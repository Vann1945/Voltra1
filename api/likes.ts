import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPool } from '../src/lib/db.js';
import { requireUser } from '../src/lib/apiAuth.js';
import { checkRateLimit } from '../src/lib/rateLimit.js';
import { safeLogError } from '../src/lib/safeLog.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await requireUser(req);

    if (req.method === 'GET') {
      const [rows] = await getPool().execute('SELECT addon_id FROM likes WHERE user_id = ?', [user.uid]);
      return res.status(200).json({ addonIds: (rows as any[]).map((r) => r.addon_id) });
    }

    if (req.method === 'POST') {
      const allowed = await checkRateLimit(`toggle-like:${user.uid}`, 60, 60_000);
      if (!allowed) return res.status(429).json({ error: 'Too many requests. Please slow down.' });

      const { addonId, isLiked } = req.body || {};
      if (typeof addonId !== 'string' || !addonId) return res.status(400).json({ error: 'addonId is required.' });

      const likeId = `${user.uid}_${addonId}`;
      const conn = await getPool().getConnection();
      try {
        await conn.beginTransaction();
        if (isLiked) {
          const [delResult] = await conn.execute('DELETE FROM likes WHERE id = ?', [likeId]);
          // Hanya kurangi counter kalau baris like memang benar-benar ada &
          // terhapus — mencegah counter drift kalau request di-retry/dobel-klik.
          if ((delResult as any).affectedRows > 0) {
            await conn.execute('UPDATE addons SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = ?', [addonId]);
          }
        } else {
          const [insResult] = await conn.execute(
            'INSERT IGNORE INTO likes (id, user_id, addon_id) VALUES (?, ?, ?)',
            [likeId, user.uid, addonId]
          );
          // INSERT IGNORE akan no-op (affectedRows = 0) kalau like ini sudah
          // ada sebelumnya (mis. double-click atau request diulang). Counter
          // hanya boleh naik saat baris baru benar-benar dibuat.
          if ((insResult as any).affectedRows > 0) {
            await conn.execute('UPDATE addons SET likes_count = likes_count + 1 WHERE id = ?', [addonId]);
          }
        }
        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    safeLogError('[LikesJS] error:', err);
    const status = err?.statusCode || 500;
    return res.status(status).json({ error: status === 401 ? 'You must log in.' : 'Failed to process like.' });
  }
}
