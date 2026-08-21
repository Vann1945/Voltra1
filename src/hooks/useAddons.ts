import { useState, useEffect, useCallback, useRef } from 'react';
import { Addon } from '../types';
import { useAuth } from './useAuth';
import { AddonUploadInput } from '../lib/utils';

const BACKGROUND_POLL_INTERVAL_MS = 90000;

export function useAddons() {
  const { user } = useAuth();
  const [addons, setAddons] = useState<Addon[]>([]);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const lastFetchedAtRef = useRef(0);
  const MIN_REFETCH_GAP_MS = 3000;

  const fetchAddons = useCallback(async () => {
    lastFetchedAtRef.current = Date.now();
    try {
      const res = await fetch('/api/addons', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to retrieve addons');
      const data = await res.json();
      setAddons(data.addons);
    } catch (err) {
      console.error('Error fetching addons:', err);
    } finally {
      setLoading(false);
    }
  }, []);

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
    setLoading(true);
    fetchAddons();

    const interval = setInterval(() => {
      if (document.hidden) return; // tab di background: jangan poll sama sekali
      fetchAddons();
    }, BACKGROUND_POLL_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.hidden) return;
      const sinceLastFetch = Date.now() - lastFetchedAtRef.current;
      if (sinceLastFetch > MIN_REFETCH_GAP_MS) {
        fetchAddons();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchAddons]);

  useEffect(() => {
    fetchLikes();
  }, [fetchLikes]);

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

  return { addons, loading, userLikes, toggleLike, createAddon, refetchAddons: fetchAddons };
}
