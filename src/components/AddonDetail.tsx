'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Addon, AddonVersion, Review, ViewState } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { AlertTriangle, ArrowDownToLine, ArrowLeft, Bookmark, Check, FolderArchive, ChevronDown, ChevronLeft, ChevronRight, Copy, Download, ExternalLink, Heart, History, MessageSquare, MoreVertical, Star, User } from '@/components/icons/animated';
import { ReportModal } from './ReportModal';
import { ReviewSection } from './ReviewSection';
import { FadeImage } from './FadeImage';
import { FitCover } from './FitCover';
import { ProfileAvatar } from './borderEffects';
import { AddonPeople } from './AddonPeople';
import { RichTextContent } from './RichTextContent';
import { getButtonClasses } from '@/lib/designSystem';
import { Skeleton, SkeletonCard } from './Skeleton';
import { uploadAddonFile, ADDON_FILE_ACCEPT } from '@/lib/addonFileUpload';
import { PanoramaViewer } from './PanoramaViewer';

/** Menu icons (SVG) — same style as lucide, no emoji */

import { fetchToolcoinCatalogItem, toolcoinItemToAddon, clientToolcoinBase } from '@/lib/toolcoin';
import { toggleToolcoinBookmark } from '@/lib/toolcoinLocal';

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


/** Marketplace descriptions are often plain text or messy HTML — normalize for RichTextContent. */
function formatMarketplaceDescription(raw: string | null | undefined): string {
  const text = (raw || '').trim();
  if (!text) return '';
  // Already HTML with block tags
  if (/<(p|div|br|li|ul|ol|h[1-6])\b/i.test(text)) {
    return text;
  }
  // Escape minimal entities then break on newlines / sentences for readability
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const paragraphs = escaped
    .split(/\n{2,}|\r\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length > 1) {
    return paragraphs.map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('');
  }
  // Single block: soft-wrap long run-on marketplace blurbs at sentence ends
  const one = paragraphs[0] || escaped;
  const sentences = one.split(/(?<=[.!?])\s+(?=[A-Z“"])/).filter(Boolean);
  if (sentences.length >= 3) {
    // group ~2 sentences per paragraph
    const chunks: string[] = [];
    for (let i = 0; i < sentences.length; i += 2) {
      chunks.push(sentences.slice(i, i + 2).join(' '));
    }
    return chunks.map((c) => `<p>${c}</p>`).join('');
  }
  return `<p>${one.replace(/\n/g, '<br/>')}</p>`;
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
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const [authorBorder, setAuthorBorder] = useState<string>('none');
  const [collaborators, setCollaborators] = useState<NonNullable<Addon['collaborators']>>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const gallerySwipeStartXRef = useRef<number | null>(null);
  const [imageLoaded, setImageLoaded] = useState(true);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(() => new Set());
  const [videoActivated, setVideoActivated] = useState(false);
  const [versions, setVersions] = useState<AddonVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [isVersionEditorOpen, setIsVersionEditorOpen] = useState(false);
  const [isVersionSaving, setIsVersionSaving] = useState(false);
  const [versionDraft, setVersionDraft] = useState({ version: '', downloadUrl: '', changelog: '', compatibilityNotes: '' });
  const [versionFileName, setVersionFileName] = useState('');
  const [versionFileUploadProgress, setVersionFileUploadProgress] = useState<number | null>(null);
  const versionFileInputRef = useRef<HTMLInputElement>(null);
  /** Full ToolCoin item by ID — survives hard refresh / deep link */
  const [toolcoinAddon, setToolcoinAddon] = useState<Addon | null>(null);
  const [toolcoinLoading, setToolcoinLoading] = useState(false);
  const [toolcoinTried, setToolcoinTried] = useState(false);
  const [toolcoinMedia, setToolcoinMedia] = useState<{
    imageUrl?: string;
    imageUrls?: string[];
    panoramaUrl?: string;
    description?: string;
    title?: string;
    authorName?: string;
    authorPhoto?: string | null;
  } | null>(null);

  const baseAddon = addons.find(a => a.id === addonId) || toolcoinAddon || undefined;
  const addon = baseAddon
    ? ({
        ...baseAddon,
        ...(toolcoinMedia || {}),
        imageUrl: toolcoinMedia?.imageUrl || baseAddon.imageUrl,
        imageUrls: toolcoinMedia?.imageUrls?.length ? toolcoinMedia.imageUrls : baseAddon.imageUrls,
        description: toolcoinMedia?.description ?? baseAddon.description,
        title: toolcoinMedia?.title || baseAddon.title,
        authorName:
          (toolcoinMedia?.authorName &&
            toolcoinMedia.authorName.toLowerCase() !== 'marketplace creator'
              ? toolcoinMedia.authorName
              : null) || baseAddon.authorName,
        authorPhoto: toolcoinMedia?.authorPhoto ?? baseAddon.authorPhoto,
      } as Addon)
    : undefined;
  const isLiked = userLikes.has(addonId);
  const isBookmarked = userBookmarks.has(addonId);
  const activeVersion = versions.find(version => version.id === selectedVersionId) || versions[0];
  const packIdForDownload = String(addon?.id || '')
    .replace(/^toolcoin:/i, '')
    .trim();
  const activeDownloadUrl = (() => {
    const raw = (activeVersion?.downloadUrl || addon?.downloadUrl || '').trim();
    // Never use bare Railway host in the browser
    if (raw && !/railway\.app/i.test(raw) && !/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith('/api/toolcoin/')) return raw;
    if (packIdForDownload) {
      return `/api/toolcoin/media/fetch-pack/${encodeURIComponent(packIdForDownload)}`;
    }
    return '';
  })();

  const [fullDescription, setFullDescription] = useState<string | null>(null);
  useEffect(() => {
    setCollaborators(addon?.collaborators ?? []);
  }, [addon?.collaborators]);

  // Cover carousel only — never mix panorama into detail hero
  const images = useMemo(() => {
    // Stable order: pack_icon (thumb) → cover0 → cover1 → cover2…  (panorama excluded)
    const panorama = (
      toolcoinMedia?.panoramaUrl ||
      (addon as any)?.panoramaUrl ||
      ''
    ).trim();
    const panoKey = panorama ? panorama.split('?')[0] : '';

    const isPano = (s: string) => {
      if (!s) return true;
      if (panorama && (s === panorama || s === panoKey || s.startsWith(panoKey))) return true;
      return /panorama/i.test(s);
    };

    const ordered: string[] = [];
    const seen = new Set<string>();
    const add = (u?: string | null) => {
      const s = (u || '').trim();
      if (!s || isPano(s) || seen.has(s)) return;
      seen.add(s);
      ordered.push(s);
    };

    // 1 pack icon / thumb
    add(toolcoinMedia?.imageUrl);
    add(addon?.imageUrl);
    // 2 covers in server order
    for (const u of toolcoinMedia?.imageUrls || []) add(u);
    for (const u of addon?.imageUrls || []) add(u);

    const real = ordered.filter((s) => !(/\.svg(\?|$)/i.test(s) || s.includes('/api/thumbnail/')));
    const fallback = ordered.filter((s) => /\.svg(\?|$)/i.test(s) || s.includes('/api/thumbnail/'));
    return (real.length ? real : fallback).filter((u) => !brokenImages.has(u));
  }, [addon, toolcoinMedia, brokenImages]);


  const panoramaUrl = (
    toolcoinMedia?.panoramaUrl ||
    (addon as any)?.panoramaUrl ||
    ''
  ).trim();

  useEffect(() => {
    setFullDescription(null);
    setToolcoinMedia(null);
    setToolcoinAddon(null);
    setToolcoinTried(false);
    setBrokenImages(new Set());
    setCurrentImageIndex(0);
    if (!addonId) return;

    const fromList = addons.find(a => a.id === addonId);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(addonId);
    const looksToolcoin =
      fromList?.source === 'toolcoin' ||
      Boolean(fromList?.authorId?.startsWith('toolcoin:')) ||
      (!fromList && isUuid);

    // Always resolve ToolCoin by id on refresh / direct link / list navigation
    if (looksToolcoin || isUuid || fromList?.source === 'toolcoin') {
      if (fromList?.source === 'toolcoin') {
        setFullDescription(fromList.description);
        setCollaborators([]);
        const resolvedVersions: AddonVersion[] = fromList.downloadUrl
          ? [{
              id: `toolcoin-${fromList.id}`,
              addonId: fromList.id,
              version: 'Marketplace',
              downloadUrl: fromList.downloadUrl,
              changelog: '',
              compatibilityNotes: fromList.toolcoinType ? `Type: ${fromList.toolcoinType}` : 'Official Minecraft Marketplace',
              createdAt: fromList.createdAt,
            }]
          : [];
        setVersions(resolvedVersions);
        setSelectedVersionId(resolvedVersions[0]?.id || null);
      }

      const ac = new AbortController();
      setToolcoinLoading(true);
      fetchToolcoinCatalogItem(addonId, ac.signal)
        .then((item) => {
          if (!item) {
            setToolcoinTried(true);
            return;
          }
          const mapped = toolcoinItemToAddon(item, clientToolcoinBase());
          setToolcoinAddon(mapped);
          if (mapped.description) setFullDescription(mapped.description);
          setToolcoinMedia({
            imageUrl: mapped.imageUrl || undefined,
            imageUrls: mapped.imageUrls?.length ? mapped.imageUrls : undefined,
            panoramaUrl: (mapped as any).panoramaUrl || undefined,
            description: mapped.description || undefined,
            title: mapped.title || undefined,
            authorName: mapped.authorName || undefined,
            authorPhoto: mapped.authorPhoto ?? undefined,
          });
          if (mapped.downloadUrl) {
            const v: AddonVersion = {
              id: `toolcoin-${mapped.id}`,
              addonId: mapped.id,
              version: 'Marketplace',
              downloadUrl: mapped.downloadUrl,
              changelog: '',
              compatibilityNotes: mapped.toolcoinType ? `Type: ${mapped.toolcoinType}` : 'Official Minecraft Marketplace',
              createdAt: mapped.createdAt,
            };
            setVersions([v]);
            setSelectedVersionId(v.id);
          }
          setCollaborators([]);
          setToolcoinTried(true);
        })
        .catch(() => setToolcoinTried(true))
        .finally(() => setToolcoinLoading(false));
      return () => ac.abort();
    }

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
  }, [addonId, addons]);

  // Cover images render with opacity-100 always (imageLoaded gate caused black hero).

  useEffect(() => {
    if (!addon) return;
    if (addon.source === 'toolcoin' || addon.authorId?.startsWith('toolcoin:')) {
      setAuthorPhoto(addon.authorPhoto ?? null);
      setAuthorBorder(addon.authorBorder ?? 'none');
      return;
    }
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

  useEffect(() => {
    if (!images.length) return;
    if (currentImageIndex >= images.length) setCurrentImageIndex(0);
  }, [images, currentImageIndex]);

  // Auto-advance cover images every 20s
  useEffect(() => {
    if (images.length < 2) return;
    const id = window.setInterval(() => {
      setCurrentImageIndex((i) => (i + 1) % images.length);
    }, 20000);
    return () => window.clearInterval(id);
  }, [images.length]);



  // More-menu handlers must stay above any early return (Rules of Hooks)
  useEffect(() => {
    if (!moreMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, [moreMenuOpen]);

  const packUuid = String((addon?.id || addonId || '')).replace(/^toolcoin:/i, '');
  const handleCopyUuid = async () => {
    try {
      await navigator.clipboard.writeText(packUuid);
      showToast('UUID copied.', 'success');
    } catch {
      showToast('Could not copy UUID.', 'error');
    }
    setMoreMenuOpen(false);
  };
  const handleOpenMinecraft = () => {
    const store = `https://www.minecraft.net/en-us/marketplace/pdp?id=${encodeURIComponent(packUuid)}`;
    window.open(store, '_blank', 'noopener,noreferrer');
    setMoreMenuOpen(false);
  };
  const handleOpenCreator = () => {
    if (addon?.authorId) {
      onNavigate({ type: 'author', id: addon.authorId } as unknown as ViewState);
    }
    setMoreMenuOpen(false);
  };

  if (!addon) {
    if (loading || toolcoinLoading || (!toolcoinTried && addonId)) {
      return (
        <div className="mx-auto min-h-[100dvh] max-w-7xl px-4 py-16 text-center">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <SkeletonCard />
          </div>
          <p className="mt-6 text-sm text-ink-900/50">Loading marketplace item…</p>
        </div>
      );
    }
    return (
      <div className="mx-auto min-h-[100dvh] max-w-7xl px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-ink-900">Add-on not found</h2>
        <p className="mt-2 text-sm text-ink-900/50">This pack may have been removed or the link is incomplete.</p>
        <button onClick={() => onNavigate('home')} className={`mt-5 ${getButtonClasses('primary', 'md')}`}>
          Return to Marketplace
        </button>
      </div>
    );
  }

  const goNext = () => {
    if (images.length <= 1) return;
    setIsPaused(true);
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };
  const goPrev = () => {
    if (images.length <= 1) return;
    setIsPaused(true);
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };
  const goTo = (idx: number) => {
    setIsPaused(true);
    setCurrentImageIndex(idx);
  };
  const handleGalleryPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    // Don't capture when clicking nav buttons / dots
    const target = event.target as HTMLElement | null;
    if (target?.closest?.('button')) return;
    gallerySwipeStartXRef.current = event.clientX;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
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

    let url = (activeDownloadUrl || '').trim();
    if (!url && packIdForDownload) {
      url = `/api/toolcoin/media/fetch-pack/${encodeURIComponent(packIdForDownload)}`;
    }
    if (!url) {
      showToast('No download is available for this version.', 'error');
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(10);

    const filenameGuess = `${(addon.title || 'pack').replace(/[^\w\- ]+/g, '').trim() || 'pack'}.mcaddon`;

    try {
      // 1) Preferred: blob via same-origin proxy (no Railway URL in UI)
      const res = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDownloadProgress(60);
      const blob = await res.blob();
      if (!blob || blob.size < 32) throw new Error('Empty pack file');
      const cd = res.headers.get('Content-Disposition') || '';
      const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(cd);
      const filename = match
        ? decodeURIComponent(match[1].replace(/"/g, '').trim())
        : filenameGuess;
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      setDownloadProgress(100);
      setDownloadSuccess(true);
      window.setTimeout(() => setDownloadSuccess(false), 3000);
      fetch(`/api/addons?id=${encodeURIComponent(addon.id)}&action=download`, { method: 'POST' }).catch(() => {});
    } catch (err) {
      // 2) Fallback: direct <a download> same-origin (still no new tab to Railway)
      try {
        const a = document.createElement('a');
        a.href = url;
        a.download = filenameGuess;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setDownloadSuccess(true);
        window.setTimeout(() => setDownloadSuccess(false), 3000);
      } catch {
        showToast('Download failed. Check your connection and try again.', 'error');
      }
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const handleLikeClick = () => {
    if (!user) { onRequireAuth(); return; }
    onToggleLike(addon.id, isLiked);
  };

  const handleBookmarkClick = () => {
    if (!user) { onRequireAuth(); return; }
    if (addon.source === 'toolcoin') {
      const nowOn = toggleToolcoinBookmark(addon.id);
      onToggleBookmark(addon.id, !nowOn);
      showToast(nowOn ? 'Saved to bookmarks.' : 'Removed from bookmarks.', 'success');
      return;
    }
    onToggleBookmark(addon.id, isBookmarked);
    showToast(isBookmarked ? 'Removed from bookmarks.' : 'Saved to bookmarks.', 'success');
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
      <div className="mb-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold text-ink-900/65 transition-colors hover:bg-ink-900/[0.04] hover:text-ink-900"
        >
          <ArrowLeft size={16} /> Back to Marketplace
        </button>
        <div className="relative" ref={moreMenuRef}>
          <button
            type="button"
            aria-label="More actions"
            aria-expanded={moreMenuOpen}
            onClick={(e) => {
              e.stopPropagation();
              setMoreMenuOpen((v) => !v);
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-parchment-border bg-parchment-raised text-ink-900/70 shadow-sm transition hover:bg-ink-900/[0.04] hover:text-ink-900"
          >
            <MoreVertical size={18} />
          </button>
          {moreMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 z-[80] mt-2 w-56 overflow-hidden rounded-2xl border border-parchment-border bg-parchment-raised py-1.5 shadow-card-float"
            >
              <button
                type="button"
                role="menuitem"
                onClick={handleCopyUuid}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-ink-900/85 transition hover:bg-ink-900/[0.05]"
              >
                <Copy size={16} className="shrink-0 text-ink-900/45" />
                Copy UUID
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={handleOpenMinecraft}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-ink-900/85 transition hover:bg-ink-900/[0.05]"
              >
                <ExternalLink size={16} className="shrink-0 text-ink-900/45" />
                Open in Minecraft
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  handleBookmarkClick();
                  setMoreMenuOpen(false);
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-ink-900/85 transition hover:bg-ink-900/[0.05]"
              >
                <Heart size={16} className="shrink-0 text-ink-900/45" />
                {isBookmarked ? 'Remove favorite' : 'Add to favorites'}
              </button>
              <div className="my-1 border-t border-parchment-border" />
              <button
                type="button"
                role="menuitem"
                onClick={handleOpenCreator}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-ink-900/85 transition hover:bg-ink-900/[0.05]"
              >
                <User size={16} className="shrink-0 text-ink-900/45" />
                Creator
              </button>
            </div>
          )}
        </div>
      </div>

    <article className="overflow-hidden rounded-2xl border border-parchment-border bg-parchment-raised shadow-card">
        <div
          className="group/cover relative w-full overflow-hidden border-b border-parchment-border bg-ink-900"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onPointerDown={handleGalleryPointerDown}
          onPointerUp={handleGalleryPointerUp}
          onPointerCancel={handleGalleryPointerCancel}
          style={{ touchAction: 'pan-y' }}
        >
          {!images[currentImageIndex] && (
            <Skeleton className="absolute inset-0 z-10 rounded-none border-0" />
          )}
          {images[currentImageIndex] ? (
            <FitCover
              key={images[currentImageIndex]}
              src={images[currentImageIndex]}
              alt={addon.title}
              className="w-full"
              matchAspect
              loading="eager"
              preferWebp={false}
              onError={() => {
                const bad = images[currentImageIndex];
                if (!bad) return;
                setBrokenImages((prev) => {
                  const next = new Set(prev);
                  next.add(bad);
                  return next;
                });
              }}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center text-sm font-bold text-white/50">
              <span>No cover image</span>
              {panoramaUrl ? (
                <span className="text-xs font-medium text-white/35">Scroll down for panorama</span>
              ) : null}
            </div>
          )}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); goPrev(); }}
                aria-label="Previous cover image"
                className="absolute left-3 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl border border-white/15 bg-ink-900/80 text-white shadow-card backdrop-blur-sm transition hover:bg-ink-900"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); goNext(); }}
                aria-label="Next cover image"
                className="absolute right-3 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl border border-white/15 bg-ink-900/80 text-white shadow-card backdrop-blur-sm transition hover:bg-ink-900"
              >
                <ChevronRight size={22} />
              </button>
              <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1 rounded-full bg-ink-900/50 px-2 py-1 backdrop-blur-sm">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); goTo(idx); }}
                    aria-label={`Go to image ${idx + 1}`}
                    className="p-1.5"
                  >
                    <span
                      className={`block h-2 rounded-full border border-white/30 transition-all ${
                        idx === currentImageIndex ? 'w-6 bg-terracotta' : 'w-2 bg-white/50'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="p-6 sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-start justify-between gap-6 mb-8">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full bg-terracotta/15 px-3 py-1.5 text-xs font-bold text-terracotta-text">
                  {addon.category}
                </span>
                {addon.source === 'toolcoin' && (
                  <span className="inline-flex rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-700">
                    Official Marketplace
                  </span>
                )}
                {(addon.tags || [])
                  .filter((tag) => {
                    const s = String(tag || '').trim();
                    if (!s || s.length > 28) return false;
                    if (/^[0-9a-f]{8}-/i.test(s) || /^[0-9a-f-]{16,}$/i.test(s)) return false;
                    const low = s.toLowerCase();
                    return !['official', 'marketplace', 'addon', 'add-on'].includes(low);
                  })
                  .slice(0, 8)
                  .map((tag) => (
                    <span
                      key={String(tag)}
                      className="inline-flex rounded-full border border-parchment-border bg-parchment px-2.5 py-1 text-[11px] font-semibold text-ink-900/65 dark:border-white/10 dark:bg-white/5 dark:text-paper/70"
                    >
                      {String(tag)}
                    </span>
                  ))}
              </div>
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
              <div className="prose prose-sm sm:prose-base max-w-none text-ink-900/80 prose-p:mb-3 prose-p:leading-7 prose-p:text-ink-900/75">
                <RichTextContent
                  html={formatMarketplaceDescription(fullDescription ?? addon.description)}
                  isDarkMode={isDarkMode}
                />
              </div>
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
    {versionFileUploadProgress !== null ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-paper/35 border-t-paper" /> : <FolderArchive size={16} aria-hidden="true" />}
  </button>
  <input ref={versionFileInputRef} type="file" onChange={handleVersionFileSelected} accept={ADDON_FILE_ACCEPT} className="hidden" />
</div><textarea value={versionDraft.changelog} onChange={event => setVersionDraft(prev => ({ ...prev, changelog: event.target.value }))} rows={3} placeholder="What changed in this release?" className="rounded-xl border border-parchment-border bg-parchment-raised px-3 py-2.5 text-sm text-ink-900 outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20 sm:col-span-2" /><input value={versionDraft.compatibilityNotes} onChange={event => setVersionDraft(prev => ({ ...prev, compatibilityNotes: event.target.value }))} placeholder="Compatibility notes (optional)" className="rounded-xl border border-parchment-border bg-parchment-raised px-3 py-2.5 text-sm text-ink-900 outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20" /><div className="flex justify-end sm:col-span-2"><button type="submit" disabled={isVersionSaving} className={`${getButtonClasses('primary', 'sm')} disabled:opacity-50`}>{isVersionSaving ? 'Saving…' : 'Publish version'}</button></div></form>}
          </section>

        </div>
      </article>


      {panoramaUrl ? (
        <div className="mt-6">
          <PanoramaViewer src={panoramaUrl} alt={`${addon.title} panorama`} />
        </div>
      ) : null}

      <section className="mt-6 rounded-2xl border border-parchment-border bg-parchment-raised p-5 shadow-card sm:p-6" aria-label="Add-on actions">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-parchment-border pb-4"><p className="text-sm font-bold text-ink-900">Want to keep this add-on?</p><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => setIsReportModalOpen(true)} className={`${getButtonClasses('secondary', 'sm')} gap-2`}><AlertTriangle size={15} />Report</button><button type="button" onClick={handleLikeClick} className={`${getButtonClasses('secondary', 'sm')} gap-2 ${isLiked ? 'border-terracotta bg-terracotta/10 text-terracotta-text' : ''}`}><Heart size={15} className={isLiked ? 'fill-current' : ''} />{isLiked ? 'Liked' : 'Like'}</button><button type="button" onClick={handleBookmarkClick} className={`${getButtonClasses('secondary', 'sm')} gap-2 ${isBookmarked ? 'border-terracotta bg-terracotta/10 text-terracotta-text' : ''}`}><Bookmark size={15} className={isBookmarked ? 'fill-current' : ''} />{isBookmarked ? 'Bookmarked' : 'Bookmark'}</button></div></div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-widest text-terracotta-text">Download release</p><p className="mt-1 text-sm font-bold text-ink-900">{activeVersion?.version || 'Current version'}</p><p className="mt-1 text-xs text-ink-900/50">{activeVersion?.compatibilityNotes || 'Choose a version above if this add-on has multiple releases.'}</p></div>{versions.length > 0 && <VersionDropdown versions={versions} selectedVersionId={selectedVersionId} onChange={setSelectedVersionId} />}</div>
        <button type="button" onClick={handleDownloadClick} disabled={isDownloading} className={`mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl px-5 text-base font-bold transition-[background-color,color,transform] duration-150 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 ${downloadSuccess ? 'bg-success/[0.12] text-success' : 'bg-terracotta text-ink-900 hover:bg-terracotta-text hover:text-paper'}`}>{isDownloading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />Downloading {downloadProgress}%</> : downloadSuccess ? <><Check size={18} />Downloaded!</> : <><Download size={18} />Download {activeVersion?.version || 'add-on'}</>}</button>
      </section>


      <section className="mt-8 rounded-2xl border border-parchment-border bg-parchment-raised p-5 shadow-card sm:p-8" aria-label="Comments and reviews"><div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-terracotta-text"><MessageSquare size={14} /> Community feedback</div><ReviewSection addonId={addon.id} reviews={reviews} onReviewSubmitted={review => setReviews(prev => [review, ...prev])} onReviewDeleted={reviewId => setReviews(prev => prev.filter(review => review.id !== reviewId))} onRequireAuth={onRequireAuth} /></section>

      <ReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} addonId={addon.id} />
    </div>
  );
}
