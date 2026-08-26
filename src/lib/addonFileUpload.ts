export const MAX_ADDON_FILE_BYTES = 200 * 1024 * 1024;
export const ALLOWED_ADDON_EXTENSIONS = ['.mcaddon', '.mcpack', '.mcworld', '.mctemplate', '.zip', '.jar'];
export const ADDON_FILE_ACCEPT = ALLOWED_ADDON_EXTENSIONS.join(',');

export function hasAllowedExtension(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return ALLOWED_ADDON_EXTENSIONS.some(ext => lower.endsWith(ext));
}

/**
 * Cloudinary assigns a random public_id to signed uploads unless one is
 * explicitly signed server-side. Rather than requiring a backend change,
 * we tag the delivery URL with Cloudinary's `fl_attachment:<name>` flag so
 * the browser downloads the file using a clean, human-readable filename
 * instead of the random Cloudinary id. This only affects how the file is
 * delivered/downloaded — it doesn't require re-signing the upload.
 */
function withAttachmentFilename(secureUrl: string, desiredFileName: string): string {
  const uploadMarker = '/upload/';
  const markerIndex = secureUrl.indexOf(uploadMarker);
  if (markerIndex === -1) return secureUrl;

  const baseName = desiredFileName.replace(/\.[^./]+$/, '');
  const safeName = baseName
    .replace(/[^a-zA-Z0-9 _-]/g, '_')
    .trim()
    .slice(0, 100) || 'download';

  const insertAt = markerIndex + uploadMarker.length;
  return `${secureUrl.slice(0, insertAt)}fl_attachment:${encodeURIComponent(safeName)}/${secureUrl.slice(insertAt)}`;
}

/**
 * Uploads a Minecraft add-on release file (.mcaddon/.zip/etc.) to Cloudinary
 * and returns a download URL that keeps a clean, readable filename.
 *
 * @param preferredName Name to use for the file on download (e.g. the
 *   project title). Falls back to the raw uploaded file's name if omitted —
 *   export tools often give files generic/auto-generated names that aren't
 *   meaningful to end users.
 */
export function uploadAddonFile(file: File, onProgress: (pct: number) => void, preferredName?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!hasAllowedExtension(file.name)) {
      reject(new Error(`Unsupported file type. Allowed: ${ALLOWED_ADDON_EXTENSIONS.join(', ')}`));
      return;
    }
    if (file.size > MAX_ADDON_FILE_BYTES) {
      reject(new Error('File is too large (max 200MB).'));
      return;
    }

    fetch('/api/upload-image?type=sign', { method: 'POST', credentials: 'include' })
      .then(async signRes => {
        const signData = await signRes.json();
        if (!signRes.ok) throw new Error(signData?.error || 'Failed to prepare upload.');
        return signData as { cloudName: string; apiKey: string; timestamp: number; folder: string; signature: string };
      })
      .then(({ cloudName, apiKey, timestamp, folder, signature }) => {
        const body = new FormData();
        body.append('file', file);
        body.append('api_key', apiKey);
        body.append('timestamp', String(timestamp));
        body.append('folder', folder);
        body.append('signature', signature);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`);

        xhr.upload.onprogress = event => {
          if (event.lengthComputable) onProgress((event.loaded / event.total) * 100);
        };

        xhr.onload = () => {
          try {
            const res = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300 && res?.secure_url) {
              resolve(withAttachmentFilename(res.secure_url as string, preferredName?.trim() || file.name));
            } else {
              reject(new Error(res?.error?.message || 'Upload failed, please try again.'));
            }
          } catch {
            reject(new Error('Upload failed, please try again.'));
          }
        };

        xhr.onerror = () => reject(new Error('Could not connect to the file host. Please try again.'));
        xhr.send(body);
      })
      .catch(reject);
  });
}