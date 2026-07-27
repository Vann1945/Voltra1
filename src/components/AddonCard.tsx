import React, { useState, useEffect } from 'react';
import { Heart, Download, User as UserIcon, Star, ArrowDownToLine, ChevronLeft, ChevronRight, Info, Loader2, Check, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Addon } from '../types';
import { useAuth } from '../hooks/useAuth';
import { ViewState } from '../App';
import { db } from '../firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { FadeImage } from './FadeImage';

interface AddonCardProps {
  addon: Addon;
  isLiked: boolean;
  onToggleLike: (addonId: string, isLiked: boolean) => void;
  onRequireAuth?: () => void;
  onNavigate?: (view: ViewState) => void;
}

export const AddonCard = React.memo(function AddonCard({ addon, isLiked, onToggleLike, onRequireAuth, onNavigate }: AddonCardProps) {
  const { user } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [authorPhoto, setAuthorPhoto] = useState<string | null>(null);
  const [authorBorder, setAuthorBorder] = useState<string>('none');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showInfo, setShowInfo] = useState(false);

  const images = addon.imageUrls && addon.imageUrls.length > 0 ? addon.imageUrls : [addon.imageUrl];

  React.useEffect(() => {
    let mounted = true;
    const fetchAuthor = async () => {
      try {
        const { fetchUserCached } = await import('../lib/userCache');
        const userData = await fetchUserCached(addon.authorId);
        if (mounted && userData) {
          setAuthorPhoto(userData.photoURL || null);
          setAuthorBorder(userData.profileBorder || 'none');
        }
      } catch (e) {
        console.error("Failed to fetch author", e);
      }
    };
    fetchAuthor();
    return () => { mounted = false; };
  }, [addon.authorId]);

  const handleLikeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      if (onRequireAuth) onRequireAuth();
      return;
    }
    onToggleLike(addon.id, isLiked);
  };

  const handleCardClick = () => {
    if (onNavigate) {
      onNavigate({ type: 'addon', id: addon.id });
    }
  };

  const handleAuthorClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onNavigate) {
      onNavigate({ type: 'author', id: addon.authorId });
    }
  };

  const handleDownloadClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isDownloading || downloadSuccess) return;
    
    setIsDownloading(true);
    setDownloadProgress(0);

    // Simulate download progress
    const interval = setInterval(() => {
      setDownloadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const addonRef = doc(db, 'addons', addon.id);
      await updateDoc(addonRef, {
        downloadsCount: increment(1)
      });
      
      // Wait for progress to reach 100
      await new Promise(resolve => setTimeout(resolve, 2200));
      
      setDownloadSuccess(true);
      window.open(addon.downloadUrl, '_blank');
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to increment download count:", error);
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
      clearInterval(interval);
    }
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const toggleInfo = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowInfo(!showInfo);
  };

  const getBorderClass = (borderType: string) => {
    switch (borderType) {
      case 'gold': return 'ring-1 ring-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]';
      case 'neon': return 'ring-1 ring-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]';
      case 'fire': return 'ring-1 ring-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]';
      case 'void': return 'ring-1 ring-purple-600 shadow-[0_0_8px_rgba(147,51,234,0.6)]';
      default: return 'border border-white/10';
    }
  };

  return (
    <article 
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      tabIndex={0}
      aria-label={`View details for ${addon.title}`}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-zinc-900/60 border border-zinc-800/80 transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-900 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 shadow-sm hover:shadow-md"
    >
      
      {/* Inner Card Content */}
      <div className="relative flex flex-col h-full w-full overflow-hidden">
        <div className="aspect-[16/10] w-full overflow-hidden bg-zinc-950 relative group/carousel">
          <FadeImage
            src={images[currentImageIndex]}
            alt={addon.title}
            containerClassName="h-full w-full"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        
        {images.length > 1 && (
          <>
            <button 
              onClick={prevImage}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md bg-black/60 text-zinc-200 opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-black/80 focus:outline-none"
            >
              <ChevronLeft size={14} aria-hidden="true" />
            </button>
            <button 
              onClick={nextImage}
              aria-label="Next image"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md bg-black/60 text-zinc-200 opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-black/80 focus:outline-none"
            >
              <ChevronRight size={14} aria-hidden="true" />
            </button>
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1" aria-hidden="true">
              {images.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`h-1 rounded-full transition-all ${idx === currentImageIndex ? 'w-3 bg-white' : 'w-1 bg-white/40'}`}
                />
              ))}
            </div>
          </>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent opacity-60 pointer-events-none" aria-hidden="true" />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 pointer-events-none pr-3">
          <span className="inline-flex items-center rounded-md bg-zinc-950/80 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-zinc-300 border border-zinc-800">
            {addon.category}
          </span>
          {addon.status === 'pending' && (
            <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-amber-300 border border-amber-500/20">
              Pending
            </span>
          )}
          {addon.status === 'rejected' && (
            <span className="inline-flex items-center rounded-md bg-red-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-red-300 border border-red-500/20">
              Rejected
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold tracking-tight text-zinc-100 group-hover:text-white transition-colors line-clamp-1">
            {addon.title}
          </h3>
          <div className="flex items-center gap-1.5 shrink-0">
            <button 
              onClick={toggleInfo}
              aria-expanded={showInfo}
              aria-label="Toggle addon details"
              className={`p-1 rounded-md transition-colors focus:outline-none ${showInfo ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
            >
              <Info size={14} aria-hidden="true" />
            </button>
            {addon.averageRating !== undefined && addon.averageRating > 0 && (
              <div className="flex items-center gap-1 text-[11px] font-medium text-zinc-300 bg-zinc-800/80 px-2 py-0.5 rounded-md border border-zinc-700/50">
                <Star size={11} className="fill-amber-400 text-amber-400" />
                <span>{addon.averageRating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
        
        {showInfo ? (
          <div className="mt-2.5 flex-1 overflow-y-auto pr-1 space-y-2 text-xs text-zinc-300 font-normal custom-scrollbar">
            {addon.demoUrl && (
              <div>
                <strong className="text-zinc-400 text-[10px] uppercase tracking-wider">Demo / Preview</strong>
                <p className="mt-0.5">
                  <a 
                    href={addon.demoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    View Demo
                    <ExternalLink size={11} />
                  </a>
                </p>
              </div>
            )}
            {addon.versionHistory && (
              <div>
                <strong className="text-zinc-400 text-[10px] uppercase tracking-wider">Version History</strong>
                <p className="mt-0.5 text-zinc-300">{addon.versionHistory}</p>
              </div>
            )}
            {addon.compatibilityNotes && (
              <div>
                <strong className="text-zinc-400 text-[10px] uppercase tracking-wider">Compatibility</strong>
                <p className="mt-0.5 text-zinc-300">{addon.compatibilityNotes}</p>
              </div>
            )}
            {addon.changelog && (
              <div>
                <strong className="text-zinc-400 text-[10px] uppercase tracking-wider">Changelog</strong>
                <p className="mt-0.5 whitespace-pre-wrap text-[11px] text-zinc-300">{addon.changelog}</p>
              </div>
            )}
            {!addon.versionHistory && !addon.compatibilityNotes && !addon.changelog && !addon.demoUrl && (
              <p className="italic opacity-50">No additional info available.</p>
            )}
          </div>
        ) : (
          <p className="mt-2 line-clamp-2 flex-1 text-xs text-zinc-400 leading-relaxed font-normal">
            {addon.description}
          </p>
        )}

        <div className="mt-4 flex flex-col gap-3 border-t border-zinc-800/80 pt-3.5">
          <div className="flex items-center justify-between gap-3">
            <button 
              className="flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer group/author focus:outline-none rounded-md min-w-0"
              onClick={handleAuthorClick}
              aria-label={`View ${addon.authorName}'s profile`}
            >
              <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 overflow-hidden border border-zinc-700/50 ${getBorderClass(authorBorder)}`} aria-hidden="true">
                {authorPhoto ? (
                  <FadeImage src={authorPhoto} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-[10px] font-medium">{addon.authorName.charAt(0)}</span>
                )}
              </div>
              <span className="truncate group-hover/author:text-white transition-colors">{addon.authorName}</span>
            </button>
            
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleLikeClick}
                aria-label={isLiked ? "Unlike addon" : "Like addon"}
                className={`flex items-center gap-1 text-[11px] font-medium transition-colors focus:outline-none rounded-md px-2 py-1 ${
                  isLiked ? 'text-rose-400 bg-rose-500/10' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <Heart size={13} className={isLiked ? 'fill-rose-400' : ''} aria-hidden="true" />
                <span>{addon.likesCount}</span>
              </button>
              
              <div className="flex items-center gap-1 text-[11px] font-medium text-zinc-400 bg-zinc-800/50 px-2 py-1 rounded-md" aria-label={`${addon.downloadsCount || 0} downloads`} title={`${addon.downloadsCount || 0} downloads`}>
                <ArrowDownToLine size={13} aria-hidden="true" />
                <span>{addon.downloadsCount || 0}</span>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleDownloadClick}
            disabled={isDownloading}
            aria-label={downloadSuccess ? "Downloaded" : isDownloading ? "Downloading..." : "Download Addon"}
            className={`relative overflow-hidden flex w-full justify-center items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-all focus:outline-none ${
              downloadSuccess 
                ? 'bg-emerald-600 text-white' 
                : 'bg-zinc-100 text-zinc-900 hover:bg-white'
            }`}
          >
            {isDownloading && (
              <div 
                className="absolute inset-0 bg-black/10 transition-all duration-200" 
                style={{ width: `${downloadProgress}%` }} 
              />
            )}
            <div className="relative z-10 flex items-center gap-1.5">
              {isDownloading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : downloadSuccess ? (
                <Check size={14} strokeWidth={2} />
              ) : (
                <Download size={14} strokeWidth={2} />
              )}
              <span>{isDownloading ? `${downloadProgress}%` : downloadSuccess ? 'Downloaded!' : 'Get Add-on'}</span>
            </div>
          </button>
        </div>
      </div>
      </div>
    </article>
  );
});
