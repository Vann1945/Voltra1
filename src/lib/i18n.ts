'use client';

import { useAppShell } from '@/providers/AppShellProvider';

/**
 * Dictionary i18n Voltra.
 *
 * Sebelumnya `language` di AppShellProvider hanya tersimpan di state +
 * localStorage tapi tidak pernah dipakai untuk mengganti teks apapun —
 * toggle di halaman Settings terlihat berfungsi (tersimpan), tapi UI
 * selalu tetap bahasa Inggris. File ini menyediakan dictionary + hook
 * `useT()` supaya komponen bisa benar-benar merender teks sesuai
 * `language` ('id' | 'en') yang aktif.
 *
 * Cara pakai di komponen:
 *   const t = useT();
 *   <button>{t('nav.explore')}</button>
 */

export const translations = {
  en: {
    'nav.explore': 'Explore',
    'nav.bookmark': 'Bookmark',
    'nav.settings': 'Settings',
    'nav.publish': 'Publish',
    'nav.publishFull': 'Publish an add-on',
    'nav.admin': 'Admin',
    'nav.signIn': 'Sign in',
    'nav.logOut': 'Log out',
    'nav.viewProfile': 'View profile',
    'nav.openProfile': 'Open profile',
    'nav.creatorDashboard': 'Creator Dashboard',
    'nav.yourProfile': 'Your Voltra profile',
    'nav.bookmarksHint': 'Bookmarks + liked',
    'nav.quickActions': 'Quick actions',
    'nav.yourSpace': 'Your space',
    'nav.menu': 'Menu',

    'settings.title': 'Settings',
    'settings.language': 'Language / Bahasa',
    'settings.languageDesc': 'Choose the display language for the app.',
    'settings.english': 'English',
    'settings.indonesian': 'Indonesian',
    'settings.theme': 'Theme',
    'settings.themeDesc': 'Light, dark, or true black for OLED screens.',
    'settings.themeLight': 'Light',
    'settings.themeDark': 'Dark',
    'settings.themeOled': 'OLED',
    'settings.layout': 'Layout',
    'settings.layoutGrid': 'Grid',
    'settings.layoutList': 'List',

    'auth.signIn': 'Sign in',
    'auth.signUp': 'Sign up',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.continueWithGoogle': 'Continue with Google',
    'auth.continueWithGithub': 'Continue with GitHub',
    'auth.noAccount': "Don't have an account?",
    'auth.haveAccount': 'Already have an account?',
    'auth.forgotPassword': 'Forgot password?',

    'landing.heroTitle': 'Find the Minecraft add-ons players actually love',
    'landing.heroCta': 'Browse the marketplace',
    'landing.footerTagline': 'Made for creators and players. Not affiliated with Mojang or Microsoft.',
    'landing.viewSource': 'View source',

    'common.backToMarketplace': 'Back to marketplace',
    'common.loading': 'Loading…',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
  },
  id: {
    'nav.explore': 'Jelajahi',
    'nav.bookmark': 'Markah',
    'nav.settings': 'Pengaturan',
    'nav.publish': 'Publikasikan',
    'nav.publishFull': 'Publikasikan add-on',
    'nav.admin': 'Admin',
    'nav.signIn': 'Masuk',
    'nav.logOut': 'Keluar',
    'nav.viewProfile': 'Lihat profil',
    'nav.openProfile': 'Buka profil',
    'nav.creatorDashboard': 'Dasbor Kreator',
    'nav.yourProfile': 'Profil Voltra kamu',
    'nav.bookmarksHint': 'Markah + disukai',
    'nav.quickActions': 'Aksi cepat',
    'nav.yourSpace': 'Ruang kamu',
    'nav.menu': 'Menu',

    'settings.title': 'Pengaturan',
    'settings.language': 'Language / Bahasa',
    'settings.languageDesc': 'Pilih bahasa tampilan untuk aplikasi.',
    'settings.english': 'Inggris',
    'settings.indonesian': 'Indonesia',
    'settings.theme': 'Tema',
    'settings.themeDesc': 'Terang, gelap, atau hitam pekat untuk layar OLED.',
    'settings.themeLight': 'Terang',
    'settings.themeDark': 'Gelap',
    'settings.themeOled': 'OLED',
    'settings.layout': 'Tata letak',
    'settings.layoutGrid': 'Grid',
    'settings.layoutList': 'Daftar',

    'auth.signIn': 'Masuk',
    'auth.signUp': 'Daftar',
    'auth.email': 'Email',
    'auth.password': 'Kata sandi',
    'auth.continueWithGoogle': 'Lanjutkan dengan Google',
    'auth.continueWithGithub': 'Lanjutkan dengan GitHub',
    'auth.noAccount': 'Belum punya akun?',
    'auth.haveAccount': 'Sudah punya akun?',
    'auth.forgotPassword': 'Lupa kata sandi?',

    'landing.heroTitle': 'Temukan add-on Minecraft yang benar-benar disukai pemain',
    'landing.heroCta': 'Jelajahi marketplace',
    'landing.footerTagline': 'Dibuat untuk kreator dan pemain. Tidak berafiliasi dengan Mojang atau Microsoft.',
    'landing.viewSource': 'Lihat kode sumber',

    'common.backToMarketplace': 'Kembali ke marketplace',
    'common.loading': 'Memuat…',
    'common.save': 'Simpan',
    'common.cancel': 'Batal',
  },
} as const;

export type TranslationKey = keyof typeof translations['en'];

/**
 * Hook untuk komponen client. Mengambil `language` dari AppShellProvider
 * (sudah ada & sudah tersambung ke Settings) dan mengembalikan fungsi
 * `t(key)` yang fallback ke dictionary Inggris (lalu ke key itu sendiri)
 * kalau suatu key belum diterjemahkan.
 */
export function useT() {
  const { language } = useAppShell();
  return function t(key: TranslationKey): string {
    return translations[language]?.[key] ?? translations.en[key] ?? key;
  };
}
