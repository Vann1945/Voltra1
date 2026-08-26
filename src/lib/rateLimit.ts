import { getPool } from './db';
import { safeLogError } from './safeLog';

export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const now = Date.now();
  const pool = getPool();

  try {
    // Pastikan baris ada dulu (no-op kalau sudah ada) supaya UPDATE di bawah
    // selalu punya baris untuk dikunci.
    await pool.execute(
      'INSERT IGNORE INTO rate_limits (bucket_key, count, window_start) VALUES (?, 0, ?)',
      [key, now]
    );

    // Satu UPDATE atomik yang sekaligus: (a) mereset window kalau sudah
    // kedaluwarsa, (b) menaikkan counter hanya kalau masih di bawah limit.
    // Ini menghindari race condition SELECT-lalu-UPDATE sebelumnya, di mana
    // dua request paralel bisa sama-sama lolos pengecekan sebelum salah
    // satunya sempat menaikkan counter (TOCTOU).
    const [result] = await pool.execute(
      `UPDATE rate_limits
       SET
         count = IF(? - window_start >= ?, 1, count + 1),
         window_start = IF(? - window_start >= ?, ?, window_start)
       WHERE bucket_key = ? AND (? - window_start >= ? OR count < ?)`,
      [now, windowMs, now, windowMs, now, key, now, windowMs, limit]
    );

    return (result as any).affectedRows > 0;
  } catch (err) {
    // Fail-closed mencegah bypass rate limit ketika storage limiter bermasalah.
    safeLogError('[rateLimitJS] failed to check rate limit, fail-closed:', err);
    return false;
  }
}

export function getClientIp(req: { headers: Record<string, any> }): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim();
  if (Array.isArray(fwd) && fwd.length > 0) return fwd[0];
  return 'unknown';
}
