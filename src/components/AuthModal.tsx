import React from 'react';
import { X } from 'lucide-react';
import { AuthCard } from './AuthCard';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const reduceMotion = useReducedMotion();
  useBodyScrollLock(isOpen);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center overflow-y-auto p-4">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-ink-900/70"
          />

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, scale: 0.95, y: 20 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.2 }}
            role="dialog"
            aria-modal="true"
            aria-label="Sign in to Voltra"
            className="relative"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close sign-in dialog"
              className="absolute -top-12 right-0 p-2 bg-terracotta rounded-lg shadow-card text-ink-900 btn-3d focus-visible:ring-2 focus-visible:ring-white"
            >
              <X size={20} />
            </button>
            <AuthCard onSuccess={onClose} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
