'use client';

import { useParams } from 'next/navigation';
import { AddonDetail } from '@/components/AddonDetail';
import { useAppShell } from '@/providers/AppShellProvider';
import { useAppNavigate } from '@/hooks/useAppNavigate';
import { slugify } from '@/types';

export default function AddonDetailRoute() {
  const params = useParams<{ category: string; slug: string }>();
  const slug = decodeURIComponent(params.slug);
  const { addons, loading, userLikes, userBookmarks, toggleLike, toggleBookmark, openAuth, isDarkMode } = useAppShell();
  const navigate = useAppNavigate(addons);

  // Sama seperti popstate handler di App.tsx lama: cocokkan slug ke judul
  // yang di-slugify, fallback ke pencocokan id langsung. Prefix kategori di
  // URL cuma dekoratif, tidak dipakai untuk pencarian (sesuai perilaku asli).
  const matched = addons.find((a) => slugify(a.title) === slug || a.id === slug);
  const addonId = matched ? matched.id : slug;

  return (
    <AddonDetail
      addonId={addonId}
      addons={addons}
      loading={loading}
      userLikes={userLikes}
      userBookmarks={userBookmarks}
      onToggleLike={toggleLike}
      onToggleBookmark={toggleBookmark}
      onRequireAuth={openAuth}
      onNavigate={navigate}
      isDarkMode={isDarkMode}
    />
  );
}
