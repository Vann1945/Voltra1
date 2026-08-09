/**
 * Script bantuan untuk mengenkripsi secret sebelum dimasukkan ke Vercel
 * sebagai env var terenkripsi (lapisan kedua, lihat src/lib/secretsEncryption.ts).
 *
 * CARA PAKAI:
 *
 *   1) Generate kunci master (SEKALI SAJA, simpan baik-baik):
 *      node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 *      -> simpan sebagai env var ENCRYPTION_MASTER_KEY di Vercel project settings.
 *
 *   2) Set kunci itu juga di terminal lokal Anda sementara (untuk enkripsi):
 *      export ENCRYPTION_MASTER_KEY="<hasil langkah 1>"
 *
 *   3) Enkripsi tiap secret yang mau dilindungi lapis kedua:
 *      npx tsx scripts/encrypt-secret.ts "nilai-password-asli-anda"
 *
 *   4) Salin output "v1:...." ke Vercel sebagai env var baru, misalnya:
 *      TIDB_PASSWORD_ENC = v1:AbCd...==:EfGh...==:IjKl...==
 *
 *   5) Update kode yang membaca secret itu untuk pakai getEncryptedEnv()
 *      alih-alih process.env langsung (lihat contoh di src/lib/db.ts).
 *
 * JANGAN commit hasil enkripsi mentah maupun ENCRYPTION_MASTER_KEY ke git.
 */
import { encryptSecret } from '../src/lib/secretsEncryption.js';

const plaintext = process.argv[2];

if (!plaintext) {
  console.error('Pemakaian: npx tsx scripts/encrypt-secret.ts "<nilai-secret-yang-mau-dienkripsi>"');
  process.exit(1);
}

try {
  const encrypted = encryptSecret(plaintext);
  console.log('\nHasil terenkripsi (simpan sebagai env var baru di Vercel):\n');
  console.log(encrypted);
  console.log('');
} catch (err) {
  console.error('Gagal enkripsi:', err instanceof Error ? err.message : err);
  process.exit(1);
}
