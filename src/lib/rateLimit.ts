import { getPool } from './db';
import { safeLogError } from './safeLog';

export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const now = Date.now();
  const pool = getPool();

  try {
    await pool.execute(
      'INSERT IGNORE INTO rate_limits (bucket_key, count, window_start) VALUES (?, 0, ?)',
      [key, now]
    );

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
