import type { MinimalVercelRequest as VercelRequest, MinimalVercelResponse as VercelResponse } from '@/lib/vercelAdapter';
import crypto from 'crypto';
import { query, queryOne } from '@/lib/db';
import { requireUser, requireAdmin } from '@/lib/apiAuth';
import { checkRateLimit } from '@/lib/rateLimit';
import { safeLogError } from '@/lib/safeLog';
import { deleteImageKitFolder, userFolderPath } from '@/lib/imageKitFolders';

const ALLOWED_BORDERS = ['none', 'sparkle-white', 'sparkle-gold', 'sparkle-cyan', 'sparkle-toxic', 'sparkle-pink', 'orbit-classic', 'orbit-fire', 'orbit-void', 'orbit-ocean', 'orbit-platinum', 'shine-white', 'shine-gold', 'shine-crimson', 'shine-emerald', 'shine-sapphire', 'pulse-violet', 'pulse-rose', 'pulse-azure', 'pulse-jade', 'pulse-amber', 'confetti-mix', 'confetti-gold', 'confetti-pastel', 'electric-blue', 'electric-violet', 'comet-gold', 'comet-cyan', 'comet-rose', 'firefly-amber', 'firefly-emerald', 'ripple-silver', 'ripple-teal', 'aurora', 'rainbow', 'halo-white', 'halo-ruby', 'shadow-pulse', 'meteor', 'starburst-gold'];

