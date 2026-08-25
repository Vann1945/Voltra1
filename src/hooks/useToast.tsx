'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

export type ToastType = 'success' | 'error';

export interface ToastState {
  id: number;
  message: string;
  type: ToastType;
}

export const TOAST_DURATION_MS: Record<ToastType, number> = { success: 3000, error: 4000 };

interface ToastContextValue {
  toast: ToastState | null;
  showToast: (message: string, type?: ToastType) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextIdRef = useRef(0);

  const clearToastTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const hideToast = useCallback(() => {
    clearToastTimer();
    setToast(null);
  }, [clearToastTimer]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    clearToastTimer();
    const id = ++nextIdRef.current;
    setToast({ id, message, type });
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setToast(current => current?.id === id ? null : current);
    }, TOAST_DURATION_MS[type]);
  }, [clearToastTimer]);

  useEffect(() => clearToastTimer, [clearToastTimer]);

  return (
    <ToastContext.Provider value={{ toast, showToast, hideToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
