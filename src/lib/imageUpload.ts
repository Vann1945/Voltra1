export type ImageUploadContext = 'avatar' | 'addon';

interface ImageKitSignResponse {
  token: string;
  expire: number;
  signature: string;
  publicKey: string;
  urlEndpoint: string;
  folder: string;
}

function extensionForFile(file: File): string {
  const typeExtension: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
  };
  return typeExtension[file.type] || file.name.split('.').pop()?.toLowerCase() || 'bin';
}

async function getImageKitSignParams(context: ImageUploadContext, folderName?: string): Promise<ImageKitSignResponse> {
  const res = await fetch('/api/upload-image?type=imagekit-sign', {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ context, folderName }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Failed to prepare image upload (${res.status}).`);
  if (!data?.token || !data?.signature || !data?.publicKey || !data?.folder) {
    throw new Error('Image hosting returned incomplete upload credentials. Please try again.');
  }
  return data as ImageKitSignResponse;
}

function uploadToImageKit(file: File, params: ImageKitSignResponse, onProgress?: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const body = new FormData();
    const extension = extensionForFile(file);
    body.append('file', file, file.name || `image.${extension}`);
    body.append('fileName', `img_${Date.now()}.${extension}`);
    body.append('folder', params.folder);
    body.append('useUniqueFileName', 'true');
    body.append('publicKey', params.publicKey);
    body.append('signature', params.signature);
    body.append('expire', String(params.expire));
    body.append('token', params.token);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://upload.imagekit.io/api/v1/files/upload');
    xhr.timeout = 120_000;

    xhr.upload.onprogress = event => {
      if (event.lengthComputable) onProgress?.((event.loaded / event.total) * 100);
    };

    xhr.onload = () => {
      const response = (() => {
        try { return JSON.parse(xhr.responseText); } catch { return null; }
      })();
      if (xhr.status >= 200 && xhr.status < 300 && response?.url) {
        onProgress?.(100);
        resolve(response.url as string);
        return;
      }
      const message = response?.message || response?.error || `Image upload failed (${xhr.status || 'network'}).`;
      reject(new Error(message));
    };

    xhr.onerror = () => reject(new Error('Could not connect to ImageKit. Check your connection and try again.'));
    xhr.ontimeout = () => reject(new Error('Image upload timed out. Please retry on a stable connection.'));
    xhr.onabort = () => reject(new Error('Image upload was cancelled.'));
    xhr.send(body);
  });
}

/** Upload one image directly to ImageKit after the server signs the request. */
export async function uploadImageToImageKit(
  file: File,
  context: ImageUploadContext,
  folderName?: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  if (!file || file.size === 0) throw new Error('The selected image is empty. Please choose it again.');
  if (!file.type.startsWith('image/')) throw new Error('Please choose a valid image file.');
  const params = await getImageKitSignParams(context, folderName);
  return uploadToImageKit(file, params, onProgress);
}
