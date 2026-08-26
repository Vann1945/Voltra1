export const MAX_ADDON_FILE_BYTES = 200 * 1024 * 1024;
export const ALLOWED_ADDON_EXTENSIONS = ['.mcaddon', '.mcpack', '.mcworld', '.mctemplate', '.zip', '.jar'];
export const ADDON_FILE_ACCEPT = ALLOWED_ADDON_EXTENSIONS.join(',');

export function hasAllowedExtension(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return ALLOWED_ADDON_EXTENSIONS.some(ext => lower.endsWith(ext));
}

function withAttachmentFilename(secureUrl: string, desiredFileName: string): string {
  const uploadMarker = '/upload/';
  const markerIndex = secureUrl.indexOf(uploadMarker);
  if (markerIndex === -1) return secureUrl;
  const baseName = desiredFileName.replace(/\.[^./]+$/, '');
  const safeName = baseName.replace(/[^a-zA-Z0-9 _-]/g, '_').trim().slice(0, 100) || 'download';
  const insertAt = markerIndex + uploadMarker.length;
  return `${secureUrl.slice(0, insertAt)}fl_attachment:${encodeURIComponent(safeName)}/${secureUrl.slice(insertAt)}`;
}

interface CloudinarySignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
}

async function getCloudinarySignature(): Promise<CloudinarySignature> {
  const signRes = await fetch('/api/upload-image?type=sign', {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  const signData = await signRes.json().catch(() => ({}));
  if (!signRes.ok) throw new Error(signData?.error || `Failed to prepare file upload (${signRes.status}).`);
  if (!signData?.cloudName || !signData?.apiKey || !signData?.timestamp || !signData?.signature) {
    throw new Error('File hosting returned incomplete upload credentials. Please try again.');
  }
  return signData as CloudinarySignature;
}

/** Uploads release files directly to Cloudinary after a server-side signature. */
export async function uploadAddonFile(file: File, onProgress: (pct: number) => void, preferredName?: string): Promise<string> {
  if (!file || file.size === 0) throw new Error('The selected file is empty. Please choose it again.');
  if (!hasAllowedExtension(file.name)) throw new Error(`Unsupported file type. Allowed: ${ALLOWED_ADDON_EXTENSIONS.join(', ')}`);
  if (file.size > MAX_ADDON_FILE_BYTES) throw new Error('File is too large (max 200MB).');

  const { cloudName, apiKey, timestamp, folder, signature } = await getCloudinarySignature();
  return new Promise((resolve, reject) => {
    const body = new FormData();
    body.append('file', file, file.name);
    body.append('api_key', apiKey);
    body.append('timestamp', String(timestamp));
    body.append('folder', folder);
    body.append('signature', signature);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`);
    xhr.timeout = 180_000;
    xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress((event.loaded / event.total) * 100); };
    xhr.onload = () => {
      const response = (() => { try { return JSON.parse(xhr.responseText); } catch { return null; } })();
      if (xhr.status >= 200 && xhr.status < 300 && response?.secure_url) {
        onProgress(100);
        resolve(withAttachmentFilename(response.secure_url as string, preferredName?.trim() || file.name));
        return;
      }
      reject(new Error(response?.error?.message || `File upload failed (${xhr.status || 'network'}).`));
    };
    xhr.onerror = () => reject(new Error('Could not connect to Cloudinary. Check your connection and try again.'));
    xhr.ontimeout = () => reject(new Error('File upload timed out. Please retry on a stable connection.'));
    xhr.onabort = () => reject(new Error('File upload was cancelled.'));
    xhr.send(body);
  });
}
