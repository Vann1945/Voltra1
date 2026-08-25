import crypto from 'crypto';
import { query, queryOne } from './db';

export type DbUser = {
  id: string;
  email: string;
  display_name: string | null;
  photo_url: string | null;
  role: 'user' | 'admin' | 'banned' | 'suspended';
  bio: string | null;
  profile_border: string | null;
  password_hash: string | null;
  email_verified: number | boolean;
  linked_providers: string[] | null;
};

const ADMIN_EMAILS = ['unknownfeed76@gmail.com', 'kanzakbarraihanriyanto86@gmail.com'];

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(normalizeEmail(email));
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  return queryOne<DbUser>('SELECT * FROM users WHERE email = ? LIMIT 1', [normalizeEmail(email)]);
}

export async function findUserById(id: string): Promise<DbUser | null> {
  return queryOne<DbUser>('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
}

export async function resolveOAuthUser(params: {
  provider: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
}): Promise<DbUser> {
  const email = normalizeEmail(params.email);
  const existing = await findUserByEmail(email);

  if (existing) {
    const linked: string[] = Array.isArray(existing.linked_providers) ? existing.linked_providers : [];
    const nextLinked = linked.includes(params.provider) ? linked : [...linked, params.provider];

    await query(
      `UPDATE users SET
         display_name = COALESCE(display_name, ?),
         photo_url = COALESCE(photo_url, ?),
         linked_providers = ?,
         role = IF(role != 'admin' AND ? = TRUE, 'admin', role)
       WHERE id = ?`,
      [params.displayName, params.photoURL || null, JSON.stringify(nextLinked), isAdminEmail(email), existing.id]
    );
    return (await findUserById(existing.id))!;
  }

  const id = crypto.randomUUID();
  const role = isAdminEmail(email) ? 'admin' : 'user';
  await query(
    `INSERT INTO users (id, email, display_name, photo_url, role, email_verified, linked_providers)
     VALUES (?, ?, ?, ?, ?, TRUE, ?)`,
    [id, email, params.displayName || 'Unknown User', params.photoURL || null, role, JSON.stringify([params.provider])]
  );
  return (await findUserById(id))!;
}
