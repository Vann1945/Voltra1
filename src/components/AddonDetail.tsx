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
      case 'gold': return 'ring-1 ring-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]';
      case 'neon': return 'ring-1 ring-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]';
      case 'fire': return 'ring-1 ring-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]';
      case 'void': return 'ring-1 ring-purple-600 shadow-[0_0_8px_rgba(147,51,234,0.6)]';
      default: return 'border border-white/10';
    }
  };

  return (
    <article className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <button 
        onClick={() => onNavigate('home')}
        aria-label="Back to Marketplace"
        className="mb-8 flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-lg p-1 -ms-1"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back to Marketplace
      </button>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50 shadow-xl">
        <div className="aspect-[21/9] w-full overflow-hidden bg-black/40 relative group/carousel">
          <FadeImage
            src={images[currentImageIndex]}
            alt=""
            containerClassName="h-full w-full cursor-zoom-in transition-transform duration-700 hover:scale-105 active:scale-[0.96]"
            className="h-full w-full object-contain bg-black/20"
            referrerPolicy="no-referrer"
            onClick={() => setIsImageExpanded(true)}
          />
          
          {images.length > 1 && (
            <>
              <button 
                onClick={prevImage}
                aria-label="Previous image"
                className="absolute left-4 top-1/2 -translate-y-1/2 p-4 rounded-full bg-black/40 backdrop-blur-md text-white opacity-0 group-hover/carousel:opacity-100 transition-[transform,background-color,border-color,color,opacity,box-shadow] hover:bg-black/60 hover:scale-110 active:scale-[0.96] shadow-[0_4px_16px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:opacity-100"
              >
                <ChevronLeft size={24} aria-hidden="true" />
              </button>
              <button 
                onClick={nextImage}
                aria-label="Next image"
                className="absolute right-4 top-1/2 -translate-y-1/2 p-4 rounded-full bg-black/40 backdrop-blur-md text-white opacity-0 group-hover/carousel:opacity-100 transition-[transform,background-color,border-color,color,opacity,box-shadow] hover:bg-black/60 hover:scale-110 active:scale-[0.96] shadow-[0_4px_16px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:opacity-100"
              >
                <ChevronRight size={24} aria-hidden="true" />
              </button>
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2" role="tablist" aria-label="Image gallery">
                {images.map((_, idx) => (
                  <button 
                    key={idx} 
                    role="tab"
                    aria-selected={idx === currentImageIndex}
                    aria-label={`View image ${idx + 1}`}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`h-2 rounded-full transition-[transform,background-color,border-color,color,opacity,box-shadow] focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black ${idx === currentImageIndex ? 'w-8 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'w-2 bg-white/40 hover:bg-white/80'}`}
                  />
                ))}
              </div>
            </>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-80 pointer-events-none" aria-hidden="true" />
        </div>

        <AnimatePresence>
          {isImageExpanded && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 ">
              <button 
                className="absolute top-6 right-6 p-4 rounded-full bg-white/10 text-white hover:bg-white/20 transition-[transform,background-color,border-color,color,opacity,box-shadow] hover:scale-110 active:scale-[0.96] hover:rotate-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white z-50"
                onClick={() => setIsImageExpanded(false)}
                aria-label="Close image preview"
              >
                <X size={24} />
              </button>
              <div className="relative w-full h-full p-4 sm:p-12 flex items-center justify-center">
                <FadeImage
                  src={images[currentImageIndex]}
                  alt=""
                  containerClassName="w-full h-full max-w-7xl max-h-screen"
                  className="w-full h-full object-contain drop-shadow-2xl rounded-2xl"
                  referrerPolicy="no-referrer"
                />
                {images.length > 1 && (
                  <>
                    <button 
                      onClick={prevImage}
                      aria-label="Previous image"
                      className="absolute left-4 sm:left-12 top-1/2 -translate-y-1/2 p-4 sm:p-5 rounded-full bg-white/10 text-white transition-[transform,background-color,border-color,color,opacity,box-shadow] hover:bg-white/20 hover:scale-110 active:scale-[0.96]  focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <ChevronLeft size={32} />
                    </button>
                    <button 
                      onClick={nextImage}
                      aria-label="Next image"
                      className="absolute right-4 sm:right-12 top-1/2 -translate-y-1/2 p-4 sm:p-5 rounded-full bg-white/10 text-white transition-[transform,background-color,border-color,color,opacity,box-shadow] hover:bg-white/20 hover:scale-110 active:scale-[0.96]  focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <ChevronRight size={32} />
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </AnimatePresence>

        <div className="p-8 sm:p-12">
          <div className="mb-8 flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-white">
                  {addon.category}
                </span>
                {addon.status === 'pending' && (
                  <span className="inline-flex items-center rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-300">
                    Pending Approval
                  </span>
                )}
                {addon.status === 'rejected' && (
                  <span className="inline-flex items-center rounded-full bg-red-500/20 px-3 py-1 text-xs font-medium text-red-300">
                    Rejected
                  </span>
                )}
                <span className="text-sm text-zinc-500">
                  {formatDistanceToNow(new Date(addon.createdAt), { addSuffix: true })}
                </span>
              </div>
              <h1 className="text-5xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-400 sm:text-6xl">{addon.title}</h1>
              
              <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-zinc-400">
                <button 
                  className="flex items-center gap-3 hover:text-white transition-colors cursor-pointer group/author focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-lg pe-2"
                  onClick={handleAuthorClick}
                  aria-label={`View ${addon.authorName}'s profile`}
                >
                  <div className={`h-12 w-12 shrink-0 overflow-hidden rounded-full bg-zinc-800 shadow-[inset_0_1px_4px_rgba(0,0,0,0.5),0_2px_4px_rgba(0,0,0,0.3)] flex items-center justify-center transition-[transform,background-color,border-color,color,opacity,box-shadow] group-hover/author:border-white/30 border border-white/5 ${getBorderClass(authorBorder)}`} aria-hidden="true">
                    {authorPhoto ? (
                      <FadeImage src={authorPhoto} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-sm font-bold text-zinc-300 group-hover/author:text-white">{addon.authorName.charAt(0)}</span>
                    )}
                  </div>
                  <span className="font-bold text-sm text-zinc-300 group-hover/author:text-white transition-colors tracking-wide">{addon.authorName}</span>
                </button>
                {addon.averageRating !== undefined && (
                  <div className="flex items-center gap-1.5 text-zinc-200 bg-zinc-800/80 px-3 py-1.5 rounded-full border border-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.3)]" aria-label={`Rating: ${addon.averageRating.toFixed(1)} out of 5 stars, from ${addon.ratingCount} reviews`}>
                    <Star size={14} className="fill-amber-400 text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.6)]" aria-hidden="true" />
                    <span className="font-bold text-sm text-zinc-200">{addon.averageRating.toFixed(1)}</span>
                    <span className="text-zinc-500 font-medium text-xs">({addon.ratingCount})</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 bg-zinc-800 px-3 py-1.5 rounded-full shadow-[inset_0_1px_4px_rgba(0,0,0,0.4)]" aria-label={`${addon.downloadsCount || 0} Downloads`}>
                  <ArrowDownToLine size={14} aria-hidden="true" />
                  <span>{addon.downloadsCount || 0} Downloads</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="flex items-center gap-2 rounded-full border border-transparent bg-zinc-900 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] px-4 py-3 text-sm font-bold text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                aria-label="Report Add-on"
                title="Report Add-on"
              >
                <AlertTriangle size={18} aria-hidden="true" />
              </button>
              <button
                onClick={handleLikeClick}
                aria-label={isLiked ? "Unlike addon" : "Like addon"}
                className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-colors focus:outline-none ${
                  isLiked ? 'text-rose-500 bg-rose-500/10' : 'text-zinc-400 bg-zinc-800/50 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <Heart size={18} className={isLiked ? 'fill-rose-500' : ''} aria-hidden="true" />
                <span>{addon.likesCount}</span>
              </button>
              <button
                onClick={handleDownloadClick}
                disabled={isDownloading}
                aria-label={downloadSuccess ? "Downloaded" : isDownloading ? "Downloading..." : "Download Addon"}
                className={`relative overflow-hidden flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-medium transition-colors focus:outline-none ${
                  downloadSuccess 
                    ? 'bg-emerald-500 text-black' 
                    : 'bg-white text-black hover:bg-zinc-200'
                }`}
              >
                {isDownloading && (
                  <div 
                    className="absolute inset-0 bg-black/10 transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200" 
                    style={{ width: `${downloadProgress}%` }} 
                  />
                )}
                <div className="relative z-10 flex items-center gap-2">
                  {isDownloading ? (
                    <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                  ) : downloadSuccess ? (
                    <Check size={18} aria-hidden="true" strokeWidth={2} />
                  ) : (
                    <Download size={18} aria-hidden="true" strokeWidth={2} />
                  )}
                  <span>{isDownloading ? `${downloadProgress}%` : downloadSuccess ? 'Downloaded!' : 'Download'}</span>
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 prose prose-invert max-w-none">
              <h3 className="text-2xl font-bold text-white mb-6 tracking-wide">Description</h3>
              <p className="whitespace-pre-wrap text-zinc-400 leading-relaxed font-medium">{addon.description}</p>
            </div>

            <div className="space-y-8">
              {addon.demoUrl && (
                <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] rounded-3xl p-8 ">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                    <ExternalLink size={18} className="text-white" strokeWidth={2} />
                    Demo / Preview
                  </h3>
                  <a 
                    href={addon.demoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-bold text-white bg-white/10 hover:bg-white/20 transition-[transform,background-color,border-color,color,opacity,box-shadow] px-4 py-2 rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
                  >
                    View Demo
                    <ExternalLink size={14} />
                  </a>
                </div>
              )}

              {(addon.versionHistory || addon.compatibilityNotes || addon.changelog) && (
                <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                    <Info size={18} className="text-zinc-400" />
                    Add-on Info
                  </h3>
                  <div className="space-y-6">
                    {addon.versionHistory && (
                      <div>
                        <h4 className="text-xs font-extrabold text-zinc-500 uppercase tracking-widest mb-2">Version History</h4>
                        <p className="text-sm text-zinc-300 font-medium">{addon.versionHistory}</p>
                      </div>
                    )}
                    {addon.compatibilityNotes && (
                      <div>
                        <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Compatibility</h4>
                        <p className="text-sm text-zinc-300">{addon.compatibilityNotes}</p>
                      </div>
                    )}
                    {addon.changelog && (
                      <div>
                        <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Changelog</h4>
                        <p className="text-sm text-zinc-300 whitespace-pre-wrap">{addon.changelog}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {addon.tags && addon.tags.length > 0 && (
                <div>
                  <h3 className="text-xs font-extrabold text-zinc-500 uppercase tracking-widest mb-4">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {addon.tags.map(tag => (
                      <span key={tag} className="inline-flex items-center rounded-full bg-zinc-900 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] border border-transparent px-4 py-2 text-xs font-bold text-zinc-400">
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
      <div className="mt-20">
        <h2 className="text-4xl font-extrabold tracking-tighter text-white mb-10 flex items-center gap-4">
          <MessageSquare className="text-white" size={32} strokeWidth={2} /> Reviews
        </h2>

        {/* Add Review Form */}
        <div className="mb-12 rounded-[2.5rem] border border-white/5 bg-zinc-900/40 backdrop-blur-3xl shadow-[0_16px_48px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] p-8 sm:p-12 ">
          <h3 className="text-2xl font-bold text-white mb-8 tracking-wide">Write a Review</h3>
          <form onSubmit={handleSubmitReview}>
            <div className="mb-6">
              <label className="block text-sm font-extrabold text-zinc-500 uppercase tracking-widest mb-4">Rating</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewReviewRating(star)}
                    className="p-1 focus:outline-none transition-transform hover:scale-110 active:scale-[0.96]"
                  >
                    <Star
                      size={28}
                      className={star <= newReviewRating ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'text-zinc-800'}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Review</label>
              <textarea
                required
                rows={4}
                value={newReviewText}
                onChange={(e) => setNewReviewText(e.target.value)}
                className="block w-full rounded-2xl border border-transparent bg-zinc-950/80 shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)] px-6 py-5 text-white placeholder-zinc-600 focus:border-white/20 focus:bg-zinc-900 focus:outline-none transition-[transform,background-color,border-color,color,opacity,box-shadow] resize-none font-medium"
                placeholder="What do you think about this add-on?"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submittingReview || !newReviewText.trim()}
                className="rounded-full bg-white px-10 py-4 text-sm font-extrabold text-black hover:bg-zinc-200 disabled:opacity-50 transition-[transform,background-color,border-color,color,opacity,box-shadow] hover:scale-105 active:scale-[0.96] hover:shadow-[0_4px_16px_rgba(255,255,255,0.2)] active:scale-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
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
                staggerChildren: 0.1
              }
            }
          }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {reviews.length === 0 ? (
            <div className="md:col-span-2 rounded-[2.5rem] border border-white/5 bg-zinc-900/40 backdrop-blur-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] py-20 text-center ">
              <MessageSquare size={32} className="mx-auto mb-6 text-zinc-600" />
              <p className="text-zinc-400 font-bold tracking-wide text-lg">No reviews yet. Be the first to review!</p>
            </div>
          ) : (
            reviews.map((review) => {
              const hash = review.userName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
              const colors = [
                'bg-zinc-800 text-white',
                'bg-zinc-100 text-black',
              ];
              const authorColor = colors[hash % colors.length];
              
              return (
                <motion.div 
                  key={review.id} 
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  className="group rounded-[2.5rem] border border-white/5 bg-zinc-900/60 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] p-8 transition-[transform,background-color,border-color,color,opacity,box-shadow] hover:bg-zinc-800 flex flex-col h-full"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${authorColor} font-extrabold shadow-[inset_0_1px_4px_rgba(0,0,0,0.2),0_2px_4px_rgba(0,0,0,0.3)] transition-[transform,background-color,border-color,color,opacity,box-shadow]`}>
                        {review.userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-lg font-bold text-white tracking-tight">{review.userName}</p>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 mt-1">{formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mb-6 flex items-center gap-1.5 bg-zinc-950/50 w-fit px-3 py-1.5 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={14} className={i < review.rating ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.6)]' : 'text-zinc-800'} />
                    ))}
                  </div>
                  <p className="text-zinc-300 whitespace-pre-wrap leading-relaxed font-medium text-sm flex-grow">{review.text}</p>
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
