import crypto from 'crypto';

/**
 * Bandingkan dua token/secret dengan waktu konstan (constant-time
 * comparison), bukan `===`/`!==` biasa. Perbandingan string biasa berhenti
 * di karakter pertama yang beda, jadi waktu eksekusinya sedikit lebih
 * cepat untuk token yang "lebih salah" (beda di karakter awal) dibanding
 * yang "hampir benar" (beda di karakter akhir) — celah ini secara teori
 * bisa dipakai penyerang untuk menebak token verifikasi email / reset
 * password karakter demi karakter lewat pengukuran waktu respons berulang
 * kali (timing attack).
 *
 * Dipakai khusus untuk token sensitif (reset password, verifikasi email)
 * yang dibandingkan dari input request, BUKAN untuk perbandingan string
 * biasa yang tidak berkaitan dengan keamanan.
 */
export function timingSafeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  // crypto.timingSafeEqual mewajibkan panjang buffer sama, jadi kalau beda
  // panjang kita tetap harus jalanin perbandingan "dummy" dengan durasi
  // serupa alih-alih langsung return false (yang juga bisa jadi sinyal
  // waktu) — bandingkan ke buffer dirinya sendiri sebagai padding netral.
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}
