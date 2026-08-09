import mysql from 'mysql2/promise';
import { getEncryptedEnv } from './secretsEncryption.js';

let pool: mysql.Pool | undefined;

// ===========================================================================
// KENAPA konfigurasi ini penting untuk performa saat traffic tinggi:
//
// Aplikasi ini berjalan sebagai serverless functions (Vercel) — ada 13 file
// route terpisah di /api, dan MASING-MASING route punya pool koneksinya
// sendiri (module-level `pool` di file ini di-share HANYA dalam satu
// serverless function/route, bukan lintas route). Setiap kali Vercel
// men-spin-up instance baru (cold start) untuk menangani lonjakan traffic,
// instance itu bikin pool baru dari nol.
//
// Kalau connectionLimit per pool terlalu besar (misal 10-20) dan traffic
// tinggi memicu banyak cold-start bersamaan di 13 route berbeda, total
// koneksi ke TiDB bisa meledak jadi ratusan dalam hitungan detik — padahal
// TiDB Serverless punya batas concurrent connection & quota RU per bulan.
// Begitu limit itu kena, TiDB MENOLAK koneksi baru sama sekali — inilah yang
// terasa sebagai "macet"/"tertahan" saat ramai: bukan lambat, tapi permintaan
// baru tidak bisa connect ke DB sama sekali.
//
// Strategi di sini:
// 1. connectionLimit kecil per pool (3) — cukup untuk 1 request serverless
//    yang biasanya cuma butuh 1 koneksi aktif dalam satu waktu, kali sedikit
//    concurrency dalam 1 instance yang sama.
// 2. queueLimit dibatasi (bukan 0/unlimited) — kalau pool penuh, request baru
//    GAGAL CEPAT dengan error yang jelas, bukan menggantung/queue tanpa batas
//    yang bikin request lama menumpuk dan client merasa "hang".
// 3. connectTimeout pendek — kalau TiDB sedang penuh/lambat merespons, kita
//    tahu dalam hitungan detik, bukan menunggu lama baru gagal.
// 4. enableKeepAlive — reuse koneksi TCP pada warm invocation (instance yang
//    sama dipakai lagi untuk request berikutnya tanpa perlu re-handshake).
// ===========================================================================
export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.TIDB_HOST,
      port: Number(process.env.TIDB_PORT || 4000),
      user: process.env.TIDB_USER,
      // Password database adalah salah satu secret paling kritis di aplikasi
      // ini (akses penuh ke seluruh data). Dibaca lewat lapisan enkripsi
      // kedua: kalau TIDB_PASSWORD_ENC (terenkripsi) sudah di-set, itu yang
      // dipakai; kalau belum (mis. saat development atau sebelum migrasi
      // penuh ke sistem enkripsi ini), otomatis fallback ke TIDB_PASSWORD
      // polos supaya tidak mendadak merusak deployment yang sudah jalan.
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

    pool.on('connection', () => {
      // no-op hook kept for future metrics; keeping the listener registered
      // avoids "possible EventEmitter memory leak" warnings under bursty
      // reconnect patterns in some mysql2 versions.
    });
  }
  return pool;
}

/**
 * Retry ringan untuk error koneksi yang sifatnya sementara (TiDB Serverless
 * kadang menutup koneksi idle atau menolak sesaat saat scaling). Query yang
 * gagal karena masalah TRANSIEN dicoba ulang sekali dengan jeda singkat —
 * supaya lonjakan traffic sesaat tidak langsung terasa sebagai error ke user,
 * padahal percobaan kedua kemungkinan besar berhasil.
 * TIDAK retry untuk error yang jelas permanen (syntax error SQL, duplicate
 * entry, dll) — hanya untuk error koneksi/timeout yang benar-benar transient.
 */
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
  } catch (err: any) {
    const code = err?.code;
    if (TRANSIENT_ERROR_CODES.has(code)) {
      await new Promise(r => setTimeout(r, 150));
      return await fn();
    }
    throw err;
  }
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return withRetry(async () => {
    const [rows] = await getPool().execute(sql, params);
    return rows as T[];
  });
}

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}
