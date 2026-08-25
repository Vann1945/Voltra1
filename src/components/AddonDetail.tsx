'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Addon, AddonVersion, Review, ViewState } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { AlertTriangle, ArrowDownToLine, ArrowLeft, Bookmark, Check, FileArchive, ChevronDown, Download, ExternalLink, Heart, History, MessageSquare, Star } from '@/components/icons/animated';
import { ReportModal } from './ReportModal';
import { ReviewSection } from './ReviewSection';
import { FadeImage } from './FadeImage';
import { ProfileAvatar } from './borderEffects';
import { AddonPeople } from './AddonPeople';
import { RichTextContent } from './RichTextContent';
import { getButtonClasses } from '@/lib/designSystem';
import { Skeleton, SkeletonCard } from './Skeleton';
import { PanoramaViewer } from './PanoramaViewer';
import { uploadAddonFile, ADDON_FILE_ACCEPT } from '@/lib/addonFileUpload';

function VersionDropdown({ versions, selectedVersionId, onChange }: { versions: AddonVersion[]; selectedVersionId: string | null; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = versions.find(version => version.id === selectedVersionId) || versions[0];

  return <div className="relative min-w-[160px]">
    <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(value => !value)} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-parchment-border bg-parchment px-3 text-left text-sm font-bold text-ink-900 shadow-sm transition-colors hover:border-terracotta focus-visible:ring-2 focus-visible:ring-terracotta">
      <span><span className="block text-[10px] font-bold uppercase tracking-widest text-ink-900/45">Version</span><span>{selected?.version || 'Current'}</span></span><ChevronDown size={16} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <>
      <button type="button" aria-label="Close version menu" className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} />
      <div role="listbox" aria-label="Available versions" className="absolute bottom-[calc(100%+8px)] right-0 z-40 max-h-56 w-full min-w-[190px] overflow-auto rounded-xl border border-parchment-border bg-parchment-raised p-1.5 shadow-card-hover">
        {versions.map(version => <button key={version.id} type="button" role="option" aria-selected={selected?.id === version.id} onClick={() => { onChange(version.id); setOpen(false); }} className={`flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-terracotta/10 ${selected?.id === version.id ? 'bg-terracotta/10 text-terracotta-text' : 'text-ink-900'}`}><span><span className="block font-bold">{version.version}</span><span className="block text-xs text-ink-900/50">{version.compatibilityNotes || 'Default release'}</span></span>{selected?.id === version.id && <Check size={15} className="mt-0.5 shrink-0" />}</button>)}
      </div>
    </>}
  </div>;
}

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
  userBookmarks: Set<string>;
  onToggleLike: (addonId: string, isLiked: boolean) => void;
  onToggleBookmark: (addonId: string, isBookmarked: boolean) => void;
  onRequireAuth: () => void;
  onNavigate: (view: ViewState) => void;
  isDarkMode: boolean;
}

