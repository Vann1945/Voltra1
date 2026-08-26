'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import type { Addon, ViewState } from '@/types';
import { categoryToSlug, slugify } from '@/types';

/**
 * Pengganti `handleNavigate` di App.tsx (Vite). Dulu pakai
 * `window.history.pushState` manual; sekarang pakai App Router
 * `router.push`, yang tetap client-side (tanpa full reload) dan
 * membuat Next.js merender `page.tsx` yang cocok dengan path barunya.
 *
 * Signature `(view: ViewState) => void` sengaja dipertahankan supaya
 * seluruh komponen (Navbar, AddonCard, dll.) yang menerima prop
 * `onNavigate` tidak perlu diubah sama sekali.
 */
export function viewToPath(view: ViewState, addons: Addon[]): string {
  if (view === 'home') return '/';
  if (view === 'landing') return '/landing';
  if (view === 'profile') return '/profile';
  if (view === 'bookmarks' || view === 'library') return '/library';
  if (view === 'settings') return '/settings';
  if (view === 'admin') return '/admin';
  if (typeof view === 'object' && view.type === 'addon') {
    const addon = addons.find((a) => a.id === view.id);
    const prefix = categoryToSlug(addon?.category);
    return `/${prefix}/${addon ? slugify(addon.title) : view.id}`;
  }
  if (typeof view === 'object' && view.type === 'author') {
    return `/author/${view.id}`;
  }
  if (typeof view === 'object' && view.type === 'reset-password') {
    return '/reset-password';
  }
  return '/';
}

export function useAppNavigate(addons: Addon[]) {
  const router = useRouter();

  return useCallback(
    (view: ViewState) => {
      router.push(viewToPath(view, addons));
    },
    [router, addons]
  );
}
