import React from 'react';
import { X } from 'lucide-react';
import { AuthCard } from './AuthCard';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            className="relative"
          >
            <button 
              onClick={onClose} 
              className="absolute -top-12 right-0 rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors active:scale-[0.96]    focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50 "
            >
              <X size={24} />
            </button>
            <AuthCard onSuccess={onClose} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
