import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { query, queryOne } from '../src/lib/db.js';
import { checkRateLimit, getClientIp } from '../src/lib/rateLimit.js';
import { timingSafeEqual } from '../src/lib/timingSafe.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getClientIp(req);
  const allowed = await checkRateLimit(`reset-password:${ip}`, 8, 15 * 60_000);
  if (!allowed) return res.status(429).json({ error: 'Too many attempts. Please try again later.' });

  const { uid, token, newPassword } = req.body || {};
  if (typeof uid !== 'string' || typeof token !== 'string' || typeof newPassword !== 'string' || !uid || !token || !newPassword) {
    return res.status(400).json({ error: 'Data is incomplete.' });
  }
  if (newPassword.length < 6 || newPassword.length > 200) {
    return res.status(400).json({ error: 'Password must be 6-200 characters.' });
  }

  const user = await queryOne<{ reset_token: string | null; reset_token_expires: number | null }>(
    'SELECT reset_token, reset_token_expires FROM users WHERE id = ? LIMIT 1',
    [uid]
  );
  if (!user) return res.status(404).json({ error: 'Account not found.' });

  if (!timingSafeEqual(user.reset_token, token) || (user.reset_token_expires && Date.now() > user.reset_token_expires)) {
    return res.status(400).json({ error: 'The reset link is invalid or has expired.' });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await query('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?', [
    passwordHash,
    uid,
  ]);

  return res.status(200).json({ ok: true });
}
