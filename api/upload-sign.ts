import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { requireUser } from '../src/lib/apiAuth.js';
import { checkRateLimit } from '../src/lib/rateLimit.js';
import { safeLogError } from '../src/lib/safeLog.js';
import { getEncryptedEnv } from '../src/lib/secretsEncryption.js';

// Endpoint ini TIDAK menyentuh file sama sekali — hanya menerbitkan tanda tangan
// (signature) sekali-pakai + berumur pendek yang mengizinkan browser upload
// LANGSUNG ke Cloudinary. Ini pola resmi Cloudinary untuk "signed upload":
// - Wajib login (requireUser) sebelum tanda tangan diterbitkan.
// - `timestamp` dan `folder` ikut ditandatangani, jadi tidak bisa dipakai ulang
//   di parameter lain atau setelah timestamp kedaluwarsa (Cloudinary menolak
//   signature yang timestamp-nya terlalu lama, default toleransi 1 jam).
// - CLOUDINARY_API_SECRET tidak pernah dikirim ke client — hanya hasil HMAC-nya.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await requireUser(req);

    const allowed = await checkRateLimit(`upload-sign:${user.uid}`, 20, 60_000);
    if (!allowed) {
      return res.status(429).json({ error: 'Too many upload requests. Please try again shortly.' });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    // API secret Cloudinary dipakai untuk menandatangani izin upload — kalau
    // bocor, siapa pun bisa membuat signature valid sendiri dan upload atas
    // nama akun kita. Dibaca lewat lapisan enkripsi kedua.
    const apiSecret = getEncryptedEnv('CLOUDINARY_API_SECRET_ENC', 'CLOUDINARY_API_SECRET');
    if (!cloudName || !apiKey || !apiSecret) {
      console.error('[api/upload-sign] Cloudinary server credentials belum diset.');
      return res.status(503).json({ error: 'File hosting is not configured on the server.' });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `addons/${user.uid}`;

    // String yang ditandatangani harus persis mengikuti parameter yang akan dikirim
    // browser saat upload (selain file, api_key, dan signature itu sendiri).
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
    const signature = crypto
      .createHash('sha1')
      .update(paramsToSign + apiSecret)
      .digest('hex');

    return res.status(200).json({
      cloudName,
      apiKey,
      timestamp,
      folder,
      signature,
    });
  } catch (err: any) {
    safeLogError('[api/upload-sign] error:', err);
    const status = err?.statusCode || 500;
    return res.status(status).json({ error: status === 401 ? 'You must log in.' : 'Failed to prepare upload.' });
  }
}
