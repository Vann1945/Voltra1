import React, { useState } from 'react';
import {
  Heart, Download, Star, ArrowDownToLine,
  Info, Check, ExternalLink, Clock
} from 'lucide-react';
import { Addon } from '../types';
import { PROFILE_UPDATED_EVENT, ProfileUpdate, useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { ViewState } from '../App';
import { FadeImage } from './FadeImage';
import { ProfileAvatar } from './borderEffects';
import { getButtonClasses } from '../lib/designSystem';

// Cache kecil di level modul supaya banyak <AddonCard> dari author yang sama
// tidak masing-masing nembak /api/users sendiri-sendiri (N+1 request tiap
// render list). In-flight promise juga di-dedupe biar 2 card yang mount
// bersamaan cuma bikin 1 request jaringan.
type AuthorInfo = { photoURL: string | null; profileBorder: string };
const authorInfoCache = new Map<string, AuthorInfo>();
const authorInfoInFlight = new Map<string, Promise<AuthorInfo>>();

function fetchAuthorInfo(authorId: string): Promise<AuthorInfo> {
  const cached = authorInfoCache.get(authorId);
  if (cached) return Promise.resolve(cached);

  const inFlight = authorInfoInFlight.get(authorId);
  if (inFlight) return inFlight;

  const promise = fetch(`/api/users?id=${authorId}`)
    .then(async (res) => {
      const info: AuthorInfo = res.ok
        ? await res.json().then((data) => ({ photoURL: data.photoURL || null, profileBorder: data.profileBorder || 'none' }))
        : { photoURL: null, profileBorder: 'none' };
      authorInfoCache.set(authorId, info);
      return info;
    })
    .catch(() => ({ photoURL: null, profileBorder: 'none' }))
    .finally(() => {
      authorInfoInFlight.delete(authorId);
    });

  authorInfoInFlight.set(authorId, promise);
  return promise;
}

function getFirstImage(value: unknown, fallback?: string): string | undefined {
  if (Array.isArray(value)) {
    const first = value.find((item): item is string => typeof item === 'string' && item.trim().length > 0);
    return first || fallback;
  }
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return getFirstImage(parsed, fallback);
    } catch {
      return value.trim();
    }
  }
  return typeof fallback === 'string' && fallback.trim() ? fallback.trim() : undefined;
}

function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<(br|\/p|\/div|\/li)>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatCount(n: number): string {
  if (!n) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2).replace(/\.?0+$/, '') + 'M';
  if (n >= 10_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toLocaleString('en-US');
}

function formatRelativeTime(dateInput: string | number | Date): string {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 1) return 'today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return diffMonths <= 1 ? '1 month ago' : `${diffMonths} months ago`;
  const diffYears = Math.floor(diffMonths / 12);
  return diffYears <= 1 ? '1 year ago' : `${diffYears} years ago`;
}

interface AddonCardProps {
  addon: Addon;
  isLiked: boolean;
  onToggleLike: (addonId: string, isLiked: boolean) => void;
  onRequireAuth?: () => void;
  onNavigate?: (view: ViewState) => void;
  priority?: boolean;
  compact?: boolean;
}

