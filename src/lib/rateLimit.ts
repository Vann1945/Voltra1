import { getPool } from './db.js';
import { safeLogError } from './safeLog.js';

/**
 * Rate limiter fixed-window sederhana yang disimpan di TiDB, bukan di memory.
 * Kenapa bukan in-memory Map? Karena tiap Vercel serverless function bisa
 * cold-start kapan saja dan counter di memory akan hilang / tidak konsisten
 * antar instance — jadi rate limit "bocor" begitu traffic naik atau function
 * di-recycle. Disimpan di DB supaya limitnya beneran ditegakkan.
 *
 * @param key      identitas unik bucket, misal `login:1.2.3.4` atau `upload:uid123`
 * @param limit    jumlah maksimum request yang diizinkan dalam window
 * @param windowMs lebar window dalam milidetik
 * @returns true jika request masih diizinkan, false jika sudah melebihi limit
 */
export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const now = Date.now();
  const pool = getPool();

  try {
    const [rows] = await pool.execute(
      'SELECT count, window_start FROM rate_limits WHERE bucket_key = ? LIMIT 1',
      [key]
    );
    const existing = (rows as any[])[0];

    if (!existing || now - Number(existing.window_start) >= windowMs) {
      // Window baru (atau belum pernah ada) — reset counter.
      await pool.execute(
        `INSERT INTO rate_limits (bucket_key, count, window_start) VALUES (?, 1, ?)
         ON DUPLICATE KEY UPDATE count = 1, window_start = VALUES(window_start)`,
        [key, now]
      );
      return true;
    }

    if (Number(existing.count) >= limit) {
      return false;
    }

    await pool.execute('UPDATE rate_limits SET count = count + 1 WHERE bucket_key = ?', [key]);
    return true;
  } catch (err) {
    // Kalau tabel rate_limits belum ada / DB lagi bermasalah, jangan sampai
    // seluruh endpoint ikut down gara-gara rate limiter — fail-open dengan log.
    safeLogError('[rateLimit] gagal cek rate limit, fail-open:', err);
    return true;
  }
}

/** Ambil IP asli client di belakang proxy Vercel. */
export function getClientIp(req: { headers: Record<string, any> }): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim();
  if (Array.isArray(fwd) && fwd.length > 0) return fwd[0];
  return 'unknown';
}
