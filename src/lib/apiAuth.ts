import type { VercelRequest } from '@vercel/node';
import { safeLogError } from './safeLog.js';
// Catatan: @auth/core/jwt ditandai "akan direfactor" oleh upstream, tapi ini
// tetap API resmi yang didokumentasikan untuk baca session JWT secara
// in-process tanpa DB — dan jauh lebih cepat daripada self-fetch HTTP yang
// dipakai sebelumnya. Kalau suatu saat upgrade @auth/core menyebabkan modul
// ini berubah signature, cek changelog @auth/core untuk migrasi getToken().
import { getToken } from '@auth/core/jwt';
import { getEncryptedEnv } from './secretsEncryption.js';

export type SessionUser = { uid: string; email: string; name: string; image?: string; role?: string };

/**
 * PENTING untuk performa: sebelumnya fungsi ini melakukan HTTP fetch ke
 * /api/auth/session — yaitu memanggil serverless function LAIN hanya untuk
 * membaca siapa yang login. Di Vercel, itu berarti setiap request API yang
 * butuh login berpotensi memicu cold-start function terpisah + 1 request
 * jaringan ekstra, di atas apa yang sebenarnya dibutuhkan endpoint itu
 * sendiri. Saat traffic tinggi, ini melipatgandakan jumlah invocation
 * serverless & titik gagal secara tidak perlu — salah satu penyebab
 * permintaan terasa macet saat ramai.
 *
 * Sekarang token sesi (JWT terenkripsi di cookie) langsung didekode di
 * dalam proses yang sama pakai getToken() dari @auth/core, tanpa keluar
 * lewat jaringan sama sekali. Hasilnya identik (cookie yang sama, secret
 * yang sama), tapi jauh lebih cepat dan tidak menambah beban invocation.
 */
export async function getSessionUser(req: VercelRequest): Promise<SessionUser | null> {
  const cookie = req.headers.cookie;
  if (!cookie) return null;

  try {
    const headers = new Headers();
    headers.set('cookie', cookie);

    // Auth.js menentukan nama cookie sesi (__Secure-... atau polos) berdasarkan
    // apakah request datang lewat https — bukan NODE_ENV. Kita cocokkan logika
    // yang persis sama seperti yang dipakai server Auth.js sendiri di api/auth.ts,
    // supaya getToken() mencari nama cookie yang benar-benar sama dengan yang
    // di-set saat login.
    const protocol = (req.headers['x-forwarded-proto'] as string) || 'https';
    const secureCookie = protocol === 'https';

    const token = await getToken({
      req: { headers },
      // Harus persis sama dengan cara auth.config.ts membaca AUTH_SECRET
      // (lewat lapisan enkripsi kedua) — kalau tidak cocok, token tidak akan
      // pernah berhasil didekode meski cookie-nya valid.
      secret: getEncryptedEnv('AUTH_SECRET_ENC', 'AUTH_SECRET'),
      secureCookie,
    });

    if (!token?.uid) return null;

    return {
      uid: token.uid as string,
      email: (token.email as string) || '',
      name: (token.name as string) || '',
      image: (token.picture as string) || undefined,
      role: (token.role as string) || undefined,
    };
  } catch (err) {
    safeLogError('[apiAuth] gagal decode session token:', err);
    return null;
  }
}

export async function requireUser(req: VercelRequest): Promise<SessionUser> {
  const user = await getSessionUser(req);
  if (!user) {
    const err: any = new Error('UNAUTHENTICATED');
    err.statusCode = 401;
    throw err;
  }
  return user;
}

export async function requireAdmin(req: VercelRequest): Promise<SessionUser> {
  const user = await requireUser(req);
  if (user.role !== 'admin') {
    const err: any = new Error('FORBIDDEN');
    err.statusCode = 403;
    throw err;
  }
  return user;
}
