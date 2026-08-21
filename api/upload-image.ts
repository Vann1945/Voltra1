import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import ImageKit from 'imagekit';
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

function getImageKitClient(): ImageKit | null {
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const privateKey = getEncryptedEnv('IMAGEKIT_PRIVATE_KEY_ENC', 'IMAGEKIT_PRIVATE_KEY');
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;
  if (!publicKey || !privateKey || !urlEndpoint) return null;
  return new ImageKit({ publicKey, privateKey, urlEndpoint });
}

async function handleUploadSign(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req);

  const allowed = await checkRateLimit(`upload-sign:${user.uid}`, 20, 60_000);
  if (!allowed) {
    return res.status(429).json({ error: 'Too many upload requests. Please try again shortly.' });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = getEncryptedEnv('CLOUDINARY_API_SECRET_ENC', 'CLOUDINARY_API_SECRET');
  if (!cloudName || !apiKey || !apiSecret) {
    console.error('[api/upload-image sign] Cloudinary server credentials belum diset.');
    return res.status(503).json({ error: 'File hosting is not configured on the server.' });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `addons/${user.uid}`;

  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash('sha1')
    .update(paramsToSign + apiSecret)
    .digest('hex');

  return res.status(200).json({ cloudName, apiKey, timestamp, folder, signature });
}

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

  const imagekit = getImageKitClient();
  if (!imagekit) {
    console.error('[api/upload-image] ImageKit server credentials belum diset.');
    return res.status(503).json({ error: 'File hosting is not configured on the server.' });
  }

  try {
    const result = await imagekit.upload({
      file: rawBase64,
      fileName: `img_${user.uid}_${Date.now()}.webp`,
      folder: `/addons/${user.uid}`,
      useUniqueFileName: true,
    });
    return res.status(200).json({ url: result.url, fileId: result.fileId });
  } catch (err) {
    console.error('[api/upload-image] ImageKit menolak upload', err);
    return res.status(502).json({ error: 'Image upload failed. Please try again.' });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const type = typeof req.query.type === 'string' ? req.query.type : undefined;

  try {
    if (type === 'sign') {
      return await handleUploadSign(req, res);
    }
    return await handleUploadImage(req, res);
  } catch (err: unknown) {
    safeLogError('[api/upload-image] error:', err);
    const status = (err as any)?.statusCode || 500;
    const label = type === 'sign' ? 'Failed to prepare upload.' : 'Failed to upload image.';
    return res.status(status).json({ error: status === 401 ? 'You must log in.' : label });
  }
}
