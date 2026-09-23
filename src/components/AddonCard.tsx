'use client';

import React, { useEffect, useState, memo } from 'react';
import { Bookmark, Check, Download, Heart } from '@/components/icons/animated';
import { Addon } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { ViewState } from '@/types';
import { FadeImage } from './FadeImage';
import {
  toggleToolcoinBookmark,
  getToolcoinBookmarks,
} from '@/lib/toolcoinLocal';

function isProceduralSvg(url?: string | null): boolean {
  const s = (url || '').trim();
  if (!s) return true;
  return /\/api\/thumbnail\//i.test(s) || /thumbnail\/[^/]+\.svg/i.test(s);
}

function getFirstImage(value: unknown, fallback?: string): string | undefined {
  const candidates: string[] = [];
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string' && item.trim()) candidates.push(item.trim());
    }
  } else if (typeof value === 'string' && value.trim()) {
    candidates.push(value.trim());
  }
  if (fallback?.trim()) candidates.push(fallback.trim());
  const real = candidates.find((u) => !isProceduralSvg(u));
  return real || candidates[0];
}

function categoryIcon(category?: string, tags?: string[]): string {
  const c = (category || '').toLowerCase();
  const tagStr = (tags || []).join(' ').toLowerCase();
  if (c.includes('world') || tagStr.includes('world')) return '/icon/world.png';
  if (c.includes('resource') || c.includes('texture') || tagStr.includes('texture')) return '/icon/texture.png';
  if (c.includes('skin') || tagStr.includes('skin')) return '/icon/skin.png';
  if (c.includes('mash') || c.includes('custom') || tagStr.includes('mashup')) return '/icon/mashup.png';
  if (c.includes('behavior')) return '/icon/addon.png';
  return '/icon/addon.png';
}

function isAvailable(addon: Addon): boolean {
  const extra = addon as Addon & { available?: boolean | number };
  if (typeof extra.available === 'boolean') return extra.available;
  if (typeof extra.available === 'number') return extra.available !== 0;
  const status = String((addon as { status?: unknown }).status ?? '');
  if (status === 'unavailable' || status === 'pending') return false;
  if (addon.source === 'toolcoin') return true;
  return true;
}

/** Human tags for chips — skip garbage / UUID */
function displayTags(addon: Addon, max = 5): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (raw?: string) => {
    const t = (raw || '').trim();
    if (!t || t.length > 28) return;
    const low = t.toLowerCase();
    if (seen.has(low)) return;
    if (/^[0-9a-f]{8}-/i.test(t) || /^[0-9a-f-]{16,}$/i.test(t)) return;
    if (['official', 'marketplace', 'addon', 'add-on'].includes(low)) return;
    seen.add(low);
    out.push(t);
  };
  // Category first so chips appear even before tags hydrate
  if (addon.category) push(addon.category);
  for (const t of addon.tags || []) {
    if (out.length >= max) break;
    push(String(t));
  }
  return out;
}

function initials(name?: string): string {
  const n = (name || '?').trim();
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return n.slice(0, 2).toUpperCase();
}

function CreatorAvatar({
  name,
  photo,
  size = 28,
}: {
  name?: string;
  photo?: string | null;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const src = photo && !failed ? photo : null;
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink-900/10 ring-1 ring-parchment-border text-ink-900/70 dark:bg-white/10 dark:text-paper/80"
      style={{ width: size, height: size }}
      title={name || 'Creator'}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="text-[10px] font-bold leading-none">{initials(name)}</span>
      )}
    </span>
  );
}

function formatCount(n?: number): string {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(v);
}

interface AddonCardProps {
  addon: Addon;
  isLiked?: boolean;
  isBookmarked?: boolean;
  onToggleLike?: (id: string, liked: boolean) => void;
  onToggleBookmark?: (id: string, bookmarked: boolean) => void;
  onRequireAuth?: () => void;
  onNavigate: (view: ViewState) => void;
  priority?: boolean;
  shelf?: boolean;
  compact?: boolean;
  layoutMode?: 'grid' | 'list';
}

