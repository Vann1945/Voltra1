import React, { useState } from 'react';
import {
  Heart, Download, Star, ArrowDownToLine,
  Info, Loader2, Check, ExternalLink
} from 'lucide-react';
import { Addon } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { ViewState } from '../App';
import { FadeImage } from './FadeImage';
import { ProfileAvatar } from './borderEffects';

function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<(br|\/p|\/div|\/li)>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface AddonCardProps {
  addon: Addon;
  isLiked: boolean;
  onToggleLike: (addonId: string, isLiked: boolean) => void;
  onRequireAuth?: () => void;
  onNavigate?: (view: ViewState) => void;
  priority?: boolean;
}

export function AddonCard({ addon, isLiked, onToggleLike, onRequireAuth, onNavigate, priority = false }: AddonCardProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [authorPhoto, setAuthorPhoto] = useState<string | null>(addon.authorPhoto ?? null);
  const [authorBorder, setAuthorBorder] = useState<string>(addon.authorBorder ?? 'none');
  const [showInfo, setShowInfo] = useState(false);

  const coverImage = addon.imageUrls && addon.imageUrls.length > 0 ? addon.imageUrls[0] : addon.imageUrl;

  React.useEffect(() => {
    if (addon.authorPhoto !== undefined || addon.authorBorder !== undefined) return;
    let cancelled = false;
    const fetchAuthor = async () => {
      try {
        const res = await fetch(`/api/users?id=${addon.authorId}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setAuthorPhoto(data.photoURL || null);
            setAuthorBorder(data.profileBorder || 'none');
          }
        }
      } catch (e) {}
    };
    fetchAuthor();
    return () => { cancelled = true; };
  }, [addon.authorId, addon.authorPhoto, addon.authorBorder]);

  const handleLikeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { if (onRequireAuth) onRequireAuth(); return; }
    onToggleLike(addon.id, isLiked);
  };

  const handleCardClick = () => {
    if (onNavigate) onNavigate({ type: 'addon', id: addon.id });
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
    setIsDownloading(true);
    setDownloadProgress(0);
    const interval = setInterval(() => {
      setDownloadProgress(prev => { if (prev >= 100) { clearInterval(interval); return 100; } return prev + 10; });
    }, 200);
    try {
      try {
        await fetch(`/api/addons?id=${addon.id}&action=download`, { method: 'POST' });
      } catch (countError) {}
      await new Promise(resolve => setTimeout(resolve, 2200));
      setDownloadSuccess(true);
      window.open(addon.downloadUrl, '_blank');
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

  return (
    <div
      onClick={handleCardClick}
      className="group relative flex cursor-pointer flex-col overflow-hidden bg-paper rounded-lg shadow-card transition-all duration-200 hover:scale-[1.03] hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-px"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-ink">
        <FadeImage
          src={coverImage}
          alt={addon.title}
          containerClassName="h-full w-full"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          referrerPolicy="no-referrer"
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
        />

        <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
          <span className="inline-flex items-center bg-accent rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-ink shadow-card">
            {addon.category}
          </span>
          {addon.status === 'pending' && (
            <span className="inline-flex items-center bg-paper rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-ink shadow-card">
              Pending
            </span>
          )}
          {addon.status === 'rejected' && (
            <span className="inline-flex items-center bg-danger rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-card">
              Rejected
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5 bg-paper">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-bold text-ink leading-tight line-clamp-1 uppercase tracking-tight">
            {addon.title}
          </h3>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={toggleInfo}
              aria-label={showInfo ? 'Hide additional info' : 'Show additional info'}
              className={`p-1.5 rounded-lg transition-all ${showInfo ? 'bg-accent-deep text-white shadow-none' : 'bg-paper text-ink shadow-card hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-px'}`}
            >
              <Info size={14} />
            </button>
            {addon.averageRating !== undefined && addon.averageRating > 0 && (
              <div className="flex items-center gap-1 bg-accent rounded-lg px-2 py-1 text-xs font-bold text-ink shadow-card">
                <Star size={11} className="fill-ink" />
                <span>{addon.averageRating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>

        {addon.tags && addon.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {addon.tags.slice(0, 3).map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center border border-ink/10 rounded-lg bg-paper px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink/70"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {showInfo ? (
          <div className="mt-3 flex-1 overflow-y-auto pr-1 space-y-3 text-sm text-ink/70 custom-scrollbar">
            {addon.demoUrl && (
              <div>
                <strong className="text-ink text-xs uppercase tracking-wider font-bold">Demo</strong>
                <p className="mt-1">
                  <a href={addon.demoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent-soft font-bold underline hover:no-underline">
                    View Demo <ExternalLink size={12} />
                  </a>
                </p>
              </div>
            )}
            {addon.versionHistory && (
              <div>
                <strong className="text-ink text-xs uppercase tracking-wider font-bold">Version History</strong>
                <p className="mt-1 font-medium">{addon.versionHistory}</p>
              </div>
            )}
            {addon.compatibilityNotes && (
              <div>
                <strong className="text-ink text-xs uppercase tracking-wider font-bold">Compatibility</strong>
                <p className="mt-1 font-medium">{addon.compatibilityNotes}</p>
              </div>
            )}
            {addon.changelog && (
              <div>
                <strong className="text-ink text-xs uppercase tracking-wider font-bold">Changelog</strong>
                <p className="mt-1 whitespace-pre-wrap text-xs font-medium">{addon.changelog}</p>
              </div>
            )}
            {!addon.versionHistory && !addon.compatibilityNotes && !addon.changelog && !addon.demoUrl && (
              <p className="italic opacity-50 font-medium">No additional info available.</p>
            )}
          </div>
        ) : (
          <p className="mt-2.5 line-clamp-2 flex-1 text-sm text-ink/60 leading-relaxed font-medium">
            {stripHtml(addon.description)}
          </p>
        )}

        <div className="mt-5 flex items-center justify-between border-t border-ink/10 pt-4">
          <div
            className="flex items-center gap-2 text-xs font-bold text-ink cursor-pointer hover:text-accent-deep transition-colors"
            onClick={handleAuthorClick}
          >
            <ProfileAvatar photoURL={authorPhoto} displayName={addon.authorName} borderValue={authorBorder} sizeClassName="h-7 w-7" textSizeClassName="text-xs" />
            <span className="truncate max-w-[100px]">{addon.authorName}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleLikeClick}
              className={`flex items-center gap-1 text-xs font-bold transition-colors ${isLiked ? 'text-accent-deep' : 'text-ink hover:text-accent-deep'}`}
            >
              <Heart size={15} className={isLiked ? 'fill-current' : ''} />
              <span>{addon.likesCount}</span>
            </button>
            <div className="flex items-center gap-1 text-xs font-bold text-ink">
              <ArrowDownToLine size={15} />
              <span>{addon.downloadsCount || 0}</span>
            </div>
            <button
              onClick={handleDownloadClick}
              disabled={isDownloading}
              className={`relative overflow-hidden flex items-center gap-1.5 border border-ink/10 rounded-lg px-3 py-1.5 text-xs font-bold uppercase transition-all ${
                downloadSuccess
                  ? 'bg-paper text-success shadow-[0_2px_12px_rgba(0,0,0,0.06)]'
                  : 'bg-accent text-ink shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-px'
              }`}
            >
              {isDownloading && (
                <div
                  className="absolute inset-0 origin-left bg-accent-soft/30 transition-transform duration-200 ease-linear will-change-transform"
                  style={{ transform: `scaleX(${downloadProgress / 100})` }}
                />
              )}
              <div className="relative z-10 flex items-center gap-1">
                {isDownloading ? <Loader2 size={13} className="animate-spin" /> : downloadSuccess ? <Check size={13} /> : <Download size={13} />}
                <span>{isDownloading ? `${downloadProgress}%` : downloadSuccess ? 'Done!' : 'Get'}</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