export function AddonDetail({ addonId, addons, loading, userLikes, userBookmarks, onToggleLike, onToggleBookmark, onRequireAuth, onNavigate, isDarkMode }: AddonDetailProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [authorPhoto, setAuthorPhoto] = useState<string | null>(null);
  const [authorBorder, setAuthorBorder] = useState<string>('none');
  const [collaborators, setCollaborators] = useState<NonNullable<Addon['collaborators']>>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const gallerySwipeStartXRef = useRef<number | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [videoActivated, setVideoActivated] = useState(false);
  const [versions, setVersions] = useState<AddonVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [isVersionEditorOpen, setIsVersionEditorOpen] = useState(false);
  const [isVersionSaving, setIsVersionSaving] = useState(false);
  const [versionDraft, setVersionDraft] = useState({ version: '', downloadUrl: '', changelog: '', compatibilityNotes: '' });
  const [versionFileName, setVersionFileName] = useState('');
  const [versionFileUploadProgress, setVersionFileUploadProgress] = useState<number | null>(null);
  const versionFileInputRef = useRef<HTMLInputElement>(null);

  const addon = addons.find(a => a.id === addonId);
  const isLiked = userLikes.has(addonId);
  const isBookmarked = userBookmarks.has(addonId);
  const activeVersion = versions.find(version => version.id === selectedVersionId) || versions[0];
  const activeDownloadUrl = activeVersion?.downloadUrl || addon?.downloadUrl || '';
  const [fullDescription, setFullDescription] = useState<string | null>(null);
  useEffect(() => {
    setCollaborators(addon?.collaborators ?? []);
  }, [addon?.collaborators]);

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
          setCollaborators(Array.isArray(data.addon.collaborators) ? data.addon.collaborators : []);
          const loadedVersions = Array.isArray(data.addon.versions) ? data.addon.versions as AddonVersion[] : [];
          const resolvedVersions = loadedVersions.length > 0 ? loadedVersions : data.addon.downloadUrl ? [{ id: `legacy-${data.addon.id}`, addonId: data.addon.id, version: 'Current', downloadUrl: data.addon.downloadUrl, changelog: data.addon.changelog || '', compatibilityNotes: data.addon.compatibilityNotes || '', createdAt: data.addon.createdAt }] : [];
          setVersions(resolvedVersions);
          setSelectedVersionId(resolvedVersions[0]?.id || null);
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
        <div className="mx-auto min-h-[100dvh] max-w-7xl px-4 py-16 text-center">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <SkeletonCard />
          </div>
        </div>
      );
    }
    return (
      <div className="mx-auto min-h-[100dvh] max-w-7xl px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-ink-900">Add-on not found</h2>
        <button onClick={() => onNavigate('home')} className={`mt-5 ${getButtonClasses('primary', 'md')}`}>
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
  const handleGalleryPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    gallerySwipeStartXRef.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const handleGalleryPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const startX = gallerySwipeStartXRef.current;
    gallerySwipeStartXRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (startX === null) return;
    const deltaX = event.clientX - startX;
    if (Math.abs(deltaX) < 48) return;
    if (deltaX < 0) goNext(); else goPrev();
  };
  const handleGalleryPointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    gallerySwipeStartXRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const demoYouTubeId = addon.demoUrl ? getYouTubeVideoId(addon.demoUrl) : null;

  const handleDownloadClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isDownloading || downloadSuccess || !addon) return;

    if (!activeDownloadUrl) {
      showToast('No download is available for this version.', 'error');
      return;
    }

    // Buka tab download LANGSUNG (masih di dalam user-gesture sinkron dari
    // klik ini). Menunda window.open() di balik await/setTimeout membuat
    // browser menganggapnya popup dan memblokirnya.
    const downloadWindow = window.open('', '_blank');
    if (downloadWindow) {
      downloadWindow.opener = null;
      downloadWindow.location.href = activeDownloadUrl;
      // File download (Content-Disposition: attachment) tidak benar-benar
      // menavigasi tab baru itu ke halaman apa pun — tab-nya tetap di
      // "about:blank" selamanya dan harus ditutup manual. Di sini kita
      // tutup otomatis SETELAH memberi waktu download mulai, tapi hanya
      // jika tab itu memang masih blank (murni trigger download). Kalau
      // downloadUrl ternyata mengarah ke halaman pihak ketiga (mis.
      // Mediafire/Google Drive), tab itu akan benar-benar bernavigasi ke
      // origin lain, sehingga membaca .location.href akan melempar error
      // cross-origin — dalam kasus itu kita biarkan tab tetap terbuka agar
      // user bisa berinteraksi dengan halaman tersebut.
      window.setTimeout(() => {
        try {
          if (!downloadWindow.closed && downloadWindow.location.href === 'about:blank') {
            downloadWindow.close();
          }
        } catch {
          // Cross-origin: tab benar-benar berpindah ke halaman lain, biarkan terbuka.
        }
      }, 1500);
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

  const handleBookmarkClick = () => {
    if (!user) { onRequireAuth(); return; }
    onToggleBookmark(addon.id, isBookmarked);
    showToast(isBookmarked ? 'Removed from Saved.' : 'Saved for later.', 'success');
  };

  const handleVersionFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setVersionFileUploadProgress(0);
    try {
      const downloadUrl = await uploadAddonFile(file, pct => setVersionFileUploadProgress(Math.round(pct)));
      setVersionDraft(prev => ({ ...prev, downloadUrl }));
      setVersionFileName(file.name);
      showToast('Update file uploaded successfully.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to upload update file.', 'error');
    } finally {
      setVersionFileUploadProgress(null);
    }
  };

  const handleSaveVersion = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || (user.uid !== addon.authorId && user.role !== 'admin')) return;
    setIsVersionSaving(true);
    try {
      const res = await fetch('/api/addons?action=versions', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ addonId: addon.id, ...versionDraft }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to add version.');
      const created: AddonVersion = { id: data.id, addonId: addon.id, version: data.version, downloadUrl: data.downloadUrl, changelog: data.changelog || '', compatibilityNotes: data.compatibilityNotes || '', createdAt: data.createdAt || new Date().toISOString() };
      setVersions(prev => [created, ...prev]);
      setSelectedVersionId(created.id);
      setVersionDraft({ version: '', downloadUrl: '', changelog: '', compatibilityNotes: '' });
      setVersionFileName('');
      setIsVersionEditorOpen(false);
      showToast('New version added.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to add version.', 'error');
    } finally {
      setIsVersionSaving(false);
    }
  };

  return (
    <div className="mx-auto min-h-[100dvh] max-w-6xl px-4 pb-32 pt-8 sm:px-6 sm:py-12 lg:px-8">
      <button
        onClick={() => onNavigate('home')}
        className="mb-8 inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold text-ink-900/65 transition-colors hover:bg-ink-900/[0.04] hover:text-ink-900"
      >
        <ArrowLeft size={16} /> Back to Marketplace
      </button>

    <article className="overflow-hidden rounded-2xl border border-parchment-border bg-parchment-raised shadow-card">
        <div
          className="relative aspect-[21/9] w-full overflow-hidden border-b border-parchment-border bg-ink-900"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onPointerDown={handleGalleryPointerDown}
          onPointerUp={handleGalleryPointerUp}
          onPointerCancel={handleGalleryPointerCancel}
          style={{ touchAction: 'pan-y' }}
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

        <div className="p-6 sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-start justify-between gap-6 mb-8">
            <div>
                              <span className="inline-flex rounded-full bg-terracotta/15 px-3 py-1.5 text-xs font-bold text-terracotta-text">

                {addon.category}
              </span>
              <h1 className="text-3xl font-bold leading-tight tracking-[-0.04em] text-ink-900 sm:text-5xl">{addon.title}</h1>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm font-bold text-ink-900/60">
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
              <AddonPeople addonId={addon.id} authorId={addon.authorId} authorName={addon.authorName} authorPhoto={authorPhoto} authorBorder={authorBorder} collaborators={collaborators} onNavigate={onNavigate} canManage={Boolean(user && (user.uid === addon.authorId || user.role === 'admin'))} onCollaboratorsChange={setCollaborators} />
            </div>

          </div>

          <div className="grid grid-cols-1 gap-8 border-t border-parchment-border pt-8 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div>
              <h2 className="mb-4 text-lg font-bold text-ink-900">Description</h2>
              <RichTextContent html={fullDescription ?? addon.description} isDarkMode={isDarkMode}/>
            </div>

            <div className="space-y-6">
              {addon.demoUrl && (
                <div className="rounded-2xl border border-parchment-border bg-parchment p-5 shadow-card">
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-900"><ExternalLink size={16} /> Demo preview</h2>
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

          <section className="mt-8 rounded-2xl border border-parchment-border bg-parchment p-5 sm:p-6" aria-labelledby="versions-title">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><h2 id="versions-title" className="flex items-center gap-2 text-lg font-bold text-ink-900"><History size={18} /> Versions & changelog</h2><p className="mt-1 text-sm text-ink-900/55">Choose the release that matches your Minecraft setup.</p></div>
              {(user?.uid === addon.authorId || user?.role === 'admin') && versions.length < 2 && <button type="button" onClick={() => setIsVersionEditorOpen(value => !value)} className={getButtonClasses('secondary', 'sm')}>{isVersionEditorOpen ? 'Close editor' : 'Add version'}</button>}
            </div>
            {versions.length > 0 ? <div className="mt-5 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]"><div className="space-y-2">{versions.map(version => <button key={version.id} type="button" onClick={() => setSelectedVersionId(version.id)} className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${activeVersion?.id === version.id ? 'border-terracotta bg-terracotta/10' : 'border-parchment-border bg-parchment-raised hover:border-terracotta/60'}`}><span className="block text-sm font-bold text-ink-900">{version.version}</span><span className="mt-1 block text-xs text-ink-900/50">{new Date(version.createdAt).toLocaleDateString()}</span></button>)}</div><div className="min-h-32 rounded-xl bg-parchment-raised p-4"><p className="text-xs font-bold uppercase tracking-widest text-terracotta-text">{activeVersion?.version || 'Latest release'}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink-900/70">{activeVersion?.changelog || 'No changelog was provided for this release.'}</p>{activeVersion?.compatibilityNotes && <p className="mt-4 border-t border-parchment-border pt-3 text-xs font-semibold text-ink-900/55">Compatibility: {activeVersion.compatibilityNotes}</p>}</div></div> : <p className="mt-5 rounded-xl bg-parchment-raised p-4 text-sm text-ink-900/55">No version history has been published yet.</p>}
            {isVersionEditorOpen && <form onSubmit={handleSaveVersion} className="mt-5 grid gap-3 border-t border-parchment-border pt-5 sm:grid-cols-2"><input required value={versionDraft.version} onChange={event => setVersionDraft(prev => ({ ...prev, version: event.target.value }))} placeholder="Version e.g. 1.1.0" className="rounded-xl border border-parchment-border bg-parchment-raised px-3 py-2.5 text-sm text-ink-900 outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20" /><div className="flex min-w-0 gap-2">
  <input required type="text" value={versionFileName || versionDraft.downloadUrl} onChange={event => { setVersionFileName(''); setVersionDraft(prev => ({ ...prev, downloadUrl: event.target.value })); }} placeholder="Link Untuk Update" className="min-w-0 flex-1 rounded-xl border border-parchment-border bg-parchment-raised px-3 py-2.5 text-sm text-ink-900 outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20" aria-label="Link Untuk Update atau nama file" />
  <button type="button" onClick={() => versionFileInputRef.current?.click()} disabled={versionFileUploadProgress !== null} title="Upload file update" aria-label="Upload file update" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-terracotta text-paper shadow-sm transition hover:bg-terracotta-text active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50">
    {versionFileUploadProgress !== null ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-paper/35 border-t-paper" /> : <FileArchive size={16} aria-hidden="true" />}
  </button>
  <input ref={versionFileInputRef} type="file" onChange={handleVersionFileSelected} accept={ADDON_FILE_ACCEPT} className="hidden" />
</div><textarea value={versionDraft.changelog} onChange={event => setVersionDraft(prev => ({ ...prev, changelog: event.target.value }))} rows={3} placeholder="What changed in this release?" className="rounded-xl border border-parchment-border bg-parchment-raised px-3 py-2.5 text-sm text-ink-900 outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20 sm:col-span-2" /><input value={versionDraft.compatibilityNotes} onChange={event => setVersionDraft(prev => ({ ...prev, compatibilityNotes: event.target.value }))} placeholder="Compatibility notes (optional)" className="rounded-xl border border-parchment-border bg-parchment-raised px-3 py-2.5 text-sm text-ink-900 outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20" /><div className="flex justify-end sm:col-span-2"><button type="submit" disabled={isVersionSaving} className={`${getButtonClasses('primary', 'sm')} disabled:opacity-50`}>{isVersionSaving ? 'Saving…' : 'Publish version'}</button></div></form>}
          </section>

        </div>
      </article>

      <section className="mt-6 rounded-2xl border border-parchment-border bg-parchment-raised p-5 shadow-card sm:p-6" aria-label="Add-on actions">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-parchment-border pb-4"><p className="text-sm font-bold text-ink-900">Want to keep this add-on?</p><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => setIsReportModalOpen(true)} className={`${getButtonClasses('secondary', 'sm')} gap-2`}><AlertTriangle size={15} />Report</button><button type="button" onClick={handleLikeClick} className={`${getButtonClasses('secondary', 'sm')} gap-2 ${isLiked ? 'border-terracotta bg-terracotta/10 text-terracotta-text' : ''}`}><Heart size={15} className={isLiked ? 'fill-current' : ''} />{isLiked ? 'Liked' : 'Like'}</button><button type="button" onClick={handleBookmarkClick} className={`${getButtonClasses('secondary', 'sm')} gap-2 ${isBookmarked ? 'border-terracotta bg-terracotta/10 text-terracotta-text' : ''}`}><Bookmark size={15} className={isBookmarked ? 'fill-current' : ''} />{isBookmarked ? 'Bookmarked' : 'Bookmark'}</button></div></div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-widest text-terracotta-text">Download release</p><p className="mt-1 text-sm font-bold text-ink-900">{activeVersion?.version || 'Current version'}</p><p className="mt-1 text-xs text-ink-900/50">{activeVersion?.compatibilityNotes || 'Choose a version above if this add-on has multiple releases.'}</p></div>{versions.length > 0 && <VersionDropdown versions={versions} selectedVersionId={selectedVersionId} onChange={setSelectedVersionId} />}</div>
        <button type="button" onClick={handleDownloadClick} disabled={isDownloading} className={`mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl px-5 text-base font-bold transition-[background-color,color,transform] duration-150 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 ${downloadSuccess ? 'bg-success/[0.12] text-success' : 'bg-terracotta text-ink-900 hover:bg-terracotta-text hover:text-paper'}`}>{isDownloading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />Downloading {downloadProgress}%</> : downloadSuccess ? <><Check size={18} />Downloaded!</> : <><Download size={18} />Download {activeVersion?.version || 'add-on'}</>}</button>
      </section>

      {addon.panoramaUrl && <div className="mt-8"><PanoramaViewer src={addon.panoramaUrl} alt={`${addon.title} panorama`} /></div>}

      <section className="mt-8 rounded-2xl border border-parchment-border bg-parchment-raised p-5 shadow-card sm:p-8" aria-label="Comments and reviews"><div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-terracotta-text"><MessageSquare size={14} /> Community feedback</div><ReviewSection addonId={addon.id} reviews={reviews} onReviewSubmitted={review => setReviews(prev => [review, ...prev])} onReviewDeleted={reviewId => setReviews(prev => prev.filter(review => review.id !== reviewId))} onRequireAuth={onRequireAuth} /></section>

      <ReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} addonId={addon.id} />
    </div>
  );
}
