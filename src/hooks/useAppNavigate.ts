'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import type { Addon, ViewState } from '@/types';
import { categoryToSlug } from '@/types';

export function viewToPath(view: ViewState, addons: Addon[]): string {
  if (view === 'home') return '/';
  if (view === 'landing') return '/landing';
  if (view === 'profile') return '/profile';
  if (view === 'bookmarks' || view === 'library') return '/library';
  if (view === 'settings') return '/settings';
  if (view === 'admin') return '/admin';
  if (view === 'creator') return '/creator';
  if (typeof view === 'object' && view.type === 'addon') {
    const addon = addons.find((a) => a.id === view.id);
    const prefix = categoryToSlug(addon?.category);
    return `/${prefix}/${encodeURIComponent(view.id)}`;
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
