import React, { useEffect, useState } from 'react';
import { ArrowDownToLine, Bookmark, Check, Clock, Download, Heart, Info, Star } from 'lucide-react';
import { Addon } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { ViewState } from '../App';
import { FadeImage } from './FadeImage';
import { ProfileAvatar } from './borderEffects';
import { AddonPeople } from './AddonPeople';

function getFirstImage(value: unknown, fallback?: string): string | undefined {
  if (Array.isArray(value)) return value.find((item): item is string => typeof item === 'string' && Boolean(item.trim())) || fallback;
  if (typeof value === 'string' && value.trim()) return value.trim();
  return fallback?.trim() || undefined;
}

function stripHtml(html: string): string {
  return (html || '').replace(/<(br|\/p|\/div|\/li)>/gi, ' ').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatCount(value: number): string {
  if (!value) return '0';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 10_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return value.toLocaleString('en-US');
}

function formatRelativeTime(input: string): string {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return '';
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return `${Math.floor(days / 30)} mo ago`;
}

interface AddonCardProps {
  addon: Addon;
  isLiked: boolean;
  isBookmarked?: boolean;
  onToggleLike: (addonId: string, isLiked: boolean) => void;
  onToggleBookmark?: (addonId: string, isBookmarked: boolean) => void;
  onRequireAuth?: () => void;
  onNavigate?: (view: ViewState) => void;
  priority?: boolean;
  compact?: boolean;
}

export const AddonCard = React.memo(function AddonCard({ addon, isLiked, isBookmarked = false, onToggleLike, onToggleBookmark, onRequireAuth, onNavigate, priority = false, compact = false }: AddonCardProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [authorPhoto, setAuthorPhoto] = useState<string | null>(addon.authorPhoto ?? null);
  const [authorBorder, setAuthorBorder] = useState(addon.authorBorder ?? 'none');
  const [collaborators, setCollaborators] = useState(addon.collaborators ?? []);

  useEffect(() => {
    setAuthorPhoto(addon.authorPhoto ?? null);
    setAuthorBorder(addon.authorBorder ?? 'none');
    setCollaborators(addon.collaborators ?? []);
  }, [addon.authorPhoto, addon.authorBorder, addon.collaborators]);

  const coverImage = getFirstImage(addon.imageUrls, addon.imageUrl);
  const stop = (event: React.MouseEvent) => event.stopPropagation();
  const handleCardClick = () => onNavigate?.({ type: 'addon', id: addon.id });
  const handleAuthorClick = (event: React.MouseEvent) => { stop(event); onNavigate?.({ type: 'author', id: addon.authorId }); };
  const handleLikeClick = (event: React.MouseEvent) => {
    stop(event);
    if (!user) { onRequireAuth?.(); return; }
    onToggleLike(addon.id, isLiked);
  };
  const handleBookmarkClick = (event: React.MouseEvent) => {
    stop(event);
    if (!user) { onRequireAuth?.(); return; }
    onToggleBookmark?.(addon.id, isBookmarked);
    showToast(isBookmarked ? 'Removed from Library.' : 'Saved to Library.', 'success');
  };
  const handleDownloadClick = async (event: React.MouseEvent) => {
    stop(event);
    if (isDownloading || downloadSuccess) return;
    const downloadWindow = window.open('', '_blank');
    if (!downloadWindow) { showToast('Pop-up blocked. Allow pop-ups for this site and try again.', 'error'); return; }
    downloadWindow.opener = null;
    downloadWindow.location.href = addon.downloadUrl;
    setIsDownloading(true);
    fetch(`/api/addons?id=${addon.id}&action=download`, { method: 'POST' }).catch(() => undefined);
    await new Promise(resolve => window.setTimeout(resolve, 900));
    setIsDownloading(false);
    setDownloadSuccess(true);
    window.setTimeout(() => setDownloadSuccess(false), 1800);
  };

  if (compact) {
    return (
      <article onClick={handleCardClick} className="group flex w-full cursor-pointer items-center gap-4 border-b border-parchment-border bg-parchment-raised px-4 py-4 transition-colors hover:bg-ink-900/[0.025] focus-within:bg-ink-900/[0.025]">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-ink-900"><FadeImage src={coverImage} fallbackSrc={addon.imageUrl} alt={addon.title} containerClassName="h-full w-full" className="h-full w-full object-cover" loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} /></div>
        <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="truncate text-sm font-bold text-ink-900">{addon.title}</h3>{addon.unlisted && <span className="rounded-full bg-ink-900/[0.06] px-2 py-0.5 text-[10px] font-bold text-ink-900/55">Unlisted</span>}</div><p className="mt-1 truncate text-xs text-ink-900/55">{stripHtml(addon.description)}</p><p className="mt-2 text-xs font-semibold text-ink-900/55">{addon.authorName} · {formatRelativeTime(addon.createdAt)}</p></div>
        <div className="flex shrink-0 items-center gap-1"><button type="button" onClick={handleBookmarkClick} aria-label={`${isBookmarked ? 'Remove from Library' : 'Save to Library'}: ${addon.title}`} className={`rounded-lg p-2 transition-colors hover:bg-terracotta/10 ${isBookmarked ? 'text-terracotta-text' : 'text-ink-900/45'}`}><Bookmark size={15} className={isBookmarked ? 'fill-current' : ''} /></button><button type="button" onClick={handleLikeClick} aria-label={`${isLiked ? 'Unlike' : 'Like'} ${addon.title}`} className={`flex items-center gap-1 rounded-lg px-2 py-2 transition-colors hover:bg-terracotta/10 ${isLiked ? 'text-terracotta-text' : 'text-ink-900/55'}`}><Heart size={14} className={isLiked ? 'fill-current' : ''} />{formatCount(addon.likesCount)}</button></div>
      </article>
    );
  }

  return (
    <article onClick={handleCardClick} className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-parchment-border bg-parchment-raised shadow-card transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover focus-within:ring-2 focus-within:ring-terracotta">
      <div className="relative aspect-[16/10] overflow-hidden bg-ink-900"><FadeImage src={coverImage} fallbackSrc={addon.imageUrl} alt={addon.title} containerClassName="h-full w-full" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} /><div className="absolute inset-x-4 top-4 flex items-start justify-between gap-3"><span className="rounded-full bg-ink-900/85 px-2.5 py-1 text-[10px] font-bold text-paper">{addon.category}</span><button type="button" onClick={handleBookmarkClick} aria-label={`${isBookmarked ? 'Remove from Library' : 'Save to Library'}: ${addon.title}`} className={`rounded-xl border border-white/15 bg-ink-900/75 p-2 text-white backdrop-blur-sm transition-[background-color,color,transform] duration-150 hover:bg-ink-900 active:scale-[0.96] ${isBookmarked ? 'text-terracotta' : ''}`}><Bookmark size={16} className={isBookmarked ? 'fill-current' : ''} /></button></div></div>
      <div className="flex flex-1 flex-col p-5"><div className="flex items-start justify-between gap-3"><h3 className="line-clamp-2 text-lg font-bold leading-6 text-ink-900">{addon.title}</h3>{addon.averageRating ? <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-terracotta/15 px-2 py-1 text-xs font-bold text-terracotta-text"><Star size={12} className="fill-current" />{addon.averageRating.toFixed(1)}</span> : null}</div><p className="mt-3 line-clamp-3 text-sm leading-6 text-ink-900/60">{stripHtml(addon.description)}</p>{addon.tags?.length ? <div className="mt-4 flex flex-wrap gap-2">{addon.tags.slice(0, 3).map(tag => <span key={tag} className="rounded-lg bg-ink-900/[0.05] px-2 py-1 text-[10px] font-semibold text-ink-900/60">{tag}</span>)}</div> : null}
        {showInfo && <div className="mt-4 rounded-xl bg-parchment p-4 text-xs leading-5 text-ink-900/65">{addon.demoUrl ? <a href={addon.demoUrl} target="_blank" rel="noopener noreferrer" onClick={stop} className="font-bold text-terracotta-text underline underline-offset-2">View demo</a> : <span>No additional project details.</span>}</div>}
        <div className="mt-auto pt-5"><AddonPeople addonId={addon.id} authorId={addon.authorId} authorName={addon.authorName} authorPhoto={authorPhoto} authorBorder={authorBorder} collaborators={collaborators} onNavigate={onNavigate} canManage={Boolean(user && (user.uid === addon.authorId || user.role === 'admin'))} onCollaboratorsChange={setCollaborators} compact /><div className="mb-4 mt-4 flex items-center justify-end gap-3 text-[11px] font-medium text-ink-900/45"><span className="flex items-center gap-1"><Clock size={12} />{formatRelativeTime(addon.createdAt)}</span></div><div className="flex items-center justify-between gap-2 border-t border-parchment-border pt-4"><div className="flex items-center gap-1"><button type="button" onClick={(event) => { stop(event); setShowInfo(value => !value); }} aria-label={showInfo ? 'Hide project info' : 'Show project info'} className="rounded-lg p-2 text-ink-900/50 transition-colors hover:bg-ink-900/[0.05] hover:text-ink-900"><Info size={15} /></button><button type="button" onClick={handleLikeClick} aria-label={`${isLiked ? 'Unlike' : 'Like'} ${addon.title}`} className={`flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-bold transition-colors hover:bg-terracotta/10 ${isLiked ? 'text-terracotta-text' : 'text-ink-900/60'}`}><Heart size={16} className={isLiked ? 'fill-current' : ''} />{formatCount(addon.likesCount)}</button><span className="hidden items-center gap-1 text-xs text-ink-900/45 sm:flex"><ArrowDownToLine size={13} />{formatCount(addon.downloadsCount || 0)}</span></div><button type="button" onClick={handleDownloadClick} disabled={isDownloading} className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-[background-color,color,transform] duration-150 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.97] ${downloadSuccess ? 'bg-success/[0.12] text-success' : 'bg-terracotta text-ink-900 hover:bg-terracotta-text hover:text-paper'}`}>{isDownloading ? 'Opening…' : downloadSuccess ? <><Check size={13} />Done</> : <><Download size={13} />Get</>}</button></div></div>
      </div>
    </article>
  );
});
