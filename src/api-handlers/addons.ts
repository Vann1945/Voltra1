import type { MinimalVercelRequest as VercelRequest, MinimalVercelResponse as VercelResponse } from '@/lib/vercelAdapter';
import crypto from 'crypto';
import { getPool, query, queryOne } from '@/lib/db';
import { getSessionUser, requireUser } from '@/lib/apiAuth';
import { buildAddonPayload, AddonUploadInput, validateAddonPatch } from '@/lib/utils';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { safeLogError } from '@/lib/safeLog';
import { ensureFeatureTables } from '@/lib/featureSchema';
import { deleteImageKitFolder, addonFolderPath } from '@/lib/imageKitFolders';

function isSafeVersionUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim().length < 1 || value.length > 2000) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function formatVersion(row: any) {
  return {
    id: row.id,
    addonId: row.addon_id,
    version: row.version,
    downloadUrl: row.download_url,
    changelog: row.changelog || '',
    compatibilityNotes: row.compatibility_notes || '',
    createdAt: new Date(row.created_at).toISOString(),
  };
}


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

async function getCollaboratorsByAddonIds(addonIds: string[]) {
  const result = new Map<string, any[]>();
  if (addonIds.length === 0) return result;
  const placeholders = addonIds.map(() => '?').join(', ');
  const rows = await query<any>(
    `SELECT ac.addon_id, u.id AS uid,
            COALESCE(u.display_name, 'Anonymous') AS display_name,
            u.photo_url, u.profile_border
     FROM addon_collaborators ac
     INNER JOIN users u ON u.id = ac.user_id
     WHERE ac.addon_id IN (${placeholders})
     ORDER BY ac.created_at ASC`,
    addonIds
  );
  for (const row of rows) {
    const collaborators = result.get(row.addon_id) || [];
    collaborators.push({
      uid: row.uid,
      displayName: row.display_name || 'Anonymous',
      photoURL: row.photo_url || null,
      profileBorder: row.profile_border || 'none',
    });
    result.set(row.addon_id, collaborators);
  }
  return result;
}

