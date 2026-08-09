import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { requireUser } from '../src/lib/apiAuth.js';
import { checkRateLimit } from '../src/lib/rateLimit.js';
import { safeLogError } from '../src/lib/safeLog.js';
import { getEncryptedEnv } from '../src/lib/secretsEncryption.js';

// CATATAN: file ini menggabungkan DUA endpoint yang tadinya terpisah
// (upload-image.ts + upload-sign.ts) menjadi satu route Vercel, dipilah
// lewat query param `?type=`. Ini semata-mata untuk tetap di bawah batas
// 12 Serverless Functions milik plan Vercel Hobby — logika masing-masing
// TIDAK berubah sama sekali, hanya digabung dalam satu file/satu function.
// Kalau nanti upgrade ke plan yang limitnya lebih tinggi, boleh dipecah
// lagi jadi file terpisah tanpa mengubah perilaku apa pun.

const MAX_BASE64_LENGTH = 6_000_000;

// Magic bytes untuk memastikan konten yang dikirim benar-benar file gambar,
// bukan cuma base64 valid yang isinya file lain / script.
const IMAGE_SIGNATURES: { prefix: Buffer; name: string }[] = [
  { prefix: Buffer.from([0xff, 0xd8, 0xff]), name: 'jpeg' },
  { prefix: Buffer.from([0x89, 0x50, 0x4e, 0x47]), name: 'png' },
  { prefix: Buffer.from([0x47, 0x49, 0x46, 0x38]), name: 'gif' },
  { prefix: Buffer.from('RIFF'), name: 'webp (riff)' },
];

function looksLikeImage(buf: Buffer): boolean {
  return IMAGE_SIGNATURES.some(sig => buf.subarray(0, sig.prefix.length).equals(sig.prefix));
}

// ---------- ?type=sign : terbitkan signature upload Cloudinary ----------
// Endpoint ini TIDAK menyentuh file sama sekali — hanya menerbitkan tanda tangan
// (signature) sekali-pakai + berumur pendek yang mengizinkan browser upload
// LANGSUNG ke Cloudinary. Ini pola resmi Cloudinary untuk "signed upload":
// - Wajib login (requireUser) sebelum tanda tangan diterbitkan.
// - `timestamp` dan `folder` ikut ditandatangani, jadi tidak bisa dipakai ulang
//   di parameter lain atau setelah timestamp kedaluwarsa (Cloudinary menolak
//   signature yang timestamp-nya terlalu lama, default toleransi 1 jam).
// - CLOUDINARY_API_SECRET tidak pernah dikirim ke client — hanya hasil HMAC-nya.
async function handleUploadSign(req: VercelRequest, res: VercelResponse) {
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
    console.error('[api/upload-image sign] Cloudinary server credentials belum diset.');
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

  return res.status(200).json({ cloudName, apiKey, timestamp, folder, signature });
}

// ---------- default: upload gambar (base64) lewat ImgBB ----------
async function handleUploadImage(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req);

  const allowed = await checkRateLimit(`upload-image:${user.uid}`, 30, 60_000);
  if (!allowed) {
    return res.status(429).json({ error: 'Too many image uploads. Please try again shortly.' });
  }

  const { imageBase64 } = req.body || {};
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return res.status(400).json({ error: 'imageBase64 is required.' });
  }
  if (imageBase64.length > MAX_BASE64_LENGTH) {
    return res.status(413).json({ error: 'Image is too large (max ~4MB).' });
  }

  const rawBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
  if (!/^[A-Za-z0-9+/=]+$/.test(rawBase64)) {
    return res.status(400).json({ error: 'Invalid image format.' });
  }

  const decoded = Buffer.from(rawBase64, 'base64');
  if (!looksLikeImage(decoded)) {
    return res.status(400).json({ error: 'File yang diunggah bukan gambar yang valid.' });
  }

  const params = new URLSearchParams();
  params.set('key', process.env.IMGBB_API_KEY || '');
  params.set('image', rawBase64);

  const imgbbRes = await fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });
  const data = await imgbbRes.json();

  if (!imgbbRes.ok || !data?.data?.url) {
    console.error('[api/upload-image] ImgBB menolak upload');
    return res.status(502).json({ error: 'Image upload failed. Please try again.' });
  }

  return res.status(200).json({ url: data.data.url as string });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const type = typeof req.query.type === 'string' ? req.query.type : undefined;

  try {
    if (type === 'sign') {
      return await handleUploadSign(req, res);
    }
    return await handleUploadImage(req, res);
  } catch (err: any) {
    safeLogError('[api/upload-image] error:', err);
    const status = err?.statusCode || 500;
    const label = type === 'sign' ? 'Failed to prepare upload.' : 'Failed to upload image.';
    return res.status(status).json({ error: status === 401 ? 'You must log in.' : label });
  }
}
