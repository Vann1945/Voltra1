import { getEncryptedEnv } from './secretsEncryption.js';

// Verifikasi token reCAPTCHA v2 ("I'm not a robot") ke Google — HANYA dipanggil di server.
export async function verifyRecaptcha(token: string | undefined | null, remoteIp?: string): Promise<boolean> {
  if (!token) return false;

  // Secret reCAPTCHA dibaca lewat lapisan enkripsi kedua (lihat secretsEncryption.ts).
  const secret = getEncryptedEnv('RECAPTCHA_SECRET_KEY_ENC', 'RECAPTCHA_SECRET_KEY');
  if (!secret) {
    throw new Error('RECAPTCHA_SECRET_KEY belum diset di environment variables.');
  }

  const params = new URLSearchParams({ secret, response: token });
  if (remoteIp) params.append('remoteip', remoteIp);

  const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = (await res.json()) as { success: boolean };
  return !!data.success;
}
