import type { MinimalVercelRequest as VercelRequest, MinimalVercelResponse as VercelResponse } from '@/lib/vercelAdapter';
import { getPool } from '@/lib/db';
import { requireUser } from '@/lib/apiAuth';
import { checkRateLimit } from '@/lib/rateLimit';
import { safeLogError } from '@/lib/safeLog';

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
          if ((delResult as any).affectedRows > 0) {
            await conn.execute('UPDATE addons SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = ?', [addonId]);
          }
        } else {
          const [insResult] = await conn.execute(
            'INSERT IGNORE INTO likes (id, user_id, addon_id) VALUES (?, ?, ?)',
            [likeId, user.uid, addonId]
          );
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
