'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAddons } from '@/hooks/useAddons';
import type { Addon } from '@/types';

export type Theme = 'light' | 'dark' | 'oled';
export type LayoutMode = 'grid' | 'list';

interface AppShellContextValue {
  // data addons (dulu di-fetch di dalam AppShell App.tsx, sekarang dipindah ke sini
  // supaya tidak refetch tiap pindah halaman App Router)
  addons: Addon[];
  loading: boolean;
  userLikes: Set<string>;
  userBookmarks: Set<string>;
  toggleLike: (addonId: string, isLiked: boolean) => Promise<void>;
  toggleBookmark: (addonId: string, isBookmarked: boolean) => Promise<void>;
  removeAddon: (addonId: string) => void;
  refetchAddons: () => Promise<void>;
  createAddon: (input: any) => Promise<string>;

  // theme & layout
  theme: Theme;
  isDarkMode: boolean;
  queueThemeChange: (next: Theme) => void;
  cycleTheme: () => void;
  layoutMode: LayoutMode;
  setLayoutMode: (mode: LayoutMode) => void;
  bookmarksLayoutMode: LayoutMode;
  setBookmarksLayoutMode: (mode: LayoutMode) => void;
  profileLayoutMode: LayoutMode;
  setProfileLayoutMode: (mode: LayoutMode) => void;

  // modal global (Upload & Auth) — dulu useState lokal di AppShell
  isUploadOpen: boolean;
  openUpload: () => void;
  closeUpload: () => void;
  isAuthOpen: boolean;
  openAuth: () => void;
  closeAuth: () => void;
}

const AppShellContext = createContext<AppShellContextValue | undefined>(undefined);

export function AppShellProvider({ children }: { children: React.ReactNode }) {
  const { addons, loading, userLikes, userBookmarks, toggleLike, toggleBookmark, removeAddon, refetchAddons, createAddon } = useAddons();

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light';
    const t = window.localStorage.getItem('voltra-theme');
    return t === 'dark' || t === 'oled' ? (t as Theme) : 'light';
  });
  const [layoutMode, setLayoutModeState] = useState<LayoutMode>(() => {
    if (typeof window === 'undefined') return 'grid';
    const v = window.localStorage.getItem('voltra-layout');
    return v === 'list' ? 'list' : 'grid';
  });
  const [bookmarksLayoutMode, setBookmarksLayoutModeState] = useState<LayoutMode>(() => {
    if (typeof window === 'undefined') return 'grid';
    const v = window.localStorage.getItem('voltra-layout-bookmarks');
    return v === 'list' ? 'list' : 'grid';
  });
  const [profileLayoutMode, setProfileLayoutModeState] = useState<LayoutMode>(() => {
    if (typeof window === 'undefined') return 'grid';
    const v = window.localStorage.getItem('voltra-layout-profile');
    return v === 'list' ? 'list' : 'grid';
  });

  const themeRef = useRef(theme);
  const queuedThemeRef = useRef<Theme | null>(null);
  const themeFrameRef = useRef<number | null>(null);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    return () => {
      if (themeFrameRef.current !== null) window.cancelAnimationFrame(themeFrameRef.current);
    };
  }, []);

  const queueThemeChange = (nextTheme: Theme) => {
    queuedThemeRef.current = nextTheme;
    if (themeFrameRef.current !== null || typeof window === 'undefined') return;
    themeFrameRef.current = window.requestAnimationFrame(() => {
      themeFrameRef.current = null;
      const next = queuedThemeRef.current;
      queuedThemeRef.current = null;
      if (!next || next === themeRef.current) return;
      themeRef.current = next;
      setTheme(next);
    });
  };

  const cycleTheme = () => {
    const current = queuedThemeRef.current ?? themeRef.current;
    queueThemeChange(current === 'light' ? 'dark' : current === 'dark' ? 'oled' : 'light');
  };

  useEffect(() => {
    window.localStorage.setItem('voltra-theme', theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem('voltra-layout', layoutMode);
  }, [layoutMode]);

  useEffect(() => {
    window.localStorage.setItem('voltra-layout-bookmarks', bookmarksLayoutMode);
  }, [bookmarksLayoutMode]);

  useEffect(() => {
    window.localStorage.setItem('voltra-layout-profile', profileLayoutMode);
  }, [profileLayoutMode]);

  const isDarkMode = theme === 'dark' || theme === 'oled';

  const value: AppShellContextValue = {
    addons,
    loading,
    userLikes,
    userBookmarks,
    toggleLike,
    toggleBookmark,
    removeAddon,
    refetchAddons,
    createAddon,
    theme,
    isDarkMode,
    queueThemeChange,
    cycleTheme,
    layoutMode,
    setLayoutMode: setLayoutModeState,
    bookmarksLayoutMode,
    setBookmarksLayoutMode: setBookmarksLayoutModeState,
    profileLayoutMode,
    setProfileLayoutMode: setProfileLayoutModeState,
    isUploadOpen,
    openUpload: () => setIsUploadOpen(true),
    closeUpload: () => setIsUploadOpen(false),
    isAuthOpen,
    openAuth: () => setIsAuthOpen(true),
    closeAuth: () => setIsAuthOpen(false),
  };

  return (
    <AppShellContext.Provider value={value}>
      {children}
    </AppShellContext.Provider>
  );
}

export function useAppShell() {
  const ctx = useContext(AppShellContext);
  if (!ctx) throw new Error('useAppShell must be used within AppShellProvider');
  return ctx;
}
