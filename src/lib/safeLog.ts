const SECRET_ENV_KEYS = [
  'AUTH_SECRET', 'TIDB_PASSWORD', 'TIDB_USER', 'TIDB_HOST',
  'SMTP_PASS', 'SMTP_USER',
  'CLOUDINARY_API_SECRET', 'CLOUDINARY_API_KEY',
  'IMAGEKIT_PRIVATE_KEY', 'IMAGEKIT_PUBLIC_KEY', 'IMAGEKIT_URL_ENDPOINT',
  'RECAPTCHA_SECRET_KEY',
  'GITHUB_CLIENT_SECRET', 'GOOGLE_CLIENT_SECRET',
  'FIREBASE_ADMIN_PRIVATE_KEY', 'FIREBASE_ADMIN_CLIENT_EMAIL',
];

function getActiveSecretValues(): string[] {
  return SECRET_ENV_KEYS.map(key => process.env[key]).filter((v): v is string => !!v && v.length >= 6);
}

const SECRET_LOOKING_PATTERNS: RegExp[] = [
  /(\w+:\/\/)([^:/\s]+):([^@/\s]+)@/gi,
  /(password|pwd|pass)\s*=\s*[^;&\s"']+/gi,
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

export function safeLogError(label: string, err: unknown): void {
  try {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error(label, redactString(message), stack ? redactString(stack) : '');
  } catch {
    console.error(label, '[error object could not be safely logged]');
  }
}
