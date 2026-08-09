import React, { useState, useEffect, useMemo } from 'react';
import { Addon, Review } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { ArrowLeft, Download, AlertTriangle, ArrowDownToLine, Loader2, Check, ExternalLink, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { ViewState } from '../App';
import { ReportModal } from './ReportModal';
import { ReviewSection } from './ReviewSection';
import { FadeImage } from './FadeImage';
import { ProfileAvatar } from './borderEffects';
import { RichTextContent } from './RichTextContent';
import { Skeleton, AddonDetailSkeleton } from './Skeleton';

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
}

export function AddonDetail({ addonId, addons, loading, userLikes, onToggleLike, onRequireAuth, onNavigate }: AddonDetailProps) {
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

  const addon = addons.find(a => a.id === addonId);
  const isLiked = userLikes.has(addonId);
  const [fullDescription, setFullDescription] = useState<string | null>(null);
  const images = useMemo(
    () => (addon?.imageUrls && addon.imageUrls.length > 0 ? addon.imageUrls : [addon?.imageUrl || '']),
    [addon]
  );

  // Addon dari `addons` (list global) punya description yang dipotong server
  // (lihat api/addons.ts) supaya listing tetap ringan. Halaman detail butuh
  // teks lengkap, jadi ambil sekali lewat endpoint khusus per-addon.
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
        // Cuma tampilkan toast error kalau load AWAL gagal. Kalau refresh
        // berkala nanti gagal sesaat (blip jaringan), diamkan saja — user
        // yang lagi baca review tidak perlu diganggu toast error berulang
        // untuk data yang sudah sempat tampil dengan benar.
        if (!cancelled && !hasLoadedOnce) showToast('Failed to load reviews.', 'error');
      }
    };
    fetchReviews();

    // Sama seperti listing addon: jangan poll buta tiap 15 detik. Refresh
    // saat tab kembali terlihat, plus interval latar belakang yang jauh
    // lebih jarang sebagai jaring pengaman, dan berhenti total saat tab
    // sedang tidak dilihat.
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
      return <AddonDetailSkeleton />;
    }
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center min-h-[100dvh]">
        <h2 className="text-2xl font-bold text-ink">Add-on not found</h2>
        <button
          onClick={() => onNavigate('home')}
 className="mt-5 inline-flex items-center gap-2 bg-paper rounded-lg text-ink px-5 py-2.5 text-sm font-bold uppercase shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-px"
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

  const handleLikeClick = () => {
    if (!user) { onRequireAuth(); return; }
    onToggleLike(addon.id, isLiked);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 min-h-[100dvh]">
      <button
        onClick={() => onNavigate('home')}
        className="mb-8 flex items-center gap-2 text-sm font-bold text-ink uppercase hover:text-accent-deep transition-colors"
      >
        <ArrowLeft size={16} /> Back to Marketplace
      </button>

    <div className="overflow-hidden rounded-lg bg-paper shadow-card">
        <div
          className="aspect-[21/9] w-full overflow-hidden bg-ink relative border-b border-ink/10"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {!imageLoaded && (
            <Skeleton className="absolute inset-0 rounded-none border-0 z-10" />
          )}
          <FadeImage
            src={images[currentImageIndex]}
            alt={addon.title}
            className={`h-full w-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            loading={currentImageIndex === 0 ? 'eager' : 'lazy'}
            fetchPriority={currentImageIndex === 0 ? 'high' : 'auto'}
          />
          {images.length > 1 && (
            <>
              <button
                onClick={goPrev}
                aria-label="Previous image"
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2 bg-accent rounded-lg shadow-card text-ink transition-all hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-px"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={goNext}
                aria-label="Next image"
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2 bg-accent rounded-lg shadow-card text-ink transition-all hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-px"
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
                    <span className={`block h-2 border border-ink transition-all ${idx === currentImageIndex ? 'w-6 bg-accent' : 'w-2 bg-paper/70'}`} />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="p-8">
          <div className="flex flex-wrap items-start justify-between gap-6 mb-8">
            <div>
              <span className="inline-block bg-accent rounded-lg px-3 py-1 text-xs font-bold uppercase text-ink mb-3 shadow-card">
                {addon.category}
              </span>
              <h1 className="text-4xl font-bold text-ink tracking-tight">{addon.title}</h1>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm font-bold text-ink/60">
                <div onClick={() => onNavigate({ type: 'author', id: addon.authorId })} className="flex items-center gap-2 cursor-pointer hover:text-ink transition-colors">
                  <ProfileAvatar photoURL={authorPhoto} displayName={addon.authorName} borderValue={authorBorder} sizeClassName="h-8 w-8" />
                  <span>{addon.authorName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ArrowDownToLine size={16} />
                  <span className="font-meta">{addon.downloadsCount || 0}</span> Downloads
                </div>
                {addon.averageRating !== undefined && addon.averageRating > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Star size={16} className="fill-ink text-ink" />
                    <span className="font-meta">{addon.averageRating.toFixed(1)}</span>
                    {reviews.length > 0 && <span className="text-ink/40 font-normal normal-case">({reviews.length} review{reviews.length === 1 ? '' : 's'})</span>}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="p-3 rounded-lg bg-paper text-ink shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-px"
                title="Report"
              >
                <AlertTriangle size={18} />
              </button>
              <button
                onClick={handleDownloadClick}
                disabled={isDownloading}
                className="flex items-center gap-2 bg-accent rounded-lg px-6 py-3 text-sm font-bold text-ink uppercase shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDownloading ? <Loader2 size={18} className="animate-spin" /> : downloadSuccess ? <Check size={18} /> : <Download size={18} />}
                {isDownloading ? 'Downloading...' : downloadSuccess ? 'Downloaded!' : 'Download'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 border-t border-ink/10 pt-8">
            <div className="lg:col-span-2">
              <h2 className="text-lg font-bold text-ink uppercase mb-4">Description</h2>
              <RichTextContent html={fullDescription ?? addon.description} />
            </div>

            <div className="space-y-6">
              {addon.demoUrl && (
                <div className="bg-paper rounded-lg shadow-card p-5">
                  <h2 className="text-sm font-bold text-ink uppercase mb-3 flex items-center gap-2"><ExternalLink size={16} /> Demo / Preview</h2>
                  {demoYouTubeId ? (
                    <div className="aspect-video w-full overflow-hidden border border-ink/10 rounded-lg bg-ink relative">
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
                            <span className="flex items-center justify-center h-14 w-14 rounded-full bg-accent shadow-[0_2px_12px_rgba(0,0,0,0.3)] transition-transform group-hover:scale-110">
                              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-ink ml-0.5"><path d="M8 5v14l11-7z" /></svg>
                            </span>
                          </span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <a href={addon.demoUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-accent-soft underline">View Demo Video</a>
                  )}
                </div>
              )}
            </div>
          </div>

          <ReviewSection
            addonId={addon.id}
            reviews={reviews}
            onReviewSubmitted={review => setReviews(prev => [review, ...prev])}
            onRequireAuth={onRequireAuth}
          />
        </div>
      </div>

      <ReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} addonId={addon.id} />
    </div>
  );
}
