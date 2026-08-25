import type { MinimalVercelRequest as VercelRequest, MinimalVercelResponse as VercelResponse } from '@/lib/vercelAdapter';
import crypto from 'crypto';
import { getPool, query, queryOne } from '@/lib/db';
import { requireUser } from '@/lib/apiAuth';
import { safeLogError } from '@/lib/safeLog';
import { checkRateLimit } from '@/lib/rateLimit';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const addonId = req.query.addonId as string;
    if (!addonId) return res.status(400).json({ error: 'addonId is required.' });
    try {
      const rows = await query(
        'SELECT id, addon_id, user_id, user_name, user_photo, rating, comment, created_at FROM reviews WHERE addon_id = ? ORDER BY created_at DESC',
        [addonId]
      );
      return res.status(200).json({
        reviews: rows.map((r: any) => ({
          id: r.id,
          addonId: r.addon_id,
          userId: r.user_id,
          userName: r.user_name,
          userPhoto: r.user_photo,
          rating: r.rating,
          comment: r.comment,
          createdAt: new Date(r.created_at).toISOString(),
        })),
      });
    } catch (err) {
      safeLogError('[api/reviews GET] error:', err);
      return res.status(500).json({ error: 'Failed to load reviews.' });
    }
  }

  if (req.method === 'POST') {
    try {
      const user = await requireUser(req);

      const allowed = await checkRateLimit(`create-review:${user.uid}`, 15, 60 * 60_000);
      if (!allowed) return res.status(429).json({ error: 'Too many reviews submitted. Please try again later.' });

      const { addonId, rating, comment } = req.body || {};

      if (typeof addonId !== 'string' || !addonId) {
        return res.status(400).json({ error: 'addonId is required.' });
      }
      if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be a whole number from 1 to 5.' });
      }
      if (comment !== undefined && comment !== null && (typeof comment !== 'string' || comment.length > 1000)) {
        return res.status(400).json({ error: 'Comment must be at most 1000 characters.' });
      }

      const addon = await queryOne<{ status: string }>('SELECT status FROM addons WHERE id = ?', [addonId]);
      if (!addon || addon.status !== 'approved') {
        return res.status(404).json({ error: 'Add-on not found.' });
      }

      const reviewId = crypto.randomUUID();
      const conn = await getPool().getConnection();
      try {
        await conn.beginTransaction();
        try {
          await conn.execute(
            'INSERT INTO reviews (id, addon_id, user_id, user_name, user_photo, rating, comment) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [reviewId, addonId, user.uid, user.name, user.image || null, rating, comment?.trim() || null]
          );
        } catch (err: any) {
          if (err?.code === 'ER_DUP_ENTRY') {
            await conn.rollback();
            conn.release();
            return res.status(409).json({ error: 'You have already reviewed this add-on.' });
          }
          throw err;
        }

        await conn.execute(
          `UPDATE addons SET
             rating_count = rating_count + 1,
             average_rating = (SELECT AVG(rating) FROM reviews WHERE addon_id = ?)
           WHERE id = ?`,
          [addonId, addonId]
        );
        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }

      return res.status(201).json({ id: reviewId });
    } catch (err: any) {
      safeLogError('[api/reviews POST] error:', err);
      const status = err?.statusCode || 500;
      return res.status(status).json({ error: status === 401 ? 'You must log in.' : 'Failed to submit review.' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const user = await requireUser(req);
      const reviewId = typeof req.query.id === 'string' ? req.query.id.trim() : '';
      if (!reviewId) return res.status(400).json({ error: 'Review id is required.' });

      const review = await queryOne<{ user_id: string; addon_id: string }>(
        'SELECT user_id, addon_id FROM reviews WHERE id = ? LIMIT 1',
        [reviewId]
      );
      if (!review) return res.status(404).json({ error: 'Review not found.' });
      if (review.user_id !== user.uid && user.role !== 'admin') {
        return res.status(403).json({ error: 'You can only delete your own reviews.' });
      }

      const conn = await getPool().getConnection();
      try {
        await conn.beginTransaction();
        await conn.execute('DELETE FROM reviews WHERE id = ?', [reviewId]);
        const [aggregateRows] = await conn.execute(
          'SELECT COUNT(*) AS rating_count, COALESCE(AVG(rating), 0) AS average_rating FROM reviews WHERE addon_id = ?',
          [review.addon_id]
        );
        const aggregate = (aggregateRows as Array<{ rating_count: number; average_rating: number }>)[0];
        await conn.execute(
          'UPDATE addons SET rating_count = ?, average_rating = ? WHERE id = ?',
          [aggregate?.rating_count || 0, aggregate?.average_rating || 0, review.addon_id]
        );
        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }

      return res.status(200).json({ ok: true, id: reviewId });
    } catch (err: any) {
      safeLogError('[api/reviews DELETE] error:', err);
      const status = err?.statusCode || 500;
      return res.status(status).json({ error: status === 401 ? 'You must log in.' : 'Failed to delete review.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
