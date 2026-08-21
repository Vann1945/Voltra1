import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '../src/lib/db.js';
import { normalizeEmail, isAdminEmail } from '../src/lib/userStore.js';
import { verifyRecaptcha } from '../src/lib/recaptcha.server.js';
import { sendVerificationEmail } from '../src/lib/email.js';
import { checkRateLimit, getClientIp } from '../src/lib/rateLimit.js';
import { safeLogError } from '../src/lib/safeLog.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const ip = getClientIp(req);
    const allowed = await checkRateLimit(`register:${ip}`, 5, 15 * 60_000);
    if (!allowed) return res.status(429).json({ error: 'Too many registration attempts. Please try again later.' });

    const { name, email: rawEmail, password, recaptchaToken } = req.body || {};

    if (typeof name !== 'string' || typeof rawEmail !== 'string' || typeof password !== 'string' || !name || !rawEmail || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    if (name.length > 100) {
      return res.status(400).json({ error: 'Nama maksimal 100 karakter.' });
    }
    if (password.length < 6 || password.length > 200) {
      return res.status(400).json({ error: 'Password must be 6-200 characters.' });
    }
    const email = normalizeEmail(rawEmail);
    if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }

    const captchaOk = await verifyRecaptcha(recaptchaToken, req.headers['x-forwarded-for'] as string);
    if (!captchaOk) {
      return res.status(400).json({ error: 'reCAPTCHA verification failed. Please try again.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 jam
    const uid = crypto.randomUUID();
    const role = isAdminEmail(email) ? 'admin' : 'user';

    try {
      await query(
        `INSERT INTO users
           (id, email, display_name, photo_url, role, password_hash, email_verified, verify_token, verify_token_expires)
         VALUES (?, ?, ?, NULL, ?, ?, FALSE, ?, ?)`,
        [uid, email, name, role, passwordHash, verifyToken, verifyTokenExpires]
      );
    } catch (err: unknown) {
      // ER_DUP_ENTRY dari UNIQUE(email) — race condition dua request register
      // bersamaan, atau memang sudah terdaftar. Baik dari OAuth maupun manual.
      if ((err as any)?.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Email is already registered.' });
      }
      throw err;
    }

    const origin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
    const verifyUrl = `${origin}/api/verify-email?token=${verifyToken}&uid=${uid}`;

    try {
      await sendVerificationEmail(email, verifyUrl);
    } catch (err) {
      safeLogError('[register] gagal kirim email verifikasi:', err);
      return res.status(201).json({
        ok: true,
        warning: 'Akun dibuat, tapi email verifikasi gagal terkirim. Hubungi admin.',
      });
    }

    return res.status(201).json({ ok: true });
  } catch (err: unknown) {
    safeLogError('[register] handler error:', err);
    return res.status(500).json({ error: (err as Error)?.message || 'Internal server error.' });
  }
}
