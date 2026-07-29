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
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-[24px] bg-zinc-900 border border-white/5 transition duration-300 hover:border-white/20 hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 shadow-lg hover:shadow-2xl"
    >
      
      {/* Inner Card Content */}
      <div className="relative flex flex-col h-full w-full overflow-hidden rounded-[calc(24px-1px)]">
        <div className="aspect-[16/10] w-full overflow-hidden bg-zinc-950 relative group/carousel">
        <FadeImage
          src={images[currentImageIndex]}
          alt={addon.title}
          containerClassName="h-full w-full"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 active:scale-[0.96]"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
        
        {images.length > 1 && (
          <>
            <button 
              onClick={prevImage}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white backdrop-blur-md opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-black/70 active:scale-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <button 
              onClick={nextImage}
              aria-label="Next image"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white backdrop-blur-md opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-black/70 active:scale-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5" aria-hidden="true">
              {images.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`h-1.5 rounded-full transition ${idx === currentImageIndex ? 'w-4 bg-white shadow-sm' : 'w-1.5 bg-white/40'}`}
                />
              ))}
            </div>
          </>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-80 pointer-events-none" aria-hidden="true" />
        <div className="absolute top-4 left-4 flex flex-wrap gap-2 pointer-events-none pe-4">
          <span className="inline-flex items-center rounded-full bg-black/60 backdrop-blur-md px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white border border-white/10 w-fit">
            {addon.category}
          </span>
          {addon.status === 'pending' && (
            <span className="inline-flex items-center rounded-full bg-amber-500/20 backdrop-blur-md px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-300 border border-amber-500/30 w-fit">
              Pending Approval
            </span>
          )}
          {addon.status === 'rejected' && (
            <span className="inline-flex items-center rounded-full bg-red-500/20 backdrop-blur-md px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-red-300 border border-red-500/30 w-fit">
              Rejected
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5 bg-zinc-900">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-bold tracking-tight text-white group-hover:text-zinc-200 transition-colors line-clamp-1 text-balance">
            {addon.title}
          </h3>
          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={toggleInfo}
              aria-expanded={showInfo}
              aria-label="Toggle addon details"
              className={`p-1.5 rounded-full transition active:scale-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${showInfo ? 'bg-zinc-800 text-white' : 'bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
            >
              <Info size={16} aria-hidden="true" />
            </button>
            {addon.averageRating !== undefined && addon.averageRating > 0 && (
              <div className="flex items-center gap-1 text-xs font-medium text-zinc-300 bg-zinc-800/50 px-2 py-1 rounded-full border border-white/5">
                <Star size={12} className="fill-amber-400 text-amber-400" />
                <span>{addon.averageRating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
        
        {showInfo ? (
          <div className="mt-3 flex-1 overflow-y-auto pe-2 space-y-3 text-sm text-zinc-400 font-light custom-scrollbar">
            {addon.demoUrl && (
              <div>
                <strong className="text-zinc-300 text-xs uppercase tracking-wider">Demo / Preview</strong>
                <p className="mt-1 text-pretty">
                  <a 
                    href={addon.demoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    View Demo
                    <ExternalLink size={12} />
                  </a>
                </p>
              </div>
            )}
            {addon.versionHistory && (
              <div>
                <strong className="text-zinc-300 text-xs uppercase tracking-wider">Version History</strong>
                <p className="mt-1 text-pretty">{addon.versionHistory}</p>
              </div>
            )}
            {addon.compatibilityNotes && (
              <div>
                <strong className="text-zinc-300 text-xs uppercase tracking-wider">Compatibility</strong>
                <p className="mt-1 text-pretty">{addon.compatibilityNotes}</p>
              </div>
            )}
            {addon.changelog && (
              <div>
                <strong className="text-zinc-300 text-xs uppercase tracking-wider">Changelog</strong>
                <p className="mt-1 whitespace-pre-wrap text-xs text-pretty">{addon.changelog}</p>
              </div>
            )}
            {!addon.versionHistory && !addon.compatibilityNotes && !addon.changelog && !addon.demoUrl && (
              <p className="italic opacity-50 text-pretty">No additional info available.</p>
            )}
          </div>
        ) : (
          <p className="mt-3 line-clamp-2 flex-1 text-sm text-zinc-400 leading-relaxed font-light">
            {addon.description}
          </p>
        )}

        <div className="mt-auto pt-6 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <button 
              className="flex items-center gap-3 text-sm font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer group/author active:scale-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-lg pe-2 min-w-0"
              onClick={handleAuthorClick}
              aria-label={`View ${addon.authorName}'s profile`}
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 overflow-hidden transition group-hover/author:border-white/30 border border-white/5 ${getBorderClass(authorBorder)}`} aria-hidden="true">
                {authorPhoto ? (
                  <FadeImage src={authorPhoto} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-xs font-medium">{addon.authorName.charAt(0)}</span>
                )}
              </div>
              <span className="truncate group-hover/author:text-white transition-colors">{addon.authorName}</span>
            </button>
            
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleLikeClick}
                aria-label={isLiked ? "Unlike addon" : "Like addon"}
                className={`flex items-center gap-1.5 text-xs font-medium transition active:scale-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 rounded-full px-2 py-1.5 ${
                  isLiked ? 'text-rose-500 bg-rose-500/10' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <Heart size={16} className={isLiked ? 'fill-rose-500' : ''} aria-hidden="true" />
                <span>{addon.likesCount}</span>
              </button>
              
              <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 bg-zinc-800/50 px-2 py-1.5 rounded-full" aria-label={`${addon.downloadsCount || 0} downloads`} title={`${addon.downloadsCount || 0} downloads`}>
                <ArrowDownToLine size={16} aria-hidden="true" />
                <span>{addon.downloadsCount || 0}</span>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleDownloadClick}
            disabled={isDownloading}
            aria-label={downloadSuccess ? "Downloaded" : isDownloading ? "Downloading..." : "Download Addon"}
            className={`relative overflow-hidden flex w-full justify-center items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition active:scale-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
              downloadSuccess 
                ? 'bg-emerald-500 text-white' 
                : 'bg-white text-black hover:bg-zinc-200'
            }`}
          >
            {isDownloading && (
              <div 
                className="absolute inset-0 bg-black/10 transition duration-200" 
                style={{ width: `${downloadProgress}%` }} 
              />
            )}
            <div className="relative z-10 flex items-center gap-2">
              {isDownloading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : downloadSuccess ? (
                <Check size={16} strokeWidth={2} />
              ) : (
                <Download size={16} strokeWidth={2} />
              )}
              <span>{isDownloading ? `${downloadProgress}%` : downloadSuccess ? 'Success!' : 'Get Add-on'}</span>
            </div>
          </button>
        </div>
      </div>
      </div>
    </article>
  );
});
