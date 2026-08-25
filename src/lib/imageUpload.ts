export type ImageUploadContext = 'avatar' | 'addon';

interface ImageKitSignResponse {
  token: string;
  expire: number;
  signature: string;
  publicKey: string;
  urlEndpoint: string;
  folder: string;
}

async function getImageKitSignParams(context: ImageUploadContext, folderName?: string): Promise<ImageKitSignResponse> {
  const res = await fetch('/api/upload-image?type=imagekit-sign', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context, folderName }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to prepare upload.');
  return data as ImageKitSignResponse;
}

export function uploadImageToImageKit(
  file: File,
  context: ImageUploadContext,
  folderName?: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  return getImageKitSignParams(context, folderName).then(({ token, expire, signature, publicKey, folder }) => {
    return new Promise<string>((resolve, reject) => {
      const body = new FormData();
      body.append('file', file);
      body.append('fileName', `img_${Date.now()}.webp`);
      body.append('folder', folder);
      body.append('useUniqueFileName', 'true');
      body.append('publicKey', publicKey);
      body.append('signature', signature);
      body.append('expire', String(expire));
      body.append('token', token);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://upload.imagekit.io/api/v1/files/upload');

      xhr.upload.onprogress = event => {
        if (event.lengthComputable && onProgress) onProgress((event.loaded / event.total) * 100);
      };

      xhr.onload = () => {
        try {
          const res = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && res?.url) {
            resolve(res.url as string);
          } else {
            reject(new Error(res?.message || 'Upload failed, please try again.'));
          }
        } catch {
          reject(new Error('Upload failed, please try again.'));
        }
      };

      xhr.onerror = () => reject(new Error('Could not connect to the image host. Please try again.'));
      xhr.send(body);
    });
  });
}
