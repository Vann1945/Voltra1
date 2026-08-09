import crypto from 'crypto';

/**
 * ===========================================================================
 * ENKRIPSI API KEY BERLAPIS (application-level secret encryption)
 * ===========================================================================
 *
 * KONTEKS: semua secret di aplikasi ini sudah disimpan sebagai environment
 * variable di Vercel, yang SUDAH dienkripsi Vercel saat disimpan (at rest)
 * dan dikirim lewat TLS ke runtime. Itu LAPISAN PERTAMA, dan sudah cukup
 * kuat untuk kebanyakan ancaman.
 *
 * Modul ini menambahkan LAPISAN KEDUA yang independen: secret-secret paling
 * sensitif (password database, password SMTP, API secret pihak ketiga)
 * disimpan dalam bentuk TERENKRIPSI di dalam env var itu sendiri (bukan
 * plaintext), dan baru didekripsi DI MEMORI, tepat saat mau dipakai, pakai
 * kunci master terpisah (ENCRYPTION_MASTER_KEY).
 *
 * KENAPA INI MENAMBAH KEAMANAN NYATA (bukan sekadar teater keamanan):
 * - Kalau suatu saat ada kebocoran yang HANYA mengekspos env var apa adanya
 *   (misal: dependency pihak ketiga yang nakal membaca process.env dan
 *   mengirimkannya keluar, kesalahan konfigurasi yang menampilkan env var
 *   di UI/log, atau akses tidak sah ke dashboard Vercel oleh pihak yang
 *   TIDAK punya ENCRYPTION_MASTER_KEY terpisah) — penyerang mendapat
 *   ciphertext yang tidak berguna tanpa kunci master.
 * - Kunci master (ENCRYPTION_MASTER_KEY) disimpan terpisah dari
 *   secret-secret yang dienkripsinya, dan TIDAK PERNAH dipakai untuk hal
 *   lain — mengurangi jejak/exposure-nya dibanding kalau semua secret
 *   dibaca langsung dari process.env di banyak tempat kode.
 * - AES-256-GCM adalah authenticated encryption: kalau ciphertext diubah
 *   (rusak/dipalsukan) dekripsi akan GAGAL dengan tegas, bukan diam-diam
 *   menghasilkan data salah — melindungi dari tampering, bukan cuma dari
 *   pembacaan.
 *
 * CARA PAKAI:
 * 1. Generate kunci master sekali: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 *    Simpan sebagai env var ENCRYPTION_MASTER_KEY di Vercel (JANGAN pernah
 *    commit ke git).
 * 2. Enkripsi secret yang mau dilindungi lapis kedua ini pakai encryptSecret()
 *    sekali (lihat scripts/encrypt-secret.ts), simpan hasilnya (format
 *    "v1:...") sebagai env var pengganti (mis. TIDB_PASSWORD_ENC alih-alih
 *    TIDB_PASSWORD polos).
 * 3. Di kode, baca lewat getEncryptedEnv('TIDB_PASSWORD_ENC') alih-alih
 *    process.env.TIDB_PASSWORD langsung.
 *
 * CATATAN PENTING: ini defense-in-depth TAMBAHAN, bukan pengganti praktik
 * dasar (rotasi key berkala, least-privilege access, jangan commit secret).
 * Kalau ENCRYPTION_MASTER_KEY sendiri bocor bersama ciphertext-nya, lapisan
 * ini tidak menolong — makanya kunci master harus dikelola paling ketat
 * (idealnya lewat Vercel's encrypted env, akses terbatas ke tim inti saja).
 * ===========================================================================
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV standar untuk GCM
const AUTH_TAG_LENGTH = 16;
const FORMAT_VERSION = 'v1';

function getMasterKey(): Buffer {
  const raw = process.env.ENCRYPTION_MASTER_KEY;
  if (!raw) {
    throw new Error(
      'ENCRYPTION_MASTER_KEY belum diset. Generate dengan: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
    );
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_MASTER_KEY harus 32 byte (256-bit) dalam base64.');
  }
  return key;
}

/**
 * Enkripsi satu nilai secret. Hasilnya string aman untuk disimpan sebagai
 * env var: "v1:<iv-base64>:<authTag-base64>:<ciphertext-base64>".
 */
export function encryptSecret(plaintext: string): string {
  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [FORMAT_VERSION, iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join(':');
}

/**
 * Dekripsi nilai yang dihasilkan encryptSecret(). Melempar error kalau
 * format tidak dikenali atau authTag tidak cocok (tanda ciphertext rusak/
 * dipalsukan) — sengaja fail loudly, bukan diam-diam mengembalikan data
 * yang salah.
 */
export function decryptSecret(encoded: string): string {
  const parts = encoded.split(':');
  if (parts.length !== 4 || parts[0] !== FORMAT_VERSION) {
    throw new Error('Format secret terenkripsi tidak dikenali.');
  }
  const [, ivB64, authTagB64, dataB64] = parts;
  const key = getMasterKey();
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}

// Cache in-memory per nama env var supaya tidak dekripsi berulang kali
// dalam satu invocation serverless yang sama (dekripsi tetap murah, tapi
// tidak ada alasan mengulang-ulang tanpa perlu).
const decryptedCache = new Map<string, string>();

/**
 * Baca env var yang nilainya TERENKRIPSI (format dari encryptSecret) dan
 * kembalikan versi plaintext-nya, di-cache di memori proses ini saja.
 *
 * FALLBACK AMAN: kalau env var terenkripsi (mis. `${envVarName}`) tidak
 * ada TAPI versi plaintext lama (`${envVarName replace _ENC}`) ada, dan
 * ENCRYPTION_MASTER_KEY belum dikonfigurasi — fungsi ini jatuh balik ke
 * nilai plaintext lama. Ini supaya migrasi bertahap ke enkripsi lapis kedua
 * tidak membuat aplikasi langsung mati kalau lapisan ini belum di-setup
 * penuh di suatu environment (mis. saat development lokal).
 */
export function getEncryptedEnv(encVarName: string, plainFallbackVarName?: string): string | undefined {
  if (decryptedCache.has(encVarName)) return decryptedCache.get(encVarName);

  const encValue = process.env[encVarName];
  if (encValue) {
    try {
      const plaintext = decryptSecret(encValue);
      decryptedCache.set(encVarName, plaintext);
      return plaintext;
    } catch (err) {
      console.error(`[secretsEncryption] Gagal dekripsi ${encVarName}:`, err instanceof Error ? err.message : err);
      // Sengaja TIDAK fallback diam-diam ke plaintext kalau ciphertext ADA
      // tapi gagal didekripsi — itu tanda ciphertext korup/salah kunci,
      // bukan situasi normal untuk fallback.
      return undefined;
    }
  }

  if (plainFallbackVarName) {
    return process.env[plainFallbackVarName];
  }
  return undefined;
}
