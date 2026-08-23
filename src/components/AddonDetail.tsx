import React, { useState, useEffect, useMemo } from 'react';
import { Addon, Review } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { ArrowLeft, Download, AlertTriangle, ArrowDownToLine, Check, ExternalLink, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { ViewState } from '../App';
import { ReportModal } from './ReportModal';
import { ReviewSection } from './ReviewSection';
import { FadeImage } from './FadeImage';
import { ProfileAvatar } from './borderEffects';
import { RichTextContent } from './RichTextContent';
import { getButtonClasses } from '../lib/designSystem';
import { Skeleton, SkeletonCard } from './Skeleton';

function getYouTubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '').replace(/^m\./, '');
    if (host === 'youtu.be') {
      return u.pathname.slice(1).split('/')[0] || null;
    }
    if (host === 'youtube.com' || host === 'music.youtube.com') {
      if (u.pathname === '/watch') return u.searchParams.get('v');
      if (u.pathname.startsWith('/embed/')) return u.pathname.split('/embed/')[1].split('/')[0];
      if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/shorts/')[1].split('/')[0];
      if (u.pathname.startsWith('/live/')) return u.pathname.split('/live/')[1].split('/')[0];
    }
    return null;
  } catch {
    return null;
  }
}

interface AddonDetailProps {
  addonId: string;
  addons: Addon[];
  loading?: boolean;
  userLikes: Set<string>;
  onToggleLike: (addonId: string, isLiked: boolean) => void;
  onRequireAuth: () => void;
  onNavigate: (view: ViewState) => void;
  isDarkMode: boolean;
}

