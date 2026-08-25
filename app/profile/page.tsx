'use client';

import { UserProfile } from '@/components/UserProfile';
import { useAppShell } from '@/providers/AppShellProvider';
import { useAppNavigate } from '@/hooks/useAppNavigate';

export default function ProfileRoute() {
  const { addons, loading, userLikes, userBookmarks, toggleLike, toggleBookmark, removeAddon, profileLayoutMode } = useAppShell();
  const navigate = useAppNavigate(addons);

  return (
    <UserProfile
      addons={addons}
      loading={loading}
      userLikes={userLikes}
      userBookmarks={userBookmarks}
      onToggleLike={toggleLike}
      onToggleBookmark={toggleBookmark}
      onNavigate={navigate}
      onAddonDeleted={removeAddon}
      layoutMode={profileLayoutMode}
    />
  );
}
