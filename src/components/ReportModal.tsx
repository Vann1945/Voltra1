import React, { useState, useRef, useEffect } from 'react';
import { X, AlertTriangle, ChevronDown, Check } from 'lucide-react';
import { Skeleton } from './Skeleton';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { motion, AnimatePresence } from 'motion/react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  addonId: string;
}

const REPORT_REASONS = [
  'Inappropriate Content',
  'Spam or Misleading',
  'Copyright Violation',
  'Malware or Virus',
  'Other',
];

export function ReportModal({ isOpen, onClose, addonId }: ReportModalProps) {
  useBodyScrollLock(isOpen);
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [otherReason, setOtherReason] = useState('');
  const [isReasonOpen, setIsReasonOpen] = useState(false);
  const reasonDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (reasonDropdownRef.current && !reasonDropdownRef.current.contains(e.target as Node)) setIsReasonOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('You need to sign in to report an add-on.', 'error');
      return;
    }
    setLoading(true);
    try {
      const finalReason = reason === 'Other' ? otherReason : reason;
      const res = await fetch('/api/reports', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addonId, reason: finalReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to submit report.');
      showToast('Report submitted. Thank you.', 'success');
      setReason(REPORT_REASONS[0]);
      setOtherReason('');
      onClose();
    } catch (error: any) {
      showToast(error?.message || 'Failed to submit report. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-ink-900/70"
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-parchment-raised rounded-lg shadow-card neumorph glass"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-danger/20 px-7 py-5 bg-danger/[0.06]">
              <h2 className="text-lg font-bold text-ink-900 flex items-center gap-2">
                <AlertTriangle size={20} className="text-danger" />
                Report Add-on
              </h2>
              <button
                onClick={onClose}
 className="p-1.5 rounded-lg bg-parchment-raised text-ink-900 shadow-card btn-3d"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-7">
              <div className="space-y-5">
                {/* Reason dropdown */}
                <div ref={reasonDropdownRef}>
                  <label className="block text-xs font-bold text-ink-900 uppercase tracking-widest mb-2">
                    Reason
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsReasonOpen(prev => !prev)}
 className="flex w-full items-center justify-between rounded-lg bg-parchment-raised px-5 py-3.5 text-sm font-bold text-ink-900 shadow-card btn-3d focus:outline-none"
                    >
                      <span>{reason}</span>
                      <ChevronDown size={15} className={`transition-transform duration-200 ${isReasonOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {isReasonOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.12 }}
 className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg bg-parchment-raised shadow-card neumorph glass"
                        >
                          {REPORT_REASONS.map(r => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => { setReason(r); setIsReasonOpen(false); }}
                              className={`flex w-full items-center justify-between px-5 py-3 text-left text-sm font-bold border-b border-parchment-border last:border-b-0 transition-colors ${
                                r === reason ? 'bg-terracotta text-ink-900' : 'text-ink-900 hover:bg-terracotta/50'
                              }`}
                            >
                              {r}
                              {r === reason && <Check size={13} />}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Other reason textarea */}
                {reason === 'Other' && (
                  <div>
                    <label className="block text-xs font-bold text-ink-900 uppercase tracking-widest mb-2">
                      Please specify
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={otherReason}
                      onChange={e => setOtherReason(e.target.value)}
                      className="block w-full border border-parchment-border rounded-lg bg-parchment-raised px-4 py-3 text-sm font-medium text-ink-900 placeholder-ink-900/40 focus:outline-none focus:shadow-[0_2px_12px_rgba(217,119,87,0.15)] transition-all resize-none"
                      placeholder="Provide more details..."
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-7 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
 className="px-5 py-3 text-sm font-bold text-ink-900 rounded-lg bg-parchment-raised shadow-card uppercase btn-3d"
                >
                  Cancel
                </button>
                {loading ? (
                  <div className="px-7 py-3">
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={loading || (reason === 'Other' && !otherReason.trim())}
                    className="flex items-center gap-2 px-7 py-3 text-sm font-bold text-ink-900 bg-terracotta rounded-lg shadow-card uppercase btn-3d disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit Report
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
