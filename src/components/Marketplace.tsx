'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, SlidersHorizontal, Sparkles, X, ChevronLeft, ChevronRight } from '@/components/icons/animated';
import { AddonCard } from './AddonCard';
import { Addon } from '@/types';
import { SkeletonCard } from './Skeleton';
import { ViewState } from '@/types';
import { CustomSelect } from './CustomSelect';
import { getButtonClasses, getInputClasses } from '@/lib/designSystem';
import { FadeImage } from './FadeImage';
import { FitCover } from './FitCover';
import { useT } from '@/lib/i18n';
import {
  toolcoinItemToAddon,
  fetchToolcoinCatalogPage,
  fetchToolcoinCatalogItem,
  mergeAddons,
  clientToolcoinBase,
  matchesLooseQuery,
  type ToolcoinCatalogItem,
  type ToolcoinCatalogPage,
} from '@/lib/toolcoin';

interface MarketplaceProps {
  addons: Addon[];
  loading: boolean;
  userLikes: Set<string>;
  userBookmarks: Set<string>;
  onToggleLike: (addonId: string, isLiked: boolean) => void;
  onToggleBookmark: (addonId: string, isBookmarked: boolean) => void;
  onRequireAuth: () => void;
  onNavigate: (view: ViewState) => void;
  layoutMode?: 'grid' | 'list';
  onGoToPage?: (page: number) => void;
  toolcoinPage?: number;
  toolcoinTotal?: number;
  toolcoinHasMore?: boolean;
  toolcoinLoadingPage?: boolean;
  toolcoinPageSize?: number;
  onSearch?: (filters: { q?: string; category?: string; tag?: string; sort?: string }, page?: number) => Promise<void>;
}

type SortOption = 'newest' | 'oldest' | 'most_liked' | 'highest_rated';
type CategoryOption = 'All' | 'Bukkit Plugins' | 'Modpack' | 'Customization' | 'Add-Ons' | 'Shaders' | 'Mods' | 'Resource Packs' | 'Data Pack' | 'World' | 'Skin Pack';
type DateRangeOption = 'all' | 'today' | 'week' | 'month';

const CATEGORIES: CategoryOption[] = ['All', 'Bukkit Plugins', 'Modpack', 'Customization', 'Add-Ons', 'Shaders', 'Mods', 'Resource Packs', 'Data Pack', 'World', 'Skin Pack'];

function buildPageList(current: number, totalPages: number): (number | '…')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages: (number | '…')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);
  if (start > 2) pages.push('…');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages - 1) pages.push('…');
  pages.push(totalPages);
  return pages;
}



