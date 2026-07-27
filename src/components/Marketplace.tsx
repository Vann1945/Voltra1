import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { AddonCard } from './AddonCard';
import { Addon } from '../types';
import { Search, SlidersHorizontal, Sparkles, Loader2, X, Image as ImageIcon } from 'lucide-react';
import { ViewState } from '../App';
import { motion, AnimatePresence } from 'framer-motion';
import { SkeletonCard } from './Skeleton';
import { FadeImage } from './FadeImage';

interface MarketplaceProps {
  addons: Addon[];
  loading: boolean;
  userLikes: Set<string>;
  onToggleLike: (addonId: string, isLiked: boolean) => void;
  onRequireAuth: () => void;
  onNavigate: (view: ViewState) => void;
}

type SortOption = 'newest' | 'oldest' | 'most_liked' | 'highest_rated';
type CategoryOption = 'All' | 'Resource Pack' | 'Behavior Pack' | 'World' | 'Skin Pack' | 'Mod';
type DateRangeOption = 'all' | 'today' | 'week' | 'month';

export function Marketplace({ addons, loading, userLikes, onToggleLike, onRequireAuth, onNavigate }: MarketplaceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryOption>('All');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [dateRange, setDateRange] = useState<DateRangeOption>('all');
  const [tagFilter, setTagFilter] = useState('');
  const [authorFilter, setAuthorFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Search suggestions
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Infinite scroll state
  const [visibleCount, setVisibleCount] = useState(12);
  const observerTarget = useRef<HTMLDivElement>(null);

  const filteredAndSortedAddons = useMemo(() => {
    let result = addons;

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a => 
        (a.title && a.title.toLowerCase().includes(q)) || 
        (a.description && a.description.toLowerCase().includes(q)) ||
        (a.tags && a.tags.some(t => t.toLowerCase().includes(q))) ||
        (a.authorName && a.authorName.toLowerCase().includes(q))
      );
    }

    // Filter by Category
    if (selectedCategory !== 'All') {
      result = result.filter(a => a.category === selectedCategory);
    }

    // Filter by Date Range
    if (dateRange !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      if (dateRange === 'today') cutoff.setDate(now.getDate() - 1);
      if (dateRange === 'week') cutoff.setDate(now.getDate() - 7);
      if (dateRange === 'month') cutoff.setMonth(now.getMonth() - 1);
      
      result = result.filter(a => new Date(a.createdAt) >= cutoff);
    }

    // Filter by Tag
    if (tagFilter) {
      const q = tagFilter.toLowerCase();
      result = result.filter(a => a.tags && a.tags.some(t => t.toLowerCase().includes(q)));
    }

    // Filter by Author
    if (authorFilter) {
      const q = authorFilter.toLowerCase();
      result = result.filter(a => a.authorName && a.authorName.toLowerCase().includes(q));
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === 'most_liked') {
        return b.likesCount - a.likesCount;
      } else if (sortBy === 'highest_rated') {
        return (b.averageRating || 0) - (a.averageRating || 0);
      } else if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return 0;
    });

    return result;
  }, [addons, searchQuery, selectedCategory, sortBy, dateRange, tagFilter, authorFilter]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(12);
  }, [searchQuery, selectedCategory, sortBy, dateRange, tagFilter, authorFilter]);

  // Intersection Observer for infinite scroll
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

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [filteredAndSortedAddons.length, loading]);

  // Featured addons
  const featuredAddons = useMemo(() => {
    return addons.filter(a => a.isFeatured);
  }, [addons]);

  // Search suggestions based on actual addons
  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return addons
      .filter(a => a.title.toLowerCase().includes(q) || a.authorName.toLowerCase().includes(q))
      .slice(0, 5);
  }, [addons, searchQuery]);

  return (
    <section id="explore" className="relative min-h-screen pb-16" aria-label="Marketplace Explore">
      <h1 className="sr-only">Minecraft Marketplace Add-ons</h1>
      
      {/* Editorial Hero Section */}
      <div className="relative overflow-hidden bg-zinc-950/80 pt-20 pb-16 border-b border-zinc-800/80">
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 text-center z-10">
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white mb-3">
              Minecraft Add-ons
            </h1>
            <p className="text-zinc-400 text-sm sm:text-base max-w-lg mx-auto font-normal leading-relaxed">
              Explore community-crafted resource packs, behavior mods, and immersive worlds.
            </p>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex justify-center">
            <div className="relative flex flex-col gap-3 bg-zinc-900/90 border border-zinc-800 shadow-xl rounded-2xl p-3 sm:p-4 w-full sm:w-[680px] lg:w-[780px] text-left">
              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                <div className="relative w-full flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} aria-hidden="true" strokeWidth={2} />
                  <input
                    type="text"
                    aria-label="Search add-ons, tags, authors"
                    placeholder="Search add-ons, tags, or creators..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="w-full rounded-xl bg-zinc-950/80 py-3 pl-11 pr-4 text-xs sm:text-sm font-normal text-white placeholder-zinc-500 border border-zinc-800 focus:border-zinc-700 focus:outline-none transition-colors h-11"
                  />
                  <AnimatePresence>
                    {showSuggestions && searchSuggestions.length > 0 && (
                      <motion.div 
                        id="search-suggestions"
                        role="listbox"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.12 }}
                        className="absolute left-0 z-50 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2 shadow-2xl overflow-hidden mt-2"
                      >
                        {searchSuggestions.map((addon) => (
                          <button
                            key={addon.id}
                            role="option"
                            aria-selected={false}
                            className="w-full p-2 text-left text-xs text-zinc-300 hover:bg-zinc-800/80 hover:text-white rounded-lg transition-colors flex items-center gap-3 focus:outline-none"
                            onClick={() => {
                              onNavigate({ type: 'addon', id: addon.id });
                              setShowSuggestions(false);
                            }}
                          >
                            <div className="h-8 w-8 shrink-0 rounded-md overflow-hidden bg-zinc-950 border border-zinc-800" aria-hidden="true">
                              <FadeImage src={addon.imageUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                            <div className="flex flex-col overflow-hidden min-w-0">
                              <span className="font-medium text-white truncate">{addon.title}</span>
                              <span className="text-[11px] text-zinc-500 truncate">by {addon.authorName}</span>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex w-full sm:w-auto items-center gap-2">
                  <div className="hidden sm:flex items-center gap-1 bg-zinc-950/80 rounded-xl p-1 h-11 border border-zinc-800" role="group" aria-label="Quick Sort">
                    <button
                      onClick={() => setSortBy('newest')}
                      className={`h-full px-3.5 rounded-lg text-xs font-medium transition-all focus:outline-none ${sortBy === 'newest' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                      aria-pressed={sortBy === 'newest'}
                    >
                      Newest
                    </button>
                    <button
                      onClick={() => setSortBy('most_liked')}
                      className={`h-full px-3.5 rounded-lg text-xs font-medium transition-all focus:outline-none ${sortBy === 'most_liked' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                      aria-pressed={sortBy === 'most_liked'}
                    >
                      Popular
                    </button>
                  </div>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    aria-expanded={showFilters}
                    aria-controls="filter-panel"
                    className={`flex flex-1 sm:flex-none items-center justify-center transition-colors h-11 px-4 gap-2 rounded-xl border text-xs font-medium focus:outline-none ${showFilters || selectedCategory !== 'All' || tagFilter || authorFilter || dateRange !== 'all' ? 'border-zinc-700 bg-zinc-800 text-white' : 'border-zinc-800 bg-zinc-950/80 text-zinc-400 hover:bg-zinc-800/80 hover:text-white'}`}
                  >
                    <SlidersHorizontal size={15} strokeWidth={2} aria-hidden="true" />
                    <span>Filters</span>
                    {(selectedCategory !== 'All' || tagFilter || authorFilter || dateRange !== 'all') && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-200 text-[10px] text-zinc-900 font-semibold">
                        {(selectedCategory !== 'All' ? 1 : 0) + (tagFilter ? 1 : 0) + (authorFilter ? 1 : 0) + (dateRange !== 'all' ? 1 : 0)}
                        <span className="sr-only">active filters</span>
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Fast Expanded Filters without heavy layout spring recalculations */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    id="filter-panel"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15, ease: 'easeInOut' }}
                    className="w-full overflow-hidden"
                  >
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 pt-3 border-t border-zinc-800/80 mt-2">
                      <div className="flex flex-col gap-1">
                        <label htmlFor="category-select" className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Category</label>
                        <select
                          id="category-select"
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value as CategoryOption)}
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2 pl-3 pr-8 text-xs text-white focus:border-zinc-700 focus:outline-none transition-colors appearance-none"
                        >
                          <option value="All">All Categories</option>
                          <option value="Resource Pack">Resource Packs</option>
                          <option value="Behavior Pack">Behavior Packs</option>
                          <option value="World">Worlds</option>
                          <option value="Skin Pack">Skin Packs</option>
                          <option value="Mod">Mods</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label htmlFor="sort-select" className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Sort By</label>
                        <select
                          id="sort-select"
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as SortOption)}
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2 pl-3 pr-8 text-xs text-white focus:border-zinc-700 focus:outline-none transition-colors appearance-none"
                        >
                          <option value="newest">Newest First</option>
                          <option value="most_liked">Most Liked</option>
                          <option value="highest_rated">Highest Rated</option>
                          <option value="oldest">Oldest First</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label htmlFor="date-select" className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Date</label>
                        <select
                          id="date-select"
                          value={dateRange}
                          onChange={(e) => setDateRange(e.target.value as DateRangeOption)}
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2 pl-3 pr-8 text-xs text-white focus:border-zinc-700 focus:outline-none transition-colors appearance-none"
                        >
                          <option value="all">Any Time</option>
                          <option value="today">Past 24 Hours</option>
                          <option value="week">Past Week</option>
                          <option value="month">Past Month</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label htmlFor="tag-input" className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Tag</label>
                        <input
                          id="tag-input"
                          type="text"
                          placeholder="Filter by tag..."
                          value={tagFilter}
                          onChange={(e) => setTagFilter(e.target.value)}
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2 px-3 text-xs text-white placeholder-zinc-500 focus:border-zinc-700 focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                    
                    {(selectedCategory !== 'All' || sortBy !== 'newest' || dateRange !== 'all' || tagFilter || authorFilter) && (
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={() => {
                            setSelectedCategory('All');
                            setSortBy('newest');
                            setDateRange('all');
                            setTagFilter('');
                            setAuthorFilter('');
                          }}
                          className="text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                        >
                          Clear Filters
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-10">
        {/* Featured Section */}
        {!loading && featuredAddons.length > 0 && !searchQuery && selectedCategory === 'All' && (
          <div className="mb-12">
            <h2 className="mb-5 flex items-center gap-2 text-xl font-semibold tracking-tight text-white">
              <Sparkles className="text-amber-400" size={18} /> Featured Add-ons
            </h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featuredAddons.map((addon) => (
                <div key={addon.id} className="relative rounded-2xl">
                  <AddonCard
                    addon={addon}
                    isLiked={userLikes.has(addon.id)}
                    onToggleLike={onToggleLike}
                    onRequireAuth={onRequireAuth}
                    onNavigate={onNavigate}
                  />
                  <div className="absolute -top-2.5 -right-2.5 rounded-md bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-[10px] font-medium text-amber-400">
                    Featured
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight text-white">Marketplace</h2>
            <span className="text-xs text-zinc-400 font-normal">
              Showing {filteredAndSortedAddons.length} {filteredAndSortedAddons.length === 1 ? 'add-on' : 'add-ons'}
            </span>
          </div>

          {/* Active Filters Display */}
          {(selectedCategory !== 'All' || tagFilter || authorFilter || dateRange !== 'all') && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-zinc-500">Active filters:</span>
              {selectedCategory !== 'All' && (
                <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-300 border border-zinc-700">
                  {selectedCategory}
                  <button onClick={() => setSelectedCategory('All')} className="ml-1 text-zinc-400 hover:text-white"><X size={12} /></button>
                </span>
              )}
              {tagFilter && (
                <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-300 border border-zinc-700">
                  Tag: {tagFilter}
                  <button onClick={() => setTagFilter('')} className="ml-1 text-zinc-400 hover:text-white"><X size={12} /></button>
                </span>
              )}
              {authorFilter && (
                <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-300 border border-zinc-700">
                  Author: {authorFilter}
                  <button onClick={() => setAuthorFilter('')} className="ml-1 text-zinc-400 hover:text-white"><X size={12} /></button>
                </span>
              )}
              {dateRange !== 'all' && (
                <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-300 border border-zinc-700">
                  Date: {dateRange}
                  <button onClick={() => setDateRange('all')} className="ml-1 text-zinc-400 hover:text-white"><X size={12} /></button>
                </span>
              )}
            </div>
          )}
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filteredAndSortedAddons.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 py-24 text-center">
            <h3 className="text-sm font-medium text-white">No add-ons found</h3>
            <p className="mt-1 text-xs text-zinc-400">Try adjusting your search query or clear active filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredAndSortedAddons.slice(0, visibleCount).map((addon) => (
              <div key={addon.id}>
                <AddonCard
                  addon={addon}
                  isLiked={userLikes.has(addon.id)}
                  onToggleLike={onToggleLike}
                  onRequireAuth={onRequireAuth}
                  onNavigate={onNavigate}
                />
              </div>
            ))}
          </div>
        )}
        
        {/* Infinite Scroll Target */}
        {!loading && (
          <div 
            ref={observerTarget} 
            className="flex justify-center py-10"
            style={{ opacity: filteredAndSortedAddons.length > visibleCount ? 1 : 0, pointerEvents: 'none' }}
          >
            {filteredAndSortedAddons.length > visibleCount && (
              <Loader2 size={24} className="animate-spin text-zinc-500" />
            )}
          </div>
        )}
      </div>
    </section>
  );
}
