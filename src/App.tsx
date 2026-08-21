import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { BorderEffectStyles } from './components/borderEffects';
import { Marketplace } from './components/Marketplace';
import { Toast } from './components/Toast';
import { Skeleton, SkeletonCard } from './components/Skeleton';
import { useAddons } from './hooks/useAddons';
import { ToastProvider, useToast } from './hooks/useToast';
import { motion, AnimatePresence } from 'motion/react';

const UserProfile = lazy(() => import('./components/UserProfile').then(m => ({ default: m.UserProfile })));
const UploadModal = lazy(() => import('./components/UploadModal').then(m => ({ default: m.UploadModal })));
const AuthModal = lazy(() => import('./components/AuthModal').then(m => ({ default: m.AuthModal })));
const AddonDetail = lazy(() => import('./components/AddonDetail').then(m => ({ default: m.AddonDetail })));
const AuthorProfile = lazy(() => import('./components/AuthorProfile').then(m => ({ default: m.AuthorProfile })));
const AdminPanel = lazy(() => import('./components/AdminPanel').then(m => ({ default: m.AdminPanel })));
const LandingPage = lazy(() => import('./components/LandingPage').then(m => ({ default: m.LandingPage })));
const ResetPasswordPage = lazy(() => import('./components/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const StreakApp = lazy(() => import('./StreakApp').then(m => ({ default: m.default })));

export type ViewState =
  | 'landing'
  | 'streak'
  | 'home'
  | 'profile'
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
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const { addons, loading, userLikes, toggleLike, refetchAddons } = useAddons();
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
      const path = window.location.pathname;
      if (path === '/' || path === '') setCurrentView('home');
      else if (path === '/landing') setCurrentView('landing');
      else if (path === '/streak') setCurrentView('streak');
      else if (path === '/profile') setCurrentView('profile');
      else if (path === '/admin') setCurrentView('admin');
      else if (path.startsWith('/addon/')) {
        const slug = path.split('/')[2];
        const addon = addons.find(a => slugify(a.title) === slug || a.id === slug);
        if (addon) setCurrentView({ type: 'addon', id: addon.id });
        else setCurrentView('home');
      } else if (path.startsWith('/author/')) {
        const id = path.split('/')[2];
        setCurrentView({ type: 'author', id });
      } else if (path === '/reset-password') {
        const params = new URLSearchParams(window.location.search);
        setCurrentView({
          type: 'reset-password',
          token: params.get('token') || '',
          uid: params.get('uid') || '',
        });
      } else {
        setCurrentView('home');
      }
    };
    if (!loading) {
      handlePopState();
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [addons, loading]);

  const handleNavigate = (view: ViewState) => {
    setCurrentView(view);
    let path = '/';
    if (view === 'home') path = '/';
    else if (view === 'landing') path = '/landing';
    else if (view === 'streak') path = '/streak';
    else if (view === 'profile') path = '/profile';
    else if (view === 'admin') path = '/admin';
    else if (typeof view === 'object' && view.type === 'addon') {
      const addon = addons.find(a => a.id === view.id);
      path = `/addon/${addon ? slugify(addon.title) : view.id}`;
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
    <div className={`${theme === 'dark' ? 'dark' : theme === 'oled' ? 'dark oled' : ''} relative isolate min-h-[100dvh] bg-paper-soft text-ink selection:bg-accent selection:text-paper`}>
      <BorderEffectStyles />
      {currentView !== 'landing' && (
        <Navbar
          onOpenUpload={() => setIsUploadOpen(true)}
          onOpenAuth={() => setIsAuthOpen(true)}
          onNavigate={handleNavigate}
          currentView={currentView}
          theme={theme}
          onToggleTheme={() => setTheme(t => t === 'light' ? 'dark' : t === 'dark' ? 'oled' : 'light')}
          onSetTheme={(nextTheme) => setTheme(nextTheme)}
          layoutMode={layoutMode}
          onSetLayoutMode={(m) => setLayoutMode(m)}
        />
      )}

      {verifyBanner && (
        <div className="max-w-3xl mx-auto mt-4 px-4">
          <div className="p-4 bg-success/[0.06] border border-success/20 rounded-lg flex items-start gap-3">
            <CheckCircle2 className="text-success shrink-0 mt-0.5" size={18} />
            <p className="text-sm font-medium text-ink flex-1">
              {verifyBanner === 'success'
                ? 'Email verified! You can now sign in.'
                : 'This email was already verified.'}
            </p>
            <button
              onClick={() => setVerifyBanner(null)}
              className="text-ink/50 hover:text-ink transition-colors"
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <main className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={getViewKey(currentView)}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            className="w-full"
          >
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
                />
              ) : currentView === 'profile' ? (
                <UserProfile
                  addons={addons}
                  loading={loading}
                  userLikes={userLikes}
                  onToggleLike={toggleLike}
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
                  onToggleLike={toggleLike}
                  onRequireAuth={() => setIsAuthOpen(true)}
                  onNavigate={handleNavigate}
                />
              ) : typeof currentView === 'object' && currentView.type === 'addon' ? (
                <AddonDetail
                  addonId={currentView.id}
                  addons={addons}
                  loading={loading}
                  userLikes={userLikes}
                  onToggleLike={toggleLike}
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
          </motion.div>
        </AnimatePresence>
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
