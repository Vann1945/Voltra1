import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { BorderEffectStyles } from './components/borderEffects';
import { Marketplace } from './components/Marketplace';
import { Toast } from './components/Toast';
import { Skeleton, SkeletonCard } from './components/Skeleton';
import { useAddons } from './hooks/useAddons';
import { ToastProvider, useToast } from './hooks/useToast';


const UserProfile = lazy(() => import('./components/UserProfile').then(m => ({ default: m.UserProfile })));
const UploadModal = lazy(() => import('./components/UploadModal').then(m => ({ default: m.UploadModal })));
const AuthModal = lazy(() => import('./components/AuthModal').then(m => ({ default: m.AuthModal })));
const AddonDetail = lazy(() => import('./components/AddonDetail').then(m => ({ default: m.AddonDetail })));
const AuthorProfile = lazy(() => import('./components/AuthorProfile').then(m => ({ default: m.AuthorProfile })));
const AdminPanel = lazy(() => import('./components/AdminPanel').then(m => ({ default: m.AdminPanel })));
const LandingPage = lazy(() => import('./components/LandingPage').then(m => ({ default: m.LandingPage })));
const ResetPasswordPage = lazy(() => import('./components/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const StreakApp = lazy(() => import('./StreakApp').then(m => ({ default: m.default })));
const BookmarksPage = lazy(() => import('./components/BookmarksPage').then(m => ({ default: m.BookmarksPage })));

export type ViewState =
  | 'landing'
  | 'streak'
  | 'home'
  | 'profile'
  | 'bookmarks'
  | 'library'
  | 'admin'
  | { type: 'addon', id: string }
  | { type: 'author', id: string }
  | { type: 'reset-password', token: string, uid: string };

export const slugify = (text: string) =>
  text.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');

export const categoryToSlug = (category?: string): string => {
  if (!category) return 'add-ons';
  const normalized = category.trim().toLowerCase().replace(/\s+/g, '-');
  if (normalized === 'add-on' || normalized === 'addon' || normalized === 'add-ons') return 'add-ons';
  if (normalized === 'resource-pack' || normalized === 'resource-packs' || normalized === 'texture-pack' || normalized === 'texture-packs') return 'texture-pack';
  return slugify(category) || 'add-ons';
};

const RESERVED_TOP_SEGMENTS = new Set([
  'home', 'landing', 'streak', 'profile', 'bookmarks', 'library', 'admin', 'reset-password', 'author',
]);

function normalizeAppPath(pathname: string): string {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  if (normalized === '/voltra') return '/';
  if (normalized.startsWith('/voltra/')) return normalized.slice('/voltra'.length) || '/';
  return normalized;
}

function getInitialView(pathname: string, search: string): ViewState {
  const path = normalizeAppPath(pathname);
  if (path === '/' || path === '/home') return 'home';
  if (path === '/landing') return 'landing';
  if (path === '/streak') return 'streak';
  if (path === '/profile') return 'profile';
  if (path === '/bookmarks' || path === '/library') return 'library';
  if (path === '/admin') return 'admin';
  if (path === '/reset-password') {
    const params = new URLSearchParams(search);
    return { type: 'reset-password', token: params.get('token') || '', uid: params.get('uid') || '' };
  }
  if (path.startsWith('/author/')) return { type: 'author', id: decodeURIComponent(path.split('/')[2] || '') };
  return 'home';
}

const FAVICONS = {
  default: {
    light: '/favicon/icon-light.svg',
    dark: '/favicon/icon-dark.svg',
    oled: '/favicon/icon-oled.svg',
  },
  streak: {
    light: '/favicon/streak-light.svg',
    dark: '/favicon/streak-dark.svg',
    oled: '/favicon/streak-oled.svg',
  },
} as const;

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-12" aria-hidden="true">
      <Skeleton className="h-8 w-48 mb-8" />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  );
}

