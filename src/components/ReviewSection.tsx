import React, { useState } from 'react';
import { Star, MessageSquare } from 'lucide-react';
import { Review } from '../types';
import { ProfileAvatar } from './borderEffects';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { getButtonClasses, getInputClasses } from '../lib/designSystem';

interface ReviewSectionProps {
  addonId: string;
  reviews: Review[];
  onReviewSubmitted: (review: Review) => void;
  onRequireAuth: () => void;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function StarRow({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size} className={i <= Math.round(value) ? 'fill-terracotta text-terracotta' : 'fill-none text-ink-900/20'} />
      ))}
    </div>
  );
}

export function ReviewSection({ addonId, reviews, onReviewSubmitted, onRequireAuth }: ReviewSectionProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const existingReview = user ? reviews.find(r => r.userId === user.uid) : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }
    if (rating < 1) {
      showToast('Please choose a star rating first.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addonId, rating, comment: comment.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to submit review.');

      onReviewSubmitted({
        id: data.id,
        addonId,
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        userPhoto: user.photoURL ?? null,
        rating,
        comment: comment.trim() || null,
        createdAt: new Date().toISOString(),
      });
      setRating(0);
      setComment('');
      showToast('Thanks for your review!', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to submit review.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border-t border-parchment-border pt-8 mt-8">
      <h2 className="text-lg font-bold text-ink-900 uppercase mb-4 flex items-center gap-2">
        <MessageSquare size={18} /> Reviews {reviews.length > 0 && <span className="text-ink-900/40 font-normal normal-case">({reviews.length})</span>}
      </h2>

      {!existingReview && (
        <form onSubmit={handleSubmit} className="bg-parchment-raised rounded-lg shadow-card neumorph p-5 mb-6 glass">
          <p className="text-xs font-bold text-ink-900 uppercase mb-2">Leave a review</p>
          <div
            className="flex items-center gap-1 mb-3"
            onMouseLeave={() => setHoverRating(0)}
          >
            {[1, 2, 3, 4, 5].map(i => (
              <button
                key={i}
                type="button"
                onClick={() => setRating(i)}
                onMouseEnter={() => setHoverRating(i)}
                aria-label={`Rate ${i} out of 5 stars`}
                className="p-0.5"
              >
                <Star
                  size={22}
                  className={i <= (hoverRating || rating) ? 'fill-terracotta text-terracotta' : 'fill-none text-ink-900/20'}
                />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            maxLength={1000}
            placeholder="Share what you liked or what could be better (optional)"
            rows={3}
            className={`${getInputClasses()} resize-none`}
          />
          <div className="flex justify-end mt-3">
            <button
              type="submit"
              disabled={submitting}
              className={`disabled:opacity-50 disabled:cursor-not-allowed ${getButtonClasses('primary', 'sm')}`}
            >
              {submitting ? <div className="h-3.5 w-3.5 rounded-full bg-ink-900/[0.06] border border-parchment-border relative before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-ink-900/10 before:to-transparent" /> : null}
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      )}

      {reviews.length === 0 ? (
        <p className="text-sm font-medium text-ink-900/50 bg-parchment-raised border border-parchment-border rounded-lg p-6 text-center">
          No reviews yet. Be the first to share your thoughts.
        </p>
      ) : (
        <div className="space-y-4">
          {reviews.map(review => (
            <div key={review.id} className="bg-parchment-raised rounded-lg shadow-card neumorph p-5 glass">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <ProfileAvatar photoURL={review.userPhoto ?? null} displayName={review.userName} sizeClassName="h-9 w-9" />
                  <div>
                    <p className="text-sm font-bold text-ink-900">{review.userName}</p>
                    <StarRow value={review.rating} />
                  </div>
                </div>
                <span className="text-xs font-medium text-ink-900/40 shrink-0">{timeAgo(review.createdAt)}</span>
              </div>
              {review.comment && (
                <p className="mt-3 text-sm text-ink-900/80 leading-relaxed whitespace-pre-wrap">{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
