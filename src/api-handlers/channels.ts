import crypto from 'crypto';
import type { MinimalVercelRequest as VercelRequest, MinimalVercelResponse as VercelResponse } from '@/lib/vercelAdapter';
import { query, queryOne } from '@/lib/db';
import { requireUser } from '@/lib/apiAuth';
import { checkRateLimit } from '@/lib/rateLimit';
import { safeLogError } from '@/lib/safeLog';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const STATUS_VALUES = new Set(['draft', 'published', 'suspended']);

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length > 0 && text.length <= max ? text : null;
}

function normalizeSlug(value: unknown): string | null {
  const slug = cleanText(value, 80)?.toLowerCase() || null;
  return slug && SLUG_RE.test(slug) ? slug : null;
}

function asChannel(row: any) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description || '',
    avatarUrl: row.avatar_url || null,
    coverUrl: row.cover_url || null,
    ownerId: row.owner_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updateCount: Number(row.update_count || 0),
    url: `/channel/${row.slug}`,
  };
}

async function getChannel(id?: string, slug?: string) {
  if (!id && !slug) return null;
  return queryOne<any>(
    `SELECT c.*, COUNT(cu.id) AS update_count
     FROM channels c
     LEFT JOIN channel_updates cu ON cu.channel_id = c.id AND cu.status = 'published'
     WHERE ${id ? 'c.id = ?' : 'c.slug = ?'}
     GROUP BY c.id
     LIMIT 1`,
    [id || slug]
  );
}

async function isManager(channelId: string, userId: string, role?: string): Promise<boolean> {
  if (role === 'admin') return true;
  const row = await queryOne<{ id: string }>(
    'SELECT id FROM channel_admins WHERE channel_id = ? AND user_id = ? LIMIT 1',
    [channelId, userId]
  );
  return Boolean(row);
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === 'string' ? req.query.id : undefined;
  const slug = typeof req.query.slug === 'string' ? req.query.slug : undefined;
  const ownerId = typeof req.query.ownerId === 'string' ? req.query.ownerId : undefined;
  const scope = typeof req.query.scope === 'string' ? req.query.scope : undefined;

  if (scope === 'admin') {
    const user = await requireUser(req);
    if (user.role !== 'admin') return res.status(403).json({ error: 'Admin access required.' });
    const search = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 80) : '';
    const status = typeof req.query.status === 'string' && STATUS_VALUES.has(req.query.status) ? req.query.status : null;
    const rows = await query<any>(
      `SELECT c.*, COUNT(cu.id) AS update_count
       FROM channels c LEFT JOIN channel_updates cu ON cu.channel_id = c.id AND cu.status = 'published'
       WHERE (? = '' OR c.name LIKE ? OR c.slug LIKE ?) AND (? IS NULL OR c.status = ?)
       GROUP BY c.id ORDER BY c.updated_at DESC LIMIT 100`,
      [search, `%${search}%`, `%${search}%`, status, status]
    );
    return res.status(200).json({ channels: rows.map(asChannel) });
  }

  if (ownerId) {
    const rows = await query<any>(
      `SELECT c.*, COUNT(cu.id) AS update_count
       FROM channels c
       LEFT JOIN channel_updates cu ON cu.channel_id = c.id AND cu.status = 'published'
       WHERE c.owner_id = ? AND c.status = 'published'
       GROUP BY c.id ORDER BY c.created_at DESC LIMIT 20`,
      [ownerId]
    );
    return res.status(200).json({ channels: rows.map(asChannel) });
  }

  const channel = await getChannel(id, slug);
  if (!channel) return res.status(404).json({ error: 'Channel not found.' });
  if (channel.status !== 'published') {
    let user = null;
    try { user = await requireUser(req); } catch { /* public not-found behavior */ }
    if (!user || !(await isManager(channel.id, user.uid, user.role))) {
      return res.status(404).json({ error: 'Channel not found.' });
    }
  }

  const updates = await query<any>(
    `SELECT id, channel_id, title, body, media_url, publish_at, status, created_at, updated_at
     FROM channel_updates WHERE channel_id = ? AND status = 'published'
     ORDER BY COALESCE(publish_at, created_at) DESC LIMIT 100`,
    [channel.id]
  );
  return res.status(200).json({ channel: asChannel(channel), updates });
}

async function handleCreate(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req);
  const allowed = await checkRateLimit(`channel-create:${user.uid}`, 10, 60 * 60_000);
  if (!allowed) return res.status(429).json({ error: 'Too many channels created. Please try again later.' });

  const body = req.body || {};
  const name = cleanText(body.name, 80);
  const slug = normalizeSlug(body.slug || body.name?.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  const description = typeof body.description === 'string' ? body.description.trim().slice(0, 500) : '';
  if (!name || !slug) return res.status(400).json({ error: 'Channel name and a valid slug are required.' });
  if (typeof body.avatarUrl !== 'undefined' && body.avatarUrl !== null && typeof body.avatarUrl !== 'string') return res.status(400).json({ error: 'Invalid avatar URL.' });
  if (typeof body.coverUrl !== 'undefined' && body.coverUrl !== null && typeof body.coverUrl !== 'string') return res.status(400).json({ error: 'Invalid cover URL.' });

  const id = crypto.randomUUID();
  try {
    await query('INSERT INTO channels (id, slug, name, description, avatar_url, cover_url, owner_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [id, slug, name, description, body.avatarUrl || null, body.coverUrl || null, user.uid, 'draft']);
    await query('INSERT INTO channel_admins (id, channel_id, user_id, role) VALUES (?, ?, ?, ?)', [crypto.randomUUID(), id, user.uid, 'owner']);
    const channel = await getChannel(id);
    return res.status(201).json({ channel: channel && asChannel(channel) });
  } catch (err: any) {
    if (err?.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'That channel slug is already in use.' });
    throw err;
  }
}

