import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPool, query, queryOne } from '../src/lib/db.js';
import { ensureFeatureTables } from '../src/lib/featureSchema.js';
import { requireUser } from '../src/lib/apiAuth.js';
import { checkRateLimit } from '../src/lib/rateLimit.js';
import { safeLogError } from '../src/lib/safeLog.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await requireUser(req);
    await ensureFeatureTables();

    if (req.method === 'GET') {
      const rows = await query<any>(
        `SELECT b.addon_id, b.created_at
         FROM bookmarks b
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
      if (!addon || (addon.status !== 'approved' && addon.author_id !== user.uid && user.role !== 'admin')) {
        return res.status(404).json({ error: 'Add-on not found.' });
      }

      const bookmarkId = `${user.uid}_${addonId}`;
      if (isBookmarked) {
        await query('DELETE FROM bookmarks WHERE id = ?', [bookmarkId]);
      } else {
        await getPool().execute('INSERT IGNORE INTO bookmarks (id, user_id, addon_id) VALUES (?, ?, ?)', [bookmarkId, user.uid, addonId]);
      }
      return res.status(200).json({ ok: true, bookmarked: !isBookmarked });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    safeLogError('[BookmarksAPI] error:', err);
    const status = err?.statusCode || 500;
    return res.status(status).json({ error: status === 401 ? 'You must log in.' : 'Failed to process bookmark.' });
  }
}
