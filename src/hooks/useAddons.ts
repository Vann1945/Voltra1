'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Addon } from '@/types';
import { PROFILE_UPDATED_EVENT, ProfileUpdate, useAuth } from './useAuth';
import { AddonUploadInput } from '@/lib/utils';
import { fetchToolcoinCatalogPage, toolcoinItemToAddon, mergeAddons, clientToolcoinBase } from '@/lib/toolcoin';

const BACKGROUND_POLL_INTERVAL_MS = 90000;
const TOOLCOIN_PAGE_SIZE = 50;

export function useAddons() {
  const { user } = useAuth();
  const [addons, setAddons] = useState<Addon[]>([]);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [userBookmarks, setUserBookmarks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const lastFetchedAtRef = useRef(0);
  const addonsRequestRef = useRef<AbortController | null>(null);
  const MIN_REFETCH_GAP_MS = 15000;

  const communityRef = useRef<Addon[]>([]);
  const [officialAddons, setOfficialAddons] = useState<Addon[]>([]);
  const [toolcoinPage, setToolcoinPage] = useState(1);
  const [toolcoinTotal, setToolcoinTotal] = useState(0);
  const [toolcoinHasMore, setToolcoinHasMore] = useState(false);
  const [toolcoinLoadingPage, setToolcoinLoadingPage] = useState(false);
  const officialFilterRef = useRef({ q: '', category: 'all', tag: '', sort: 'newest' });
  const toolcoinReqRef = useRef<AbortController | null>(null);

  const loadOfficialPage = useCallback(async (page: number, signal?: AbortSignal, filters = officialFilterRef.current) => {
    setToolcoinLoadingPage(true);
    try {
      const data = await fetchToolcoinCatalogPage({
        page,
        limit: TOOLCOIN_PAGE_SIZE,
        q: filters.q,
        category: filters.category,
        tag: filters.tag,
        sort: filters.sort,
        signal,
      });
      const base = data.downloadBase || clientToolcoinBase();
      const official = data.items
        .filter((it) => it?.id && it?.title)
        .map((it) => toolcoinItemToAddon(it, base));
      setOfficialAddons(official);
      setToolcoinPage(page);
      setToolcoinTotal(data.total);
      setToolcoinHasMore(data.has_more);
      setAddons(mergeAddons(communityRef.current, official));
      console.info(`[toolcoin] page ${page}: ${official.length}/${data.total}`);
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        console.warn('[toolcoin] page load failed', err);
      }
    } finally {
      setToolcoinLoadingPage(false);
    }
  }, []);

  const searchOfficial = useCallback(async (filters: { q?: string; category?: string; tag?: string; sort?: string }, page = 1) => {
    officialFilterRef.current = {
      q: filters.q?.trim() || '',
      category: filters.category || 'all',
      tag: filters.tag?.trim() || '',
      sort: filters.sort || 'newest',
    };
    toolcoinReqRef.current?.abort();
    const controller = new AbortController();
    toolcoinReqRef.current = controller;
    await loadOfficialPage(page, controller.signal, officialFilterRef.current);
  }, [loadOfficialPage]);

  const goToOfficialPage = useCallback(async (page: number) => {
    if (page < 1) return;
    toolcoinReqRef.current?.abort();
    const controller = new AbortController();
    toolcoinReqRef.current = controller;
    await loadOfficialPage(page, controller.signal, officialFilterRef.current);
  }, [loadOfficialPage]);

  // keep loadMoreOfficial as next-page helper for compatibility
  const loadMoreOfficial = useCallback(async () => {
    if (!toolcoinHasMore || toolcoinLoadingPage) return;
    await goToOfficialPage(toolcoinPage + 1);
  }, [toolcoinHasMore, toolcoinLoadingPage, toolcoinPage, goToOfficialPage]);

  const fetchAddons = useCallback(async (isBackground = false) => {
    addonsRequestRef.current?.abort();
    const controller = new AbortController();
    addonsRequestRef.current = controller;
    lastFetchedAtRef.current = Date.now();
    if (!isBackground) setLoading(true);
    try {
      const communityRes = await fetch('/api/addons', {
        credentials: 'include',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      let community: Addon[] = [];
      const contentType = communityRes.headers.get('content-type') || '';
      if (communityRes.ok && contentType.includes('application/json')) {
        const data = await communityRes.json();
        if (Array.isArray(data.addons)) community = data.addons;
      } else if (communityRes.status !== 404 && !controller.signal.aborted) {
        console.warn(`Community addons unavailable (${communityRes.status})`);
      }

      communityRef.current = community;
      if (!controller.signal.aborted) {
        setAddons(mergeAddons(community, []));
        officialFilterRef.current = { q: '', category: 'all', tag: '', sort: 'newest' };
        await loadOfficialPage(1, controller.signal, officialFilterRef.current);
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') console.error('Error fetching addons:', err);
    } finally {
      if (addonsRequestRef.current === controller) {
        addonsRequestRef.current = null;
        setLoading(false);
      }
    }
  }, [loadOfficialPage]);


  const fetchBookmarks = useCallback(async () => {
    if (!user) {
      setUserBookmarks(new Set());
      return;
    }
    try {
      const res = await fetch('/api/addons?action=bookmarks', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setUserBookmarks(new Set<string>(Array.isArray(data.addonIds) ? data.addonIds : []));
    } catch (err) {
      console.error('Error fetching bookmarks:', err);
    }
  }, [user]);

  const fetchLikes = useCallback(async () => {
    if (!user) {
      setUserLikes(new Set());
      return;
    }
    try {
      const res = await fetch('/api/likes', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setUserLikes(new Set<string>(data.addonIds));
    } catch (err) {
      console.error('Error fetching likes:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchAddons(false);

    const interval = setInterval(() => {
      if (document.hidden) return; // tab di background: jangan poll sama sekali
      fetchAddons(true);
    }, BACKGROUND_POLL_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.hidden) return;
      const sinceLastFetch = Date.now() - lastFetchedAtRef.current;
      if (sinceLastFetch > MIN_REFETCH_GAP_MS) {
        fetchAddons(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      addonsRequestRef.current?.abort();
    };
  }, [fetchAddons]);

  useEffect(() => {
    fetchLikes();
    fetchBookmarks();
  }, [fetchLikes, fetchBookmarks]);

  useEffect(() => {
    const handleProfileUpdated = (event: Event) => {
      const detail = (event as CustomEvent<ProfileUpdate>).detail;
      if (!detail?.uid) return;
      setAddons(current => current.map(addon => {
        const updatedAddon = addon.authorId === detail.uid
          ? {
              ...addon,
              authorName: detail.displayName,
              authorPhoto: detail.photoURL || null,
              authorBorder: detail.profileBorder || 'none',
            }
          : addon;
        if (!updatedAddon.collaborators?.some(collaborator => collaborator.uid === detail.uid)) return updatedAddon;
        return {
          ...updatedAddon,
          collaborators: updatedAddon.collaborators.map(collaborator => collaborator.uid === detail.uid
            ? { ...collaborator, displayName: detail.displayName, photoURL: detail.photoURL || null, profileBorder: detail.profileBorder || 'none' }
            : collaborator
          ),
        };
      }));
    };

    window.addEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated);
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated);
  }, []);

  const toggleLike = async (addonId: string, isLiked: boolean) => {
    if (!user) return;
    setUserLikes((prev) => {
      const next = new Set(prev);
      if (isLiked) next.delete(addonId); else next.add(addonId);
      return next;
    });
    setAddons((prev) =>
      prev.map((a) => (a.id === addonId ? { ...a, likesCount: a.likesCount + (isLiked ? -1 : 1) } : a))
    );

    try {
      const res = await fetch('/api/likes', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addonId, isLiked }),
      });
      if (!res.ok) throw new Error('Failed to toggle like.');
    } catch (err) {
      console.error('Error toggling like:', err);
      fetchLikes();
      fetchAddons();
    }
  };

  const toggleBookmark = async (addonId: string, isBookmarked: boolean) => {
    if (!user) return;
    setUserBookmarks(prev => {
      const next = new Set(prev);
      if (isBookmarked) next.delete(addonId); else next.add(addonId);
      return next;
    });
    try {
      const res = await fetch('/api/addons?action=bookmarks', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addonId, isBookmarked }),
      });
      if (!res.ok) throw new Error('Failed to toggle bookmark.');
    } catch (err) {
      console.error('Error toggling bookmark:', err);
      fetchBookmarks();
    }
  };

  const removeAddon = useCallback((addonId: string) => {
    setAddons(current => current.filter(addon => addon.id !== addonId));
    setUserLikes(current => {
      if (!current.has(addonId)) return current;
      const next = new Set(current);
      next.delete(addonId);
      return next;
    });
    setUserBookmarks(current => {
      if (!current.has(addonId)) return current;
      const next = new Set(current);
      next.delete(addonId);
      return next;
    });
  }, []);

  const createAddon = useCallback(async (input: AddonUploadInput): Promise<string> => {
    if (!user) throw new Error('You need to sign in to publish an add-on.');

    const res = await fetch('/api/addons', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to create add-on.');
    }
    const data = await res.json();
    await fetchAddons();
    return data.id as string;
  }, [user, fetchAddons]);

  return { addons, loading, userLikes, userBookmarks, toggleLike, toggleBookmark, createAddon, removeAddon, refetchAddons: fetchAddons, loadMoreOfficial, goToOfficialPage, searchOfficial, toolcoinPage, toolcoinTotal, toolcoinHasMore, toolcoinLoadingPage, toolcoinPageSize: TOOLCOIN_PAGE_SIZE };
}
