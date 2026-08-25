'use client';

import { useState } from 'react';
import { Heart, LockKeyhole, Bookmark } from '@/components/icons/animated';
import { Addon } from '@/types';
import { ViewState } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { AddonCard } from './AddonCard';
import { getButtonClasses } from '@/lib/designSystem';

interface BookmarksPageProps {
  addons: Addon[];
  userLikes: Set<string>;
  userBookmarks: Set<string>;
  onToggleLike: (addonId: string, isLiked: boolean) => void;
  onToggleBookmark: (addonId: string, isBookmarked: boolean) => void;
  onRequireAuth: () => void;
  onNavigate: (view: ViewState) => void;
  layoutMode?: 'grid' | 'list';
}

type CollectionTab = 'saved' | 'liked';

export function BookmarksPage({ addons, userLikes, userBookmarks, onToggleLike, onToggleBookmark, onRequireAuth, onNavigate, layoutMode = 'grid' }: BookmarksPageProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<CollectionTab>('saved');
  const savedAddons = addons.filter(addon => userBookmarks.has(addon.id));
  const likedAddons = addons.filter(addon => userLikes.has(addon.id));
  const visibleAddons = activeTab === 'saved' ? savedAddons : likedAddons;
  const activeLabel = activeTab === 'saved' ? 'bookmarks' : 'liked add-ons';

  return <section className="min-h-[calc(100dvh-64px)] bg-parchment pb-32" aria-label="Bookmark">
    <div className="border-b border-parchment-border bg-parchment-raised">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <p className="inline-flex items-center gap-2 text-sm font-bold text-terracotta-text"><Bookmark size={16} /> Your collection</p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-6"><div><h1 className="text-4xl font-bold tracking-[-0.04em] text-ink-900 sm:text-5xl">Bookmark</h1><p className="mt-4 max-w-2xl text-base leading-7 text-ink-900/60">Keep bookmarks and liked add-ons together, ready whenever you want to return.</p></div><div className="hidden rounded-2xl border border-parchment-border bg-parchment px-4 py-3 text-right sm:block"><p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-900/45">Total collection</p><p className="mt-1 text-xl font-bold text-ink-900">{savedAddons.length + likedAddons.length}</p></div></div>
      </div>
    </div>
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      {!user ? <div className="rounded-2xl border border-parchment-border bg-parchment-raised px-6 py-20 text-center shadow-card"><LockKeyhole size={32} className="mx-auto text-ink-900/35" /><h2 className="mt-4 text-xl font-bold text-ink-900">Sign in to open your bookmarks</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-900/55">Your bookmarks and liked add-ons stay private to your account and sync across devices.</p><button type="button" onClick={onRequireAuth} className={`mt-6 ${getButtonClasses('primary', 'md')}`}>Sign in</button></div> : <>
        <div className="mb-8 flex flex-col gap-5 border-b border-parchment-border pb-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-terracotta-text">Browse your collection</p><h2 className="mt-2 text-2xl font-bold text-ink-900">{visibleAddons.length} {activeLabel}</h2></div><div className="grid grid-cols-2 rounded-xl border border-parchment-border bg-parchment p-1" role="tablist" aria-label="Collection sections"><button type="button" role="tab" aria-selected={activeTab === 'saved'} onClick={() => setActiveTab('saved')} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition-colors ${activeTab === 'saved' ? 'bg-ink-900 text-paper shadow-sm' : 'text-ink-900/55 hover:bg-ink-900/[0.05]'}`}><Bookmark size={15} />Bookmark <span className="text-xs opacity-70">{savedAddons.length}</span></button><button type="button" role="tab" aria-selected={activeTab === 'liked'} onClick={() => setActiveTab('liked')} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition-colors ${activeTab === 'liked' ? 'bg-terracotta text-ink-900 shadow-sm' : 'text-ink-900/55 hover:bg-ink-900/[0.05]'}`}><Heart size={15} className={activeTab === 'liked' ? 'fill-current' : ''} />Liked <span className="text-xs opacity-70">{likedAddons.length}</span></button></div></div>
        {visibleAddons.length === 0 ? <div className="rounded-2xl border border-parchment-border bg-parchment-raised px-6 py-20 text-center shadow-card"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-terracotta/12 text-terracotta-text">{activeTab === 'saved' ? <Bookmark size={26} /> : <Heart size={26} />}</div><h2 className="mt-5 text-xl font-bold text-ink-900">{activeTab === 'saved' ? 'Your saved list is ready' : 'No liked add-ons yet'}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-900/55">{activeTab === 'saved' ? 'Use the bookmark icon on an add-on to keep it close.' : 'Tap the heart on add-ons that inspire you and they will appear here.'}</p><button type="button" onClick={() => onNavigate('home')} className={`mt-6 ${getButtonClasses('primary', 'md')}`}>Explore add-ons</button></div> : <div className={layoutMode === 'grid' ? 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'overflow-hidden rounded-2xl border border-parchment-border bg-parchment-raised'}>{visibleAddons.map((addon, index) => <AddonCard key={addon.id} addon={addon} isLiked={userLikes.has(addon.id)} isBookmarked={userBookmarks.has(addon.id)} onToggleLike={onToggleLike} onToggleBookmark={onToggleBookmark} onRequireAuth={onRequireAuth} onNavigate={onNavigate} compact={layoutMode === 'list'} priority={index === 0} />)}</div>}
      </>}
    </div>
  </section>;
}
