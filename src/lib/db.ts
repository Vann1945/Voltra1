import mysql from 'mysql2/promise';
import { getEncryptedEnv } from './secretsEncryption';

let pool: mysql.Pool | undefined;

export function getPool(): mysql.Pool {
  if (!pool) {
    if (!process.env.TIDB_HOST) {
      throw new Error('Database environment variables are missing (TIDB_HOST).');
    }
    pool = mysql.createPool({
      host: process.env.TIDB_HOST,
      port: Number(process.env.TIDB_PORT || 4000),
      user: process.env.TIDB_USER,
      password: getEncryptedEnv('TIDB_PASSWORD_ENC', 'TIDB_PASSWORD'),
      database: process.env.TIDB_DATABASE,
      ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
      waitForConnections: true,
      connectionLimit: 3,
      maxIdle: 2,
      idleTimeout: 30000,
      queueLimit: 20,
      connectTimeout: 8000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });

    pool.on('connection', () => {});
  }
  return pool;
}

const TRANSIENT_ERROR_CODES = new Set([
  'PROTOCOL_CONNECTION_LOST',
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'POOL_CLOSED',
]);

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err: unknown) {
    const code = (err as any)?.code;
    if (TRANSIENT_ERROR_CODES.has(code)) {
      await new Promise(r => setTimeout(r, 150));
      return await fn();
    }
    throw err;
  }
}

export async function query<T = unknown>(sql: string, params: any[] = []): Promise<T[]> {
  return withRetry(async () => {
    const [rows] = await getPool().execute(sql, params);
    return rows as T[];
  });
}

export async function queryOne<T = unknown>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}
