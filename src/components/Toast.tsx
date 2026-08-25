'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, X } from '@/components/icons/animated';
import { TOAST_DURATION_MS, ToastState } from '@/hooks/useToast';

interface ToastProps {
  toast: ToastState | null;
  onClose: () => void;
}

export function Toast({ toast, onClose }: ToastProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!toast) {
      setProgress(100);
      return;
    }

    const total = TOAST_DURATION_MS[toast.type];
    const startedAt = Date.now();
    let frame: number | null = null;

    const tick = () => {
      const elapsed = Date.now() - startedAt;
      setProgress(Math.max(0, 100 - (elapsed / total) * 100));
      if (elapsed < total) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [toast?.id, toast?.type]);

  const isSuccess = toast?.type === 'success';

  return (
    <>
      {toast && (
        <div
          key={toast.id}
          role={isSuccess ? 'status' : 'alert'}
          aria-live={isSuccess ? 'polite' : 'assertive'}
          className="toast-position fixed z-[500]"
        >
          <div className="toast-enter relative w-full overflow-hidden rounded-xl border border-parchment-border bg-parchment-raised shadow-[0_6px_20px_rgba(0,0,0,0.1)]">
            <div className={`absolute bottom-0 left-0 top-0 w-1 ${isSuccess ? 'bg-success' : 'bg-danger'}`} />

            <div className="flex items-start gap-3 px-4 py-4 pl-5">
              <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isSuccess ? 'text-success' : 'text-danger'}`}>
                {isSuccess
                  ? <CheckCircle2 size={20} strokeWidth={2} aria-hidden="true" />
                  : <XCircle size={20} strokeWidth={2} aria-hidden="true" />
                }
              </div>

              <div className="min-w-0 flex-1">
                <p className={`mb-0.5 text-xs font-bold uppercase tracking-widest ${isSuccess ? 'text-success' : 'text-danger'}`}>
                  {isSuccess ? 'Success' : 'Error'}
                </p>
                <p className="break-words text-sm leading-snug text-ink-900">{toast.message}</p>
              </div>

              <button
                type="button"
                aria-label="Close notification"
                onClick={onClose}
                className="mt-0.5 shrink-0 rounded-lg p-1.5 text-ink-900/50 transition-[color,background-color,transform] duration-150 hover:bg-ink-900/[0.05] hover:text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta active:scale-[0.96]"
              >
                <X size={14} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>

            <div className="h-1 w-full bg-ink-900/[0.06]" aria-hidden="true">
              <div
                className={`h-full transition-[width] duration-100 ${isSuccess ? 'bg-success' : 'bg-danger'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