export function AddonDetail({ addonId, addons, loading, userLikes, onToggleLike, onRequireAuth, onNavigate, isDarkMode }: AddonDetailProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [authorPhoto, setAuthorPhoto] = useState<string | null>(null);
  const [authorBorder, setAuthorBorder] = useState<string>('none');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [videoActivated, setVideoActivated] = useState(false);
  const panoramaStripRef = React.useRef<HTMLDivElement>(null);

  const addon = addons.find(a => a.id === addonId);
  const isLiked = userLikes.has(addonId);
  const [fullDescription, setFullDescription] = useState<string | null>(null);
  const images = useMemo(
    () => (addon?.imageUrls && addon.imageUrls.length > 0 ? addon.imageUrls : [addon?.imageUrl || '']),
    [addon]
  );

  useEffect(() => {
    setFullDescription(null);
    if (!addonId) return;
    let cancelled = false;
    fetch(`/api/addons?id=${addonId}`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!cancelled && data?.addon?.description !== undefined) {
          setFullDescription(data.addon.description);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [addonId]);

  useEffect(() => {
    const url = images[currentImageIndex];
    if (!url) { setImageLoaded(false); return; }

    setImageLoaded(false);
    let cancelled = false;
    let settleTimer: ReturnType<typeof setTimeout>;
    const startedAt = Date.now();
    const MIN_SKELETON_MS = 350;

    const finish = () => {
      if (cancelled) return;
      const remaining = Math.max(0, MIN_SKELETON_MS - (Date.now() - startedAt));
      settleTimer = setTimeout(() => { if (!cancelled) setImageLoaded(true); }, remaining);
    };

    const img = new Image();
    img.onload = finish;
    img.onerror = finish;
    img.src = url;

    return () => {
      cancelled = true;
      clearTimeout(settleTimer);
      img.onload = null;
      img.onerror = null;
    };
  }, [images, currentImageIndex]);

  useEffect(() => {
    if (!addon) return;
    if (addon.authorPhoto !== undefined || addon.authorBorder !== undefined) {
      setAuthorPhoto(addon.authorPhoto ?? null);
      setAuthorBorder(addon.authorBorder ?? 'none');
      return;
    }
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
  }, [addon]);

  useEffect(() => {
    setCurrentImageIndex(0);
    setVideoActivated(false);
  }, [addonId]);

  useEffect(() => {
    if (images.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setCurrentImageIndex(prev => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [images.length, isPaused]);

  useEffect(() => {
    const handleVisibility = () => setIsPaused(document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    const strip = panoramaStripRef.current;
    if (!strip) return;
    let isDown = false;
    let startX = 0;
    let startScroll = 0;

    const start = (x: number) => { isDown = true; startX = x; startScroll = strip.scrollLeft; strip.style.cursor = 'grabbing'; };
    const move = (x: number) => { if (!isDown) return; strip.scrollLeft = startScroll - (x - startX); };
    const end = () => { isDown = false; strip.style.cursor = 'grab'; };

    const onMouseDown = (e: MouseEvent) => { start(e.pageX); e.preventDefault(); };
    const onMouseMove = (e: MouseEvent) => move(e.pageX);
    const onMouseUp = () => end();
    const onTouchStart = (e: TouchEvent) => start(e.touches[0].pageX);
    const onTouchMove = (e: TouchEvent) => move(e.touches[0].pageX);
    const onTouchEnd = () => end();

    strip.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    strip.addEventListener('touchstart', onTouchStart, { passive: true });
    strip.addEventListener('touchmove', onTouchMove, { passive: true });
    strip.addEventListener('touchend', onTouchEnd);

    return () => {
      strip.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      strip.removeEventListener('touchstart', onTouchStart);
      strip.removeEventListener('touchmove', onTouchMove);
      strip.removeEventListener('touchend', onTouchEnd);
    };
  }, [addon?.panoramaUrl]);

  useEffect(() => {
    if (!addonId) return;
    let cancelled = false;
    let hasLoadedOnce = false;
    const fetchReviews = async () => {
      try {
        const res = await fetch(`/api/reviews?addonId=${addonId}`);
        if (!res.ok) throw new Error('failed');
        const data = await res.json();
        if (!cancelled) {
          setReviews(data.reviews as Review[]);
          hasLoadedOnce = true;
        }
      } catch {
        if (!cancelled && !hasLoadedOnce) showToast('Failed to load reviews.', 'error');
      }
    };
    fetchReviews();
    const interval = setInterval(() => {
      if (!document.hidden) fetchReviews();
    }, 90000);
    const handleVisibility = () => { if (!document.hidden) fetchReviews(); };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [addonId]);

  if (!addon) {
    if (loading) {
      return (
        <div className="mx-auto max-w-7xl px-4 py-16 text-center min-h-[100dvh]">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <SkeletonCard />
          </div>
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center min-h-[100dvh]">
        <h2 className="text-2xl font-bold text-ink-900">Add-on not found</h2>
        <button
          onClick={() => onNavigate('home')}
          className={`mt-5 ${getButtonClasses('primary', 'md')}`}
        >
          Return to Marketplace
        </button>
      </div>
    );
  }

  const goNext = () => {
    setIsPaused(true);
    setCurrentImageIndex(prev => (prev + 1) % images.length);
  };
  const goPrev = () => {
    setIsPaused(true);
    setCurrentImageIndex(prev => (prev - 1 + images.length) % images.length);
  };
  const goTo = (idx: number) => {
    setIsPaused(true);
    setCurrentImageIndex(idx);
  };
  const demoYouTubeId = addon.demoUrl ? getYouTubeVideoId(addon.demoUrl) : null;

  const handleDownloadClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isDownloading || downloadSuccess || !addon) return;

    // Buka tab download LANGSUNG (masih di dalam user-gesture sinkron dari
    // klik ini). Menunda window.open() di balik await/setTimeout membuat
    // browser menganggapnya popup dan memblokirnya.
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

  const handleLikeClick = () => {
    if (!user) { onRequireAuth(); return; }
    onToggleLike(addon.id, isLiked);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 min-h-[100dvh]">
      <button
        onClick={() => onNavigate('home')}
        className="mb-8 flex items-center gap-2 text-sm font-bold text-ink-900 uppercase hover:text-terracotta-text transition-colors"
      >
        <ArrowLeft size={16} /> Back to Marketplace
      </button>

    <div className="overflow-hidden rounded-2xl bg-parchment-raised shadow-card neumorph glass">
        <div
          className="aspect-[21/9] w-full overflow-hidden bg-ink-900 relative border-b border-parchment-border"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {!imageLoaded && (
            <Skeleton className="absolute inset-0 rounded-none border-0 z-10" />
          )}
          <FadeImage
            src={images[currentImageIndex]}
            alt={addon.title}
            className={`h-full w-full object-contain transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            loading={currentImageIndex === 0 ? 'eager' : 'lazy'}
            fetchPriority={currentImageIndex === 0 ? 'high' : 'auto'}
          />
          {images.length > 1 && (
            <>
              <button
                onClick={goPrev}
                aria-label="Previous image"
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2.5 bg-terracotta rounded-xl shadow-card text-ink-900 transition-[transform,box-shadow] duration-200 hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-px"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={goNext}
                aria-label="Next image"
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2.5 bg-terracotta rounded-xl shadow-card text-ink-900 transition-[transform,box-shadow] duration-200 hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-px"
              >
                <ChevronRight size={18} />
              </button>
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-20 flex">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => goTo(idx)}
                    aria-label={`Go to image ${idx + 1}`}
                    className="p-2 flex items-center justify-center"
                  >
                    <span className={`block h-2 border border-ink transition-all ${idx === currentImageIndex ? 'w-6 bg-terracotta' : 'w-2 bg-parchment-raised/70'}`} />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="p-8">
          <div className="flex flex-wrap items-start justify-between gap-6 mb-8">
            <div>
              <span className="inline-block bg-terracotta rounded-full px-3 py-1.5 text-xs font-bold uppercase text-paper mb-3 shadow-sm">
                {addon.category}
              </span>
              <h1 className="text-4xl sm:text-5xl font-bold text-ink-900 tracking-tight leading-tight">{addon.title}</h1>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm font-bold text-ink-900/60">
                <div onClick={() => onNavigate({ type: 'author', id: addon.authorId })} className="flex items-center gap-2 cursor-pointer hover:text-ink-900 transition-colors">
                  <ProfileAvatar photoURL={authorPhoto} displayName={addon.authorName} borderValue={authorBorder} sizeClassName="h-8 w-8" />
                  <span>{addon.authorName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ArrowDownToLine size={16} />
                  <span className="font-meta">{addon.downloadsCount || 0}</span> Downloads
                </div>
                {addon.averageRating !== undefined && addon.averageRating > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Star size={16} className="fill-ink text-ink-900" />
                    <span className="font-meta">{addon.averageRating.toFixed(1)}</span>
                    {reviews.length > 0 && <span className="text-ink-900/40 font-normal normal-case">({reviews.length} review{reviews.length === 1 ? '' : 's'})</span>}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsReportModalOpen(true)}
                className={getButtonClasses('secondary', 'md')}
                title="Report"
              >
                <AlertTriangle size={18} />
              </button>
              <button
                onClick={handleDownloadClick}
                disabled={isDownloading}
                className={`disabled:opacity-50 disabled:cursor-not-allowed ${getButtonClasses('primary', 'lg')}`}
              >
                {isDownloading ? (
                  <div className="h-4 w-4 rounded-full bg-ink-900/[0.06] border border-parchment-border relative before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-ink/10 before:to-transparent" />
                ) : downloadSuccess ? <Check size={18} /> : <Download size={18} />}
                {isDownloading ? 'Downloading...' : downloadSuccess ? 'Downloaded!' : 'Download'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 border-t border-parchment-border pt-8">
            <div className="lg:col-span-2">
              <h2 className="text-lg font-bold text-ink-900 uppercase mb-4">Description</h2>
              <RichTextContent html={fullDescription ?? addon.description} isDarkMode={isDarkMode}/>
            </div>

            <div className="space-y-6">
              {addon.demoUrl && (
                <div className="bg-parchment-raised rounded-lg shadow-card neumorph p-5 glass">
                  <h2 className="text-sm font-bold text-ink-900 uppercase mb-3 flex items-center gap-2"><ExternalLink size={16} /> Demo / Preview</h2>
                  {demoYouTubeId ? (
                    <div className="aspect-video w-full overflow-hidden border border-parchment-border rounded-lg bg-ink-900 relative">
                      {videoActivated ? (
                        <iframe
                          className="w-full h-full"
                          src={`https://www.youtube-nocookie.com/embed/${demoYouTubeId}?autoplay=1`}
                          title={`${addon.title} demo video`}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setVideoActivated(true)}
                          aria-label={`Play ${addon.title} demo video`}
                          className="group relative h-full w-full"
                        >
                          <img
                            src={`https://i.ytimg.com/vi/${demoYouTubeId}/hqdefault.jpg`}
                            alt=""
                            className="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                            loading="lazy"
                          />
                          <span className="absolute inset-0 flex items-center justify-center">
                            <span className="flex items-center justify-center h-14 w-14 rounded-full bg-terracotta shadow-[0_2px_12px_rgba(0,0,0,0.3)] transition-transform group-hover:scale-110">
                              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-ink ml-0.5"><path d="M8 5v14l11-7z" /></svg>
                            </span>
                          </span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <a href={addon.demoUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-terracotta-text underline underline-offset-2">View Demo Video</a>
                  )}
                </div>
              )}
            </div>
          </div>

          <ReviewSection
            addonId={addon.id}
            reviews={reviews}
            onReviewSubmitted={review => setReviews(prev => [review, ...prev])}
            onReviewDeleted={reviewId => setReviews(prev => prev.filter(review => review.id !== reviewId))}
            onRequireAuth={onRequireAuth}
          />
        </div>
      </div>

      {addon.panoramaUrl && (
        <div className="mt-8 overflow-hidden rounded-2xl bg-parchment-raised shadow-card neumorph glass">
          <div className="px-6 pt-6 pb-4 border-b border-parchment-border">
            <h2 className="text-lg font-bold text-ink-900 uppercase">Panorama</h2>
            <p className="text-xs text-ink-900/50 font-medium mt-1">Geser untuk menjelajahi panorama.</p>
          </div>
          <div
            ref={panoramaStripRef}
            className="flex overflow-x-auto select-none bg-ink-900 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-parchment-raised/20"
            style={{ cursor: 'grab', scrollbarWidth: 'thin' }}
          >
            <img
              src={addon.panoramaUrl}
              alt={`${addon.title} panorama`}
              draggable={false}
              className="h-[240px] sm:h-[320px] w-auto max-w-none pointer-events-none"
            />
          </div>
        </div>
      )}

      <ReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} addonId={addon.id} />
    </div>
  );
}