function isSafeUrlOrEmpty(v: unknown): boolean {
  if (v === null || v === undefined || v === '') return true;
  if (typeof v !== 'string' || v.length > 2000) return false;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === 'string' ? req.query.id : undefined;
  const scope = typeof req.query.scope === 'string' ? req.query.scope : undefined;

  if (scope === 'search') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    try {
      const user = await requireUser(req);
      const rawQuery = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      if (rawQuery.length < 2) return res.status(200).json({ users: [] });
      const search = `%${rawQuery.slice(0, 60)}%`;
      const rows = await query<any>(
        `SELECT id, display_name, photo_url, profile_border
         FROM users
         WHERE id <> ? AND display_name IS NOT NULL AND display_name LIKE ?
         ORDER BY display_name ASC
         LIMIT 8`,
        [user.uid, search]
      );
      return res.status(200).json({ users: rows.map(row => ({
        uid: row.id,
        displayName: row.display_name || 'Anonymous',
        photoURL: row.photo_url || null,
        profileBorder: row.profile_border || 'none',
      })) });
    } catch (err: any) {
      safeLogError('[api/users search] error:', err);
      const status = err?.statusCode || 500;
      return res.status(status).json({ error: status === 401 ? 'You must log in.' : 'Failed to search users.' });
    }
  }

  if (scope === 'habit') {
    try {
      const user = await requireUser(req);

      if (req.method === 'GET') {
        const rows = await query<any>(
          `SELECT h.name, h.journey_start_date, l.log_date, l.status
           FROM habits h LEFT JOIN habit_logs l ON l.habit_id = h.id
           WHERE h.user_id = ?`,
          [user.uid]
        );

        if (rows.length === 0) {
          return res.status(200).json({ name: null, journeyStartDate: null, log: {} });
        }

        const log: Record<string, string> = {};
        for (const r of rows) {
          if (r.log_date && r.status) {
            const dateStr = r.log_date instanceof Date ? r.log_date.toISOString().slice(0, 10) : String(r.log_date).slice(0, 10);
            log[dateStr] = r.status;
          }
        }
        const journeyStartDate = rows[0].journey_start_date
          ? (rows[0].journey_start_date instanceof Date
              ? (rows[0].journey_start_date as Date).toISOString().slice(0, 10)
              : String(rows[0].journey_start_date).slice(0, 10))
          : null;

        return res.status(200).json({ name: rows[0].name, journeyStartDate, log });
      }

      if (req.method === 'PUT') {
        const { name } = req.body || {};
        if (typeof name !== 'string' || name.trim().length < 1 || name.length > 80) {
          return res.status(400).json({ error: 'Habit name must be 1-80 characters.' });
        }
        const allowed = await checkRateLimit(`habit-update:${user.uid}`, 30, 60_000);
        if (!allowed) return res.status(429).json({ error: 'Too many requests. Please slow down.' });

        await query(
          `INSERT INTO habits (id, user_id, name) VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE name = VALUES(name)`,
          [crypto.randomUUID(), user.uid, name]
        );
        return res.status(200).json({ ok: true });
      }

      if (req.method === 'DELETE') {
        await query('DELETE FROM habits WHERE user_id = ?', [user.uid]);
        return res.status(200).json({ ok: true });
      }

      return res.status(405).json({ error: 'Method not allowed' });
    } catch (err: any) {
      safeLogError('[api/users habit] error:', err);
      const status = err?.statusCode || 500;
      return res.status(status).json({ error: status === 401 ? 'You must log in.' : 'Failed to process habit.' });
    }
  }

  if (scope === 'habit-log') {
    if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });
    try {
      const user = await requireUser(req);

      const { date, status } = req.body || {};
      if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'Invalid date.' });
      }
      if (status !== 'active' && status !== 'rest') {
        return res.status(400).json({ error: 'Invalid status.' });
      }

      const allowed = await checkRateLimit(`habit-log:${user.uid}`, 60, 60_000);
      if (!allowed) return res.status(429).json({ error: 'Too many requests. Please slow down.' });

      // Make sure a habit row exists for this user before logging against it
      // (a brand new user may log a day before ever setting a habit name).
      await query(
        `INSERT INTO habits (id, user_id) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE user_id = user_id`,
        [crypto.randomUUID(), user.uid]
      );
      const habit = await queryOne<{ id: string }>('SELECT id FROM habits WHERE user_id = ?', [user.uid]);
      if (!habit) return res.status(500).json({ error: 'Failed to process log entry.' });

      await query('UPDATE habits SET journey_start_date = COALESCE(journey_start_date, ?) WHERE id = ?', [date, habit.id]);
      await query(
        `INSERT INTO habit_logs (id, habit_id, log_date, status) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status = VALUES(status)`,
        [crypto.randomUUID(), habit.id, date, status]
      );

      return res.status(200).json({ ok: true });
    } catch (err: any) {
      safeLogError('[api/users habit-log] error:', err);
      const status = err?.statusCode || 500;
      return res.status(status).json({ error: status === 401 ? 'You must log in.' : 'Failed to process log entry.' });
    }
  }

  if (scope === 'me') {
    if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });
    try {
      const user = await requireUser(req);

      const allowed = await checkRateLimit(`update-profile:${user.uid}`, 20, 60_000);
      if (!allowed) return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });

      const { displayName, photoURL, bio, profileBorder } = req.body || {};

      if (displayName !== undefined && displayName !== null) {
        if (typeof displayName !== 'string' || displayName.trim().length < 1 || displayName.length > 60) {
          return res.status(400).json({ error: 'Display name must be 1-60 characters.' });
        }
      }
      if (bio !== undefined && bio !== null) {
        if (typeof bio !== 'string' || bio.length > 500) {
          return res.status(400).json({ error: 'Bio maksimal 500 karakter.' });
        }
      }
      if (!isSafeUrlOrEmpty(photoURL)) {
        return res.status(400).json({ error: 'Invalid profile photo URL.' });
      }
      if (profileBorder !== undefined && profileBorder !== null && profileBorder !== '' && !ALLOWED_BORDERS.includes(profileBorder)) {
        return res.status(400).json({ error: 'Invalid border selection.' });
      }

      const existing = await queryOne<{ display_name: string | null }>('SELECT display_name FROM users WHERE id = ? LIMIT 1', [user.uid]);
      const oldDisplayName = existing?.display_name || null;

      await query(
        'UPDATE users SET display_name = ?, photo_url = ?, bio = ?, profile_border = ? WHERE id = ?',
        [displayName ?? null, photoURL ?? null, bio ?? null, profileBorder || 'none', user.uid]
      );

      // Nama tampilan berubah -> folder foto profil lama (dinamai pakai nama
      // lama) di ImageKit dihapus. Upload foto berikutnya bikin folder baru
      // sesuai nama baru.
      const newDisplayName = typeof displayName === 'string' ? displayName.trim() : null;
      if (oldDisplayName && newDisplayName && newDisplayName !== oldDisplayName) {
        await deleteImageKitFolder(userFolderPath(oldDisplayName));
      }

      return res.status(200).json({ ok: true });
    } catch (err: any) {
      safeLogError('[api/users me] error:', err);
      const status = err?.statusCode || 500;
      return res.status(status).json({ error: status === 401 ? 'You must log in.' : 'Failed to update profile.' });
    }
  }

  if (id) {
    if (req.method === 'GET') {
      try {
        const user = await queryOne<{ display_name: string | null; photo_url: string | null; profile_border: string | null }>(
          'SELECT display_name, photo_url, profile_border FROM users WHERE id = ? LIMIT 1',
          [id]
        );
        if (!user) return res.status(404).json({ error: 'User not found.' });
        return res.status(200).json({
          displayName: user.display_name,
          photoURL: user.photo_url,
          profileBorder: user.profile_border || 'none',
        });
      } catch (err) {
        safeLogError('[api/users GET id] error:', err);
        return res.status(500).json({ error: 'Failed to load profile.' });
      }
    }

    if (req.method === 'PATCH') {
      try {
        const admin = await requireAdmin(req);
        const { role } = req.body || {};
        const allowedRoles = ['user', 'admin', 'banned', 'suspended'];
        if (!allowedRoles.includes(role)) return res.status(400).json({ error: 'Invalid role.' });
        if (id === admin.uid && role !== 'admin') {
          return res.status(400).json({ error: 'You cannot remove your own admin role.' });
        }
        await query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
        return res.status(200).json({ ok: true });
      } catch (err: any) {
        safeLogError('[api/users PATCH id] error:', err);
        const status = err?.statusCode || 500;
        return res.status(status).json({ error: status === 403 ? 'Admins only.' : 'Failed to update role.' });
      }
    }

    if (req.method === 'DELETE') {
      try {
        const admin = await requireAdmin(req);
        if (id === admin.uid) {
          return res.status(400).json({ error: 'You cannot delete your own account from this panel.' });
        }
        await query('DELETE FROM users WHERE id = ?', [id]);
        return res.status(200).json({ ok: true });
      } catch (err: any) {
        safeLogError('[api/users DELETE id] error:', err);
        const status = err?.statusCode || 500;
        return res.status(status).json({ error: status === 403 ? 'Admins only.' : 'Failed to delete user.' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.method === 'GET') {
    try {
      await requireAdmin(req);
      const rows = await query(
        'SELECT id, email, display_name, photo_url, role, bio, profile_border, email_verified, created_at FROM users ORDER BY created_at DESC'
      );
      return res.status(200).json({
        users: rows.map((r: any) => ({
          uid: r.id,
          email: r.email,
          displayName: r.display_name,
          photoURL: r.photo_url,
          role: r.role,
          bio: r.bio,
          profileBorder: r.profile_border,
          emailVerified: !!r.email_verified,
          createdAt: new Date(r.created_at).toISOString(),
        })),
      });
    } catch (err: any) {
      safeLogError('[api/users GET] error:', err);
      const status = err?.statusCode || 500;
      return res.status(status).json({ error: status === 403 ? 'Admins only.' : 'Failed to load users.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
