import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { query, queryOne } from '../src/lib/db.js';
import { getSessionUser, requireUser } from '../src/lib/apiAuth.js';
import { buildAddonPayload, AddonUploadInput, validateAddonPatch } from '../src/lib/utils.js';
import { checkRateLimit, getClientIp } from '../src/lib/rateLimit.js';
import { safeLogError } from '../src/lib/safeLog.js';

function parseJsonArray(value: unknown): string[] {
  const clean = (items: unknown[]) => items
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim());
  if (Array.isArray(value)) return clean(value);
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? clean(parsed) : [];
  } catch {
    return [];
  }
}

function rowToAddon(r: any, truncateDescription: boolean) {
  const DESCRIPTION_PREVIEW_LENGTH = 600;
  const rawDescription: string = typeof r.description === 'string' ? r.description : '';
  const imageUrl = typeof r.image_url === 'string' ? r.image_url.trim() : '';
  const authorPhoto = typeof r.author_photo === 'string' && r.author_photo.trim() ? r.author_photo.trim() : null;
  const imageUrls = parseJsonArray(r.image_urls);
  return {
    id: r.id,
    title: r.title,
    description: truncateDescription && rawDescription.length > DESCRIPTION_PREVIEW_LENGTH
      ? rawDescription.slice(0, DESCRIPTION_PREVIEW_LENGTH) + '…'
      : rawDescription,
    category: r.category,
    additionalCategory: r.additional_category,
    projectClass: r.project_class,
    imageUrl,
    imageUrls: imageUrls.length > 0 ? imageUrls : (imageUrl ? [imageUrl] : []),
    panoramaUrl: r.panorama_url,
    tags: parseJsonArray(r.tags),
    downloadUrl: r.download_url,
    demoUrl: r.demo_url,
    license: r.license,
    distributionPref: r.distribution_pref,
    socials: parseJsonArray(r.socials),
    authorId: r.author_id,
    authorName: r.resolved_author_name || r.author_name,
    authorPhoto,
    authorBorder: r.author_border || 'none',
    status: r.status,
    isFeatured: !!r.is_featured,
    unlisted: !!r.unlisted,
    allowComments: !!r.allow_comments,
    likesCount: r.likes_count,
    downloadsCount: r.downloads_count,
    ratingCount: r.rating_count,
    averageRating: Number(r.average_rating),
    createdAt: new Date(r.created_at).toISOString(),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === 'string' ? req.query.id : undefined;
  const action = typeof req.query.action === 'string' ? req.query.action : undefined;

  if (id && action === 'download') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    try {
      const ip = getClientIp(req);
      const allowed = await checkRateLimit(`download:${ip}:${id}`, 5, 60_000);
      if (!allowed) return res.status(200).json({ ok: true });
      await query('UPDATE addons SET downloads_count = downloads_count + 1 WHERE id = ?', [id]);
      return res.status(200).json({ ok: true });
    } catch (err) {
      safeLogError('[api/addons download] error:', err);
      return res.status(200).json({ ok: false }); 
    }
  }

  if (id) {
    if (req.method === 'GET') {
      try {
        const addon = await queryOne<any>(
          `SELECT a.*, u.photo_url AS author_photo, u.profile_border AS author_border,
                  COALESCE(u.display_name, a.author_name) AS resolved_author_name
           FROM addons a
           LEFT JOIN users u ON u.id = a.author_id
           WHERE a.id = ?`,
          [id]
        );
        if (!addon) return res.status(404).json({ error: 'Add-on not found.' });

        if (addon.status !== 'approved') {
          const user = await getSessionUser(req);
          const isOwner = user && addon.author_id === user.uid;
          const isAdmin = user?.role === 'admin';
          if (!isOwner && !isAdmin) return res.status(404).json({ error: 'Add-on not found.' });
        }

        return res.status(200).json({ addon: rowToAddon(addon, false) });
      } catch (err) {
        safeLogError('[api/addons GET id] error:', err);
        return res.status(500).json({ error: 'Failed to load add-on.' });
      }
    }

    if (req.method === 'PATCH') {
      try {
        const user = await requireUser(req);
        const addon = await queryOne<{ author_id: string }>('SELECT author_id FROM addons WHERE id = ?', [id]);
        if (!addon) return res.status(404).json({ error: 'Add-on not found.' });

        const isOwner = addon.author_id === user.uid;
        const isAdmin = user.role === 'admin';
        if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Not allowed.' });

        const body = req.body || {};
        const validationError = validateAddonPatch(body, isAdmin);
        if (validationError) return res.status(400).json({ error: validationError });

        const fields: string[] = [];
        const values: any[] = [];

        if (isAdmin && typeof body.status === 'string') { fields.push('status = ?'); values.push(body.status); }
        if (isAdmin && typeof body.isFeatured === 'boolean') { fields.push('is_featured = ?'); values.push(body.isFeatured); }
        if (isAdmin && typeof body.category === 'string') { fields.push('category = ?'); values.push(body.category); }
        if (isAdmin && Array.isArray(body.tags)) { fields.push('tags = ?'); values.push(JSON.stringify(body.tags)); }
        if (typeof body.title === 'string') { fields.push('title = ?'); values.push(body.title); }
        if (typeof body.description === 'string') { fields.push('description = ?'); values.push(body.description); }
        if (typeof body.downloadUrl === 'string') { fields.push('download_url = ?'); values.push(body.downloadUrl); }
        if (typeof body.panoramaUrl === 'string') { fields.push('panorama_url = ?'); values.push(body.panoramaUrl); }
        if (typeof body.demoUrl === 'string') { fields.push('demo_url = ?'); values.push(body.demoUrl); }
        if (typeof body.unlisted === 'boolean') { fields.push('unlisted = ?'); values.push(body.unlisted); }
        if (typeof body.allowComments === 'boolean') { fields.push('allow_comments = ?'); values.push(body.allowComments); }

        if (fields.length === 0) return res.status(400).json({ error: 'No fields were changed.' });

        values.push(id);
        await query(`UPDATE addons SET ${fields.join(', ')} WHERE id = ?`, values);
        return res.status(200).json({ ok: true });
      } catch (err: any) {
        safeLogError('[api/addons PATCH] error:', err);
        const status = err?.statusCode || 500;
        return res.status(status).json({ error: status === 401 ? 'You must log in.' : 'Failed to update add-on.' });
      }
    }

    if (req.method === 'DELETE') {
      try {
        const user = await requireUser(req);
        const addon = await queryOne<{ author_id: string }>('SELECT author_id FROM addons WHERE id = ?', [id]);
        if (!addon) return res.status(404).json({ error: 'Add-on not found.' });
        if (addon.author_id !== user.uid && user.role !== 'admin') {
          return res.status(403).json({ error: 'Not allowed.' });
        }
        await query('DELETE FROM addons WHERE id = ?', [id]);
        return res.status(200).json({ ok: true });
      } catch (err: any) {
        safeLogError('[api/addons DELETE] error:', err);
        const status = err?.statusCode || 500;
        return res.status(status).json({ error: status === 401 ? 'You must log in.' : 'Failed to delete add-on.' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.method === 'GET') {
    // Marketplace publik tetap render empty state saat environment DB belum
    // tersedia (misalnya preview lokal), bukan mengembalikan blank/error page.
    if (!process.env.TIDB_HOST) return res.status(200).json({ addons: [] });

    try {
      const user = await getSessionUser(req);
      let rows: any[];
      if (user?.role === 'admin') {
        rows = await query(
          `SELECT a.*, u.photo_url AS author_photo, u.profile_border AS author_border,
                  COALESCE(u.display_name, a.author_name) AS resolved_author_name
           FROM addons a
           LEFT JOIN users u ON u.id = a.author_id
           ORDER BY a.created_at DESC`
        );
      } else if (user) {
        rows = await query(
          `SELECT a.*, u.photo_url AS author_photo, u.profile_border AS author_border,
                  COALESCE(u.display_name, a.author_name) AS resolved_author_name
           FROM addons a
           LEFT JOIN users u ON u.id = a.author_id
           WHERE a.status = 'approved' OR a.author_id = ?
           ORDER BY a.created_at DESC`,
          [user.uid]
        );
      } else {
        rows = await query(
          `SELECT a.*, u.photo_url AS author_photo, u.profile_border AS author_border,
                  COALESCE(u.display_name, a.author_name) AS resolved_author_name
           FROM addons a
           LEFT JOIN users u ON u.id = a.author_id
           WHERE a.status = 'approved'
           ORDER BY a.created_at DESC`
        );
      }
      return res.status(200).json({ addons: rows.map(r => rowToAddon(r, true)) });
    } catch (err) {
      safeLogError('[api/addons GET] error:', err);
      return res.status(500).json({ error: 'Failed to load add-ons.' });
    }
  }

  if (req.method === 'POST') {
    try {
      const user = await requireUser(req);
      const allowed = await checkRateLimit(`create-addon:${user.uid}`, 10, 60 * 60_000);
      if (!allowed) return res.status(429).json({ error: 'Too many add-ons created in the last hour. Please try again later.' });
      const input = req.body as AddonUploadInput;
      const addonId = crypto.randomUUID();
      const payload = buildAddonPayload(input, addonId, user.uid, user.name || 'Anonymous');

      await query(
        `INSERT INTO addons
           (id, title, description, category, additional_category, project_class, image_url, image_urls,
            panorama_url, tags, download_url, demo_url, license, distribution_pref, socials, author_id, author_name,
            status, is_featured, unlisted, allow_comments, likes_count, downloads_count, rating_count, average_rating)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0)`,
        [
          payload.id, payload.title, payload.description, payload.category, payload.additionalCategory,
          payload.projectClass, payload.imageUrl, JSON.stringify(payload.imageUrls), payload.panoramaUrl,
          JSON.stringify(payload.tags), payload.downloadUrl, payload.demoUrl, payload.license, payload.distributionPref,
          JSON.stringify(payload.socials), payload.authorId, payload.authorName, payload.status,
          payload.isFeatured, payload.unlisted, payload.allowComments,
        ]
      );
      return res.status(201).json({ id: addonId });
    } catch (err: any) {
      safeLogError('[api/addons POST] error:', err);
      const status = err?.statusCode || 500;
      return res.status(status).json({ error: status === 401 ? 'You must log in.' : 'Failed to create add-on.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
