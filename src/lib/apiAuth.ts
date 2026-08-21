import type { VercelRequest } from '@vercel/node';
import { safeLogError } from './safeLog.js';
import { getToken } from '@auth/core/jwt';
import { getEncryptedEnv } from './secretsEncryption.js';

export type SessionUser = { uid: string; email: string; name: string; image?: string; role?: string };

export async function getSessionUser(req: VercelRequest): Promise<SessionUser | null> {
  const cookie = req.headers.cookie;
  if (!cookie) return null;

  try {
    const headers = new Headers();
    headers.set('cookie', cookie);

    const protocol = (req.headers['x-forwarded-proto'] as string) || 'https';
    const secureCookie = protocol === 'https';

    const token = await getToken({
      req: { headers },
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