async function handleUpdate(req: VercelRequest, res: VercelResponse, channelId: string) {
  const user = await requireUser(req);
  const channel = await getChannel(channelId);
  if (!channel) return res.status(404).json({ error: 'Channel not found.' });
  if (!(await isManager(channelId, user.uid, user.role))) return res.status(403).json({ error: 'Only the channel owner or an admin can manage this channel.' });

  const body = req.body || {};
  const fields: string[] = [];
  const values: unknown[] = [];
  if (body.name !== undefined) { const value = cleanText(body.name, 80); if (!value) return res.status(400).json({ error: 'Channel name is required.' }); fields.push('name = ?'); values.push(value); }
  if (body.slug !== undefined) { const value = normalizeSlug(body.slug); if (!value) return res.status(400).json({ error: 'Invalid channel slug.' }); fields.push('slug = ?'); values.push(value); }
  if (body.description !== undefined) { if (typeof body.description !== 'string' || body.description.length > 500) return res.status(400).json({ error: 'Description must be at most 500 characters.' }); fields.push('description = ?'); values.push(body.description.trim()); }
  if (body.avatarUrl !== undefined) { fields.push('avatar_url = ?'); values.push(body.avatarUrl || null); }
  if (body.coverUrl !== undefined) { fields.push('cover_url = ?'); values.push(body.coverUrl || null); }
  if (body.status !== undefined) { if (typeof body.status !== 'string' || !STATUS_VALUES.has(body.status)) return res.status(400).json({ error: 'Invalid channel status.' }); fields.push('status = ?'); values.push(body.status); }
  if (fields.length === 0) return res.status(400).json({ error: 'No channel fields were changed.' });

  try {
    values.push(channelId);
    await query(`UPDATE channels SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);
    const updated = await getChannel(channelId);
    return res.status(200).json({ channel: updated && asChannel(updated) });
  } catch (err: any) {
    if (err?.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'That channel slug is already in use.' });
    throw err;
  }
}

async function handleDelete(req: VercelRequest, res: VercelResponse, channelId: string) {
  const user = await requireUser(req);
  const channel = await getChannel(channelId);
  if (!channel) return res.status(404).json({ error: 'Channel not found.' });
  if (!(await isManager(channelId, user.uid, user.role))) return res.status(403).json({ error: 'Only the channel owner or an admin can delete this channel.' });
  await query('DELETE FROM channels WHERE id = ?', [channelId]);
  return res.status(200).json({ ok: true });
}

async function handleUpdatePost(req: VercelRequest, res: VercelResponse, channelId: string) {
  const user = await requireUser(req);
  if (!(await isManager(channelId, user.uid, user.role))) return res.status(403).json({ error: 'Only the channel owner or an admin can publish updates.' });
  const body = req.body || {};
  const title = cleanText(body.title, 120);
  const text = cleanText(body.body, 10_000);
  if (!title || !text) return res.status(400).json({ error: 'Update title and body are required.' });
  const publishAt = body.publishAt === null || body.publishAt === '' ? null : new Date(body.publishAt);
  if (publishAt && Number.isNaN(publishAt.getTime())) return res.status(400).json({ error: 'Invalid update time.' });
  const status = body.status === 'draft' ? 'draft' : 'published';
  const id = crypto.randomUUID();
  await query('INSERT INTO channel_updates (id, channel_id, title, body, media_url, publish_at, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [id, channelId, title, text, body.mediaUrl || null, publishAt ? publishAt.toISOString().slice(0, 19).replace('T', ' ') : null, status, user.uid]);
  return res.status(201).json({ id, status });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const id = typeof req.query.id === 'string' ? req.query.id : undefined;
    const updateId = typeof req.query.updateId === 'string' ? req.query.updateId : undefined;
    if (req.method === 'GET') return await handleGet(req, res);
    if (req.method === 'POST' && !id) return await handleCreate(req, res);
    if (!id) return res.status(400).json({ error: 'Channel id is required.' });
    if (req.method === 'PATCH' && !updateId) return await handleUpdate(req, res, id);
    if (req.method === 'DELETE' && !updateId) return await handleDelete(req, res, id);
    if (req.method === 'POST' && !updateId) return await handleUpdatePost(req, res, id);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    safeLogError('[api/channels] error:', err);
    const status = err?.statusCode || 500;
    return res.status(status).json({ error: status === 401 ? 'You must log in.' : status === 403 ? 'You do not have permission.' : 'Failed to process channel.' });
  }
}
