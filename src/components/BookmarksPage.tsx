import React from 'react';
import { Bookmark, LockKeyhole } from 'lucide-react';
import { Addon } from '../types';
import { ViewState } from '../App';
import { useAuth } from '../hooks/useAuth';
import { AddonCard } from './AddonCard';
import { getButtonClasses } from '../lib/designSystem';

interface BookmarksPageProps {
  addons: Addon[];
  userLikes: Set<string>;
  userBookmarks: Set<string>;
  onToggleLike: (addonId: string, isLiked: boolean) => void;
  onToggleBookmark: (addonId: string, isBookmarked: boolean) => void;
  onRequireAuth: () => void;
  onNavigate: (view: ViewState) => void;
}

export function BookmarksPage({ addons, userLikes, userBookmarks, onToggleLike, onToggleBookmark, onRequireAuth, onNavigate }: BookmarksPageProps) {
  const { user } = useAuth();
  const bookmarkedAddons = addons.filter(addon => userBookmarks.has(addon.id));

  return (
    <section className="min-h-[calc(100dvh-64px)] bg-parchment pb-32" aria-label="Bookmarks">
      <div className="border-b border-parchment-border bg-parchment-raised">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <p className="inline-flex items-center gap-2 text-sm font-bold text-terracotta-text"><Bookmark size={16} /> Personal collection</p>
          <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] text-ink-900 sm:text-5xl">Your bookmarks</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-ink-900/60">Save projects you want to revisit, compare, or download later.</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {!user ? (
          <div className="rounded-2xl border border-parchment-border bg-parchment-raised px-6 py-20 text-center shadow-card">
            <LockKeyhole size={32} className="mx-auto text-ink-900/35" />
            <h2 className="mt-4 text-xl font-bold text-ink-900">Sign in to see your bookmarks</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-900/55">Your saved projects are private to your account and available on every device.</p>
            <button type="button" onClick={onRequireAuth} className={`mt-6 ${getButtonClasses('primary', 'md')}`}>Sign in</button>
          </div>
        ) : bookmarkedAddons.length === 0 ? (
          <div className="rounded-2xl border border-parchment-border bg-parchment-raised px-6 py-20 text-center shadow-card">
            <Bookmark size={32} className="mx-auto text-ink-900/35" />
            <h2 className="mt-4 text-xl font-bold text-ink-900">Nothing bookmarked yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-900/55">Tap the bookmark icon on any project to keep it here for later.</p>
            <button type="button" onClick={() => onNavigate('home')} className={`mt-6 ${getButtonClasses('primary', 'md')}`}>Explore projects</button>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-end justify-between gap-4 border-b border-parchment-border pb-5"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-terracotta-text">Saved library</p><h2 className="mt-2 text-2xl font-bold text-ink-900">{bookmarkedAddons.length} {bookmarkedAddons.length === 1 ? 'project' : 'projects'}</h2></div><button type="button" onClick={() => onNavigate('home')} className={getButtonClasses('secondary', 'sm')}>Browse more</button></div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {bookmarkedAddons.map((addon, index) => <AddonCard key={addon.id} addon={addon} isLiked={userLikes.has(addon.id)} isBookmarked={userBookmarks.has(addon.id)} onToggleLike={onToggleLike} onToggleBookmark={onToggleBookmark} onRequireAuth={onRequireAuth} onNavigate={onNavigate} priority={index === 0} />)}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
