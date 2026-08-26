import ImageKit from 'imagekit';
import { getEncryptedEnv } from '@/lib/secretsEncryption';
import { safeLogError } from '@/lib/safeLog';

/**
 * Struktur folder ImageKit:
 *   /users/<nama-user>/...      -> foto profil
 *   /add-ons/<judul-addon>/...  -> cover, gambar deskripsi, dsb.
 *
 * Folder dinamai pakai NAMA (bukan uid/id) sesuai permintaan. Konsekuensinya:
 * kalau ada 2 user/addon dengan nama persis sama, mereka berbagi folder yang
 * sama di ImageKit (gambarnya tetap terpisah karena nama file di-random per
 * upload, tapi hapus folder saat rename/delete bisa memengaruhi keduanya).
 * Kalau ini jadi masalah nyata, solusinya nanti tambahin suffix id pendek.
 */

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

/**
 * Bersihin nama supaya aman dipakai sebagai folder path di ImageKit.
 *
 * ImageKit menolak request upload dengan error "invalid value for folder
 * parameter" kalau folder-nya mengandung spasi atau karakter selain
 * huruf/angka/strip/underscore/titik. Nama user & judul add-on (sumber
 * folder ini) hampir pasti mengandung spasi ("Void Orbit", dll), jadi semua
 * karakter di luar whitelist itu diganti jadi "-" (bukan sekadar dibuang),
 * supaya kata-katanya tetap kebaca di nama foldernya.
 */
export function slugifyForImageKit(input: string): string {
  const cleaned = (input || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')   // buang diakritik (é -> e, dst.)
    .replace(/[^a-zA-Z0-9._-]+/g, '-') // apa pun selain whitelist -> "-" (termasuk spasi)
    .replace(/-{2,}/g, '-')            // rapikan strip beruntun jadi satu
    .replace(/^[-.]+|[-.]+$/g, '')     // buang strip/titik di awal & akhir
    .slice(0, 80)
    .replace(/^[-.]+|[-.]+$/g, '');    // jaga-jaga kalau slice motong pas di strip/titik
  return cleaned || 'untitled';
}

export function userFolderPath(displayName: string): string {
  return `/users/${slugifyForImageKit(displayName)}`;
}

export function addonFolderPath(title: string): string {
  return `/add-ons/${slugifyForImageKit(title)}`;
}

/**
 * Hapus folder ImageKit beserta seluruh isinya. Dipakai saat:
 * - nama user berubah (folder lama dihapus, upload berikutnya bikin folder baru)
 * - judul add-on berubah (folder lama dihapus)
 * - add-on dihapus (folder & semua gambar di dalamnya ikut terhapus)
 *
 * Aman dipanggil meski foldernya belum pernah ada (mis. user/addon belum
 * pernah upload gambar) — error 404 dari ImageKit di-diamkan.
 */
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
