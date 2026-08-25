'use client';

import { useParams } from 'next/navigation';
import { AuthorProfile } from '@/components/AuthorProfile';
import { useAppShell } from '@/providers/AppShellProvider';
import { useAppNavigate } from '@/hooks/useAppNavigate';

export default function AuthorRoute() {
  const params = useParams<{ id: string }>();
  const authorId = decodeURIComponent(params.id);
  const { addons, loading, userLikes, userBookmarks, toggleLike, toggleBookmark, openAuth } = useAppShell();
  const navigate = useAppNavigate(addons);

  return (
    <AuthorProfile
      authorId={authorId}
      addons={addons}
      loading={loading}
      userLikes={userLikes}
      userBookmarks={userBookmarks}
      onToggleLike={toggleLike}
      onToggleBookmark={toggleBookmark}
      onRequireAuth={openAuth}
      onNavigate={navigate}
    />
  );
}