function AppShell() {
  const { toast, hideToast } = useToast();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>(() =>
    typeof window === 'undefined' ? 'home' : getInitialView(window.location.pathname, window.location.search)
  );
  const { addons, loading, userLikes, userBookmarks, toggleLike, toggleBookmark, removeAddon, refetchAddons } = useAddons();
  const [verifyBanner, setVerifyBanner] = useState<'success' | 'already' | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark' | 'oled'>(() => {
    if (typeof window === 'undefined') return 'light';
    const t = window.localStorage.getItem('voltra-theme');
    return (t === 'dark' || t === 'oled') ? (t as 'dark' | 'oled') : 'light';
  });
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>(() => {
    if (typeof window === 'undefined') return 'grid';
    const v = window.localStorage.getItem('voltra-layout');
    return v === 'list' ? 'list' : 'grid';
  });
  const themeRef = useRef(theme);
  const queuedThemeRef = useRef<'light' | 'dark' | 'oled' | null>(null);
  const themeFrameRef = useRef<number | null>(null);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    return () => {
      if (themeFrameRef.current !== null) window.cancelAnimationFrame(themeFrameRef.current);
    };
  }, []);

  const queueThemeChange = (nextTheme: 'light' | 'dark' | 'oled') => {
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
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }

    const set = currentView === 'streak' ? FAVICONS.streak : FAVICONS.default;
    link.type = 'image/svg+xml';
    link.href = set[theme];
  }, [currentView, theme]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verified = params.get('verified');
    if (verified === 'success' || verified === 'already') {
      setVerifyBanner(verified);
      // Bersihin query string biar kalau di-refresh nggak muncul lagi
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const path = normalizeAppPath(window.location.pathname);
      const segments = path.split('/').filter(Boolean);
      const isAddonPath = segments.length === 2 && !RESERVED_TOP_SEGMENTS.has(segments[0]);
      if (isAddonPath) {
        const slug = decodeURIComponent(segments[1]);
        const addon = addons.find(a => slugify(a.title) === slug || a.id === slug);
        if (addon) setCurrentView({ type: 'addon', id: addon.id });
        else if (!loading) setCurrentView('home');
        return;
      }
      setCurrentView(getInitialView(window.location.pathname, window.location.search));
    };

    handlePopState();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [addons, loading]);

  const handleNavigate = (view: ViewState) => {
    setCurrentView(view);
    let path = '/';
    if (view === 'home') path = '/';
    else if (view === 'landing') path = '/landing';
    else if (view === 'streak') path = '/streak';
    else if (view === 'profile') path = '/profile';
    else if (view === 'bookmarks' || view === 'library') path = '/library';
    else if (view === 'admin') path = '/admin';
    else if (typeof view === 'object' && view.type === 'addon') {
      const addon = addons.find(a => a.id === view.id);
      const prefix = categoryToSlug(addon?.category);
      path = `/${prefix}/${addon ? slugify(addon.title) : view.id}`;
    } else if (typeof view === 'object' && view.type === 'author') {
      path = `/author/${view.id}`;
    }
    window.history.pushState({}, '', path);
  };

  const getViewKey = (view: ViewState) => {
    if (typeof view === 'string') return view;
    if (view.type === 'reset-password') return 'reset-password';
    return `${view.type}-${view.id}`;
  };

  const isDarkMode = theme === 'dark' || theme === 'oled';

  return (
    <div className={`${theme === 'dark' ? 'dark' : theme === 'oled' ? 'dark oled' : ''} theme-shell relative isolate min-h-[100dvh] bg-parchment text-ink-900 selection:bg-terracotta selection:text-ink-900`}>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <BorderEffectStyles />
      {currentView !== 'landing' && (
        <Navbar
          onOpenUpload={() => setIsUploadOpen(true)}
          onOpenAuth={() => setIsAuthOpen(true)}
          onNavigate={handleNavigate}
          currentView={currentView}
          theme={theme}
          onToggleTheme={cycleTheme}
          onSetTheme={queueThemeChange}
          layoutMode={layoutMode}
          onSetLayoutMode={(m) => setLayoutMode(m)}
        />
      )}

      {verifyBanner && (
        <div className="max-w-3xl mx-auto mt-4 px-4">
          <div role="status" aria-live="polite" className="p-4 bg-success/[0.06] border border-success/20 rounded-2xl flex items-start gap-3 shadow-card">
            <CheckCircle2 className="text-success shrink-0 mt-0.5" size={18} />
            <p className="text-sm font-medium text-ink-900 flex-1">
              {verifyBanner === 'success'
                ? 'Email verified! You can now sign in.'
                : 'This email was already verified.'}
            </p>
            <button
              type="button"
              onClick={() => setVerifyBanner(null)}
              className="text-ink-900/50 hover:text-ink-900 transition-colors focus-visible:ring-2 focus-visible:ring-terracotta"

              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <main id="main-content" tabIndex={-1} className="relative outline-none">
                  <div key={getViewKey(currentView)} className="w-full route-content-enter">
            <Suspense fallback={<PageSkeleton />}>
              {currentView === 'landing' ? (
                <LandingPage onNavigate={handleNavigate} />
              ) : currentView === 'streak' ? (
                <StreakApp theme={theme} onNavigate={handleNavigate} />
              ) : currentView === 'home' ? (
                <Marketplace
                  addons={addons}
                  loading={loading}
                  userLikes={userLikes}
                  onToggleLike={toggleLike}
                  onRequireAuth={() => setIsAuthOpen(true)}
                  onNavigate={handleNavigate}
                  layoutMode={layoutMode}
                  userBookmarks={userBookmarks}
                  onToggleBookmark={toggleBookmark}
                />

              ) : currentView === 'profile' ? (
                <UserProfile
                  addons={addons}
                  loading={loading}
                  userLikes={userLikes}
                  userBookmarks={userBookmarks}
                  onToggleLike={toggleLike}
                  onToggleBookmark={toggleBookmark}
                  onNavigate={handleNavigate}
                  onAddonDeleted={removeAddon}
                />
              ) : currentView === 'library' || currentView === 'bookmarks' ? (
                <BookmarksPage
                  addons={addons}
                  userLikes={userLikes}
                  userBookmarks={userBookmarks}
                  onToggleLike={toggleLike}
                  onToggleBookmark={toggleBookmark}
                  onRequireAuth={() => setIsAuthOpen(true)}
                  onNavigate={handleNavigate}
                />
              ) : currentView === 'admin' ? (
                <AdminPanel
                  addons={addons}
                  loading={loading}
                  onNavigate={handleNavigate}
                  onAddonsChanged={refetchAddons}
                />
              ) : typeof currentView === 'object' && currentView.type === 'author' ? (
                <AuthorProfile
                  authorId={currentView.id}
                  addons={addons}
                  loading={loading}
                  userLikes={userLikes}
                  userBookmarks={userBookmarks}
                  onToggleLike={toggleLike}
                  onToggleBookmark={toggleBookmark}
                  onRequireAuth={() => setIsAuthOpen(true)}
                  onNavigate={handleNavigate}
                />
              ) : typeof currentView === 'object' && currentView.type === 'addon' ? (
                <AddonDetail
                  addonId={currentView.id}
                  addons={addons}
                  loading={loading}
                  userLikes={userLikes}
                  userBookmarks={userBookmarks}
                  onToggleLike={toggleLike}
                  onToggleBookmark={toggleBookmark}
                  onRequireAuth={() => setIsAuthOpen(true)}
                  onNavigate={handleNavigate}
                  isDarkMode={isDarkMode}
                />
              ) : typeof currentView === 'object' && currentView.type === 'reset-password' ? (
                <ResetPasswordPage
                  token={currentView.token}
                  uid={currentView.uid}
                  onNavigate={handleNavigate}
                />
              ) : null}
            </Suspense>
        </div>
      </main>

      <Suspense fallback={null}>
        {isUploadOpen && (
          <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
        )}
        {isAuthOpen && (
          <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
        )}
      </Suspense>

      <Toast toast={toast} onClose={hideToast} />
    </div>
  );
}
