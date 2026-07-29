import React, { useMemo, useState, useEffect } from 'react';
import { AddonCard } from './AddonCard';
import { Addon } from '../types';
import { Package, Heart, ArrowLeft, Loader2 } from 'lucide-react';
import { ViewState } from '../App';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'framer-motion';
import { SkeletonCard, Skeleton } from './Skeleton';
import { FadeImage } from './FadeImage';

interface AuthorProfileProps {
  authorId: string;
  addons: Addon[];
  loading: boolean;
  userLikes: Set<string>;
  onToggleLike: (addonId: string, isLiked: boolean) => void;
  onRequireAuth: () => void;
  onNavigate: (view: ViewState) => void;
}

export function AuthorProfile({ authorId, addons, loading, userLikes, onToggleLike, onRequireAuth, onNavigate }: AuthorProfileProps) {
  const [authorPhoto, setAuthorPhoto] = useState<string | null>(null);
  const [authorBorder, setAuthorBorder] = useState<string>('none');

  useEffect(() => {
    let mounted = true;
    const fetchAuthorData = async () => {
      try {
        const { fetchUserCached } = await import('../lib/userCache');
        const userData = await fetchUserCached(authorId);
        if (mounted && userData) {
          setAuthorPhoto(userData.photoURL || null);
          setAuthorBorder(userData.profileBorder || 'none');
        }
      } catch (error) {
        console.error("Error fetching author data:", error);
      }
    };
    if (authorId) {
      fetchAuthorData();
    }
    return () => { mounted = false; };
  }, [authorId]);

  const authorAddons = useMemo(() => {
    return addons.filter(a => a.authorId === authorId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [addons, authorId]);

  const authorName = authorAddons.length > 0 ? authorAddons[0].authorName : 'Unknown Author';

  const totalLikes = useMemo(() => {
    return authorAddons.reduce((sum, addon) => sum + (addon.likesCount || 0), 0);
  }, [authorAddons]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 w-32 h-6">
          <Skeleton className="w-full h-full" />
        </div>
        <div className="mb-12 flex flex-col md:flex-row items-start md:items-center gap-6 relative bg-zinc-900/40 p-8 rounded-3xl border border-white/5">
          <Skeleton className="h-28 w-28 rounded-full" />
          <div className="flex-1 w-full space-y-4">
            <Skeleton className="h-8 w-48" />
            <div className="flex gap-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (authorAddons.length === 0) {
    return (
      <div className="py-32 text-center">
        <h3 className="text-lg font-semibold text-white">Author not found or has no add-ons.</h3>
        <button onClick={() => onNavigate('home')} className="mt-4 text-violet-500 hover:text-violet-400">
          Return to Marketplace
        </button>
      </div>
    );
  }

  const getBorderClass = (borderType: string) => {
    switch (borderType) {
      case 'gold': return 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-zinc-950 shadow-[0_0_15px_rgba(250,204,21,0.5)]';
      case 'neon': return 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-zinc-950 shadow-[0_0_15px_rgba(34,211,238,0.6)]';
      case 'fire': return 'ring-2 ring-rose-500 ring-offset-2 ring-offset-zinc-950 shadow-[0_0_15px_rgba(244,63,94,0.6)]';
      case 'void': return 'ring-2 ring-purple-600 ring-offset-2 ring-offset-zinc-950 shadow-[0_0_15px_rgba(147,51,234,0.6)]';
      default: return 'border border-white/10';
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <button 
        onClick={() => onNavigate('home')}
        className="mb-8 flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-lg p-1 -ms-1"
        aria-label="Back to Marketplace"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back to Marketplace
      </button>

      <section className="mb-12 flex flex-col md:flex-row items-start md:items-center gap-6 relative bg-zinc-900/40 p-8 rounded-3xl border border-white/5" aria-labelledby="author-name">
        <div className={`h-28 w-28 shrink-0 overflow-hidden rounded-full bg-zinc-900 flex items-center justify-center ${getBorderClass(authorBorder)}`} aria-hidden="true">
          {authorPhoto ? (
            <FadeImage src={authorPhoto} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-zinc-400">
              {authorName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        
        <div className="flex-1 w-full">
          <div className="flex items-center justify-between w-full">
            <h1 id="author-name" className="text-3xl font-bold tracking-tight text-white">{authorName}</h1>
          </div>
          <div className="mt-4 flex items-center gap-4 text-sm text-zinc-500">
            <span className="flex items-center gap-1.5" aria-label={`${authorAddons.length} Uploads`}><Package size={16} aria-hidden="true" /> {authorAddons.length} Uploads</span>
            <span className="flex items-center gap-1.5" aria-label={`${totalLikes} Total Likes`}><Heart size={16} aria-hidden="true" /> {totalLikes} Total Likes</span>
          </div>
        </div>
      </section>

      <div className="space-y-16">
        <section>
          <h2 className="mb-6 text-xl font-medium tracking-tight text-white flex items-center gap-2">
            <Package size={20} className="text-zinc-400" /> Uploads by {authorName}
          </h2>
          
          <motion.div 
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
            {authorAddons.map((addon) => (
              <motion.div
                key={addon.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
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
          </motion.div>
        </section>
      </div>
    </div>
  );
}
