'use client';

import { BookmarksPage } from '@/components/BookmarksPage';
import { useAppShell } from '@/providers/AppShellProvider';
import { useAppNavigate } from '@/hooks/useAppNavigate';

export function LibraryRouteContent() {
  const { addons, userLikes, userBookmarks, toggleLike, toggleBookmark, openAuth, bookmarksLayoutMode } = useAppShell();
  const navigate = useAppNavigate(addons);

  return (
    <BookmarksPage
      addons={addons}
      userLikes={userLikes}
      userBookmarks={userBookmarks}
      onToggleLike={toggleLike}
      onToggleBookmark={toggleBookmark}
      onRequireAuth={openAuth}
      onNavigate={navigate}
      layoutMode={bookmarksLayoutMode}
    />
  );
}
