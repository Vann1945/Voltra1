import type { MinimalVercelRequest as VercelRequest, MinimalVercelResponse as VercelResponse } from '@/lib/vercelAdapter';
import crypto from 'crypto';
import { query } from '@/lib/db';
import { findUserByEmail } from '@/lib/userStore';
import { sendVerificationEmail } from '@/lib/email';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { safeLogError } from '@/lib/safeLog';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const ip = getClientIp(req);
    const allowed = await checkRateLimit(`resend-verification:${ip}`, 5, 15 * 60_000);
    if (!allowed) return res.status(429).json({ error: 'Too many attempts. Please try again later.' });

    const { email } = req.body || {};
    if (typeof email !== 'string' || !email) return res.status(400).json({ error: 'Email is required.' });

    const user = await findUserByEmail(email);
    if (!user) return res.status(200).json({ ok: true });
    if (user.email_verified) return res.status(200).json({ ok: true });

    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
    await query('UPDATE users SET verify_token = ?, verify_token_expires = ? WHERE id = ?', [
      verifyToken,
      verifyTokenExpires,
      user.id,
    ]);

    const origin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
    const verifyUrl = `${origin}/api/verify-email?token=${verifyToken}&uid=${user.id}`;
    try {
      await sendVerificationEmail(user.email, verifyUrl);
    } catch (err) {
      safeLogError('[ResendJS] email failed to send:', err);
    }
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    safeLogError('[ResendJS] handler error:', err);
    return res.status(500).json({ error: err?.message || 'Internal server error.' });
  }
}
