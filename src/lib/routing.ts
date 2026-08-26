import type { ViewState } from '@/types';

const RESERVED_TOP_SEGMENTS = new Set([
  'home', 'landing', 'profile', 'bookmarks', 'library', 'settings', 'admin', 'creator', 'reset-password', 'author',
]);

/**
 * Kebalikan dari `viewToPath` (lihat useAppNavigate.ts) — dipakai supaya
 * Navbar tahu tab mana yang lagi aktif berdasarkan pathname App Router saat ini.
 * Ini menggantikan `getInitialView`/`normalizeAppPath` dari App.tsx versi Vite.
 */
export function pathToViewState(pathname: string): ViewState {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/' || path === '/home') return 'home';
  if (path === '/landing') return 'landing';
  if (path === '/profile') return 'profile';
  if (path === '/bookmarks' || path === '/library') return 'library';
  if (path === '/settings') return 'settings';
  if (path === '/admin') return 'admin';
  if (path === '/creator') return 'creator';
  if (path === '/reset-password') return { type: 'reset-password', token: '', uid: '' };

  const segments = path.split('/').filter(Boolean);
  if (segments.length === 2 && segments[0] === 'author') {
    return { type: 'author', id: decodeURIComponent(segments[1]) };
  }
  if (segments.length === 2 && !RESERVED_TOP_SEGMENTS.has(segments[0])) {
    return { type: 'addon', id: decodeURIComponent(segments[1]) };
  }
  return 'home';
}
