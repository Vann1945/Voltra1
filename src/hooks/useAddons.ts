'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Addon } from '@/types';
import { PROFILE_UPDATED_EVENT, ProfileUpdate, useAuth } from './useAuth';
import { AddonUploadInput } from '@/lib/utils';

const BACKGROUND_POLL_INTERVAL_MS = 90000;

export function useAddons() {
  const { user } = useAuth();
  const [addons, setAddons] = useState<Addon[]>([]);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [userBookmarks, setUserBookmarks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const lastFetchedAtRef = useRef(0);
  const addonsRequestRef = useRef<AbortController | null>(null);
  const MIN_REFETCH_GAP_MS = 15000; // Increase to 15s to avoid spamming the DB on fast tab switching

  const fetchAddons = useCallback(async (isBackground = false) => {
    addonsRequestRef.current?.abort();
    const controller = new AbortController();
    addonsRequestRef.current = controller;
    lastFetchedAtRef.current = Date.now();
    if (!isBackground) setLoading(true);
    try {
      const res = await fetch('/api/addons', {
        credentials: 'include',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok) {
        if (res.status === 404) {
          if (!controller.signal.aborted) setAddons([]);
          return;
        }
        throw new Error(`Failed to retrieve addons (${res.status})`);
      }
      if (!contentType.includes('application/json')) {
        if (!controller.signal.aborted) setAddons([]);
        return;
      }
      const data = await res.json();
      if (!controller.signal.aborted && Array.isArray(data.addons)) setAddons(data.addons);
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') console.error('Error fetching addons:', err);
    } finally {
      if (addonsRequestRef.current === controller) {
        addonsRequestRef.current = null;
        setLoading(false);
      }
    }
  }, []);

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

  return { addons, loading, userLikes, userBookmarks, toggleLike, toggleBookmark, createAddon, removeAddon, refetchAddons: fetchAddons };
}
