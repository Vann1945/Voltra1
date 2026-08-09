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

// Hash bcrypt VALID (cost 10) untuk password acak yang sengaja tidak akan
// pernah dipakai siapa pun ("this-is-a-dummy-password-never-matches").
// Dipakai di authorize() saat email tidak ditemukan, supaya bcrypt.compare()
// tetap menjalankan komputasi cost-10 yang lengkap (bukan gagal cepat), agar
// waktu respons login untuk "email tidak terdaftar" tidak bisa dibedakan
// dari "email terdaftar tapi password salah" — mencegah user enumeration
// lewat timing attack. INI BUKAN placeholder/dummy string sembarangan; ini
// harus tetap berupa hash bcrypt yang valid secara struktur supaya proses
// hashing benar-benar berjalan penuh.
const DUMMY_PASSWORD_HASH = '$2a$10$fTy1OLV1a11SPxPYmixkk.cIXbrd2o3qNIvurHqKJCK2dD7aimX5W';

export const authConfig: AuthConfig = {
  basePath: '/api/auth',
  // AUTH_SECRET adalah kunci induk untuk seluruh sistem sesi — kalau bocor,
  // penyerang bisa memalsukan sesi login siapa saja. Dibaca lewat lapisan
  // enkripsi kedua (lihat src/lib/secretsEncryption.ts). PENTING: kalau
  // AUTH_SECRET_ENC dipakai di sini, src/lib/apiAuth.ts (yang mendekode
  // token session di tempat terpisah) HARUS baca dengan cara yang sama
  // supaya kedua sisi cocok.
  secret: getEncryptedEnv('AUTH_SECRET_ENC', 'AUTH_SECRET'),
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

        // Rate limit per-email supaya brute force password tidak bisa jalan
        // kencang meski reCAPTCHA berhasil dilewati (misal token dipakai ulang
        // lewat automation yang sudah solve captcha-nya).
        const loginAllowed = await checkRateLimit(`login:${rawEmail.trim().toLowerCase()}`, 8, 10 * 60_000);
        if (!loginAllowed) throw new Error('TOO_MANY_ATTEMPTS');

        const captchaOk = await verifyRecaptcha(recaptchaToken);
        if (!captchaOk) throw new Error('RECAPTCHA_FAILED');

        const user = await findUserByEmail(rawEmail);

        // PENTING: selalu jalankan bcrypt.compare() dengan durasi yang sama
        // baik user-nya ada maupun tidak. Kalau early-return begitu saja saat
        // user tidak ditemukan, waktu respons endpoint ini jadi jauh lebih
        // cepat untuk email yang TIDAK terdaftar dibanding yang terdaftar
        // (karena bcrypt sengaja lambat, ~100ms+) — perbedaan waktu itu bisa
        // dipakai penyerang untuk menebak email mana saja yang punya akun di
        // Voltra (user enumeration lewat timing), meski pesan errornya sudah
        // sama-sama "INVALID_CREDENTIALS".
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

        // PENTING (keamanan account-linking): resolveOAuthUser() di bawah ini
        // akan MENGGABUNGKAN login OAuth ke akun lama yang emailnya sama
        // (kalau sudah ada) — termasuk mewarisi role admin kalau akun lama
        // itu admin. Kalau kita percaya begitu saja `user.email` dari OAuth
        // tanpa memastikan provider-nya SUDAH memverifikasi email itu,
        // penyerang yang berhasil mendaftarkan email siapa pun sebagai
        // "unverified" di provider OAuth (Google mengizinkan ini terjadi
        // dalam kondisi tertentu) bisa membajak akun Voltra manapun yang
        // pakai email itu. Google secara eksplisit menyediakan klaim
        // `email_verified` untuk kasus ini (didokumentasikan resmi oleh
        // Auth.js) — GitHub sendiri, berdasarkan kebijakan platform mereka,
        // tidak pernah mengizinkan email primer yang belum diverifikasi jadi
        // hasil API publik, jadi tidak perlu pengecekan tambahan untuk GitHub.
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
      // PENTING untuk performa: callback jwt() ini dipanggil di SETIAP
      // pengecekan sesi (setiap request API yang butuh login memicu ini,
      // lihat src/lib/apiAuth.ts). Kalau kita query TiDB tiap kali, artinya
      // setiap request otentikasi = 1 query DB tambahan di luar query yang
      // memang dibutuhkan endpoint itu sendiri — ini kelipatan beban DB yang
      // signifikan saat traffic tinggi dan salah satu penyebab utama
      // permintaan terasa "macet"/tertahan saat ramai.
      //
      // Solusinya: data user di-refresh dari DB paling lambat tiap 60 detik
      // per token, bukan di setiap request. 60 detik dipilih (bukan lebih
      // lama) karena `role` dipakai untuk keputusan otorisasi (admin/banned/
      // suspended) — kita tidak mau perubahan ban/promosi admin baru
      // berlaku setelah waktu yang lama. Ini tetap memangkas query DB
      // sampai puluhan kali lipat dibanding sebelumnya (yang query di SETIAP
      // request), sambil tetap responsif untuk perubahan keamanan penting.
      const lastRefreshed = typeof token.lastRefreshed === 'number' ? token.lastRefreshed : 0;
      const needsRefresh = Date.now() - lastRefreshed > 60_000;

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
          (session as any).firebaseToken = await getAdminAuth().createCustomToken(token.uid as string, {
            role: token.role,
          });
        } catch (err) {
          safeLogError('[AuthJS] failed to create firebaseToken (createCustomToken):', err);
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};
