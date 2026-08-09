import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from '../src/lib/apiAuth.js';
import { checkRateLimit } from '../src/lib/rateLimit.js';
import { safeLogError } from '../src/lib/safeLog.js';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
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
  } catch (err: any) {
    safeLogError('[api/upload-image] error:', err);
    const status = err?.statusCode || 500;
    return res.status(status).json({ error: status === 401 ? 'You must log in.' : 'Failed to upload image.' });
  }
}
