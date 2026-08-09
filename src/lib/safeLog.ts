/**
 * Lapisan pertahanan tambahan untuk mencegah kebocoran API key/secret lewat
 * log server (Vercel log stream, dashboard, dsb).
 *
 * KENAPA INI PERLU meskipun semua secret sudah disimpan sebagai environment
 * variable (yang sudah dienkripsi Vercel saat disimpan): env var yang
 * dienkripsi di rest TIDAK melindungi dari kebocoran TIDAK SENGAJA lewat
 * `console.error(err)` — beberapa library (driver DB, SMTP client, dsb)
 * kadang menyertakan config/connection string di dalam objek Error saat
 * gagal connect (mis. error auth MySQL bisa memuat host+user+password di
 * pesannya). Kalau itu ter-log begitu saja, secretnya berakhir di log
 * server dalam bentuk teks biasa — walau env var aslinya aman.
 *
 * safeLogError() adalah "lapisan kedua": redaksi otomatis berbasis pattern
 * SEBELUM sesuatu benar-benar ditulis ke log, apapun sumbernya.
 */

const SECRET_ENV_KEYS = [
  'AUTH_SECRET', 'TIDB_PASSWORD', 'TIDB_USER', 'TIDB_HOST',
  'SMTP_PASS', 'SMTP_USER',
  'CLOUDINARY_API_SECRET', 'CLOUDINARY_API_KEY',
  'IMGBB_API_KEY', 'RECAPTCHA_SECRET_KEY',
  'GITHUB_CLIENT_SECRET', 'GOOGLE_CLIENT_SECRET',
  'FIREBASE_ADMIN_PRIVATE_KEY', 'FIREBASE_ADMIN_CLIENT_EMAIL',
];

/** Nilai env var yang benar-benar aktif saat ini — dicocokkan literal di dalam string apa pun sebelum di-log. */
function getActiveSecretValues(): string[] {
  return SECRET_ENV_KEYS.map(key => process.env[key]).filter((v): v is string => !!v && v.length >= 6);
}

const SECRET_LOOKING_PATTERNS: RegExp[] = [
  // connection string mysql://user:pass@host / postgres:// dsb.
  /(\w+:\/\/)([^:/\s]+):([^@/\s]+)@/gi,
  // "password=xxxx" / "pwd=xxxx" ala DSN
  /(password|pwd|pass)\s*=\s*[^;&\s"']+/gi,
  // Authorization header value
  /(authorization["']?\s*:\s*["']?bearer\s+)[a-z0-9._-]+/gi,
];

function redactString(input: string): string {
  let out = input;
  for (const secretValue of getActiveSecretValues()) {
    if (secretValue && out.includes(secretValue)) {
      out = out.split(secretValue).join('[REDACTED]');
    }
  }
  for (const pattern of SECRET_LOOKING_PATTERNS) {
    out = out.replace(pattern, (_match, prefix) => `${prefix ?? ''}[REDACTED]`);
  }
  return out;
}

/**
 * Log error dengan redaksi otomatis. Pakai ini alih-alih console.error()
 * langsung di titik mana pun yang mungkin menyentuh error dari DB, SMTP,
 * atau HTTP client pihak ketiga (yaitu hampir semua error di api/*.ts).
 */
export function safeLogError(label: string, err: unknown): void {
  try {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error(label, redactString(message), stack ? redactString(stack) : '');
  } catch {
    // Kalau redaksi sendiri gagal, jangan sampai proses log-nya crash —
    // fallback ke pesan generik super aman tanpa detail apa pun.
    console.error(label, '[error object could not be safely logged]');
  }
}