export const AddonCard = memo(function AddonCard({
  addon,
  isLiked = false,
  isBookmarked = false,
  onToggleLike,
  onToggleBookmark,
  onRequireAuth,
  onNavigate,
  priority = false,
  shelf = false,
  compact = false,
  layoutMode = 'grid',
}: AddonCardProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [localBm, setLocalBm] = useState(false);

  useEffect(() => {
    if (addon.source === 'toolcoin') {
      setLocalBm(getToolcoinBookmarks().has(addon.id));
    }
  }, [addon.id, addon.source, isBookmarked]);

  const effectiveBookmarked = addon.source === 'toolcoin' ? localBm : isBookmarked;
  const coverImage = getFirstImage(addon.imageUrls, addon.imageUrl);
  const available = isAvailable(addon);
  const iconSrc = categoryIcon(addon.category, addon.tags);
  const tags = displayTags(addon, layoutMode === 'list' || compact ? 6 : 4);
  const desc = (addon.description || '').replace(/<[^>]+>/g, '').trim();

  const openDetail = () => {
    onNavigate({ type: 'addon', id: addon.id } as ViewState);
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      onRequireAuth?.();
      return;
    }
    onToggleLike?.(addon.id, isLiked);
  };

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (addon.source === 'toolcoin') {
      const nowOn = toggleToolcoinBookmark(addon.id);
      setLocalBm(nowOn);
      onToggleBookmark?.(addon.id, !nowOn);
      showToast(nowOn ? 'Saved.' : 'Removed from bookmarks.', 'success');
      return;
    }
    if (!user) {
      onRequireAuth?.();
      return;
    }
    onToggleBookmark?.(addon.id, isBookmarked);
  };

  const handleDownloadClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!available || isDownloading) return;
    const url = addon.downloadUrl;
    if (!url) {
      showToast('Download not available for this pack.', 'error');
      return;
    }
    setIsDownloading(true);
    try {
      const res = await fetch(url, { credentials: 'omit' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      if (!blob || blob.size < 32) throw new Error('Empty file');
      const cd = res.headers.get('Content-Disposition') || '';
      const m = /filename\*?=(?:UTF-8'')?["']?([^"';]+)/i.exec(cd);
      const filename = (m?.[1] || `${addon.title || 'pack'}.mcaddon`).replace(/[^\w.\- ]+/g, '_');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
      setDownloadSuccess(true);
      window.setTimeout(() => setDownloadSuccess(false), 2500);
    } catch {
      // fallback: open same-origin proxy in new tab
      window.open(url, '_blank', 'noopener,noreferrer');
    } finally {
      setIsDownloading(false);
    }
  };

  const AvailabilityMark = () =>
    available ? (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500/90 text-white shadow-sm">
        <Check size={12} />
      </span>
    ) : (
      <span className="inline-flex h-5 w-5 rounded-md border border-white/30 bg-ink-900/40" />
    );

  // ── Shelf (home rows) ──
  if (shelf) {
    return (
      <div className="group flex h-full w-full flex-col text-left">
        <button
          type="button"
          onClick={openDetail}
          className="relative aspect-square w-full overflow-hidden rounded-2xl bg-ink-900/90 ring-1 ring-parchment-border"
        >
          <FadeImage
            src={coverImage}
            fallbackSrc={addon.imageUrl || '/icon/pack_fallback.svg'}
            alt={addon.title}
            containerClassName="absolute inset-0"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading={priority ? 'eager' : 'lazy'}
          />
          <div className="absolute left-2 top-2 pointer-events-none">
            <AvailabilityMark />
          </div>
        </button>
        <div className="mt-2 min-w-0 px-0.5">
          <button type="button" onClick={openDetail} className="flex w-full items-start gap-1.5 text-left">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold leading-snug text-ink-900 dark:text-paper">
                {addon.title}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-ink-900/50 dark:text-paper/50">
                <CreatorAvatar name={addon.authorName} photo={addon.authorPhoto} size={14} />
                <span className="truncate">{addon.authorName || 'Marketplace'}</span>
              </p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={iconSrc} alt="" className="mt-0.5 h-4 w-4 shrink-0 object-contain opacity-75" />
          </button>
          {tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="max-w-[7rem] truncate rounded-md bg-ink-900/[0.06] px-1.5 py-0.5 text-[9px] font-semibold text-ink-900/50 dark:bg-white/10 dark:text-paper/55"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <div className="mt-1.5 flex items-center gap-0.5">
            <button
              type="button"
              onClick={handleLikeClick}
              className={`rounded-md p-1 transition ${isLiked ? 'text-terracotta' : 'text-ink-900/35 hover:text-ink-900/60 dark:text-paper/40'}`}
            >
              <Heart size={13} className={isLiked ? 'fill-current' : ''} />
            </button>
            <button
              type="button"
              onClick={handleDownloadClick}
              disabled={!available || isDownloading}
              className="rounded-md p-1 text-ink-900/35 transition hover:text-ink-900/60 disabled:opacity-35 dark:text-paper/40"
            >
              {downloadSuccess ? <Check size={13} /> : <Download size={13} />}
            </button>
            <button
              type="button"
              onClick={handleBookmarkClick}
              className={`rounded-md p-1 transition ${effectiveBookmarked ? 'text-terracotta' : 'text-ink-900/35 hover:text-ink-900/60 dark:text-paper/40'}`}
            >
              <Bookmark size={13} className={effectiveBookmarked ? 'fill-current' : ''} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── List (Modrinth-style row) ──
  if (layoutMode === 'list' || compact) {
    return (
      <article
        className="group flex w-full gap-3 rounded-2xl border border-parchment-border bg-parchment-raised p-3 shadow-sm transition hover:border-ink-900/20 hover:shadow-card dark:border-white/10 dark:bg-ink-900/40 sm:gap-4 sm:p-4"
        onClick={openDetail}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openDetail();
          }
        }}
      >
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-ink-900/80 ring-1 ring-parchment-border sm:h-20 sm:w-20">
          <FadeImage
            src={coverImage}
            fallbackSrc={addon.imageUrl || '/icon/pack_fallback.svg'}
            alt={addon.title}
            containerClassName="absolute inset-0"
            className="h-full w-full object-cover"
            loading={priority ? 'eager' : 'lazy'}
          />
          <div className="absolute left-1 top-1">
            <AvailabilityMark />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-bold leading-snug text-ink-900 dark:text-paper">
                {addon.title}
                <span className="ml-1.5 text-[12px] font-medium text-ink-900/45 dark:text-paper/45">
                  by {addon.authorName || 'Unknown'}
                </span>
              </h3>
              {desc ? (
                <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-ink-900/55 dark:text-paper/55">
                  {desc}
                </p>
              ) : null}
            </div>
            <div className="hidden shrink-0 items-center gap-3 text-[11px] font-semibold text-ink-900/45 dark:text-paper/45 sm:flex">
              <span className="inline-flex items-center gap-1">
                <Download size={12} /> {formatCount(addon.downloadsCount)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Heart size={12} /> {formatCount(addon.likesCount)}
              </span>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <CreatorAvatar name={addon.authorName} photo={addon.authorPhoto} size={18} />
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-md border border-parchment-border bg-parchment px-1.5 py-0.5 text-[10px] font-semibold text-ink-900/60 dark:border-white/10 dark:bg-white/5 dark:text-paper/65"
              >
                {tag}
              </span>
            ))}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={iconSrc} alt="" className="ml-auto h-4 w-4 object-contain opacity-60 sm:ml-0" />
          </div>
        </div>
      </article>
    );
  }

  // ── Grid (Modrinth-style card) ──
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-parchment-border bg-parchment-raised shadow-sm transition hover:border-ink-900/20 hover:shadow-card dark:border-white/10 dark:bg-ink-900/40">
      <button
        type="button"
        onClick={openDetail}
        className="relative aspect-[16/10] w-full overflow-hidden bg-ink-900/90 text-left"
      >
        <FadeImage
          src={coverImage}
          fallbackSrc={addon.imageUrl || '/icon/pack_fallback.svg'}
          alt={addon.title}
          containerClassName="absolute inset-0"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          loading={priority ? 'eager' : 'lazy'}
        />
        <div className="absolute left-2 top-2">
          <AvailabilityMark />
        </div>
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
          <p className="truncate text-[15px] font-bold text-white">{addon.title}</p>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-white/75">
            <CreatorAvatar name={addon.authorName} photo={addon.authorPhoto} size={16} />
            <span className="truncate">by {addon.authorName || 'Marketplace'}</span>
          </p>
        </div>
      </button>

      <div className="flex flex-1 flex-col gap-2 p-3">
        {desc ? (
          <p className="line-clamp-2 text-[12px] leading-relaxed text-ink-900/55 dark:text-paper/55">
            {desc}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-md border border-parchment-border bg-parchment px-1.5 py-0.5 text-[10px] font-semibold text-ink-900/60 dark:border-white/10 dark:bg-white/5 dark:text-paper/65"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-parchment-border pt-2 dark:border-white/10">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-ink-900/45 dark:text-paper/45">
            <span className="inline-flex items-center gap-0.5">
              <Download size={12} /> {formatCount(addon.downloadsCount)}
            </span>
            <span className="inline-flex items-center gap-0.5">
              <Heart size={12} /> {formatCount(addon.likesCount)}
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={handleLikeClick}
              className={`rounded-md p-1.5 transition ${isLiked ? 'text-terracotta' : 'text-ink-900/35 hover:text-ink-900/60 dark:text-paper/40'}`}
              aria-label="Like"
            >
              <Heart size={14} className={isLiked ? 'fill-current' : ''} />
            </button>
            <button
              type="button"
              onClick={handleBookmarkClick}
              className={`rounded-md p-1.5 transition ${effectiveBookmarked ? 'text-terracotta' : 'text-ink-900/35 hover:text-ink-900/60 dark:text-paper/40'}`}
              aria-label="Bookmark"
            >
              <Bookmark size={14} className={effectiveBookmarked ? 'fill-current' : ''} />
            </button>
            <button
              type="button"
              onClick={handleDownloadClick}
              disabled={!available || isDownloading}
              className="inline-flex h-8 items-center gap-1 rounded-xl bg-terracotta px-2.5 text-[11px] font-bold text-ink-900 transition hover:opacity-90 disabled:opacity-50"
            >
              {downloadSuccess ? 'Got it' : isDownloading ? '…' : available ? 'Get' : 'N/A'}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
});
