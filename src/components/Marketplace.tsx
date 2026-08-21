import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AddonCard } from './AddonCard';
import { Addon } from '../types';
import { Search, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { Skeleton } from './Skeleton';
import { ViewState } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { SkeletonCard } from './Skeleton';
import { CustomSelect } from './CustomSelect';
import { FadeImage } from './FadeImage';

interface MarketplaceProps {
  addons: Addon[];
  loading: boolean;
  userLikes: Set<string>;
  onToggleLike: (addonId: string, isLiked: boolean) => void;
  onRequireAuth: () => void;
  onNavigate: (view: ViewState) => void;
  layoutMode?: 'grid' | 'list';
}

type SortOption = 'newest' | 'oldest' | 'most_liked' | 'highest_rated';
type CategoryOption = 'All' | 'Bukkit Plugins' | 'Modpack' | 'Customization' | 'Add-Ons' | 'Shaders' | 'Mods' | 'Resource Packs' | 'Data Pack' | 'World' | 'Skin Pack';
type DateRangeOption = 'all' | 'today' | 'week' | 'month';

export function Marketplace({ addons, loading, userLikes, onToggleLike, onRequireAuth, onNavigate, layoutMode = 'grid' }: MarketplaceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryOption>('All');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [dateRange, setDateRange] = useState<DateRangeOption>('all');
  const [tagFilter, setTagFilter] = useState('');
  const [authorFilter, setAuthorFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterPanelExpanded, setFilterPanelExpanded] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [visibleCount, setVisibleCount] = useState(12);
  const observerTarget = useRef<HTMLDivElement>(null);
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(searchQuery), 200);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const filteredAndSortedAddons = useMemo(() => {
    let result = addons;

    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase();
      result = result.filter(a =>
        (a.title && a.title.toLowerCase().includes(q)) ||
        (a.description && a.description.toLowerCase().includes(q)) ||
        (a.tags && a.tags.some(t => t.toLowerCase().includes(q))) ||
        (a.authorName && a.authorName.toLowerCase().includes(q))
      );
    }
    if (selectedCategory !== 'All') result = result.filter(a => a.category === selectedCategory);
    if (dateRange !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      if (dateRange === 'today') cutoff.setDate(now.getDate() - 1);
      if (dateRange === 'week') cutoff.setDate(now.getDate() - 7);
      if (dateRange === 'month') cutoff.setMonth(now.getMonth() - 1);
      result = result.filter(a => new Date(a.createdAt) >= cutoff);
    }
    if (tagFilter) {
      const wanted = tagFilter.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
      result = result.filter(a => a.tags && wanted.some(q => a.tags.some(t => t.toLowerCase().includes(q))));
    }
    if (authorFilter) { const q = authorFilter.toLowerCase(); result = result.filter(a => a.authorName && a.authorName.toLowerCase().includes(q)); }

    return [...result].sort((a, b) => {
      if (sortBy === 'most_liked') return b.likesCount - a.likesCount;
      if (sortBy === 'highest_rated') return (b.averageRating || 0) - (a.averageRating || 0);
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return 0;
    });
  }, [addons, debouncedQuery, selectedCategory, sortBy, dateRange, tagFilter, authorFilter]);

  useEffect(() => { setVisibleCount(12); }, [debouncedQuery, selectedCategory, sortBy, dateRange, tagFilter, authorFilter]);

  useEffect(() => {
    if (loading) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setVisibleCount(prev => Math.min(prev + 12, filteredAndSortedAddons.length));
        }
      },
      { threshold: 0.1, rootMargin: '400px' }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [filteredAndSortedAddons.length, loading]);

  const featuredAddons = useMemo(() => addons.filter(a => a.isFeatured), [addons]);

  const searchSuggestions = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    const q = debouncedQuery.toLowerCase();
    return addons
      .filter(a => (a.title && a.title.toLowerCase().includes(q)) || (a.authorName && a.authorName.toLowerCase().includes(q)))
      .slice(0, 5);
  }, [addons, debouncedQuery]);

  const activeFilterCount =
    (selectedCategory !== 'All' ? 1 : 0) + (tagFilter ? 1 : 0) + (authorFilter ? 1 : 0) + (dateRange !== 'all' ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0 || sortBy !== 'newest';

  return (
    <section id="explore" className="relative min-h-[100dvh] pb-16" aria-label="Marketplace Explore">
      <h1 className="sr-only">Minecraft Marketplace Add-ons</h1>

      <div className="relative border-b border-ink/10 bg-paper-soft pt-16 pb-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-10">
            <div className="inline-flex items-center gap-2 bg-accent rounded-lg px-4 py-1.5 mb-6 shadow-card">
              <Sparkles size={13} className="text-ink" />
              <span className="text-xs font-bold text-ink uppercase tracking-widest">Minecraft Marketplace</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-ink tracking-tight mb-4 leading-none">
              Find Your<br />Next Add-on
            </h1>
            <p className="text-base font-normal text-ink/60 max-w-md mx-auto">
              Browse, download, and share Minecraft add-ons built by the community.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex justify-center">
            <div className="relative flex flex-col gap-3 bg-paper rounded-lg shadow-card p-4 sm:p-5 w-full sm:w-[680px] lg:w-[840px] text-left">
              <div className="flex flex-col lg:flex-row items-stretch gap-3">
                {/* Search input */}
                <div className="relative w-full flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/40" size={20} aria-hidden="true" />
                  <input
                    type="text"
                    aria-label="Search add-ons, tags, authors"
                    placeholder="Search add-ons, tags, authors..."
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="w-full border border-ink/10 rounded-lg bg-paper py-3.5 pl-12 pr-4 text-sm font-bold text-ink placeholder-ink/40 focus:outline-none focus:shadow-[0_2px_12px_rgba(217,119,87,0.15)] transition-all h-[56px]"
                  />

                  <AnimatePresence>
                    {showSuggestions && searchSuggestions.length > 0 && (
                      <motion.div
                        id="search-suggestions"
                        role="listbox"
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 z-50 w-full rounded-lg bg-paper shadow-card overflow-hidden mt-2"
                      >
                        {searchSuggestions.map(addon => (
                          <button
                            key={addon.id}
                            role="option"
                            aria-selected={false}
                            className="w-full p-2.5 text-left text-sm font-bold text-ink hover:bg-accent/40 transition-colors flex items-center gap-3 border-b border-ink/10 last:border-b-0"
                            onMouseDown={() => { onNavigate({ type: 'addon', id: addon.id }); setShowSuggestions(false); }}
                          >
                            <div className="h-10 w-10 shrink-0 overflow-hidden bg-ink border border-ink/10 rounded-lg" aria-hidden="true">
                              <FadeImage src={addon.imageUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                            <div className="flex flex-col overflow-hidden">
                              <span className="truncate">{addon.title}</span>
                              <span className="text-xs text-ink/50 font-medium truncate">by {addon.authorName}</span>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex w-full lg:w-auto items-stretch gap-3">
                  <div className="hidden sm:flex items-center gap-1 bg-paper border border-ink/10 rounded-lg p-1 h-[56px]" role="group" aria-label="Quick Sort">
                    <button
                      onClick={() => setSortBy('newest')}
                      aria-pressed={sortBy === 'newest'}
                      className={`h-full px-4 text-xs font-bold uppercase tracking-wide transition-colors ${sortBy === 'newest' ? 'bg-accent text-ink' : 'text-ink/70 hover:text-ink'}`}
                    >
                      Newest
                    </button>
                    <button
                      onClick={() => setSortBy('most_liked')}
                      aria-pressed={sortBy === 'most_liked'}
                      className={`h-full px-4 text-xs font-bold uppercase tracking-wide transition-colors ${sortBy === 'most_liked' ? 'bg-accent text-ink' : 'text-ink/70 hover:text-ink'}`}
                    >
                      Popular
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setShowFilters(prev => {
                        if (prev) setFilterPanelExpanded(false);
                        return !prev;
                      });
                    }}
                    aria-expanded={showFilters}
                    aria-controls="filter-panel"
                    className={`relative flex flex-1 lg:flex-none items-center justify-center gap-2 h-[56px] px-6 border border-ink/10 rounded-lg text-sm font-bold uppercase transition-all ${
                      showFilters || hasActiveFilters
                        ? 'bg-paper text-ink shadow-none'
                        : 'bg-paper text-ink shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-px'
                    }`}
                  >
                    <SlidersHorizontal size={17} aria-hidden="true" />
                    <span>Filters</span>
                    {activeFilterCount > 0 && (
                      <span className="flex h-5 w-5 items-center justify-center bg-accent border border-ink/10 rounded-lg text-[10px] text-ink font-bold">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    id="filter-panel"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onAnimationComplete={() => { if (showFilters) setFilterPanelExpanded(true); }}
                    className="w-full"
                    style={{ overflow: filterPanelExpanded ? 'visible' : 'hidden' }}
                  >
                    <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 pt-4 border-t border-ink/10 mt-1">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-ink uppercase tracking-widest">Category</label>
                        <CustomSelect
                          value={selectedCategory}
                          onChange={val => setSelectedCategory(val as CategoryOption)}
                          options={[
                            { value: 'All', label: 'All' },
                            { value: 'Bukkit Plugins', label: 'Bukkit Plugins' },
                            { value: 'Modpack', label: 'Modpack' },
                            { value: 'Customization', label: 'Customization' },
                            { value: 'Add-Ons', label: 'Add-Ons' },
                            { value: 'Shaders', label: 'Shaders' },
                            { value: 'Mods', label: 'Mods' },
                            { value: 'Resource Packs', label: 'Resource Packs' },
                            { value: 'Data Pack', label: 'Data Pack' },
                            { value: 'World', label: 'World' },
                            { value: 'Skin Pack', label: 'Skin Pack' },
                          ]}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-ink uppercase tracking-widest">Sort By</label>
                        <CustomSelect
                          value={sortBy}
                          onChange={val => setSortBy(val as SortOption)}
                          options={[
                            { value: 'newest', label: 'Newest First' },
                            { value: 'most_liked', label: 'Most Liked' },
                            { value: 'highest_rated', label: 'Highest Rated' },
                            { value: 'oldest', label: 'Oldest First' },
                          ]}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-ink uppercase tracking-widest">Date</label>
                        <CustomSelect
                          value={dateRange}
                          onChange={val => setDateRange(val as DateRangeOption)}
                          options={[
                            { value: 'all', label: 'Any Time' },
                            { value: 'today', label: 'Past 24h' },
                            { value: 'week', label: 'Past Week' },
                            { value: 'month', label: 'Past Month' },
                          ]}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-ink uppercase tracking-widest">Tag</label>
                        <input
                          type="text"
                          placeholder="Filter by tag... (pisahkan dengan koma)"
                          value={tagFilter}
                          onChange={e => setTagFilter(e.target.value)}
                          className="w-full border border-ink/10 rounded-lg bg-paper py-2.5 px-3 text-sm font-bold text-ink placeholder-ink/40 focus:outline-none focus:shadow-[0_2px_12px_rgba(217,119,87,0.15)] transition-all"
                        />
                      </div>
                    </div>

                    {hasActiveFilters && (
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={() => { setSelectedCategory('All'); setSortBy('newest'); setDateRange('all'); setTagFilter(''); setAuthorFilter(''); }}
                          className="text-xs font-bold text-ink underline hover:text-accent-deep transition-colors uppercase"
                        >
                          Clear All Filters
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-12">
        {!loading && featuredAddons.length > 0 && !searchQuery && selectedCategory === 'All' && (
          <div className="mb-14">
            <h2 className="flex items-center gap-3 text-2xl font-bold text-ink tracking-tight mb-6">
              <span className="inline-flex items-center gap-2 bg-accent rounded-lg px-3 py-1 shadow-card">
                <Sparkles size={18} className="text-ink" />
                Featured
              </span>
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredAddons.map((addon, index) => (
                <div key={addon.id} className="relative">
                  <AddonCard
                    addon={addon}
                    isLiked={userLikes.has(addon.id)}
                    onToggleLike={onToggleLike}
                    onRequireAuth={onRequireAuth}
                    onNavigate={onNavigate}
                    priority={index === 0}
                  />
                  <div className="absolute -top-3 -right-3 bg-accent rounded-lg px-3 py-1 text-xs font-bold text-ink shadow-card uppercase">
                    Featured
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-bold text-ink tracking-tight">
            {searchQuery ? `Results for "${searchQuery}"` : 'All Add-ons'}
          </h2>
          <span className="text-sm font-normal text-ink/70">
            {filteredAndSortedAddons.length} add-on{filteredAndSortedAddons.length !== 1 ? 's' : ''} found
          </span>
        </div>

        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            {selectedCategory !== 'All' && (
              <span className="inline-flex items-center gap-1.5 bg-accent-deep rounded-lg px-3 py-1.5 text-xs font-bold text-white shadow-card">
                {selectedCategory}
                <button onClick={() => setSelectedCategory('All')} className="hover:opacity-60 transition-opacity"><X size={11} /></button>
              </span>
            )}
            {tagFilter && (
              <span className="inline-flex items-center gap-1.5 bg-accent rounded-lg px-3 py-1.5 text-xs font-bold text-ink shadow-card">
                Tag: {tagFilter}
                <button onClick={() => setTagFilter('')} className="hover:opacity-60 transition-opacity"><X size={11} /></button>
              </span>
            )}
            {authorFilter && (
              <span className="inline-flex items-center gap-1.5 bg-paper rounded-lg px-3 py-1.5 text-xs font-bold text-ink shadow-card">
                Author: {authorFilter}
                <button onClick={() => setAuthorFilter('')} className="hover:opacity-60 transition-opacity"><X size={11} /></button>
              </span>
            )}
            {dateRange !== 'all' && (
              <span className="inline-flex items-center gap-1.5 bg-accent rounded-lg px-3 py-1.5 text-xs font-bold text-ink shadow-card">
                {dateRange}
                <button onClick={() => setDateRange('all')} className="hover:opacity-60 transition-opacity"><X size={11} /></button>
              </span>
            )}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filteredAndSortedAddons.length === 0 ? (
          <div className="rounded-lg bg-paper py-24 text-center shadow-card">
            <Search size={40} className="mx-auto mb-4 text-ink/30" />
            <h3 className="text-lg font-bold text-ink">Nothing matches that search</h3>
            <p className="mt-1 text-sm font-normal text-ink/60">Try a different keyword, or clear your filters to see everything.</p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('All'); setSortBy('newest'); setDateRange('all'); setTagFilter(''); setAuthorFilter(''); }}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-ink bg-accent rounded-lg shadow-card uppercase transition-all hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-px"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <motion.div
            layout
            initial="hidden"
            animate="visible"
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.12 } } }}
            className={layoutMode === 'grid' ? 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'mx-auto flex w-full max-w-4xl flex-col divide-y divide-ink/10 overflow-hidden rounded-lg bg-paper shadow-card'}
          >
            <AnimatePresence mode="popLayout">
              {filteredAndSortedAddons.slice(0, visibleCount).map((addon, index) => (
                <motion.div
                  layout
                  key={addon.id}
                  variants={{ hidden: { opacity: 0, scale: 0.96, y: 16 }, visible: { opacity: 1, scale: 1, y: 0 } }}
                  exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.54, ease: 'easeOut' }}
                  className={layoutMode === 'list' ? 'w-full' : ''}
                >
                  <AddonCard
                    addon={addon}
                    isLiked={userLikes.has(addon.id)}
                    onToggleLike={onToggleLike}
                    onRequireAuth={onRequireAuth}
                    onNavigate={onNavigate}
                    compact={layoutMode === 'list'}
                    priority={
                      index === 0 &&
                      !(!loading && featuredAddons.length > 0 && !searchQuery && selectedCategory === 'All')
                    }
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Infinite scroll sentinel */}
        {!loading && (
          <div
            ref={observerTarget}
            className="flex justify-center py-12"
            style={{ opacity: filteredAndSortedAddons.length > visibleCount ? 1 : 0, pointerEvents: 'none' }}
          >
            {filteredAndSortedAddons.length > visibleCount && (
              <div className="rounded-lg bg-accent p-3 shadow-card">
                  <Skeleton className="h-6 w-16" />
                </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
