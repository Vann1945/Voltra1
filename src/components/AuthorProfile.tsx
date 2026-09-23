'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { AddonCard } from './AddonCard';
import { getButtonClasses } from '@/lib/designSystem';
import { Addon } from '@/types';
import { Package, Heart, ArrowLeft } from '@/components/icons/animated';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { ViewState } from '@/types';
import { motion } from 'motion/react';
import { SkeletonCard } from './Skeleton';
import { ProfileAvatar } from './borderEffects';
import {
  fetchToolcoinCatalogPage,
  toolcoinItemToAddon,
  clientToolcoinBase,
  matchesLooseQuery,
} from '@/lib/toolcoin';

interface AuthorProfileProps {
  authorId: string;
  addons: Addon[];
  loading: boolean;
  userLikes: Set<string>;
  userBookmarks: Set<string>;
  onToggleLike: (addonId: string, isLiked: boolean) => void;
  onToggleBookmark: (addonId: string, isBookmarked: boolean) => void;
  onRequireAuth: () => void;
  onNavigate: (view: ViewState) => void;
}

function isToolcoinAuthor(authorId: string): boolean {
  return (authorId || '').startsWith('toolcoin:');
}

/** toolcoin:oreville-studios → "oreville studios" */
function toolcoinAuthorQuery(authorId: string): string {
  return authorId
    .replace(/^toolcoin:/i, '')
    .replace(/-/g, ' ')
    .trim();
}

