import type { MinimalVercelRequest as VercelRequest, MinimalVercelResponse as VercelResponse } from '@/lib/vercelAdapter';
import crypto from 'crypto';
import { query } from '@/lib/db';
import { findUserByEmail, normalizeEmail } from '@/lib/userStore';
import { verifyRecaptcha } from '@/lib/recaptcha.server';
import { sendPasswordResetEmail } from '@/lib/email';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { safeLogError } from '@/lib/safeLog';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const ip = getClientIp(req);
    const allowed = await checkRateLimit(`forgot-password:${ip}`, 5, 15 * 60_000);
    if (!allowed) return res.status(429).json({ error: 'Too many attempts. Please try again later.' });

    const { email: rawEmail, recaptchaToken } = req.body || {};
    if (typeof rawEmail !== 'string' || !rawEmail) return res.status(400).json({ error: 'Email is required.' });
    const email = normalizeEmail(rawEmail);

    const captchaOk = await verifyRecaptcha(recaptchaToken, req.headers['x-forwarded-for'] as string);
    if (!captchaOk) return res.status(400).json({ error: 'reCAPTCHA verification failed.' });

    const user = await findUserByEmail(email);

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpires = Date.now() + 60 * 60 * 1000; // 1 jam
      await query('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?', [
        resetToken,
        resetTokenExpires,
        user.id,
      ]);
      const origin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
      const resetUrl = `${origin}/reset-password?token=${resetToken}&uid=${user.id}`;
      try {
        await sendPasswordResetEmail(email, resetUrl);
      } catch (emailErr) {
        safeLogError('[Forgot-Password] email failed to send:', emailErr);
      }
    }

    return res.status(200).json({ ok: true, message: 'If the email is registered, the reset link has been sent.' });
  } catch (err: any) {
    safeLogError('[ForgotJs] handler error:', err);
    return res.status(500).json({ error: err?.message || 'Internal server error.' });
  }
}
