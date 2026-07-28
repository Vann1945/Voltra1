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
    <section id="explore" className="relative min-h-screen pb-12" aria-label="Marketplace Explore">
      <h1 className="sr-only">Minecraft Marketplace Add-ons</h1>
      {/* Premium Hero Section */}
      <div className="relative overflow-hidden bg-zinc-950 pt-28 pb-20 border-b border-white/5">
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center z-10">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mb-10"
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-6">
              Minecraft Add-ons
            </h1>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto font-medium tracking-wide">
              Explore resource packs, mods, and worlds crafted by the community.
            </p>
          </motion.div>
          {/* Search & Filter */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="flex justify-center"
          >
            <div className="relative flex flex-col gap-4 bg-zinc-900/80 backdrop-blur-xl border border-white/10 shadow-2xl rounded-[24px] p-4 sm:p-5 w-full sm:w-[680px] lg:w-[840px] text-left">
              <div className="flex flex-col lg:flex-row items-center gap-3">
                <div className="relative w-full flex-1">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400" size={20} aria-hidden="true" strokeWidth={2} />
              <input
                type="text"
                aria-label="Search add-ons, tags, authors"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="w-full rounded-2xl bg-zinc-950 py-4 pl-12 pr-4 text-sm font-medium text-white placeholder-zinc-500 border border-white/5 focus:border-white/20 focus:bg-zinc-900 focus:outline-none transition-all h-[56px]"
              />
              <AnimatePresence>
                {showSuggestions && searchSuggestions.length > 0 && (
                  <motion.div 
                    id="search-suggestions"
                    role="listbox"
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 z-50 w-full rounded-2xl border border-white/10 bg-zinc-900/95 backdrop-blur-xl p-2 shadow-2xl overflow-hidden mt-2"
                  >
                    {searchSuggestions.map((addon) => (
                      <button
                        key={addon.id}
                        role="option"
                        aria-selected={false}
                        className="w-full p-2 text-left text-sm text-zinc-300 hover:bg-white/5 hover:text-white rounded-xl transition-colors flex items-center gap-3 focus:outline-none focus-visible:bg-white/10"
                        onClick={() => {
                          onNavigate({ type: 'addon', id: addon.id });
                          setShowSuggestions(false);
                        }}
                      >
                        <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-zinc-950 border border-white/5" aria-hidden="true">
                          <FadeImage src={addon.imageUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex flex-col overflow-hidden">
                          <span className="font-medium text-white truncate">{addon.title}</span>
                          <span className="text-xs text-zinc-500 truncate">by {addon.authorName}</span>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex w-full lg:w-auto items-center gap-3">
              <div className="hidden sm:flex items-center gap-1 bg-zinc-950 rounded-2xl p-1 h-[56px] border border-white/5" role="group" aria-label="Quick Sort">
                <button
                  onClick={() => setSortBy('newest')}
                  className={`h-full px-5 rounded-xl text-sm font-medium transition-all focus:outline-none ${sortBy === 'newest' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                  aria-pressed={sortBy === 'newest'}
                >
                  Newest
                </button>
                <button
                  onClick={() => setSortBy('most_liked')}
                  className={`h-full px-5 rounded-xl text-sm font-medium transition-all focus:outline-none ${sortBy === 'most_liked' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                  aria-pressed={sortBy === 'most_liked'}
                >
                  Popular
                </button>
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                aria-expanded={showFilters}
                aria-controls="filter-panel"
                className={`flex flex-1 lg:flex-none items-center justify-center transition-all duration-300 h-[56px] px-6 gap-2 rounded-2xl border focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${showFilters || selectedCategory !== 'All' || tagFilter || authorFilter || dateRange !== 'all' ? 'border-white/20 bg-zinc-800 text-white shadow-md' : 'border-white/5 bg-zinc-950 text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}
              >
                <SlidersHorizontal size={18} strokeWidth={2} aria-hidden="true" />
                <span className="font-medium text-sm tracking-wide">Filters</span>
                {(selectedCategory !== 'All' || tagFilter || authorFilter || dateRange !== 'all') && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] text-black font-bold">
                    {(selectedCategory !== 'All' ? 1 : 0) + (tagFilter ? 1 : 0) + (authorFilter ? 1 : 0) + (dateRange !== 'all' ? 1 : 0)}
                    <span className="sr-only">active filters</span>
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Expanded Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                id="filter-panel"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="w-full pt-2"
              >
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 pt-4 border-t border-white/5 mt-2">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="category-select" className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Category</label>
                    <select
                      id="category-select"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value as CategoryOption)}
                      className="w-full rounded-xl border border-white/5 bg-black/40 py-2.5 pl-3 pr-8 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20 transition-colors appearance-none"
                    >
                      <option value="All">All Categories</option>
                      <option value="Resource Pack">Resource Packs</option>
                      <option value="Behavior Pack">Behavior Packs</option>
                      <option value="World">Worlds</option>
                      <option value="Skin Pack">Skin Packs</option>
                      <option value="Mod">Mods</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="sort-select" className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Sort By</label>
                    <select
                      id="sort-select"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="w-full rounded-xl border border-white/5 bg-black/40 py-2.5 pl-3 pr-8 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20 transition-colors appearance-none"
                    >
                      <option value="newest">Newest First</option>
                      <option value="most_liked">Most Liked</option>
                      <option value="highest_rated">Highest Rated</option>
                      <option value="oldest">Oldest First</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="date-select" className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Date</label>
                    <select
                      id="date-select"
                      value={dateRange}
                      onChange={(e) => setDateRange(e.target.value as DateRangeOption)}
                      className="w-full rounded-xl border border-white/5 bg-black/40 py-2.5 pl-3 pr-8 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20 transition-colors appearance-none"
                    >
                      <option value="all">Any Time</option>
                      <option value="today">Past 24 Hours</option>
                      <option value="week">Past Week</option>
                      <option value="month">Past Month</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="tag-input" className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Tag</label>
                    <input
                      id="tag-input"
                      type="text"
                      placeholder="Filter by tag..."
                      value={tagFilter}
                      onChange={(e) => setTagFilter(e.target.value)}
                      className="w-full rounded-xl border border-white/5 bg-black/40 py-2.5 px-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 transition-colors"
                    />
                  </div>
                </div>
                
                {(selectedCategory !== 'All' || sortBy !== 'newest' || dateRange !== 'all' || tagFilter || authorFilter) && (
                  <div className="mt-4 flex justify-end">
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
      </motion.div>
    </div>
  </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-12">
      {/* Featured Section */}
      {!loading && featuredAddons.length > 0 && !searchQuery && selectedCategory === 'All' && (
        <div className="mb-16">
          <h2 className="mb-6 flex items-center gap-2 text-2xl font-medium tracking-tight text-white">
            <Sparkles className="text-amber-400" size={20} /> Featured Add-ons
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredAddons.map((addon) => (
              <div key={addon.id} className="relative rounded-[2rem] ring-1 ring-white/10 hover:ring-white/20 transition-all">
                <AddonCard
                  addon={addon}
                  isLiked={userLikes.has(addon.id)}
                  onToggleLike={onToggleLike}
                  onRequireAuth={onRequireAuth}
                  onNavigate={onNavigate}
                />
                <div className="absolute -top-3 -right-3 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-medium text-amber-400 ">
                  Featured
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-8 flex flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-medium tracking-tight text-white">Marketplace</h2>
        </div>

        {/* Active Filters Display */}
        {(selectedCategory !== 'All' || tagFilter || authorFilter || dateRange !== 'all') && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-zinc-500">Active filters:</span>
            {selectedCategory !== 'All' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-400 border border-violet-500/20">
                {selectedCategory}
                <button onClick={() => setSelectedCategory('All')} className="ml-1 hover:text-white"><X size={12} /></button>
              </span>
            )}
            {tagFilter && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400 border border-blue-500/20">
                Tag: {tagFilter}
                <button onClick={() => setTagFilter('')} className="ml-1 hover:text-white"><X size={12} /></button>
              </span>
            )}
            {authorFilter && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                Author: {authorFilter}
                <button onClick={() => setAuthorFilter('')} className="ml-1 hover:text-white"><X size={12} /></button>
              </span>
            )}
            {dateRange !== 'all' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400 border border-amber-500/20">
                Date: {dateRange}
                <button onClick={() => setDateRange('all')} className="ml-1 hover:text-white"><X size={12} /></button>
              </span>
            )}
          </div>
        )}
      </div>
      
      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filteredAndSortedAddons.length === 0 ? (
        <div className="rounded-3xl border border-zinc-800/50 bg-zinc-900/20 py-32 text-center">
          <h3 className="mt-2 text-sm font-semibold text-white">No add-ons found</h3>
          <p className="mt-1 text-sm text-zinc-400">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <motion.div 
          layout
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.05
              }
            }
          }}
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          <AnimatePresence mode="popLayout">
            {filteredAndSortedAddons.slice(0, visibleCount).map((addon) => (
              <motion.div
                layout
                key={addon.id}
                variants={{
                  hidden: { opacity: 0, scale: 0.9, y: 20 },
                  visible: { opacity: 1, scale: 1, y: 0 }
                }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <AddonCard
                  addon={addon}
                  isLiked={userLikes.has(addon.id)}
                  onToggleLike={onToggleLike}
                  onRequireAuth={onRequireAuth}
                  onNavigate={onNavigate}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
      
      {/* Infinite Scroll Target */}
      {!loading && (
        <div 
          ref={observerTarget} 
          className="flex justify-center py-12"
          style={{ opacity: filteredAndSortedAddons.length > visibleCount ? 1 : 0, pointerEvents: 'none' }}
        >
          {filteredAndSortedAddons.length > visibleCount && (
            <Loader2 size={32} className="animate-spin text-zinc-600" />
          )}
        </div>
      )}
      </div>
    </section>
  );
}
