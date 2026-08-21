import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TOAST_DURATION_MS } from '../hooks/useToast';

export interface ToastState {
  message: string;
  type: 'success' | 'error';
}

interface ToastProps {
  toast: ToastState | null;
  onClose: () => void;
}

export function Toast({ toast, onClose }: ToastProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!toast) { setProgress(100); return; }
    const total = TOAST_DURATION_MS[toast.type];
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / total) * 100);
      setProgress(remaining);
      if (remaining > 0) raf = requestAnimationFrame(tick);
    };
    let raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [toast]);

  const isSuccess = toast?.type === 'success';

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.message + toast.type}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-6 left-1/2 z-[500] -translate-x-1/2 w-[calc(100%-2rem)] max-w-[360px]"
        >
          <div className="relative overflow-hidden border border-parchment-border rounded-lg bg-parchment-raised shadow-[0_6px_20px_rgba(0,0,0,0.1)]">
            <div
              className={`absolute left-0 top-0 bottom-0 w-1 ${
                isSuccess ? 'bg-success' : 'bg-danger'
              }`}
            />

            <div className="flex items-start gap-3 px-4 pl-5 py-4">
              <div
                className={`shrink-0 mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg ${
                  isSuccess ? 'text-success' : 'text-danger'
                }`}
              >
                {isSuccess
                  ? <CheckCircle2 size={20} strokeWidth={2} />
                  : <XCircle size={20} strokeWidth={2} />
                }
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className={`text-xs font-medium uppercase tracking-widest mb-0.5 ${
                    isSuccess ? 'text-success' : 'text-danger'
                  }`}
                >
                  {isSuccess ? 'Success' : 'Error'}
                </p>
                <p className="text-sm text-ink-900 leading-snug">
                  {toast.message}
                </p>
              </div>

              <button
                onClick={onClose}
                className="shrink-0 mt-0.5 p-1.5 rounded-lg text-ink-900/50 transition-colors hover:text-ink-900"
              >
                <X size={14} strokeWidth={2} />
              </button>
            </div>

            <div className="h-0.5 w-full bg-ink-900/[0.06]">
              <motion.div
                className={`h-full ${isSuccess ? 'bg-success' : 'bg-danger'}`}
                style={{ width: `${progress}%` }}
                transition={{ ease: 'linear' }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
