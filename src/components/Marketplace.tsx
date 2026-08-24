import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { AddonCard } from './AddonCard';
import { Addon } from '../types';
import { Skeleton, SkeletonCard } from './Skeleton';
import { ViewState } from '../App';
import { CustomSelect } from './CustomSelect';
import { getButtonClasses, getInputClasses } from '../lib/designSystem';
import { FadeImage } from './FadeImage';

interface MarketplaceProps { addons: Addon[]; loading: boolean; userLikes: Set<string>; userBookmarks: Set<string>; onToggleLike: (addonId: string, isLiked: boolean) => void; onToggleBookmark: (addonId: string, isBookmarked: boolean) => void; onRequireAuth: () => void; onNavigate: (view: ViewState) => void; layoutMode?: 'grid' | 'list'; }
type SortOption = 'newest' | 'oldest' | 'most_liked' | 'highest_rated';
type CategoryOption = 'All' | 'Bukkit Plugins' | 'Modpack' | 'Customization' | 'Add-Ons' | 'Shaders' | 'Mods' | 'Resource Packs' | 'Data Pack' | 'World' | 'Skin Pack';
type DateRangeOption = 'all' | 'today' | 'week' | 'month';

const CATEGORIES: CategoryOption[] = ['All', 'Bukkit Plugins', 'Modpack', 'Customization', 'Add-Ons', 'Shaders', 'Mods', 'Resource Packs', 'Data Pack', 'World', 'Skin Pack'];

