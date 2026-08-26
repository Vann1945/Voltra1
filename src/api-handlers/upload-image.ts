import type { MinimalVercelRequest as VercelRequest, MinimalVercelResponse as VercelResponse } from '@/lib/vercelAdapter';
import crypto from 'crypto';
import { requireUser } from '@/lib/apiAuth';
import { checkRateLimit } from '@/lib/rateLimit';
import { safeLogError } from '@/lib/safeLog';
import { getEncryptedEnv } from '@/lib/secretsEncryption';
import { getImageKitClient, userFolderPath, addonFolderPath } from '@/lib/imageKitFolders';

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

/**
 * Sign params untuk upload LANGSUNG dari browser ke ImageKit (tanpa lewat
 * server kita sebagai proxy). Ini menghindari hard limit ukuran body request
 * di Vercel Serverless/Route Handler (~4.5MB, tidak bisa dikonfigurasi untuk
 * Route Handler) yang sebelumnya bikin upload gambar berkualitas
 * tinggi/cover image gagal diam-diam: gambar webp ~4MB di-base64 jadi ~5.3MB
 * lalu dibungkus JSON, lewat dari limit Vercel sebelum sempat sampai ke kode
 * handler ini sama sekali.
 *
 * Folder tujuan tetap ditentukan di server (bukan dikirim client) supaya
 * client tidak bisa menyuruh ImageKit menyimpan file di folder sembarangan.
 */
async function handleImageKitSign(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req);

  const allowed = await checkRateLimit(`upload-sign:${user.uid}`, 20, 60_000);
  if (!allowed) {
    return res.status(429).json({ error: 'Too many upload requests. Please try again shortly.' });
  }

  const imagekit = getImageKitClient();
  if (!imagekit) {
    console.error('[api/upload-image imagekit-sign] ImageKit server credentials belum diset.');
    return res.status(503).json({ error: 'File hosting is not configured on the server.' });
  }

  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;
  if (!publicKey || !urlEndpoint) {
    console.error('[api/upload-image imagekit-sign] IMAGEKIT_PUBLIC_KEY/IMAGEKIT_URL_ENDPOINT belum diset.');
    return res.status(503).json({ error: 'File hosting is not configured on the server.' });
  }

  const { context, folderName } = req.body || {};
  const safeContext = context === 'avatar' ? 'avatar' : 'addon';
  const safeFolderName = typeof folderName === 'string' && folderName.trim() ? folderName.trim() : (user.name || user.uid);
  const folder = safeContext === 'avatar' ? userFolderPath(safeFolderName) : addonFolderPath(safeFolderName);

  // Token unik per request supaya signature tidak bisa dipakai ulang untuk
  // upload lain (ImageKit menolak token yang sudah pernah dipakai).
  const token = crypto.randomUUID();
  const { signature, expire } = imagekit.getAuthenticationParameters(token);

  return res.status(200).json({ token, expire, signature, publicKey, urlEndpoint, folder });
}

async function handleUploadImage(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req);

  const allowed = await checkRateLimit(`upload-image:${user.uid}`, 30, 60_000);
  if (!allowed) {
    return res.status(429).json({ error: 'Too many image uploads. Please try again shortly.' });
  }

  const { imageBase64, context, folderName } = req.body || {};
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

  // Folder ditentukan dari context + folderName yang dikirim client:
  //  - context "avatar" -> /users/<nama>      (folderName = display name user)
  //  - context "addon"  -> /add-ons/<judul>   (folderName = judul add-on)
  // Fallback ke folder lama kalau client belum kirim context (jaga-jaga).
  const safeContext = context === 'avatar' ? 'avatar' : 'addon';
  const safeFolderName = typeof folderName === 'string' && folderName.trim() ? folderName.trim() : (user.name || user.uid);
  const folder = safeContext === 'avatar' ? userFolderPath(safeFolderName) : addonFolderPath(safeFolderName);

  try {
    const result = await imagekit.upload({
      file: rawBase64,
      fileName: `img_${Date.now()}.webp`,
      folder,
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
    if (type === 'imagekit-sign') {
      return await handleImageKitSign(req, res);
    }
    return await handleUploadImage(req, res);
  } catch (err: any) {
    safeLogError('[api/upload-image] error:', err);
    const status = err?.statusCode || 500;
    const label = type === 'sign' || type === 'imagekit-sign' ? 'Failed to prepare upload.' : 'Failed to upload image.';
    return res.status(status).json({ error: status === 401 ? 'You must log in.' : label });
  }
}
