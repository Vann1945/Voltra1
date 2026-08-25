import ImageKit from 'imagekit';
import { getEncryptedEnv } from '@/lib/secretsEncryption';
import { safeLogError } from '@/lib/safeLog';

let cachedClient: ImageKit | null | undefined;

export function getImageKitClient(): ImageKit | null {
  if (cachedClient !== undefined) return cachedClient;

  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const privateKey = getEncryptedEnv('IMAGEKIT_PRIVATE_KEY_ENC', 'IMAGEKIT_PRIVATE_KEY');
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;

  cachedClient = (!publicKey || !privateKey || !urlEndpoint)
    ? null
    : new ImageKit({ publicKey, privateKey, urlEndpoint });

  return cachedClient;
}

export function slugifyForImageKit(input: string): string {
  const cleaned = (input || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\\/?%*:|"<>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
    .trim();
  return cleaned || 'untitled';
}

export function userFolderPath(displayName: string): string {
  return `/users/${slugifyForImageKit(displayName)}`;
}

export function addonFolderPath(title: string): string {
  return `/add-ons/${slugifyForImageKit(title)}`;
}

export async function deleteImageKitFolder(folderPath: string): Promise<void> {
  const imagekit = getImageKitClient();
  if (!imagekit) return;

  try {
    await imagekit.deleteFolder(folderPath);
  } catch (err: any) {
    const status = err?.statusCode || err?.$ResponseMetadata?.statusCode;
    if (status !== 404) {
      safeLogError(`[imageKitFolders] Failed to delete folder ${folderPath}:`, err);
    }
  }
}