export function Marketplace({ addons, loading, userLikes, userBookmarks, onToggleLike, onToggleBookmark, onRequireAuth, onNavigate, layoutMode = 'grid' }: MarketplaceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryOption>('All');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [dateRange, setDateRange] = useState<DateRangeOption>('all');
  const [tagFilter, setTagFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(12);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => { const timer = window.setTimeout(() => setDebouncedQuery(searchQuery.trim()), 200); return () => window.clearTimeout(timer); }, [searchQuery]);
  useEffect(() => { setVisibleCount(12); }, [debouncedQuery, selectedCategory, sortBy, dateRange, tagFilter]);
  useEffect(() => {
    if (loading) return;
    const observer = new IntersectionObserver(entries => { if (entries[0]?.isIntersecting) setVisibleCount(count => Math.min(count + 12, 1000)); }, { rootMargin: '320px' });
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [loading]);

  const filteredAndSortedAddons = useMemo(() => {
    let result = addons;
    const query = debouncedQuery.toLowerCase();
    if (query) result = result.filter(addon => addon.title?.toLowerCase().includes(query) || addon.description?.toLowerCase().includes(query) || addon.tags?.some(tag => tag.toLowerCase().includes(query)) || addon.authorName?.toLowerCase().includes(query));
    if (selectedCategory !== 'All') result = result.filter(addon => addon.category === selectedCategory);
    if (dateRange !== 'all') {
      const cutoff = new Date();
      if (dateRange === 'today') cutoff.setDate(cutoff.getDate() - 1);
      if (dateRange === 'week') cutoff.setDate(cutoff.getDate() - 7);
      if (dateRange === 'month') cutoff.setMonth(cutoff.getMonth() - 1);
      result = result.filter(addon => new Date(addon.createdAt) >= cutoff);
    }
    if (tagFilter.trim()) {
      const wanted = tagFilter.toLowerCase().split(',').map(tag => tag.trim()).filter(Boolean);
      result = result.filter(addon => wanted.some(wantedTag => addon.tags?.some(tag => tag.toLowerCase().includes(wantedTag))));
    }
    return [...result].sort((a, b) => sortBy === 'most_liked' ? b.likesCount - a.likesCount : sortBy === 'highest_rated' ? (b.averageRating || 0) - (a.averageRating || 0) : sortBy === 'oldest' ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [addons, debouncedQuery, selectedCategory, sortBy, dateRange, tagFilter]);

  const featuredAddons = useMemo(() => addons.filter(addon => addon.isFeatured), [addons]);
  const searchSuggestions = useMemo(() => {
    if (!debouncedQuery) return [];
    const query = debouncedQuery.toLowerCase();
    return addons.filter(addon => addon.title?.toLowerCase().includes(query) || addon.authorName?.toLowerCase().includes(query)).slice(0, 5);
  }, [addons, debouncedQuery]);
  const activeFilterCount = (selectedCategory !== 'All' ? 1 : 0) + (sortBy !== 'newest' ? 1 : 0) + (dateRange !== 'all' ? 1 : 0) + (tagFilter ? 1 : 0);
  const hasActiveCriteria = activeFilterCount > 0 || searchQuery.trim().length > 0;
  const clearFilters = () => { setSearchQuery(''); setSelectedCategory('All'); setSortBy('newest'); setDateRange('all'); setTagFilter(''); setShowFilters(false); };

  return <section id="explore" className="min-h-[100dvh] bg-parchment pb-20" aria-label="Marketplace explore">
    <div className="border-b border-parchment-border bg-parchment-raised"><div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20"><div className="max-w-3xl"><p className="inline-flex items-center gap-2 text-sm font-bold text-terracotta-text"><Sparkles size={16} /> Community marketplace</p><h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] text-ink-900 sm:text-5xl">Voltra Marketplace</h1><p className="mt-4 max-w-2xl text-base leading-7 text-ink-900/60">Find Some New Add-on</p></div>
      <div className="mt-10 rounded-2xl border border-parchment-border bg-parchment p-4 shadow-card sm:p-5"><div className="flex flex-col gap-3 lg:flex-row"><div className="relative flex-1"><Search size={18} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-900/45" /><input id="marketplace-search" role="combobox" aria-label="Search add-ons, tags, authors" aria-autocomplete="list" aria-controls="search-suggestions" aria-expanded={showSuggestions && searchSuggestions.length > 0} autoComplete="off" value={searchQuery} onChange={event => { setSearchQuery(event.target.value); setShowSuggestions(true); }} onFocus={() => setShowSuggestions(true)} onBlur={() => window.setTimeout(() => setShowSuggestions(false), 200)} placeholder="Search add-ons, tags, authors" className={`${getInputClasses()} pl-11`} />{showSuggestions && searchSuggestions.length > 0 && <div id="search-suggestions" role="listbox" className="absolute left-0 right-0 top-full z-[120] mt-2 overflow-hidden rounded-xl border border-parchment-border bg-parchment-raised p-1 shadow-card-float">{searchSuggestions.map(addon => <button key={addon.id} type="button" role="option" onClick={() => { onNavigate({ type: 'addon', id: addon.id }); setShowSuggestions(false); }} className="flex min-h-12 w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-ink-900/[0.04]"><span className="h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-ink-900"><FadeImage src={addon.imageUrl} alt="" className="h-full w-full object-cover" /></span><span className="min-w-0"><span className="block truncate text-sm font-bold text-ink-900">{addon.title}</span><span className="block truncate text-xs text-ink-900/55">by {addon.authorName}</span></span></button>)}</div>}</div><div className="flex gap-3"><CustomSelect value={sortBy} onChange={value => setSortBy(value as SortOption)} options={[{ value: 'newest', label: 'Newest' }, { value: 'most_liked', label: 'Most liked' }, { value: 'highest_rated', label: 'Highest rated' }, { value: 'oldest', label: 'Oldest' }]} className="min-w-[148px]" /><button type="button" onClick={() => setShowFilters(value => !value)} aria-expanded={showFilters} aria-controls="marketplace-filters" className={`${getButtonClasses('secondary', 'md')} shrink-0`}><SlidersHorizontal size={16} />Filters{activeFilterCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-terracotta px-1.5 text-[10px] text-paper">{activeFilterCount}</span>}</button></div></div>{showFilters && <div id="marketplace-filters" className="mt-4 grid gap-4 border-t border-parchment-border pt-4 sm:grid-cols-3"><label className="text-xs font-bold text-ink-900/60">Category<CustomSelect value={selectedCategory} onChange={value => setSelectedCategory(value as CategoryOption)} options={CATEGORIES} className="mt-2" /></label><label className="text-xs font-bold text-ink-900/60">Date added<CustomSelect value={dateRange} onChange={value => setDateRange(value as DateRangeOption)} options={[{ value: 'all', label: 'Any time' }, { value: 'today', label: 'Past 24 hours' }, { value: 'week', label: 'Past week' }, { value: 'month', label: 'Past month' }]} className="mt-2" /></label><label className="text-xs font-bold text-ink-900/60">Tags<input value={tagFilter} onChange={event => setTagFilter(event.target.value)} placeholder="e.g. survival, medieval" className={`${getInputClasses()} mt-2`} /></label></div>}</div>
    </div></div>

    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="flex flex-col gap-4 border-b border-parchment-border py-8 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-bold uppercase tracking-[0.14em] text-terracotta-text">Explore</p><h2 className="mt-2 text-2xl font-bold tracking-[-0.03em]">{debouncedQuery ? `Results for “${debouncedQuery}”` : 'All add-ons'}</h2></div><div className="flex items-center gap-3 text-sm text-ink-900/55"><span aria-live="polite">{filteredAndSortedAddons.length} {filteredAndSortedAddons.length === 1 ? 'add-on' : 'add-ons'}</span>{hasActiveCriteria && <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 font-bold text-terracotta-text hover:underline"><X size={14} />Clear all</button>}</div></div>
      {featuredAddons.length > 0 && !debouncedQuery && selectedCategory === 'All' && <section className="py-10"><div className="mb-5 flex items-center justify-between"><div><p className="text-sm font-bold uppercase tracking-[0.14em] text-terracotta-text">Curated</p><h2 className="mt-2 text-xl font-bold">Featured add-ons</h2></div></div><div className="grid gap-6 md:grid-cols-3">{featuredAddons.slice(0, 3).map((addon, index) => <AddonCard key={addon.id} addon={addon} isLiked={userLikes.has(addon.id)} isBookmarked={userBookmarks.has(addon.id)} onToggleLike={onToggleLike} onToggleBookmark={onToggleBookmark} onRequireAuth={onRequireAuth} onNavigate={onNavigate} priority={index === 0} />)}</div></section>}
      <div className="pb-8 pt-10">{loading ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <SkeletonCard key={index} />)}</div> : filteredAndSortedAddons.length === 0 ? <div className="rounded-2xl border border-parchment-border bg-parchment-raised px-6 py-20 text-center shadow-card"><Search size={32} className="mx-auto text-ink-900/30" /><h3 className="mt-4 text-lg font-bold">No add-ons found</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-900/55">{hasActiveCriteria ? 'Try a different search or clear your filters to see more add-ons.' : 'No add-ons have been published yet. Check back soon for new community releases.'}</p>{hasActiveCriteria && <button type="button" onClick={clearFilters} className={`mt-6 ${getButtonClasses('primary', 'md')}`}>Clear all</button>}</div> : <div className={layoutMode === 'grid' ? 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'overflow-hidden rounded-2xl border border-parchment-border bg-parchment-raised'}>{filteredAndSortedAddons.slice(0, visibleCount).map((addon, index) => <AddonCard key={addon.id} addon={addon} isLiked={userLikes.has(addon.id)} isBookmarked={userBookmarks.has(addon.id)} onToggleLike={onToggleLike} onToggleBookmark={onToggleBookmark} onRequireAuth={onRequireAuth} onNavigate={onNavigate} compact={layoutMode === 'list'} priority={index === 0} />)}</div>}
      </div><div ref={observerTarget} className="h-8" aria-hidden="true" /></div>
  </section>;
}
