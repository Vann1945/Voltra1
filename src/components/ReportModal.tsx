import React, { useState } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';

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
  'Other'
];

export function ReportModal({ isOpen, onClose, addonId }: ReportModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [otherReason, setOtherReason] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const reportId = crypto.randomUUID();
      const finalReason = reason === 'Other' ? otherReason : reason;

      await setDoc(doc(db, 'reports', reportId), {
        id: reportId,
        addonId,
        userId: user.uid,
        reason: finalReason,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      alert('Report submitted successfully. Thank you.');
      onClose();
      setReason(REPORT_REASONS[0]);
      setOtherReason('');
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40/80 "
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/5 px-8 py-6">
              <h2 className="text-xl font-medium text-white flex items-center gap-2">
                <AlertTriangle className="text-rose-500" size={20} />
                Report Add-on
              </h2>
              <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-3">Reason for reporting</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="block w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-white focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all appearance-none"
                  >
                    {REPORT_REASONS.map(r => (
                      <option key={r} value={r} className="bg-black/40">{r}</option>
                    ))}
                  </select>
                </div>

                {reason === 'Other' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-3">Please specify</label>
                    <textarea
                      required
                      rows={3}
                      value={otherReason}
                      onChange={(e) => setOtherReason(e.target.value)}
                      className="block w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-white placeholder-slate-600 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all resize-none"
                      placeholder="Provide more details..."
                    />
                  </div>
                )}
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full px-6 py-3 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || (reason === 'Other' && !otherReason.trim())}
                  className="flex items-center justify-center gap-2 rounded-full bg-rose-500 px-8 py-3 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  {loading ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
