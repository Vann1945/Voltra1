import Google from '@auth/core/providers/google';
import GitHub from '@auth/core/providers/github';
import Credentials from '@auth/core/providers/credentials';
import type { AuthConfig } from '@auth/core/types';
import bcrypt from 'bcryptjs';
import { getAdminAuth } from './src/lib/firebaseAdmin.js';
import { verifyRecaptcha } from './src/lib/recaptcha.server.js';
import { sendLoginNotificationEmail } from './src/lib/email.js';
import { findUserByEmail, findUserById, resolveOAuthUser } from './src/lib/userStore.js';
import { checkRateLimit } from './src/lib/rateLimit.js';
import { safeLogError } from './src/lib/safeLog.js';
import { getEncryptedEnv } from './src/lib/secretsEncryption.js';

const DUMMY_PASSWORD_HASH = '$2a$10$fTy1OLV1a11SPxPYmixkk.cIXbrd2o3qNIvurHqKJCK2dD7aimX5W';
const authSecret = getEncryptedEnv('AUTH_SECRET_ENC', 'AUTH_SECRET') || process.env.AUTH_SECRET;
const firebaseTokenCache = new Map<string, { token: string; expiresAt: number }>();
const FIREBASE_TOKEN_CACHE_TTL_MS = 5 * 60_000;

if (process.env.NODE_ENV === 'production' && !authSecret) {
  throw new Error('AUTH_SECRET atau AUTH_SECRET_ENC wajib dikonfigurasi di production.');
}

export const authConfig: AuthConfig = {
  basePath: '/api/auth',
  secret: authSecret,
  trustHost: true,
  session: { strategy: 'jwt' },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
    Credentials({
      id: 'credentials',
      name: 'Email dan Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        recaptchaToken: { label: 'reCAPTCHA', type: 'text' },
      },
      async authorize(credentials) {
        const rawEmail = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        const recaptchaToken = credentials?.recaptchaToken as string | undefined;
        if (!rawEmail || !password) return null;

        const loginAllowed = await checkRateLimit(`login:${rawEmail.trim().toLowerCase()}`, 8, 10 * 60_000);
        if (!loginAllowed) throw new Error('TOO_MANY_ATTEMPTS');

        const captchaOk = await verifyRecaptcha(recaptchaToken);
        if (!captchaOk) throw new Error('RECAPTCHA_FAILED');

        const user = await findUserByEmail(rawEmail);

        const passwordHash = user?.password_hash || DUMMY_PASSWORD_HASH;
        const valid = await bcrypt.compare(password, passwordHash);

        if (!user || !user.password_hash || !valid) throw new Error('INVALID_CREDENTIALS');

        if (!user.email_verified) throw new Error('EMAIL_NOT_VERIFIED');

        try {
          await sendLoginNotificationEmail(user.email, user.display_name || 'User');
        } catch (err) {
          safeLogError('[auth] gagal kirim notifikasi login:', err);
        }

        return {
          id: user.id, 
          email: user.email,
          name: user.display_name,
          image: user.photo_url,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google' || account?.provider === 'github') {
        if (!user.email) {
          console.error(`[auth] signIn ditolak: provider=${account.provider} nggak punya email`);
          return false;
        }

        if (account.provider === 'google' && (profile as any)?.email_verified !== true) {
          console.error('[auth] signIn ditolak: email Google belum diverifikasi.');
          return false;
        }

        try {
          const resolved = await resolveOAuthUser({
            provider: account.provider,
            email: user.email,
            displayName: user.name || 'Unknown User',
            photoURL: user.image,
          });
          user.id = resolved.id;
          (user as any).role = resolved.role;
        } catch (err) {
          safeLogError(`[AuthJS] resolveOAuthUser failed for provider=${account.provider}:`, err);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.uid = String(user.id);
        token.role = (user as any).role;
      }
      const lastRefreshed = typeof token.lastRefreshed === 'number' ? token.lastRefreshed : 0;
      const needsRefresh = Date.now() - lastRefreshed > 300_000; // Refresh JWT data from DB every 5 minutes instead of 1 minute to reduce load

      if (token.uid && (user || needsRefresh)) {
        try {
          const dbUser = await findUserById(token.uid as string);
          if (dbUser) {
            token.role = dbUser.role;
            token.picture = dbUser.photo_url;
            token.name = dbUser.display_name;
            token.bio = dbUser.bio;
            token.profileBorder = dbUser.profile_border;
          }
          token.lastRefreshed = Date.now();
        } catch (err) {
          safeLogError('[auth] jwt callback: gagal ambil data user dari TiDB:', err);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).uid = token.uid;
        (session.user as any).role = token.role;
        (session.user as any).displayName = (token.name as string) || session.user.name || null;
        (session.user as any).photoURL = (token.picture as string) || session.user.image || null;
        (session.user as any).bio = (token.bio as string) || null;
        (session.user as any).profileBorder = (token.profileBorder as string) || 'none';
      }
      if (token.uid) {
        try {
          const uid = String(token.uid);
          const role = typeof token.role === 'string' ? token.role : 'user';
          const cacheKey = `${uid}:${role}`;
          const cached = firebaseTokenCache.get(cacheKey);
          if (cached && cached.expiresAt > Date.now()) {
            (session as any).firebaseToken = cached.token;
          } else {
            const adminAuth = getAdminAuth();
            const firebaseToken = await adminAuth.createCustomToken(uid, { role });
            firebaseTokenCache.set(cacheKey, {
              token: firebaseToken,
              expiresAt: Date.now() + FIREBASE_TOKEN_CACHE_TTL_MS,
            });
            (session as any).firebaseToken = firebaseToken;
          }
        } catch (err) {
          safeLogError('[AuthJS] failed to create firebaseToken (createCustomToken):', err);
          // Don't throw, allow the session to be returned without firebaseToken
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};
