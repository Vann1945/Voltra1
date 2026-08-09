import React from 'react';
import { X } from 'lucide-react';
import { AuthCard } from './AuthCard';
import { motion, AnimatePresence } from 'motion/react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-ink/70"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative"
          >
            <button
              onClick={onClose}
              className="absolute -top-12 right-0 p-2 bg-accent rounded-lg shadow-card text-ink transition-all hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-px"
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
