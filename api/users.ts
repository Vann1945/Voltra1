import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, queryOne } from '../src/lib/db.js';
import { requireUser, requireAdmin } from '../src/lib/apiAuth.js';
import { checkRateLimit } from '../src/lib/rateLimit.js';
import { safeLogError } from '../src/lib/safeLog.js';

const ALLOWED_BORDERS = ['none', 'bronze', 'silver', 'gold', 'diamond', 'emerald', 'admin'];

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

      await query(
        'UPDATE users SET display_name = ?, photo_url = ?, bio = ?, profile_border = ? WHERE id = ?',
        [displayName ?? null, photoURL ?? null, bio ?? null, profileBorder || 'none', user.uid]
      );
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
