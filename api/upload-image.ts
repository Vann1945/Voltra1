import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { requireUser } from '../src/lib/apiAuth.js';
import { checkRateLimit } from '../src/lib/rateLimit.js';
import { safeLogError } from '../src/lib/safeLog.js';
import { getEncryptedEnv } from '../src/lib/secretsEncryption.js';

const MAX_BASE64_LENGTH = 6_000_000;
const IMAGE_SIGNATURES: { prefix: Buffer; name: string }[] = [
  { prefix: Buffer.from([0xff, 0xd8, 0xff]), name: 'jpeg' },
  { prefix: Buffer.from([0x89, 0x50, 0x4e, 0x47]), name: 'png' },
  { prefix: Buffer.from([0x47, 0x49, 0x46, 0x38]), name: 'gif' },
  { prefix: Buffer.from('RIFF'), name: 'webp (riff)' },
];

function looksLikeImage(buf: Buffer): boolean {
  return IMAGE_SIGNATURES.some(sig => buf.subarray(0, sig.prefix.length).equals(sig.prefix));
}

async function issueCloudinarySignature(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req);
  const allowed = await checkRateLimit(`upload-sign:${user.uid}`, 20, 60_000);
  if (!allowed) return res.status(429).json({ error: 'Too many upload requests. Please try again shortly.' });
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = getEncryptedEnv('CLOUDINARY_API_SECRET_ENC', 'CLOUDINARY_API_SECRET');
  if (!cloudName || !apiKey || !apiSecret) {
    console.error('[api/upload-sign] Cloudinary server credentials belum diset.');
    return res.status(503).json({ error: 'File hosting is not configured on the server.' });
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `addons/${user.uid}`;
  const signature = crypto.createHash('sha1').update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`).digest('hex');
  return res.status(200).json({ cloudName, apiKey, timestamp, folder, signature });
}

async function uploadImage(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req);
  const allowed = await checkRateLimit(`upload-image:${user.uid}`, 30, 60_000);
  if (!allowed) return res.status(429).json({ error: 'Too many image uploads. Please try again shortly.' });
  const { imageBase64 } = req.body || {};
  if (!imageBase64 || typeof imageBase64 !== 'string') return res.status(400).json({ error: 'imageBase64 is required.' });
  if (imageBase64.length > MAX_BASE64_LENGTH) return res.status(413).json({ error: 'Image is too large (max ~4MB).' });
  const rawBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
  if (!/^[A-Za-z0-9+/=]+$/.test(rawBase64)) return res.status(400).json({ error: 'Invalid image format.' });
  const decoded = Buffer.from(rawBase64, 'base64');
  if (!looksLikeImage(decoded)) return res.status(400).json({ error: 'File yang diunggah bukan gambar yang valid.' });
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
  try {
    const isSignatureRequest = req.url?.includes('/api/upload-sign');
    return isSignatureRequest ? await issueCloudinarySignature(req, res) : await uploadImage(req, res);
  } catch (err: any) {
    safeLogError('[api/upload-image] error:', err);
    const status = err?.statusCode || 500;
    return res.status(status).json({ error: status === 401 ? 'You must log in.' : 'Upload request failed.' });
  }
}
