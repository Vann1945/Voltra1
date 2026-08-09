import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { query } from '../src/lib/db.js';
import { requireUser, requireAdmin } from '../src/lib/apiAuth.js';
import { checkRateLimit } from '../src/lib/rateLimit.js';
import { safeLogError } from '../src/lib/safeLog.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === 'string' ? req.query.id : undefined;

  if (id) {
    if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });
    try {
      await requireAdmin(req);
      await query("UPDATE reports SET status = 'resolved' WHERE id = ?", [id]);
      return res.status(200).json({ ok: true });
    } catch (err: any) {
      safeLogError('[api/reports PATCH id] error:', err);
      const status = err?.statusCode || 500;
      return res.status(status).json({ error: status === 403 ? 'Admins only.' : 'Failed to resolve report.' });
    }
  }

  if (req.method === 'GET') {
    try {
      const mine = req.query.mine === 'true';
      let rows: any[];
      if (mine) {
        const user = await requireUser(req);
        rows = await query(
          'SELECT id, addon_id, user_id, reason, status, created_at FROM reports WHERE user_id = ? ORDER BY created_at DESC',
          [user.uid]
        );
      } else {
        await requireAdmin(req);
        rows = await query('SELECT id, addon_id, user_id, reason, status, created_at FROM reports ORDER BY created_at DESC');
      }
      return res.status(200).json({
        reports: rows.map((r: any) => ({
          id: r.id,
          addonId: r.addon_id,
          userId: r.user_id,
          reason: r.reason,
          status: r.status,
          createdAt: new Date(r.created_at).toISOString(),
        })),
      });
    } catch (err: any) {
      safeLogError('[api/reports GET] error:', err);
      const status = err?.statusCode || 500;
      return res.status(status).json({ error: status === 403 ? 'Admins only.' : 'Failed to load reports.' });
    }
  }

  if (req.method === 'POST') {
    try {
      const user = await requireUser(req);

      const allowed = await checkRateLimit(`create-report:${user.uid}`, 10, 60 * 60_000);
      if (!allowed) return res.status(429).json({ error: 'Too many reports submitted. Please try again later.' });

      const { addonId, reason } = req.body || {};
      if (typeof addonId !== 'string' || !addonId) return res.status(400).json({ error: 'addonId is required.' });
      if (typeof reason !== 'string' || reason.trim().length < 1 || reason.length > 1000) {
        return res.status(400).json({ error: 'Report reason must be 1-1000 characters.' });
      }
      const reportId = crypto.randomUUID();
      await query('INSERT INTO reports (id, addon_id, user_id, reason, status) VALUES (?, ?, ?, ?, ?)', [
        reportId, addonId, user.uid, reason, 'pending',
      ]);
      return res.status(201).json({ id: reportId });
    } catch (err: any) {
      safeLogError('[api/reports POST] error:', err);
      const status = err?.statusCode || 500;
      return res.status(status).json({ error: status === 401 ? 'You must log in.' : 'Failed to submit report.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