export function Marketplace({
  addons,
  loading,
  userLikes,
  userBookmarks,
  onToggleLike,
  onToggleBookmark,
  onRequireAuth,
  onNavigate,
  layoutMode = 'grid',
  onGoToPage,
  toolcoinPage = 1,
  toolcoinTotal = 0,
  toolcoinHasMore = false,
  toolcoinLoadingPage = false,
  toolcoinPageSize = 50,
  onSearch,
}: MarketplaceProps) {
  const t = useT();
  const [pageSize, setPageSize] = useState(() => {
    try {
      const n = Number(localStorage.getItem('toolcoin_page_size') || toolcoinPageSize || 20);
      return Math.min(300, Math.max(20, n || 20));
    } catch {
      return toolcoinPageSize || 20;
    }
  });
  useEffect(() => {
    const onStorage = () => {
      try {
        const n = Number(localStorage.getItem('toolcoin_page_size') || 20);
        setPageSize(Math.min(300, Math.max(20, n || 20)));
      } catch { /* ignore */ }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('toolcoin-page-size', onStorage as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('toolcoin-page-size', onStorage as EventListener);
    };
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryOption>('All');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [dateRange, setDateRange] = useState<DateRangeOption>('all');
  const [tagFilter, setTagFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const [internalPage, setInternalPage] = useState(toolcoinPage || 1);
  const [officialAddons, setOfficialAddons] = useState<Addon[]>([]);
  const [officialTotal, setOfficialTotal] = useState(toolcoinTotal || 0);
  const [officialHasMore, setOfficialHasMore] = useState(Boolean(toolcoinHasMore));
  const [officialLoading, setOfficialLoading] = useState(false);
  const [groupShelves, setGroupShelves] = useState<Record<string, Addon[]>>({});
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [featuredIds, setFeaturedIds] = useState<Set<string>>(new Set());
  const [featuredHydrated, setFeaturedHydrated] = useState<Addon[]>([]);
  const [homeShelfIds, setHomeShelfIds] = useState<Record<string, string[]>>({});


  const featuredTrackRef = useRef<HTMLDivElement | null>(null);



  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(searchQuery.trim()), 200);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setInternalPage(Math.max(1, toolcoinPage || 1));
  }, [toolcoinPage]);

  useEffect(() => {
    setInternalPage(1);
  }, [debouncedQuery, selectedCategory, sortBy, tagFilter]);

  const toolcoinCategory = useMemo(() => {
    switch (selectedCategory) {
      case 'Add-Ons': return 'addon';
      case 'Resource Packs': return 'resourcepack';
      case 'World': return 'world';
      case 'Skin Pack': return 'skinpack';
      default: return 'all';
    }
  }, [selectedCategory]);

  const currentPage = Math.max(1, internalPage);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setOfficialLoading(true);

    void onSearch?.({
      q: debouncedQuery || undefined,
      category: toolcoinCategory,
      tag: tagFilter.trim() || undefined,
      sort: sortBy,
    }, currentPage).catch(() => undefined);

    fetchToolcoinCatalogPage({
      page: currentPage,
      limit: 24,
      category: toolcoinCategory,
      q: debouncedQuery,
      tag: tagFilter.trim(),
      sort: sortBy,
      signal: controller.signal,
    }).then((page: ToolcoinCatalogPage) => {
      if (!active) return;
      const base = page.downloadBase || clientToolcoinBase();
      let mapped = (page.items || []).filter(Boolean).map((item: ToolcoinCatalogItem) => toolcoinItemToAddon(item, base));
      // Client-side safety net: Add-Ons tab must not show skins / worlds / textures
      if (selectedCategory === 'Add-Ons') {
        mapped = mapped.filter((a) => a.category === 'Add-Ons');
      } else if (selectedCategory === 'Skin Pack') {
        mapped = mapped.filter((a) => a.category === 'Skin Pack');
      } else if (selectedCategory === 'Resource Packs') {
        mapped = mapped.filter((a) => a.category === 'Resource Packs');
      } else if (selectedCategory === 'World') {
        mapped = mapped.filter((a) => a.category === 'World');
      } else if (selectedCategory === 'Customization') {
        mapped = mapped.filter((a) => a.category === 'Customization');
      }
      setOfficialAddons(mapped);
      setOfficialTotal(page.total || mapped.length);
      setOfficialHasMore(Boolean(page.has_more));
    }).catch((error) => {
      if (!active || error?.name === 'AbortError') return;
      setOfficialAddons([]);
      setOfficialTotal(0);
      setOfficialHasMore(false);
    }).finally(() => {
      if (active) setOfficialLoading(false);
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [currentPage, debouncedQuery, selectedCategory, sortBy, tagFilter, toolcoinCategory, onSearch]);

  const filteredAndSortedAddons = useMemo(() => {
    // Always render the full ToolCoin page (50). Custom/community packs are
    // merged in without replacing official items and are never duplicated by ID.
    const pageItems = currentPage === 1
      ? mergeAddons(addons, officialAddons)
      : mergeAddons([], officialAddons);
    let result = pageItems;
    const query = debouncedQuery.trim();
    if (query) {
      // ToolCoin rows are already filtered by the API (token search). Exact
      // includes() broke "Action And Stuff" vs title "Actions & Stuff".
      result = result.filter((addon) => {
        if (addon.source === 'toolcoin') return true;
        const hay = `${addon.title || ''} ${addon.description || ''} ${addon.authorName || ''} ${(addon.tags || []).join(' ')}`.toLowerCase();
        const tokens = query
          .toLowerCase()
          .replace(/&/g, ' ')
          .replace(/\b(and|or|the|a|an)\b/g, ' ')
          .split(/[^a-z0-9.]+/)
          .filter((t) => t.length >= 2);
        if (!tokens.length) return hay.includes(query.toLowerCase());
        return tokens.every((t) => hay.includes(t));
      });
    }
    if (selectedCategory !== 'All') {
      result = result.filter((addon) => {
        if (selectedCategory === 'Add-Ons') {
          // Strict: Add-Ons shelf only (resource packs are a separate category)
          return addon.category === 'Add-Ons';
        }
        return addon.category === selectedCategory;
      });
    }
    if (dateRange !== 'all') {
      const cutoff = new Date();
      if (dateRange === 'today') cutoff.setDate(cutoff.getDate() - 1);
      if (dateRange === 'week') cutoff.setDate(cutoff.getDate() - 7);
      if (dateRange === 'month') cutoff.setMonth(cutoff.getMonth() - 1);
      result = result.filter((addon) => new Date(addon.createdAt) >= cutoff);
    }
    if (tagFilter.trim()) {
      const wanted = tagFilter
        .toLowerCase()
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
      result = result.filter((addon) =>
        wanted.some((wantedTag) => addon.tags?.some((tag) => tag.toLowerCase().includes(wantedTag)))
      );
    }
    return [...result].sort((a, b) => {
      const ao = a.source === 'toolcoin' ? 1 : 0;
      const bo = b.source === 'toolcoin' ? 1 : 0;
      if (ao !== bo) return bo - ao;
      if (sortBy === 'most_liked') return b.likesCount - a.likesCount;
      if (sortBy === 'highest_rated') return (b.averageRating || 0) - (a.averageRating || 0);
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [addons, officialAddons, debouncedQuery, selectedCategory, sortBy, dateRange, tagFilter]);

  const featuredAddons = useMemo(() => {
    const pool = mergeAddons(addons, officialAddons, featuredHydrated);
    const byId = new Map(pool.map((a) => [a.id, a]));
    // also index without toolcoin: prefix
    for (const a of pool) {
      if (a.id?.startsWith('toolcoin:')) byId.set(a.id.slice('toolcoin:'.length), a);
      else byId.set(`toolcoin:${a.id}`, a);
    }
    const out: Addon[] = [];
    const seen = new Set<string>();
    for (const id of featuredIds) {
      const a = byId.get(id) || byId.get(`toolcoin:${id}`) || byId.get(id.replace(/^toolcoin:/, ''));
      if (a && !seen.has(a.id)) {
        seen.add(a.id);
        out.push({ ...a, isFeatured: true });
      }
    }
    for (const a of pool) {
      if (a.isFeatured && !seen.has(a.id)) {
        seen.add(a.id);
        out.push(a);
      }
    }
    return out.slice(0, 12);
  }, [addons, officialAddons, featuredIds, featuredHydrated]);

  const homeMode = selectedCategory === 'All' && !debouncedQuery.trim() && !tagFilter.trim();

  // Auto-advance featured carousel every 20s
  useEffect(() => {
    if (!homeMode || featuredAddons.length < 2) return;
    const id = window.setInterval(() => {
      setFeaturedIndex((i) => {
        const n = featuredAddons.length;
        const next = (i + 1) % n;
        const el = featuredTrackRef.current;
        if (el && el.clientWidth) {
          el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
        }
        return next;
      });
    }, 20000);
    return () => window.clearInterval(id);
  }, [homeMode, featuredAddons.length]);


  // Featured pins: API + localStorage fallback + hydrate missing packs by id
  useEffect(() => {
    let cancelled = false;
    const LS_KEY = 'toolcoin_featured_ids';

    const load = async () => {
      let ids: string[] = [];
      let data: any = null;
      try {
        fetch('/api/toolcoin/home-shelves', { cache: 'no-store' })
          .then((r) => r.json())
          .then((d) => {
            if (d?.shelves && typeof d.shelves === 'object') setHomeShelfIds(d.shelves);
          })
          .catch(() => {});
        const res = await fetch('/api/toolcoin/featured?items=1', { cache: 'no-store' });
        if (res.ok) {
          data = await res.json();
          if (Array.isArray(data.ids)) ids = data.ids.map(String).filter(Boolean);
        }
      } catch { /* proxy may be down */ }

      if (!ids.length) {
        try {
          const raw = localStorage.getItem(LS_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) ids = parsed.map(String).filter(Boolean);
          }
        } catch { /* ignore */ }
      } else {
        try {
          localStorage.setItem(LS_KEY, JSON.stringify(ids));
        } catch { /* ignore */ }
      }

      if (cancelled) return;
      setFeaturedIds(new Set(ids));

      // Fast path: API may return full items; else hydrate in parallel (capped)
      const hydrated: Addon[] = [];
      if (Array.isArray((data as any)?.items) && (data as any).items.length) {
        for (const raw of (data as any).items) {
          try {
            const a = toolcoinItemToAddon(raw);
            a.isFeatured = true;
            hydrated.push(a);
          } catch { /* ignore */ }
        }
      } else {
        const need = ids.slice(0, 8);
        await Promise.all(
          need.map(async (id) => {
            try {
              const item = await fetchToolcoinCatalogItem(id);
              if (item) {
                const a = toolcoinItemToAddon(item);
                a.isFeatured = true;
                hydrated.push(a);
              }
            } catch { /* ignore */ }
          }),
        );
      }
      if (!cancelled && hydrated.length) {
        setFeaturedHydrated(hydrated);
      }
    };

    load();
    const t = window.setInterval(load, 12000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, []);



  // Home shelves: small page per category so rows are full (not only page-1 mixed)
  useEffect(() => {
    if (!homeMode) return;
    let cancelled = false;
    const cats: { key: string; api: string; sort?: string }[] = [
      { key: '__newest', api: 'all', sort: 'newest' },
      { key: 'Add-Ons', api: 'addon', sort: 'newest' },
      { key: 'World', api: 'world', sort: 'newest' },
      { key: 'Resource Packs', api: 'resourcepack', sort: 'newest' },
      { key: 'Skin Pack', api: 'skinpack', sort: 'newest' },
      { key: 'Customization', api: 'mashup', sort: 'newest' },
    ];
    (async () => {
      const entries = await Promise.all(
        cats.map(async ({ key, api, sort }) => {
          try {
            const page = await fetchToolcoinCatalogPage({
              page: 1,
              limit: 12,
              category: api,
              sort: sort || 'newest',
            });
            const base = page.downloadBase || clientToolcoinBase();
            const mapped = (page.items || []).map((item) => toolcoinItemToAddon(item, base));
            return [key, mapped] as const;
          } catch {
            return [key, [] as Addon[]] as const;
          }
        })
      );
      if (cancelled) return;
      const next: Record<string, Addon[]> = {};
      for (const [k, v] of entries) next[k] = v;
      setGroupShelves(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [homeMode]);


  const byCategory = (cat: CategoryOption, limit = 8, mode: 'newest' | 'category' = 'category') => {
    // New Releases: dedicated newest page from API — never mix featured pins
    if (mode === 'newest') {
      const fromApi = groupShelves['__newest'] || [];
      if (fromApi.length) {
        const featuredSet = featuredIds;
        // Prefer non-featured so the row is not a clone of the hero strip
        const filtered = fromApi.filter((a) => !featuredSet.has(a.id));
        const pick = (filtered.length >= Math.min(4, limit) ? filtered : fromApi).slice(0, limit);
        return pick;
      }
      // Fallback: official catalog only (no featuredHydrated)
      return [...officialAddons]
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .filter((a) => !featuredIds.has(a.id))
        .slice(0, limit);
    }
    const pool = mergeAddons(addons, officialAddons, featuredHydrated);
    const shelfKey =
      cat === 'Add-Ons' ? 'Add-Ons' :
      cat === 'World' ? 'World' :
      cat === 'Resource Packs' ? 'Resource Packs' :
      cat === 'Skin Pack' ? 'Skin Pack' :
      cat === 'Customization' ? 'Customization' : cat;
    const pinned = homeShelfIds[shelfKey] || homeShelfIds[cat] || [];
    if (pinned.length) {
      const byId = new Map(pool.map((a) => [a.id, a]));
      const ordered: Addon[] = [];
      for (const id of pinned) {
        const a = byId.get(id) || byId.get(id.replace(/^toolcoin:/, '')) || byId.get(`toolcoin:${id}`);
        if (a) ordered.push(a);
      }
      if (ordered.length) return ordered.slice(0, limit);
    }
    const shelf = groupShelves[cat];
    const matches = (a: Addon) => {
      if (cat === 'Add-Ons') {
        if (a.category === 'Resource Packs' || a.category === 'Customization') return false;
        if ((a.tags || []).some((t) => /resource\s*pack|mash[- ]?up/i.test(String(t)))) return false;
        return a.category === 'Add-Ons' || (a.tags || []).some((t) => /behavior/i.test(String(t)));
      }
      if (cat === 'Customization') {
        if (a.category === 'Customization') return true;
        const blob = `${a.title || ''} ${(a.tags || []).join(' ')}`.toLowerCase();
        return /mash[- ]?up|persona|realism reimagined|comic\s*verse/i.test(blob);
      }
      return a.category === cat;
    };
    if (shelf?.length) return shelf.filter(matches).slice(0, limit);
    return pool.filter(matches).slice(0, limit);
  };


  const openCategory = (cat: CategoryOption) => {
    setSelectedCategory(cat);
    setInternalPage(1);
    onGoToPage?.(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const HOME_GROUPS: {
    titleKey: 'market.newReleases' | 'market.addons' | 'market.worlds' | 'market.textures' | 'market.skins' | 'market.mashups';
    hintKey: 'market.newReleasesHint' | 'market.addonsHint' | 'market.worldsHint' | 'market.texturesHint' | 'market.skinsHint' | 'market.mashupsHint';
    category: CategoryOption;
    mode: 'newest' | 'category';
  }[] = [
    { titleKey: 'market.newReleases', hintKey: 'market.newReleasesHint', category: 'All', mode: 'newest' },
    { titleKey: 'market.addons', hintKey: 'market.addonsHint', category: 'Add-Ons', mode: 'category' },
    { titleKey: 'market.worlds', hintKey: 'market.worldsHint', category: 'World', mode: 'category' },
    { titleKey: 'market.textures', hintKey: 'market.texturesHint', category: 'Resource Packs', mode: 'category' },
    { titleKey: 'market.skins', hintKey: 'market.skinsHint', category: 'Skin Pack', mode: 'category' },
    { titleKey: 'market.mashups', hintKey: 'market.mashupsHint', category: 'Customization', mode: 'category' },
  ];

  const searchSuggestions = useMemo(() => {
    if (!debouncedQuery) return [];
    return mergeAddons(addons, officialAddons)
      .filter((addon) =>
        matchesLooseQuery(
          `${addon.title || ''} ${addon.authorName || ''} ${(addon.tags || []).join(' ')}`,
          debouncedQuery
        )
      )
      .slice(0, 8);
  }, [addons, officialAddons, debouncedQuery]);

  const effectiveTotal = officialTotal || toolcoinTotal || 0;
  const totalPages = Math.max(1, Math.ceil(effectiveTotal / pageSize));
  const pageButtons = buildPageList(currentPage, totalPages);

  const activeFilterCount =
    (selectedCategory !== 'All' ? 1 : 0) +
    (sortBy !== 'newest' ? 1 : 0) +
    (dateRange !== 'all' ? 1 : 0) +
    (tagFilter ? 1 : 0);
  const hasActiveCriteria = activeFilterCount > 0 || searchQuery.trim().length > 0;
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSortBy('newest');
    setDateRange('all');
    setTagFilter('');
    setShowFilters(false);
  };

  const goPage = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage || toolcoinLoadingPage || officialLoading) return;
    setInternalPage(page);
    onGoToPage?.(page);
    document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="min-h-[calc(100dvh-64px)] bg-parchment pb-24" aria-label="Marketplace">
      {/* Compact search header */}
      <div className="border-b border-parchment-border bg-parchment-raised/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search marketplace</span>
              <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-900/40" />
              <input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setInternalPage(1);
                }}
                placeholder={t('market.searchPlaceholder')}
                className={`${getInputClasses()} h-12 rounded-2xl border-parchment-border bg-parchment pl-11 pr-10 text-sm shadow-sm`}
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-900/40 hover:bg-ink-900/5 hover:text-ink-900"
                >
                  <X size={16} />
                </button>
              )}
            </label>
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className={`${getButtonClasses(showFilters || activeFilterCount > 0 ? 'primary' : 'secondary', 'md')} inline-flex shrink-0 items-center gap-2 rounded-2xl px-4`}
            >
              <SlidersHorizontal size={16} />
              {t('market.filters')}
              {activeFilterCount > 0 ? (
                <span className="rounded-full bg-ink-900/10 px-1.5 text-[11px] font-bold">{activeFilterCount}</span>
              ) : null}
            </button>
            {!homeMode && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('All');
                  setTagFilter('');
                  setInternalPage(1);
                }}
                className={`${getButtonClasses('secondary', 'md')} shrink-0 rounded-2xl`}
              >
                {t('market.backHome')}
              </button>
            )}
          </div>

          {/* Category chips — ToolCoin style */}
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(
              [
                { labelKey: 'market.chipAll' as const, cat: 'All' as CategoryOption, icon: '/icon/mc_icon.png' },
                { labelKey: 'market.chipAddons' as const, cat: 'Add-Ons' as CategoryOption, icon: '/icon/addon.png' },
                { labelKey: 'market.chipWorlds' as const, cat: 'World' as CategoryOption, icon: '/icon/world.png' },
                { labelKey: 'market.chipTextures' as const, cat: 'Resource Packs' as CategoryOption, icon: '/icon/texture.png' },
                { labelKey: 'market.chipSkins' as const, cat: 'Skin Pack' as CategoryOption, icon: '/icon/skin.png' },
                { labelKey: 'market.chipMashups' as const, cat: 'Customization' as CategoryOption, icon: '/icon/mashup.png' },
              ] as const
            ).map(({ labelKey, cat, icon }) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => openCategory(cat)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition ${
                    active
                      ? 'border-ink-900 bg-ink-900 text-paper shadow-sm'
                      : 'border-parchment-border bg-parchment text-ink-900/70 hover:border-ink-900/25 hover:text-ink-900'
                  }`}
                >
                  <img src={icon} alt="" className="h-4 w-4 object-contain" />
                  {t(labelKey)}
                </button>
              );
            })}
          </div>

          {showFilters && (
            <div className="relative z-[90] mt-4 overflow-visible rounded-2xl border border-parchment-border bg-parchment-raised p-4 shadow-card sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-ink-900">Filters & sorting</p>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs font-bold text-terracotta hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="min-w-0">
                  <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-ink-900/45">Sorting</span>
                  <CustomSelect
                    value={sortBy}
                    onChange={(value) => setSortBy(value as SortOption)}
                    options={[
                      { value: 'newest', label: 'Newest first' },
                      { value: 'oldest', label: 'Oldest first' },
                      { value: 'most_liked', label: 'Most liked' },
                      { value: 'highest_rated', label: 'Top rated' },
                    ]}
                  />
                </div>
                <div className="min-w-0">
                  <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-ink-900/45">Added</span>
                  <CustomSelect
                    value={dateRange}
                    onChange={(value) => setDateRange(value as typeof dateRange)}
                    options={[
                      { value: 'any', label: 'Any time' },
                      { value: 'week', label: 'Past week' },
                      { value: 'month', label: 'Past month' },
                      { value: 'year', label: 'Past year' },
                    ]}
                  />
                </div>
                <div className="min-w-0">
                  <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-ink-900/45">Tag</span>
                  <input
                    value={tagFilter}
                    onChange={(e) => setTagFilter(e.target.value)}
                    placeholder="e.g. furniture, magic"
                    className={`${getInputClasses()} h-11 rounded-xl text-sm`}
                  />
                </div>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-ink-900/40">
                Sort and tags apply to the catalog list. Category chips above still filter pack type.
              </p>
            </div>
          )}


        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        {/* Featured hero carousel */}
        {homeMode && featuredAddons.length > 0 && (
          <div className="mb-10">
            <div className="relative overflow-hidden rounded-3xl border border-parchment-border bg-ink-900 shadow-card">
              <div
                ref={featuredTrackRef}
                className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                onScroll={(e) => {
                  const el = e.currentTarget;
                  if (!el.clientWidth) return;
                  const idx = Math.round(el.scrollLeft / el.clientWidth);
                  if (idx !== featuredIndex && idx >= 0 && idx < featuredAddons.length) {
                    setFeaturedIndex(idx);
                  }
                }}
              >
                {featuredAddons.slice(0, 8).map((addon, i) => (
                  <button
                    key={addon.id}
                    type="button"
                    onClick={() => onNavigate({ type: 'addon', id: addon.id } as ViewState)}
                    className="relative min-w-full shrink-0 snap-center text-left"
                  >
                    <div className="relative w-full overflow-hidden bg-ink-900">
                      <FitCover
                        src={(() => {
                          const thumb = addon.imageUrl || '';
                          const urls = addon.imageUrls || [];
                          // Key art Thumbnail_0 — full image, never cropped
                          return urls.find((u) => u && u !== thumb) || urls[0] || thumb;
                        })()}
                        alt={addon.title}
                        className="w-full"
                        matchAspect
                        loading={i === 0 ? 'eager' : 'lazy'}
                      />
                      <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-black via-black/45 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 z-[3] p-5 sm:p-8">
                        <div className="flex items-end gap-4">
                          <div className="hidden h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/20 bg-ink-900/60 shadow-lg sm:block">
                            <img
                              src={addon.imageUrl || addon.imageUrls?.[0] || ''}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                              decoding="async"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="min-w-0 flex-1 pr-16 sm:pr-20">
                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-terracotta">{t('market.pickedForYou')}</p>
                            <h2 className="mt-1 truncate text-xl font-bold tracking-tight text-paper sm:text-2xl">
                              {addon.title}
                            </h2>
                            <p className="mt-1 truncate text-sm text-paper/70">
                              by {addon.authorName}
                              {addon.category ? ` · ${addon.category}` : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {featuredAddons.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous featured"
                    onClick={(e) => {
                      e.stopPropagation();
                      const el = featuredTrackRef.current;
                      if (!el) return;
                      const n = Math.min(8, featuredAddons.length);
                      const next = (featuredIndex - 1 + n) % n;
                      setFeaturedIndex(next);
                      el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
                    }}
                    className="absolute left-2 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <button
                    type="button"
                    aria-label="Next featured"
                    onClick={(e) => {
                      e.stopPropagation();
                      const el = featuredTrackRef.current;
                      if (!el) return;
                      const n = Math.min(8, featuredAddons.length);
                      const next = (featuredIndex + 1) % n;
                      setFeaturedIndex(next);
                      el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
                    }}
                    className="absolute right-2 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
                  >
                    <ChevronRight size={22} />
                  </button>
                  <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center gap-1.5">
                    {featuredAddons.slice(0, 8).map((addon, i) => (
                      <span
                        key={addon.id}
                        className={`h-1.5 rounded-full transition-all ${
                          i === featuredIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/30'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* HOME: grouped rows */}
        {homeMode && !loading && !officialLoading && (
          <div className="relative z-0 isolate space-y-12">
            {HOME_GROUPS.map((group) => {
              const items = byCategory(group.category, 8, group.mode);
              if (items.length === 0) return null;
              return (
                <section key={`${group.titleKey}-${group.category}`} aria-label={t(group.titleKey)}>
                  <div className="mb-3">
                    <div className="flex items-center gap-3">
                      <h2 className="shrink-0 text-[13px] font-bold uppercase tracking-[0.12em] text-ink-900">
                        {t(group.titleKey)}
                      </h2>
                      <div className="h-px min-w-[2rem] flex-1 bg-parchment-border" aria-hidden />
                      <button
                        type="button"
                        onClick={() => openCategory(group.category)}
                        className="shrink-0 text-[12px] font-semibold text-ink-900/55 transition hover:text-ink-900"
                      >
                        {t('market.seeAll')}
                      </button>
                    </div>
                    <p className="mt-1 text-[12px] text-ink-900/45">{t(group.hintKey)}</p>
                  </div>
                  <div
                    className={
                      layoutMode === 'list'
                        ? 'flex flex-col gap-3'
                        : 'flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
                    }
                  >
                    {items.map((addon, index) => (
                      <div
                        key={addon.id}
                        className={
                          layoutMode === 'list'
                            ? 'w-full'
                            : 'w-[min(42vw,156px)] shrink-0 snap-start sm:w-[168px]'
                        }
                      >
                        <AddonCard
                          addon={addon}
                          isLiked={userLikes.has(addon.id)}
                          isBookmarked={userBookmarks.has(addon.id)}
                          onToggleLike={onToggleLike}
                          onToggleBookmark={onToggleBookmark}
                          onRequireAuth={onRequireAuth}
                          onNavigate={onNavigate}
                          priority={index === 0}
                          shelf
                          compact={layoutMode === 'list'}
                        />
                      </div>
                    ))}

                    {layoutMode !== 'list' && (
                      <button
                        type="button"
                        onClick={() => openCategory(group.category)}
                        className="flex w-[min(42vw,156px)] shrink-0 snap-start flex-col sm:w-[168px]"
                        aria-label={t('market.more')}
                      >
                        <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-parchment-border bg-parchment-raised text-ink-900/45 transition hover:border-ink-900/25 hover:text-ink-900">
                          <ChevronRight size={22} />
                          <span className="text-[12px] font-bold">{t('market.more')}</span>
                        </div>
                        <div className="mt-2 h-[34px]" aria-hidden />
                      </button>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* CATALOG mode: search or single category — full grid + pagination */}
        {(!homeMode || loading || officialLoading) && (
          <div>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-terracotta-text">
                  {selectedCategory === 'All' ? 'Explore' : selectedCategory}
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-ink-900">
                  {debouncedQuery ? `Showing matches for “${debouncedQuery}”` : selectedCategory === 'All' ? 'Everything in the catalog' : selectedCategory}
                </h2>
                <p className="mt-1 text-sm text-ink-900/50">
                  {loading || officialLoading
                    ? 'Loading…'
                    : `${filteredAndSortedAddons.length} on this page · ${(officialTotal || effectiveTotal || 0).toLocaleString('id-ID')} total`}
                </p>
              </div>
              <CustomSelect
                value={sortBy}
                onChange={(value) => setSortBy(value as SortOption)}
                options={[
                  { value: 'newest', label: 'Newest' },
                  { value: 'most_liked', label: 'Most liked' },
                  { value: 'highest_rated', label: 'Highest rated' },
                  { value: 'oldest', label: 'Oldest' },
                ]}
                className="min-w-[140px]"
              />
            </div>

            {loading || officialLoading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(8)].map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : filteredAndSortedAddons.length === 0 ? (
              <div className="rounded-2xl border border-parchment-border bg-parchment-raised px-6 py-16 text-center">
                <Sparkles size={28} className="mx-auto text-ink-900/30" />
                <p className="mt-3 font-bold text-ink-900">Nothing matched that</p>
                <p className="mt-1 text-sm text-ink-900/50">Try a shorter name, or jump back home and browse by category.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                    setTagFilter('');
                  }}
                  className={`mt-5 ${getButtonClasses('primary', 'md')}`}
                >
                  {t('market.backHome')}
                </button>
              </div>
            ) : (
              <div
                className={
                  layoutMode === 'grid'
                    ? 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                    : 'overflow-hidden rounded-2xl border border-parchment-border bg-parchment-raised'
                }
              >
                {filteredAndSortedAddons.map((addon, index) => (
                  <AddonCard
                    key={addon.id}
                    addon={addon}
                    isLiked={userLikes.has(addon.id)}
                    isBookmarked={userBookmarks.has(addon.id)}
                    onToggleLike={onToggleLike}
                    onToggleBookmark={onToggleBookmark}
                    onRequireAuth={onRequireAuth}
                    onNavigate={onNavigate}
                    compact={layoutMode === 'list'}
                    priority={index === 0}
                  />
                ))}
              </div>
            )}

            {effectiveTotal > 24 && (
              <nav
                className="mt-10 flex flex-col items-center gap-4 border-t border-parchment-border pt-8 sm:flex-row sm:justify-between"
                aria-label="Catalog pagination"
              >
                <p className="text-sm text-ink-900/50">
                  Page <span className="font-bold text-ink-900">{currentPage}</span> of{' '}
                  <span className="font-bold text-ink-900">{totalPages}</span>
                </p>
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage <= 1 || toolcoinLoadingPage || officialLoading}
                    onClick={() => goPage(currentPage - 1)}
                    className={`${getButtonClasses('secondary', 'sm')} disabled:opacity-40`}
                  >
                    <ChevronLeft size={16} /> Prev
                  </button>
                  {pageButtons.map((p, i) =>
                    p === '…' ? (
                      <span key={`e${i}`} className="px-2 text-ink-900/40">
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        disabled={toolcoinLoadingPage || officialLoading}
                        onClick={() => goPage(p)}
                        aria-current={p === currentPage ? 'page' : undefined}
                        className={
                          p === currentPage
                            ? `${getButtonClasses('primary', 'sm')} min-w-10`
                            : `${getButtonClasses('secondary', 'sm')} min-w-10`
                        }
                      >
                        {p}
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    disabled={currentPage >= totalPages || toolcoinLoadingPage || officialLoading}
                    onClick={() => goPage(currentPage + 1)}
                    className={`${getButtonClasses('secondary', 'sm')} disabled:opacity-40`}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </nav>
            )}
          </div>
        )}
      </div>
    </section>
  );
}