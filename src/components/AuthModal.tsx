'use client';

import React, { useEffect, useRef } from 'react';
import { X } from '@/components/icons/animated';
import { AuthCard } from './AuthCard';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const reduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusFrame = window.requestAnimationFrame(() => {
      const initialTarget = dialogRef.current?.querySelector<HTMLElement>('[data-auth-initial-focus]');
      (initialTarget || dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR))?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center overflow-y-auto p-4 sm:p-8">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
            className="absolute inset-0 bg-ink-900/70 backdrop-blur-[2px]"
          />

          <motion.div
            ref={dialogRef}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.97, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, scale: 0.97, y: 16 }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 32 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-dialog-title"
            aria-describedby="auth-dialog-description"
            className="relative w-full max-w-[440px]"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close sign-in dialog"
              className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-xl border border-parchment-border bg-parchment-raised/95 text-ink-900/65 shadow-sm transition-[background-color,color,transform] duration-200 hover:bg-parchment hover:text-ink-900 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2"
            >
              <X size={18} />
            </button>
            <AuthCard onSuccess={onClose} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
