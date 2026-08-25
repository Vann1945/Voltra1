'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { RotateCcw } from '@/components/icons/animated';
import { getButtonClasses } from '@/lib/designSystem';

interface ResetModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ResetModal({ isOpen, onConfirm, onCancel }: ResetModalProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Lock background scroll while the modal is open. Without this, touch
    // or wheel input can still scroll the page behind the overlay even
    // though it's visually covered — the modal should fully own input
    // while it's the active surface.
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    // Focus the safe (Cancel) action, not the destructive one. Auto-focusing
    // "Yes, Reset" would mean a stray Enter keypress — key-repeat, or a
    // reflexive second press left over from the click that opened this
    // modal — permanently wipes the user's data with no further
    // confirmation. Focusing Cancel means an accidental keypress is safe by
    // default; reaching the destructive action always requires a
    // deliberate Tab or click.
    cancelButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
        return;
      }

      // Trap focus inside the dialog: without this, Tab can move keyboard
      // focus to elements behind the overlay that are visually hidden but
      // still present in the DOM, letting a keyboard user "tab into"
      // content they can't see — the standard WAI-ARIA dialog pattern
      // requires focus stay within the modal while it's open.
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [isOpen, onCancel]);

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-ink-900/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-modal-title"
          onClick={onCancel}
        >
          <m.div
            ref={dialogRef}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="bg-linen-50 rounded-3xl p-10 max-w-sm w-full shadow-2xl flex flex-col items-center text-center border border-linen-200 neumorph glass"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-linen-200 text-ink-900 rounded-full flex items-center justify-center mb-6">
              <RotateCcw className="w-5 h-5" aria-hidden="true" />
            </div>
            <h2 id="reset-modal-title" className="text-xl font-serif mb-3 text-ink-900 tracking-tight">
              Begin Anew?
            </h2>
            <p className="text-sm text-ink-500 mb-8 leading-relaxed font-medium">
              Your streak will return to zero and all historical data will be cleared permanently.
            </p>
            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={onConfirm}
                className={`w-full ${getButtonClasses('danger', 'md')}`}
              >
                Yes, Reset
              </button>
              <button
                ref={cancelButtonRef}
                onClick={onCancel}
                className={`w-full ${getButtonClasses('ghost', 'md')}`}
              >
                Cancel
              </button>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
