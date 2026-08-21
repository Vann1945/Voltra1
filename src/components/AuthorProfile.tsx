import React, { useMemo, useState, useEffect } from 'react';
import { AddonCard } from './AddonCard';
import { Addon } from '../types';
import { Package, Heart, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { ViewState } from '../App';
import { motion } from 'motion/react';
import { SkeletonCard, Skeleton, PageSkeletonCards } from './Skeleton';
import { ProfileAvatar } from './borderEffects';

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
        }
      } catch (error) {
        showToast('Failed to load author profile.', 'error');
      }
    };
    if (authorId) fetchAuthorData();
  }, [authorId]);

  const authorAddons = useMemo(() => {
    return addons.filter(a => a.authorId === authorId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [addons, authorId]);

  const authorName = authorAddons.length > 0 ? authorAddons[0].authorName : 'Unknown Author';

  const totalLikes = useMemo(() => authorAddons.reduce((sum, addon) => sum + (addon.likesCount || 0), 0), [authorAddons]);

  if (loading) {
    return <PageSkeletonCards count={8} />;
  }

  if (authorAddons.length === 0) {
    return (
      <div className="py-32 text-center min-h-[100dvh]">
        <h3 className="text-lg font-bold text-ink uppercase">This author has no public add-ons yet</h3>
        <button
          onClick={() => onNavigate('home')}
          className="mt-5 inline-flex items-center gap-2 bg-paper rounded-lg text-ink px-5 py-2.5 text-sm font-bold uppercase shadow-card btn-3d"
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
        className="mb-8 flex items-center gap-2 text-sm font-bold text-ink uppercase hover:text-accent-deep transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Marketplace
      </button>

      {/* Author header */}
      <div className="mb-12 flex flex-col md:flex-row items-start md:items-center gap-6 relative bg-paper p-8 rounded-lg shadow-card neumorph glass">
        <ProfileAvatar
          photoURL={authorPhoto}
          displayName={authorName}
          borderValue={authorBorder}
          sizeClassName="h-28 w-28"
          textSizeClassName="text-4xl font-bold"
        />

        <div className="flex-1 w-full">
          <h1 className="text-3xl font-bold text-ink tracking-tight">{authorName}</h1>
          <div className="mt-4 flex items-center gap-3 text-sm font-bold text-ink">
            <span className="flex items-center gap-2 bg-paper px-3 py-1.5 rounded-lg shadow-card"><Package size={15} /> {authorAddons.length} Uploads</span>
            <span className="flex items-center gap-2 bg-paper px-3 py-1.5 rounded-lg shadow-card"><Heart size={15} /> {totalLikes} Total Likes</span>
          </div>
        </div>
      </div>

      <div className="space-y-16">
        <section>
          <h2 className="mb-6 text-xl font-bold text-ink uppercase tracking-tight flex items-center gap-2">
            <Package size={20} className="text-accent-soft" /> Uploads by {authorName}
          </h2>

          <motion.div
            initial="hidden" animate="visible"
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.12 } } }}
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {authorAddons.map(addon => (
              <motion.div key={addon.id} variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.54, ease: 'easeOut' } } }}>
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
