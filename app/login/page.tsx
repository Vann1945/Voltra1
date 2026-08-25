import { Suspense } from 'react';
import { LoginRedirect } from './LoginRedirect';

/**
 * `authConfig.pages.signIn` di `src/auth.config.ts` diset ke "/login", tapi
 * app ini TIDAK punya halaman login sendiri — login selalu lewat AuthModal
 * (lihat AppShellProvider/openAuth). Selama alurnya sukses ini tidak masalah
 * karena Auth.js redirect balik ke `callbackUrl` yang sudah kita set manual.
 *
 * Tapi begitu Google/GitHub OAuth GAGAL (mis. signIn callback menolak email
 * yang belum diverifikasi, atau OAuthAccountNotLinked), Auth.js redirect ke
 * `pages.signIn` + `?error=...` alih-alih ke callbackUrl — dan karena
 * `/login` tidak ada, user mendarat di halaman 404 Next.js tanpa penjelasan
 * apa pun. Halaman ini jadi "jaring pengaman": terima redirect itu, lalu
 * lempar balik ke beranda dengan error yang sama supaya AppChrome bisa
 * menampilkannya sebagai toast dan membuka ulang AuthModal.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginRedirect />
    </Suspense>
  );
}