export const AddonCard = React.memo(function AddonCard({ addon, isLiked, onToggleLike, onRequireAuth, onNavigate, priority = false, compact = false }: AddonCardProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [authorPhoto, setAuthorPhoto] = useState<string | null>(addon.authorPhoto ?? null);
  const [authorBorder, setAuthorBorder] = useState<string>(addon.authorBorder ?? 'none');
  const [showInfo, setShowInfo] = useState(false);

  const coverImage = getFirstImage(addon.imageUrls, addon.imageUrl);

  React.useEffect(() => {
    if (addon.authorPhoto !== undefined || addon.authorBorder !== undefined) {
      setAuthorPhoto(addon.authorPhoto ?? null);
      setAuthorBorder(addon.authorBorder ?? 'none');
      return;
    }
    let cancelled = false;
    fetchAuthorInfo(addon.authorId).then((info) => {
      if (!cancelled) {
        setAuthorPhoto(info.photoURL);
        setAuthorBorder(info.profileBorder);
      }
    });
    return () => { cancelled = true; };
  }, [addon.authorId, addon.authorPhoto, addon.authorBorder]);

  React.useEffect(() => {
    const handleProfileUpdated = (event: Event) => {
      const detail = (event as CustomEvent<ProfileUpdate>).detail;
      if (!detail?.uid || detail.uid !== addon.authorId) return;
      authorInfoCache.delete(addon.authorId);
      setAuthorPhoto(detail.photoURL || null);
      setAuthorBorder(detail.profileBorder || 'none');
    };

    window.addEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated);
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated);
  }, [addon.authorId]);

  const handleLikeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { if (onRequireAuth) onRequireAuth(); return; }
    onToggleLike(addon.id, isLiked);
  };

  const handleCardClick = () => {
    if (onNavigate) onNavigate({ type: 'addon', id: addon.id });
  };

  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.currentTarget !== e.target) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick();
    }
  };

  const handleAuthorClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onNavigate) onNavigate({ type: 'author', id: addon.authorId });
  };

  const handleDownloadClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isDownloading || downloadSuccess) return;

    // Buka tab download LANGSUNG di dalam handler klik (masih dalam user-gesture
    // yang sama secara sinkron). Kalau ditunda lewat await/setTimeout, banyak
    // browser (Chrome, Safari, Firefox) akan mem-blokir window.open sebagai
    // popup karena dianggap bukan hasil interaksi langsung pengguna.
    const downloadWindow = window.open('', '_blank');
    if (downloadWindow) {
      downloadWindow.opener = null;
      downloadWindow.location.href = addon.downloadUrl;
    } else {
      showToast('Pop-up diblokir browser. Izinkan pop-up untuk situs ini lalu coba lagi.', 'error');
    }

    setIsDownloading(true);
    setDownloadProgress(0);
    const interval = setInterval(() => {
      setDownloadProgress(prev => { if (prev >= 100) { clearInterval(interval); return 100; } return prev + 10; });
    }, 200);
    try {
      // Hitung download di background; jangan sampai kegagalan hitung
      // menghalangi UX (file sudah kebuka duluan).
      fetch(`/api/addons?id=${addon.id}&action=download`, { method: 'POST' }).catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 900));
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (error) {
      showToast('Download failed. Please try again.', 'error');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
      clearInterval(interval);
    }
  };

  const toggleInfo = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowInfo(!showInfo);
  };

  if (compact) {
    return (
      <div
        onClick={handleCardClick}
        onKeyDown={handleCardKeyDown}
        role="button"
        tabIndex={0}
        aria-label={`Open ${addon.title}`}
        className="group flex w-full cursor-pointer items-center gap-3 rounded-xl bg-parchment-raised px-3 py-2.5 transition-[background-color,box-shadow] hover:bg-ink-900/[0.03] active:bg-ink-900/[0.05] focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2"
      >
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-ink-900">
          <FadeImage
            src={coverImage}
            fallbackSrc={addon.imageUrl}
            alt={addon.title}
            containerClassName="h-full w-full"
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            sizes={compact ? '56px' : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px'}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <h3 className="truncate text-sm font-bold text-ink-900">{addon.title}</h3>
            <span className="shrink-0 text-xs font-medium text-ink-900/45">by {addon.authorName}</span>
            {addon.status === 'pending' && (
              <span className="shrink-0 rounded-md bg-terracotta px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-ink-900">Pending</span>
            )}
            {addon.status === 'rejected' && (
              <span className="shrink-0 rounded-md bg-danger px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">Rejected</span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs font-medium text-ink-900/55">
            {stripHtml(addon.description)}
          </p>
          {addon.tags && addon.tags.length > 0 && (
            <div className="mt-1.5 flex items-center gap-1.5">
              {addon.tags.slice(0, 3).map((tag, i) => (
                <span
                  key={i}
                  className="shrink-0 rounded-md bg-ink-900/[0.05] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-900/55"
                >
                  {tag}
                </span>
              ))}
              {addon.tags.length > 3 && (
                <span className="shrink-0 text-[10px] font-bold text-ink-900/35">+{addon.tags.length - 3}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="flex items-center gap-2.5 text-xs font-bold text-ink-900/75">
            <span className="flex items-center gap-1" title="Downloads">
              <ArrowDownToLine aria-hidden="true" size={12} />
              {formatCount(addon.downloadsCount || 0)}
            </span>
            <button
              type="button"
              onClick={handleLikeClick}
              aria-label={`${isLiked ? 'Unlike' : 'Like'} ${addon.title}`}
              className={`flex items-center gap-1 transition-colors ${isLiked ? 'text-terracotta-text' : 'hover:text-terracotta-text'}`}
            >
              <Heart aria-hidden="true" size={12} className={isLiked ? 'fill-current' : ''} />
              {formatCount(addon.likesCount)}
            </button>
          </div>
          <span className="flex items-center gap-1 text-[11px] font-medium text-ink-900/40">
            <Clock size={11} />
            {formatRelativeTime(addon.createdAt)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Open ${addon.title}`}
      className={`group relative flex cursor-pointer flex-col overflow-hidden bg-parchment-raised transition-[transform,box-shadow,border-color] duration-200 ease-out hover:shadow-card-hover hover:-translate-y-1 active:translate-y-0 focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 ${compact ? 'rounded-xl shadow-card glass' : 'rounded-2xl shadow-card neumorph'}`}
    >
      <div className={`relative ${compact ? 'aspect-[16/8]' : 'aspect-[16/10]'} w-full overflow-hidden bg-ink-900`}>
        <FadeImage
          src={coverImage}
          fallbackSrc={addon.imageUrl}
          alt={addon.title}
          containerClassName="h-full w-full"
          className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          referrerPolicy="no-referrer"
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
        />

        <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
          <span className="inline-flex items-center bg-terracotta rounded-xl px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-paper shadow-sm">
            {addon.category}
          </span>
          {addon.status === 'pending' && (
            <span className="inline-flex items-center bg-parchment-raised rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-ink-900 shadow-sm border border-parchment-border">
              Pending
            </span>
          )}
          {addon.status === 'rejected' && (
            <span className="inline-flex items-center bg-danger rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-sm">
              Rejected
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className={`flex flex-1 flex-col ${compact ? 'p-3' : 'p-5'} bg-parchment-raised`}>
        <div className="flex items-start justify-between gap-3">
          <h3 className={`font-bold text-ink-900 leading-tight line-clamp-1 uppercase tracking-tight ${compact ? 'text-sm' : 'text-base'}`}>
            {addon.title}
          </h3>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={toggleInfo}
              aria-label={showInfo ? 'Hide additional info' : 'Show additional info'}
              className={`p-1.5 rounded-lg transition-all duration-300 ease-out active:scale-[0.97] ${showInfo ? 'bg-terracotta-text text-white shadow-none' : 'bg-parchment-raised text-ink-900 shadow-sm border border-parchment-border hover:border-ink-900/20 hover:shadow-md'}`}
            >
              <Info size={14} />
            </button>
            {addon.averageRating !== undefined && addon.averageRating > 0 && (
              <div className="flex items-center gap-1 bg-terracotta rounded-lg px-2 py-1 text-xs font-bold text-ink-900 shadow-card">
                <Star size={11} className="fill-ink" />
                <span>{addon.averageRating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>

        {addon.tags && addon.tags.length > 0 && (
          <div className={`mt-2 flex flex-wrap gap-1.5 ${compact ? 'hidden' : ''}`}>
            {addon.tags.slice(0, 3).map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center border border-parchment-border rounded-lg bg-parchment-raised px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-900/70"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {showInfo ? (
          <div className={`mt-3 flex-1 overflow-y-auto pr-1 space-y-3 ${compact ? 'text-xs' : 'text-sm'} text-ink-900/70 custom-scrollbar`}>
            {addon.demoUrl && (
              <div>
                <strong className="text-ink-900 text-xs uppercase tracking-wider font-bold">Demo</strong>
                <p className="mt-1">
                  <a href={addon.demoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-terracotta-text font-bold underline decoration-terracotta-text/40 underline-offset-2 hover:decoration-terracotta-text">
                    View Demo <ExternalLink size={12} />
                  </a>
                </p>
              </div>
            )}
            {addon.versionHistory && (
              <div>
                <strong className="text-ink-900 text-xs uppercase tracking-wider font-bold">Version History</strong>
                <p className="mt-1 font-medium">{addon.versionHistory}</p>
              </div>
            )}
            {addon.compatibilityNotes && (
              <div>
                <strong className="text-ink-900 text-xs uppercase tracking-wider font-bold">Compatibility</strong>
                <p className="mt-1 font-medium">{addon.compatibilityNotes}</p>
              </div>
            )}
            {addon.changelog && (
              <div>
                <strong className="text-ink-900 text-xs uppercase tracking-wider font-bold">Changelog</strong>
                <p className="mt-1 whitespace-pre-wrap text-xs font-medium">{addon.changelog}</p>
              </div>
            )}
            {!addon.versionHistory && !addon.compatibilityNotes && !addon.changelog && !addon.demoUrl && (
              <p className="italic opacity-50 font-medium">No additional info available.</p>
            )}
          </div>
        ) : (
          <p className={`mt-2.5 line-clamp-2 flex-1 ${compact ? 'text-xs' : 'text-sm'} text-ink-900/60 leading-relaxed font-medium`}>
            {stripHtml(addon.description)}
          </p>
        )}

        <div className={`flex items-center justify-between border-t border-parchment-border ${compact ? 'mt-3 pt-3' : 'mt-5 pt-4'}`}>
              <button
            type="button"
            aria-label={`Open profile of ${addon.authorName}`}
            className="flex items-center gap-2 text-xs font-bold text-ink-900 cursor-pointer hover:text-terracotta-text transition-colors"
            onClick={handleAuthorClick}
          >
            <ProfileAvatar photoURL={authorPhoto} displayName={addon.authorName} borderValue={authorBorder} sizeClassName={compact ? 'h-6 w-6' : 'h-7 w-7'} textSizeClassName={compact ? 'text-[10px]' : 'text-xs'} />
            <span className="truncate max-w-[100px]">{addon.authorName}</span>
          </button>

          <div className={`flex items-center gap-3 ${compact ? 'gap-2' : ''}`}>
            <button
              type="button"
              onClick={handleLikeClick}
              aria-label={`${isLiked ? 'Unlike' : 'Like'} ${addon.title}`}
              className={`flex items-center gap-1 text-xs font-bold transition-colors ${isLiked ? 'text-terracotta-text' : 'text-ink-900 hover:text-terracotta-text'}`}
            >
              <Heart aria-hidden="true" size={15} className={isLiked ? 'fill-current' : ''} />
              <span>{addon.likesCount}</span>
            </button>
            <div className="flex items-center gap-1 text-xs font-bold text-ink-900">
              <ArrowDownToLine aria-hidden="true" size={15} />
              <span>{addon.downloadsCount || 0}</span>
            </div>
            <button
              type="button"
              onClick={handleDownloadClick}
              disabled={isDownloading}
              aria-label={`${downloadSuccess ? 'Downloaded' : 'Download'} ${addon.title}`}
              className={`relative overflow-hidden flex items-center gap-1.5 border border-parchment-border rounded-lg px-3 py-1.5 text-xs font-bold uppercase transition-all duration-300 ease-out active:scale-[0.97] ${
                downloadSuccess
                  ? 'bg-parchment-raised text-success shadow-sm'
                  : 'bg-terracotta text-ink-900 shadow-sm hover:shadow-md hover:border-terracotta/50'
              }`}
            >
              {isDownloading && (
                <div
                  className="absolute inset-0 origin-left bg-terracotta-soft/30 transition-transform duration-200 ease-linear will-change-transform"
                  style={{ transform: `scaleX(${downloadProgress / 100})` }}
                />
              )}
              <div className="relative z-10 flex items-center gap-1">
                {isDownloading ? (
                  <div className="h-3.5 w-3.5 rounded-full bg-ink-900/[0.06] border border-parchment-border relative before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-ink-900/10 before:to-transparent" />
                ) : downloadSuccess ? <Check size={13} /> : <Download size={13} />}
                <span>{isDownloading ? `${downloadProgress}%` : downloadSuccess ? 'Done!' : 'Get'}</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
