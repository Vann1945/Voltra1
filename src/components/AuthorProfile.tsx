'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { AddonCard } from './AddonCard';
import { getButtonClasses } from '@/lib/designSystem';
import { Addon } from '@/types';
import { Package, Heart, ArrowLeft } from '@/components/icons/animated';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { ViewState } from '@/types';
import { motion } from 'motion/react';
import { SkeletonCard, Skeleton, PageSkeletonCards } from './Skeleton';
import { ProfileAvatar } from './borderEffects';

interface AuthorProfileProps {
  authorId: string;
  addons: Addon[];
  loading: boolean;
  userLikes: Set<string>;
  userBookmarks: Set<string>;
  onToggleLike: (addonId: string, isLiked: boolean) => void;
  onToggleBookmark: (addonId: string, isBookmarked: boolean) => void;
  onRequireAuth: () => void;
  onNavigate: (view: ViewState) => void;
}

export function AuthorProfile({ authorId, addons, loading, userLikes, userBookmarks, onToggleLike, onToggleBookmark, onRequireAuth, onNavigate }: AuthorProfileProps) {
  const [authorPhoto, setAuthorPhoto] = useState<string | null>(null);
  const [authorBorder, setAuthorBorder] = useState<string>('none');
  const [authorDisplayName, setAuthorDisplayName] = useState<string>('');
  const { user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    const fetchAuthorData = async () => {
      try {
        const res = await fetch(`/api/users?id=${authorId}`);
        if (res.ok) {
          const data = await res.json();
          setAuthorPhoto(data.photoURL || null);
          setAuthorBorder(data.profileBorder || 'none');
          setAuthorDisplayName(data.displayName || '');
        }
      } catch (error) {
        showToast('Failed to load author profile.', 'error');
      }
    };
    if (authorId) fetchAuthorData();
  }, [authorId]);

  const authorAddons = useMemo(() => {
    return addons.filter(a => a.authorId === authorId || a.collaborators?.some(collaborator => collaborator.uid === authorId)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [addons, authorId]);

  const authorName = authorDisplayName || (authorAddons.find(addon => addon.authorId === authorId)?.authorName) || authorAddons.find(addon => addon.collaborators?.some(collaborator => collaborator.uid === authorId))?.collaborators?.find(collaborator => collaborator.uid === authorId)?.displayName || 'Unknown Author';

  const totalLikes = useMemo(() => authorAddons.reduce((sum, addon) => sum + (addon.likesCount || 0), 0), [authorAddons]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 min-h-[100dvh]">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (authorAddons.length === 0) {
    return (
      <div className="py-32 text-center min-h-[100dvh]">
        <h3 className="text-lg font-bold text-ink-900 uppercase">This author has no public add-ons yet</h3>
        <button
          onClick={() => onNavigate('home')}
          className={`mt-5 ${getButtonClasses('secondary', 'md')}`}
        >
          Return to Marketplace
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 min-h-[100dvh]">
      <button
        onClick={() => onNavigate('home')}
        className="mb-8 flex items-center gap-2 text-sm font-bold text-ink-900 uppercase hover:text-terracotta-text transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Marketplace
      </button>

      {/* Author header */}
      <div className="mb-12 flex flex-col md:flex-row items-start md:items-center gap-6 relative bg-parchment-raised p-8 rounded-lg shadow-card neumorph glass">
        <ProfileAvatar
          photoURL={authorPhoto}
          displayName={authorName}
          borderValue={authorBorder}
          sizeClassName="h-28 w-28"
          textSizeClassName="text-4xl font-bold"
        />

        <div className="flex-1 w-full">
          <h1 className="text-3xl font-bold text-ink-900 tracking-tight">{authorName}</h1>
          <div className="mt-4 flex items-center gap-3 text-sm font-bold text-ink-900">
            <span className="flex items-center gap-2 bg-parchment-raised px-3 py-1.5 rounded-lg shadow-card"><Package size={15} /> {authorAddons.length} Projects</span>
            <span className="flex items-center gap-2 bg-parchment-raised px-3 py-1.5 rounded-lg shadow-card"><Heart size={15} /> {totalLikes} Total Likes</span>
          </div>
        </div>
      </div>

      <div className="space-y-16">
        <section>
                      <h2 className="mb-6 text-xl font-bold text-ink-900 uppercase tracking-tight flex items-center gap-2">
            <Package size={20} className="text-terracotta-soft" /> Projects by {authorName}

          </h2>

          <motion.div
            initial="hidden" animate="visible"
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.12 } } }}
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {authorAddons.map(addon => (
              <motion.div key={addon.id} variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.54, ease: 'easeOut' } } }}>
                <AddonCard addon={addon} isLiked={userLikes.has(addon.id)} isBookmarked={userBookmarks.has(addon.id)} onToggleLike={onToggleLike} onToggleBookmark={onToggleBookmark} onRequireAuth={onRequireAuth} onNavigate={onNavigate} />
              </motion.div>
            ))}
          </motion.div>
        </section>
      </div>
    </div>
  );
}
