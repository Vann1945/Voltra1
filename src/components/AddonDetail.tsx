import React, { useState, useEffect } from 'react';
import { Addon, Review } from '../types';
import { useAuth } from '../hooks/useAuth';
import { ArrowLeft, Heart, Download, User as UserIcon, Star, AlertTriangle, MessageSquare, ArrowDownToLine, ChevronLeft, ChevronRight, Info, Loader2, Check, ExternalLink, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { ViewState } from '../App';
import { ReportModal } from './ReportModal';
import { motion, AnimatePresence } from 'framer-motion';
import { FadeImage } from './FadeImage';

interface AddonDetailProps {
  addonId: string;
  addons: Addon[];
  userLikes: Set<string>;
  onToggleLike: (addonId: string, isLiked: boolean) => void;
  onRequireAuth: () => void;
  onNavigate: (view: ViewState) => void;
}

export function AddonDetail({ addonId, addons, userLikes, onToggleLike, onRequireAuth, onNavigate }: AddonDetailProps) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReviewText, setNewReviewText] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [authorPhoto, setAuthorPhoto] = useState<string | null>(null);
  const [authorBorder, setAuthorBorder] = useState<string>('none');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageExpanded, setIsImageExpanded] = useState(false);

  const addon = addons.find(a => a.id === addonId);
  const isLiked = userLikes.has(addonId);
  const images = addon?.imageUrls && addon.imageUrls.length > 0 ? addon.imageUrls : [addon?.imageUrl || ''];

  useEffect(() => {
    if (!addon) return;
    let mounted = true;
    const fetchAuthor = async () => {
      try {
        const { fetchUserCached } = await import('../lib/userCache');
        const userData = await fetchUserCached(addon.authorId);
        if (mounted && userData) {
          setAuthorPhoto(userData.photoURL || null);
          setAuthorBorder(userData.profileBorder || 'none');
        }
      } catch (e) {
        console.error("Failed to fetch author", e);
      }
    };
    fetchAuthor();
    return () => { mounted = false; };
  }, [addon]);

  useEffect(() => {
    if (!addonId) return;

    const q = query(
      collection(db, 'reviews'),
      where('addonId', '==', addonId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedReviews: Review[] = [];
      snapshot.forEach((doc) => {
        fetchedReviews.push({ id: doc.id, ...doc.data() } as Review);
      });
      setReviews(fetchedReviews);
    });

    return () => unsubscribe();
  }, [addonId]);

  if (!addon) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-white">Add-on not found</h2>
        <button onClick={() => onNavigate('home')} className="mt-4 text-violet-500 hover:text-violet-400">
          Return to Marketplace
        </button>
      </div>
    );
  }

  const handleLikeClick = () => {
    if (!user) {
      onRequireAuth();
      return;
    }
    onToggleLike(addon.id, isLiked);
  };

  const handleAuthorClick = () => {
    onNavigate({ type: 'author', id: addon.authorId });
  };

  const handleDownloadClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isDownloading || downloadSuccess || !addon) return;
    
    setIsDownloading(true);
    setDownloadProgress(0);

    // Simulate download progress
    const interval = setInterval(() => {
      setDownloadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const addonRef = doc(db, 'addons', addon.id);
      await updateDoc(addonRef, {
        downloadsCount: increment(1)
      });
      
      // Wait for progress to reach 100
      await new Promise(resolve => setTimeout(resolve, 2200));
      
      setDownloadSuccess(true);
      window.open(addon.downloadUrl, '_blank');
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to increment download count:", error);
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
      clearInterval(interval);
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }

    if (!newReviewText.trim()) return;

    setSubmittingReview(true);
    try {
      const reviewId = crypto.randomUUID();
      const newReview = {
        id: reviewId,
        addonId: addon.id,
        userId: user.uid,
        userName: user.displayName,
        rating: newReviewRating,
        text: newReviewText.trim(),
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'reviews'), newReview);

      // Update addon average rating and count
      const currentCount = addon.ratingCount || 0;
      const currentAvg = addon.averageRating || 0;
      const newCount = currentCount + 1;
      const newAvg = ((currentAvg * currentCount) + newReviewRating) / newCount;

      const addonRef = doc(db, 'addons', addon.id);
      await updateDoc(addonRef, {
        ratingCount: newCount,
        averageRating: newAvg
      });

      setNewReviewText('');
      setNewReviewRating(5);
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const getBorderClass = (borderType: string) => {
    switch (borderType) {
      case 'gold': return 'ring-1 ring-amber-400';
      case 'neon': return 'ring-1 ring-cyan-400';
      case 'fire': return 'ring-1 ring-rose-500';
      case 'void': return 'ring-1 ring-purple-500';
      default: return 'border border-zinc-700/50';
    }
  };

  return (
    <article className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <button 
        onClick={() => onNavigate('home')}
        aria-label="Back to Marketplace"
        className="mb-6 flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors focus:outline-none rounded-md p-1 -ml-1"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back to Marketplace
      </button>

      <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/80 shadow-md">
        <div className="aspect-[21/9] w-full overflow-hidden bg-zinc-950 relative group/carousel">
          <FadeImage
            src={images[currentImageIndex]}
            alt=""
            containerClassName="h-full w-full cursor-zoom-in transition-transform duration-500 hover:scale-[1.02]"
            className="h-full w-full object-contain bg-zinc-950"
            referrerPolicy="no-referrer"
            onClick={() => setIsImageExpanded(true)}
          />
          
          {images.length > 1 && (
            <>
              <button 
                onClick={prevImage}
                aria-label="Previous image"
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-lg bg-black/60 text-zinc-200 opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-black/80 focus:outline-none"
              >
                <ChevronLeft size={20} aria-hidden="true" />
              </button>
              <button 
                onClick={nextImage}
                aria-label="Next image"
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-lg bg-black/60 text-zinc-200 opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-black/80 focus:outline-none"
              >
                <ChevronRight size={20} aria-hidden="true" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5" role="tablist" aria-label="Image gallery">
                {images.map((_, idx) => (
                  <button 
                    key={idx} 
                    role="tab"
                    aria-selected={idx === currentImageIndex}
                    aria-label={`View image ${idx + 1}`}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`h-1.5 rounded-full transition-all focus:outline-none ${idx === currentImageIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'}`}
                  />
                ))}
              </div>
            </>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent opacity-60 pointer-events-none" aria-hidden="true" />
        </div>

        <AnimatePresence>
          {isImageExpanded && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm">
              <button 
                className="absolute top-6 right-6 p-3 rounded-lg bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white transition-colors focus:outline-none z-50"
                onClick={() => setIsImageExpanded(false)}
                aria-label="Close image preview"
              >
                <X size={20} />
              </button>
              <div className="relative w-full h-full p-4 sm:p-12 flex items-center justify-center">
                <FadeImage
                  src={images[currentImageIndex]}
                  alt=""
                  containerClassName="w-full h-full max-w-6xl max-h-screen"
                  className="w-full h-full object-contain rounded-xl"
                  referrerPolicy="no-referrer"
                />
                {images.length > 1 && (
                  <>
                    <button 
                      onClick={prevImage}
                      aria-label="Previous image"
                      className="absolute left-4 sm:left-12 top-1/2 -translate-y-1/2 p-3 rounded-lg bg-zinc-800/80 text-white hover:bg-zinc-700 focus:outline-none"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button 
                      onClick={nextImage}
                      aria-label="Next image"
                      className="absolute right-4 sm:right-12 top-1/2 -translate-y-1/2 p-3 rounded-lg bg-zinc-800/80 text-white hover:bg-zinc-700 focus:outline-none"
                    >
                      <ChevronRight size={24} />
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </AnimatePresence>

        <div className="p-6 sm:p-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center rounded-md bg-zinc-800 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-zinc-300 border border-zinc-700/60">
                  {addon.category}
                </span>
                {addon.status === 'pending' && (
                  <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-amber-300 border border-amber-500/20">
                    Pending Approval
                  </span>
                )}
                {addon.status === 'rejected' && (
                  <span className="inline-flex items-center rounded-md bg-red-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-red-300 border border-red-500/20">
                    Rejected
                  </span>
                )}
                <span className="text-xs text-zinc-500 font-normal">
                  {formatDistanceToNow(new Date(addon.createdAt), { addSuffix: true })}
                </span>
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{addon.title}</h1>
              
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-zinc-400">
                <button 
                  className="flex items-center gap-2.5 hover:text-white transition-colors cursor-pointer group/author focus:outline-none rounded-md"
                  onClick={handleAuthorClick}
                  aria-label={`View ${addon.authorName}'s profile`}
                >
                  <div className={`h-8 w-8 shrink-0 overflow-hidden rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700/50 ${getBorderClass(authorBorder)}`} aria-hidden="true">
                    {authorPhoto ? (
                      <FadeImage src={authorPhoto} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-xs font-medium text-zinc-300">{addon.authorName.charAt(0)}</span>
                    )}
                  </div>
                  <span className="font-medium text-xs text-zinc-300 group-hover/author:text-white transition-colors">{addon.authorName}</span>
                </button>
                {addon.averageRating !== undefined && (
                  <div className="flex items-center gap-1 text-zinc-200 bg-zinc-800/80 px-2.5 py-1 rounded-md border border-zinc-700/50" aria-label={`Rating: ${addon.averageRating.toFixed(1)} out of 5 stars, from ${addon.ratingCount} reviews`}>
                    <Star size={12} className="fill-amber-400 text-amber-400" aria-hidden="true" />
                    <span className="font-medium text-xs">{addon.averageRating.toFixed(1)}</span>
                    <span className="text-zinc-500 font-normal text-[11px]">({addon.ratingCount})</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-xs font-normal text-zinc-400 bg-zinc-800/50 px-2.5 py-1 rounded-md border border-zinc-700/40" aria-label={`${addon.downloadsCount || 0} Downloads`}>
                  <ArrowDownToLine size={13} aria-hidden="true" />
                  <span>{addon.downloadsCount || 0} Downloads</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 focus:outline-none"
                aria-label="Report Add-on"
                title="Report Add-on"
              >
                <AlertTriangle size={15} aria-hidden="true" />
              </button>
              <button
                onClick={handleLikeClick}
                aria-label={isLiked ? "Unlike addon" : "Like addon"}
                className={`flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors focus:outline-none ${
                  isLiked 
                    ? 'border-rose-500/30 text-rose-400 bg-rose-500/10' 
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                <Heart size={15} className={isLiked ? 'fill-rose-400' : ''} aria-hidden="true" />
                <span>{addon.likesCount}</span>
              </button>
              <button
                onClick={handleDownloadClick}
                disabled={isDownloading}
                aria-label={downloadSuccess ? "Downloaded" : isDownloading ? "Downloading..." : "Download Addon"}
                className={`relative overflow-hidden flex items-center gap-2 rounded-lg px-5 py-2 text-xs font-medium transition-all focus:outline-none ${
                  downloadSuccess 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-zinc-100 text-zinc-900 hover:bg-white'
                }`}
              >
                {isDownloading && (
                  <div 
                    className="absolute inset-0 bg-black/10 transition-all duration-200" 
                    style={{ width: `${downloadProgress}%` }} 
                  />
                )}
                <div className="relative z-10 flex items-center gap-1.5">
                  {isDownloading ? (
                    <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  ) : downloadSuccess ? (
                    <Check size={14} aria-hidden="true" strokeWidth={2} />
                  ) : (
                    <Download size={14} aria-hidden="true" strokeWidth={2} />
                  )}
                  <span>{isDownloading ? `${downloadProgress}%` : downloadSuccess ? 'Downloaded!' : 'Get Add-on'}</span>
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-6 border-t border-zinc-800/80">
            <div className="lg:col-span-2">
              <h3 className="text-base font-semibold text-white mb-3 tracking-tight">Description</h3>
              <p className="whitespace-pre-wrap text-zinc-300 text-xs sm:text-sm leading-relaxed font-normal">{addon.description}</p>
            </div>

            <div className="space-y-6">
              {addon.demoUrl && (
                <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-5">
                  <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <ExternalLink size={14} className="text-zinc-400" />
                    Demo / Preview
                  </h3>
                  <a 
                    href={addon.demoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-zinc-800 hover:bg-zinc-700 transition-colors px-3 py-1.5 rounded-lg border border-zinc-700/60"
                  >
                    View Demo
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}

              {(addon.versionHistory || addon.compatibilityNotes || addon.changelog) && (
                <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-5">
                  <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Info size={14} className="text-zinc-400" />
                    Specifications
                  </h3>
                  <div className="space-y-4 text-xs">
                    {addon.versionHistory && (
                      <div>
                        <h4 className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Version</h4>
                        <p className="text-zinc-300 font-normal">{addon.versionHistory}</p>
                      </div>
                    )}
                    {addon.compatibilityNotes && (
                      <div>
                        <h4 className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Compatibility</h4>
                        <p className="text-zinc-300 font-normal">{addon.compatibilityNotes}</p>
                      </div>
                    )}
                    {addon.changelog && (
                      <div>
                        <h4 className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Changelog</h4>
                        <p className="text-zinc-300 font-normal whitespace-pre-wrap">{addon.changelog}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {addon.tags && addon.tags.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-2.5">Tags</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {addon.tags.map(tag => (
                      <span key={tag} className="inline-flex items-center rounded-md bg-zinc-950/80 border border-zinc-800 px-2.5 py-1 text-[11px] font-normal text-zinc-400">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold tracking-tight text-white mb-6 flex items-center gap-2.5">
          <MessageSquare className="text-zinc-400" size={20} strokeWidth={2} /> Reviews
        </h2>

        {/* Add Review Form */}
        <div className="mb-8 rounded-2xl border border-zinc-800/80 bg-zinc-900/80 p-6 sm:p-8">
          <h3 className="text-sm font-semibold text-white mb-4">Write a Review</h3>
          <form onSubmit={handleSubmitReview}>
            <div className="mb-4">
              <label className="block text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-2">Rating</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewReviewRating(star)}
                    className="p-1 focus:outline-none transition-transform hover:scale-105 active:scale-95"
                  >
                    <Star
                      size={20}
                      className={star <= newReviewRating ? 'fill-amber-400 text-amber-400' : 'text-zinc-800'}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-2">Comment</label>
              <textarea
                required
                rows={3}
                value={newReviewText}
                onChange={(e) => setNewReviewText(e.target.value)}
                className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-xs text-white placeholder-zinc-500 focus:border-zinc-700 focus:outline-none transition-colors resize-none font-normal"
                placeholder="Share your feedback about this add-on..."
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submittingReview || !newReviewText.trim()}
                className="rounded-lg bg-zinc-100 px-5 py-2 text-xs font-medium text-zinc-900 hover:bg-white disabled:opacity-50 transition-colors focus:outline-none"
              >
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </form>
        </div>

        {/* Reviews List */}
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
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {reviews.length === 0 ? (
            <div className="md:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/50 py-16 text-center">
              <MessageSquare size={28} strokeWidth={1.5} className="mx-auto mb-3 text-zinc-600" />
              <p className="text-zinc-400 font-normal text-xs">No reviews yet. Be the first to share feedback!</p>
            </div>
          ) : (
            reviews.map((review) => {
              return (
                <motion.div 
                  key={review.id} 
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-5 flex flex-col h-full"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-700/50">
                        {review.userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-zinc-200">{review.userName}</p>
                        <p className="text-[10px] text-zinc-500 font-normal mt-0.5">{formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mb-3 flex items-center gap-1 bg-zinc-950/60 w-fit px-2 py-0.5 rounded-md border border-zinc-800/80">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={11} className={i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-800'} />
                    ))}
                  </div>
                  <p className="text-zinc-300 whitespace-pre-wrap leading-relaxed font-normal text-xs flex-grow">{review.text}</p>
                </motion.div>
              );
            })
          )}
        </motion.div>
      </div>

      <ReportModal 
        isOpen={isReportModalOpen} 
        onClose={() => setIsReportModalOpen(false)} 
        addonId={addon.id} 
      />
    </article>
  );
}