async function attachCollaborators(addons: any[]) {
  const collaboratorsByAddon = await getCollaboratorsByAddonIds(addons.map(addon => addon.id));
  return addons.map(addon => ({ ...addon, collaborators: collaboratorsByAddon.get(addon.id) || [] }));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === 'string' ? req.query.id : undefined;
  const action = typeof req.query.action === 'string' ? req.query.action : undefined;

  if (action === 'collaborators') {
    try {
      await ensureFeatureTables();
      const user = await requireUser(req);
      const addonId = typeof req.query.addonId === 'string' ? req.query.addonId : typeof req.body?.addonId === 'string' ? req.body.addonId : '';
      if (!addonId) return res.status(400).json({ error: 'addonId is required.' });
      const addon = await queryOne<{ author_id: string }>('SELECT author_id FROM addons WHERE id = ?', [addonId]);
      if (!addon) return res.status(404).json({ error: 'Add-on not found.' });
      if (addon.author_id !== user.uid && user.role !== 'admin') return res.status(403).json({ error: 'Only the project owner can manage collaborators.' });

      if (req.method === 'GET') {
        const collaboratorsByAddon = await getCollaboratorsByAddonIds([addonId]);
        return res.status(200).json({ collaborators: collaboratorsByAddon.get(addonId) || [] });
      }

      const collaboratorId = typeof req.body?.collaboratorId === 'string' ? req.body.collaboratorId.trim() : '';
      if (!collaboratorId) return res.status(400).json({ error: 'collaboratorId is required.' });
      if (collaboratorId === addon.author_id) return res.status(400).json({ error: 'The project owner is already listed as creator.' });

      const collaborator = await queryOne<{ id: string; display_name: string | null; photo_url: string | null; profile_border: string | null }>(
        'SELECT id, display_name, photo_url, profile_border FROM users WHERE id = ? LIMIT 1',
        [collaboratorId]
      );
      if (!collaborator) return res.status(404).json({ error: 'User not found.' });

      if (req.method === 'POST') {
        await query(
          'INSERT IGNORE INTO addon_collaborators (id, addon_id, user_id) VALUES (?, ?, ?)',
          [crypto.randomUUID(), addonId, collaboratorId]
        );
        return res.status(201).json({ collaborator: {
          uid: collaborator.id,
          displayName: collaborator.display_name || 'Anonymous',
          photoURL: collaborator.photo_url || null,
          profileBorder: collaborator.profile_border || 'none',
        } });
      }

      if (req.method === 'DELETE') {
        await query('DELETE FROM addon_collaborators WHERE addon_id = ? AND user_id = ?', [addonId, collaboratorId]);
        return res.status(200).json({ ok: true });
      }

      return res.status(405).json({ error: 'Method not allowed' });
    } catch (err: any) {
      safeLogError('[api/addons collaborators] error:', err);
      const status = err?.statusCode || 500;
      return res.status(status).json({ error: status === 401 ? 'You must log in.' : 'Failed to process collaborators.' });
    }
  }

  if (action === 'bookmarks') {
    try {
      const user = await requireUser(req);
      await ensureFeatureTables();
      if (req.method === 'GET') {
        const rows = await query<any>(
          `SELECT b.addon_id, b.created_at FROM bookmarks b
           INNER JOIN addons a ON a.id = b.addon_id
           WHERE b.user_id = ? AND (a.status = 'approved' OR a.author_id = ?)
           ORDER BY b.created_at DESC`,
          [user.uid, user.uid]
        );
        return res.status(200).json({ addonIds: rows.map(row => row.addon_id) });
      }
      if (req.method === 'POST') {
        const allowed = await checkRateLimit(`toggle-bookmark:${user.uid}`, 60, 60_000);
        if (!allowed) return res.status(429).json({ error: 'Too many requests. Please slow down.' });
        const { addonId, isBookmarked } = req.body || {};
        if (typeof addonId !== 'string' || !addonId) return res.status(400).json({ error: 'addonId is required.' });
        const addon = await queryOne<{ id: string; status: string; author_id: string }>('SELECT id, status, author_id FROM addons WHERE id = ?', [addonId]);
        if (!addon || (addon.status !== 'approved' && addon.author_id !== user.uid && user.role !== 'admin')) return res.status(404).json({ error: 'Add-on not found.' });
        const bookmarkId = `${user.uid}_${addonId}`;
        if (isBookmarked) await query('DELETE FROM bookmarks WHERE id = ?', [bookmarkId]);
        else await getPool().execute('INSERT IGNORE INTO bookmarks (id, user_id, addon_id) VALUES (?, ?, ?)', [bookmarkId, user.uid, addonId]);
        return res.status(200).json({ ok: true, bookmarked: !isBookmarked });
      }
      return res.status(405).json({ error: 'Method not allowed' });
    } catch (err: any) {
      safeLogError('[api/addons bookmarks] error:', err);
      const status = err?.statusCode || 500;
      return res.status(status).json({ error: status === 401 ? 'You must log in.' : 'Failed to process bookmark.' });
    }
  }

  if (action === 'versions') {
    try {
      const addonId = typeof req.query.addonId === 'string' ? req.query.addonId : typeof req.body?.addonId === 'string' ? req.body.addonId : '';
      const versionId = typeof req.query.versionId === 'string' ? req.query.versionId : typeof req.body?.id === 'string' ? req.body.id : '';
      if (!addonId) return res.status(400).json({ error: 'addonId is required.' });
      await ensureFeatureTables();
      const addon = await queryOne<{ status: string; author_id: string }>('SELECT status, author_id FROM addons WHERE id = ?', [addonId]);
      if (!addon) return res.status(404).json({ error: 'Add-on not found.' });
      const sessionUser = await getSessionUser(req);
      const canView = addon.status === 'approved' || sessionUser?.uid === addon.author_id || sessionUser?.role === 'admin';
      if (!canView) return res.status(404).json({ error: 'Add-on not found.' });
      if (req.method === 'GET') {
        const rows = await query<any>('SELECT id, addon_id, version, download_url, changelog, compatibility_notes, created_at FROM addon_versions WHERE addon_id = ? ORDER BY created_at DESC', [addonId]);
        return res.status(200).json({ versions: rows.map(formatVersion) });
      }
      const user = await requireUser(req);
      if (addon.author_id !== user.uid && user.role !== 'admin') return res.status(403).json({ error: 'Only the project owner can manage versions.' });
      const body = req.body || {};
      const version = typeof body.version === 'string' ? body.version.trim() : '';
      const downloadUrl = typeof body.downloadUrl === 'string' ? body.downloadUrl.trim() : '';
      const changelog = typeof body.changelog === 'string' ? body.changelog.trim() : '';
      const compatibilityNotes = typeof body.compatibilityNotes === 'string' ? body.compatibilityNotes.trim() : '';
      if (!version || version.length > 80) return res.status(400).json({ error: 'Version is required and must be at most 80 characters.' });
      if (!isSafeVersionUrl(downloadUrl)) return res.status(400).json({ error: 'A valid download URL is required.' });
      if (changelog.length > 10000) return res.status(400).json({ error: 'Changelog must be at most 10,000 characters.' });
      if (compatibilityNotes.length > 1000) return res.status(400).json({ error: 'Compatibility notes must be at most 1,000 characters.' });
      if (req.method === 'POST') {
        const countRow = await queryOne<{ count: number }>('SELECT COUNT(*) AS count FROM addon_versions WHERE addon_id = ?', [addonId]);
        if (Number(countRow?.count || 0) >= 2) return res.status(400).json({ error: 'An add-on can have at most two versions.' });
        const duplicate = await queryOne('SELECT id FROM addon_versions WHERE addon_id = ? AND version = ?', [addonId, version]);
        if (duplicate) return res.status(409).json({ error: 'That version already exists for this add-on.' });
        const newId = crypto.randomUUID();
        await query('INSERT INTO addon_versions (id, addon_id, version, download_url, changelog, compatibility_notes) VALUES (?, ?, ?, ?, ?, ?)', [newId, addonId, version, downloadUrl, changelog, compatibilityNotes]);
        await query('UPDATE addons SET download_url = ? WHERE id = ?', [downloadUrl, addonId]);
        return res.status(201).json({ id: newId, addonId, version, downloadUrl, changelog, compatibilityNotes, createdAt: new Date().toISOString() });
      }
      if (req.method === 'PATCH') {
        if (!versionId) return res.status(400).json({ error: 'Version id is required.' });
        const existing = await queryOne<{ id: string; addon_id: string }>('SELECT id, addon_id FROM addon_versions WHERE id = ?', [versionId]);
        if (!existing || existing.addon_id !== addonId) return res.status(404).json({ error: 'Version not found.' });
        const duplicate = await queryOne('SELECT id FROM addon_versions WHERE addon_id = ? AND version = ? AND id <> ?', [addonId, version, versionId]);
        if (duplicate) return res.status(409).json({ error: 'That version already exists for this add-on.' });
        await query('UPDATE addon_versions SET version = ?, download_url = ?, changelog = ?, compatibility_notes = ? WHERE id = ?', [version, downloadUrl, changelog, compatibilityNotes, versionId]);
        await query('UPDATE addons SET download_url = ? WHERE id = ?', [downloadUrl, addonId]);
        return res.status(200).json({ ok: true });
      }
      return res.status(405).json({ error: 'Method not allowed' });
    } catch (err: any) {
      safeLogError('[api/addons versions] error:', err);
      const status = err?.statusCode || 500;
      return res.status(status).json({ error: status === 401 ? 'You must log in.' : 'Failed to process add-on version.' });
    }
  }

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
        await ensureFeatureTables();
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

        const versionRows = await query<any>(
          'SELECT id, addon_id, version, download_url, changelog, compatibility_notes, created_at FROM addon_versions WHERE addon_id = ? ORDER BY created_at DESC',
          [id]
        );
        const detail = rowToAddon(addon, false) as any;
        const collaboratorsByAddon = await getCollaboratorsByAddonIds([id]);
        detail.collaborators = collaboratorsByAddon.get(id) || [];
        detail.versions = versionRows.map(version => ({
          id: version.id,
          addonId: version.addon_id,
          version: version.version,
          downloadUrl: version.download_url,
          changelog: version.changelog || '',
          compatibilityNotes: version.compatibility_notes || '',
          createdAt: new Date(version.created_at).toISOString(),
        }));
        return res.status(200).json({ addon: detail });
      } catch (err) {
        safeLogError('[api/addons GET id] error:', err);
        return res.status(500).json({ error: 'Failed to load add-on.' });
      }
    }

    if (req.method === 'PATCH') {
      try {
        const user = await requireUser(req);
        const addon = await queryOne<{ author_id: string; title: string }>('SELECT author_id, title FROM addons WHERE id = ?', [id]);
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
        if (typeof body.demoUrl === 'string') { fields.push('demo_url = ?'); values.push(body.demoUrl); }
        if (typeof body.unlisted === 'boolean') { fields.push('unlisted = ?'); values.push(body.unlisted); }
        if (typeof body.allowComments === 'boolean') { fields.push('allow_comments = ?'); values.push(body.allowComments); }

        if (fields.length === 0) return res.status(400).json({ error: 'No fields were changed.' });

        values.push(id);
        await query(`UPDATE addons SET ${fields.join(', ')} WHERE id = ?`, values);

        // Judul berubah -> folder gambar ImageKit lama (dinamai pakai judul lama)
        // dihapus. Upload gambar berikutnya otomatis bikin folder baru sesuai
        // judul baru. Kegagalan hapus folder tidak menggagalkan request utama.
        const newTitle = typeof body.title === 'string' ? body.title.trim() : null;
        if (newTitle && newTitle !== addon.title) {
          await deleteImageKitFolder(addonFolderPath(addon.title));
        }

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
        const addon = await queryOne<{ author_id: string; title: string }>('SELECT author_id, title FROM addons WHERE id = ?', [id]);
        if (!addon) return res.status(404).json({ error: 'Add-on not found.' });
        if (addon.author_id !== user.uid && user.role !== 'admin') {
          return res.status(403).json({ error: 'Not allowed.' });
        }
        await query('DELETE FROM addons WHERE id = ?', [id]);

        // Add-on dihapus -> seluruh folder gambarnya di ImageKit ikut dihapus.
        await deleteImageKitFolder(addonFolderPath(addon.title));

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
      const addonPayloads = rows.map(r => rowToAddon(r, true));
      return res.status(200).json({ addons: await attachCollaborators(addonPayloads) });
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
      const versions = Array.isArray(input.versions) && input.versions.length > 0
        ? input.versions
        : [{ version: '1.0.0', downloadUrl: input.downloadUrl, changelog: '', compatibilityNotes: '' }];
      if (versions.length > 2) return res.status(400).json({ error: 'An add-on can have at most two versions.' });
      for (const version of versions) {
        if (!version || typeof version.version !== 'string' || !version.version.trim() || version.version.length > 80) {
          return res.status(400).json({ error: 'Each version needs a name of at most 80 characters.' });
        }
        if (typeof version.downloadUrl !== 'string' || !/^https?:\/\//.test(version.downloadUrl)) {
          return res.status(400).json({ error: 'Each version needs a valid download URL.' });
        }
        if (typeof version.changelog === 'string' && version.changelog.length > 10000) {
          return res.status(400).json({ error: 'Each changelog must be at most 10,000 characters.' });
        }
      }
      const addonId = crypto.randomUUID();
      const payload = buildAddonPayload({ ...input, downloadUrl: versions[0].downloadUrl, versions } as AddonUploadInput, addonId, user.uid, user.name || 'Anonymous');

      await ensureFeatureTables();
      const conn = await getPool().getConnection();
      try {
        await conn.beginTransaction();
        await conn.execute(
          `INSERT INTO addons
             (id, title, description, category, additional_category, project_class, image_url, image_urls,
              tags, download_url, demo_url, license, distribution_pref, socials, author_id, author_name,
              status, is_featured, unlisted, allow_comments, likes_count, downloads_count, rating_count, average_rating)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0)`,
          [
            payload.id, payload.title, payload.description, payload.category, payload.additionalCategory,
            payload.projectClass, payload.imageUrl, JSON.stringify(payload.imageUrls),
            JSON.stringify(payload.tags), payload.downloadUrl, payload.demoUrl, payload.license, payload.distributionPref,
            JSON.stringify(payload.socials), payload.authorId, payload.authorName, payload.status,
            payload.isFeatured, payload.unlisted, payload.allowComments,
          ]
        );
        const versionPlaceholders = versions.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
        const versionValues = versions.flatMap(version => [
          crypto.randomUUID(),
          addonId,
          version.version.trim(),
          version.downloadUrl.trim(),
          version.changelog || '',
          version.compatibilityNotes || '',
        ]);
        await conn.execute(
          `INSERT INTO addon_versions (id, addon_id, version, download_url, changelog, compatibility_notes) VALUES ${versionPlaceholders}`,
          versionValues
        );
        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
      return res.status(201).json({ id: addonId, versions: versions.length });
    } catch (err: any) {
      safeLogError('[api/addons POST] error:', err);
      const status = err?.statusCode || 500;
      return res.status(status).json({ error: status === 401 ? 'You must log in.' : 'Failed to create add-on.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
