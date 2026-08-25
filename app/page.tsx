'use client';

import { Marketplace } from '@/components/Marketplace';
import { useAppShell } from '@/providers/AppShellProvider';
import { useAppNavigate } from '@/hooks/useAppNavigate';

export default function HomePage() {
  const { addons, loading, userLikes, userBookmarks, toggleLike, toggleBookmark, layoutMode, openAuth } = useAppShell();
  const navigate = useAppNavigate(addons);

  return (
    <Marketplace
      addons={addons}
      loading={loading}
      userLikes={userLikes}
      onToggleLike={toggleLike}
      onRequireAuth={openAuth}
      onNavigate={navigate}
      layoutMode={layoutMode}
      userBookmarks={userBookmarks}
      onToggleBookmark={toggleBookmark}
    />
  );
}
