/**
 * Upload gambar LANGSUNG dari browser ke ImageKit (bukan lewat server kita).
 *
 * Kenapa: sebelumnya semua upload gambar (avatar, cover add-on, gambar di
 * description editor) di-base64-kan lalu dikirim sebagai JSON body ke API
 * route kita, yang jadi proxy ke ImageKit. Vercel Route Handler punya hard
 * limit ukuran body request (~4.5MB, tidak bisa dikonfigurasi via
 * next.config), sementara gambar webp hasil kompresi bisa sampai ~4MB —
 * setelah di-base64 (+33%) jadi ~5.3MB dan lewat dari limit Vercel SEBELUM
 * request sampai ke kode kita. Hasilnya: upload gagal tanpa pesan error yang
 * jelas dari aplikasi kita sendiri.
 *
 * Fix-nya: server hanya menandatangani (sign) request upload — file-nya
 * sendiri dikirim langsung dari browser ke ImageKit sebagai multipart, jadi
 * tidak pernah lewat body-size limit server kita sama sekali. Pola ini sama
 * seperti upload file add-on ke Cloudinary di `addonFileUpload.ts`.
 */

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

/**
 * Upload satu file gambar ke ImageKit dan mengembalikan URL publiknya.
 *
 * @param file File gambar (idealnya sudah dikompres/convert ke webp di
 *   pemanggil, seperti sebelumnya — helper ini tidak melakukan kompresi).
 * @param context "avatar" untuk foto profil, "addon" untuk cover/gambar add-on.
 * @param folderName Nama yang dipakai untuk membentuk folder ImageKit
 *   (nama user untuk avatar, judul add-on untuk cover). Folder tetap
 *   divalidasi & dibentuk di server, bukan dipercaya mentah dari client.
 * @param onProgress Callback progress 0-100 (opsional).
 */
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
      // Endpoint upload ImageKit selalu domain ini, terlepas dari urlEndpoint
      // (yang dipakai untuk sisi delivery/pembacaan gambar, bukan upload).
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