export function AuthorProfile({
  authorId,
  addons,
  loading,
  userLikes,
  userBookmarks,
  onToggleLike,
  onToggleBookmark,
  onRequireAuth,
  onNavigate,
}: AuthorProfileProps) {
  const [authorPhoto, setAuthorPhoto] = useState<string | null>(null);
  const [authorBorder, setAuthorBorder] = useState<string>('none');
  const [authorDisplayName, setAuthorDisplayName] = useState<string>('');
  const [toolcoinAddons, setToolcoinAddons] = useState<Addon[]>([]);
  const [toolcoinLoading, setToolcoinLoading] = useState(false);
  const { user } = useAuth();
  const { showToast } = useToast();

  // Community authors → existing /api/users
  useEffect(() => {
    if (!authorId || isToolcoinAuthor(authorId)) return;
    let cancelled = false;
    const fetchAuthorData = async () => {
      try {
        const res = await fetch(`/api/users?id=${encodeURIComponent(authorId)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setAuthorPhoto(data.photoURL || null);
        setAuthorBorder(data.profileBorder || 'none');
        setAuthorDisplayName(data.displayName || '');
      } catch {
        if (!cancelled) showToast('Failed to load author profile.', 'error');
      }
    };
    void fetchAuthorData();
    return () => {
      cancelled = true;
    };
  }, [authorId, showToast]);

  // Official Marketplace creators → fetch ALL packs from ToolCoin by creator name
  useEffect(() => {
    if (!authorId || !isToolcoinAuthor(authorId)) {
      setToolcoinAddons([]);
      return;
    }
    const q = toolcoinAuthorQuery(authorId);
    if (!q) return;

    const controller = new AbortController();
    let active = true;
    setToolcoinLoading(true);

    (async () => {
      const base = clientToolcoinBase();
      const collected: Addon[] = [];
      const seen = new Set<string>();
      // Pull several pages — creator catalogs are usually < a few hundred
      for (let page = 1; page <= 20; page++) {
        const result = await fetchToolcoinCatalogPage({
          page,
          limit: 50,
          category: 'all',
          creator: q,
          sort: 'title',
          signal: controller.signal,
        });
        for (const item of result.items) {
          if (!item?.id || seen.has(item.id)) continue;
          const creatorName = (item.creator || '').trim();
          // Keep server-filtered rows; only drop obvious wrong creators when set
          if (
            creatorName &&
            creatorName.toLowerCase() !== 'marketplace creator' &&
            !matchesLooseQuery(creatorName, q) &&
            !matchesLooseQuery(q, creatorName)
          ) {
            const slug = creatorName.toLowerCase().replace(/\s+/g, '-');
            if (slug !== authorId.replace(/^toolcoin:/i, '')) continue;
          }
          seen.add(item.id);
          collected.push(toolcoinItemToAddon(item, base));
        }
        if (!result.has_more || result.items.length === 0) break;
      }
      if (!active) return;
      setToolcoinAddons(collected);
      // Prefer real creator string + photo from first enriched pack
      const sample = collected.find((a) => a.authorName && a.authorName !== 'Marketplace Creator');
      if (sample) {
        setAuthorDisplayName(sample.authorName);
        if (sample.authorPhoto) setAuthorPhoto(sample.authorPhoto);
      } else if (q) {
        setAuthorDisplayName(q.replace(/\b\w/g, (c) => c.toUpperCase()));
      }
      setToolcoinLoading(false);
    })().catch((err) => {
      if (!active || err?.name === 'AbortError') return;
      setToolcoinLoading(false);
      showToast('Failed to load creator catalog.', 'error');
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [authorId, showToast]);

  // Community packs already in memory + full ToolCoin creator catalog
  const authorAddons = useMemo(() => {
    const fromList = addons.filter(
      (a) =>
        a.authorId === authorId ||
        a.collaborators?.some((c) => c.uid === authorId)
    );

    if (isToolcoinAuthor(authorId)) {
      const byId = new Map<string, Addon>();
      for (const a of fromList) byId.set(a.id, a);
      for (const a of toolcoinAddons) byId.set(a.id, a);
      return Array.from(byId.values()).sort((a, b) =>
        (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' })
      );
    }

    return fromList.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [addons, authorId, toolcoinAddons]);

  const authorName =
    authorDisplayName ||
    authorAddons.find((a) => a.authorId === authorId)?.authorName ||
    authorAddons.find((a) => a.collaborators?.some((c) => c.uid === authorId))
      ?.collaborators?.find((c) => c.uid === authorId)?.displayName ||
    (isToolcoinAuthor(authorId)
      ? toolcoinAuthorQuery(authorId).replace(/\b\w/g, (c) => c.toUpperCase())
      : 'Unknown Author');

  const totalLikes = useMemo(
    () => authorAddons.reduce((sum, addon) => sum + (addon.likesCount || 0), 0),
    [authorAddons]
  );

  if (loading || toolcoinLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 min-h-[100dvh]">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (authorAddons.length === 0) {
    return (
      <div className="py-32 text-center min-h-[100dvh]">
        <h3 className="text-lg font-bold text-ink-900 uppercase">
          This author has no public add-ons yet
        </h3>
        <button
          onClick={() => onNavigate('home')}
          className={`mt-5 ${getButtonClasses('secondary', 'md')}`}
        >
          Return to Marketplace
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 min-h-[100dvh]">
      <button
        onClick={() => onNavigate('home')}
        className="mb-8 flex items-center gap-2 text-sm font-bold text-ink-900 uppercase hover:text-terracotta-text transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Marketplace
      </button>

      <div className="mb-12 flex flex-col md:flex-row items-start md:items-center gap-6 relative bg-parchment-raised p-8 rounded-lg shadow-card neumorph glass">
        <ProfileAvatar
          photoURL={authorPhoto}
          displayName={authorName}
          borderValue={authorBorder}
          sizeClassName="h-28 w-28"
          textSizeClassName="text-4xl font-bold"
        />

        <div className="flex-1 w-full">
          <h1 className="text-3xl font-bold text-ink-900 tracking-tight">{authorName}</h1>
          {isToolcoinAuthor(authorId) && (
            <p className="mt-1 text-sm font-semibold text-emerald-700">Official Marketplace Creator</p>
          )}
          <div className="mt-4 flex items-center gap-3 text-sm font-bold text-ink-900">
            <span className="flex items-center gap-2 bg-parchment-raised px-3 py-1.5 rounded-lg shadow-card">
              <Package size={15} /> {authorAddons.length} Projects
            </span>
            <span className="flex items-center gap-2 bg-parchment-raised px-3 py-1.5 rounded-lg shadow-card">
              <Heart size={15} /> {totalLikes} Total Likes
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-16">
        <section>
          <h2 className="mb-6 text-xl font-bold text-ink-900 uppercase tracking-tight flex items-center gap-2">
            <Package size={20} className="text-terracotta-soft" /> Projects by {authorName}
          </h2>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
            }}
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {authorAddons.map((addon) => (
              <motion.div
                key={addon.id}
                variants={{
                  hidden: { opacity: 0, y: 16 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
                }}
              >
                <AddonCard
                  addon={addon}
                  isLiked={userLikes.has(addon.id)}
                  isBookmarked={userBookmarks.has(addon.id)}
                  onToggleLike={onToggleLike}
                  onToggleBookmark={onToggleBookmark}
                  onRequireAuth={onRequireAuth}
                  onNavigate={onNavigate}
                />
              </motion.div>
            ))}
          </motion.div>
        </section>
      </div>
    </div>
  );
}
