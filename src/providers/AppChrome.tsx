'use client';

import React, { Suspense, lazy, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, X } from '@/components/icons/animated';
import { Navbar } from '@/components/Navbar';
import { BorderEffectStyles } from '@/components/borderEffects';
import { Toast } from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import { useAppShell } from './AppShellProvider';
import { useAppNavigate } from '@/hooks/useAppNavigate';
import { pathToViewState } from '@/lib/routing';

const UploadModal = lazy(() => import('@/components/UploadModal').then((m) => ({ default: m.UploadModal })));
const AuthModal = lazy(() => import('@/components/AuthModal').then((m) => ({ default: m.AuthModal })));

const FAVICONS = {
  default: {
    light: '/favicon/icon-light.svg',
    dark: '/favicon/icon-dark.svg',
    oled: '/favicon/icon-oled.svg',
  },
} as const;

/**
 * useSearchParams() MEWAJIBKAN Suspense boundary di Next.js App Router —
 * kalau tidak, build gagal saat prerender halaman manapun yang tidak
 * punya query string (termasuk halaman 404 otomatis bawaan Next.js).
 * Makanya logic ini dipisah ke komponen sendiri, bukan langsung di AppChrome.
 */
function VerifyBanner() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [verifyBanner, setVerifyBanner] = useState<'success' | 'already' | null>(null);

  useEffect(() => {
    const verified = searchParams.get('verified');
    if (verified === 'success' || verified === 'already') {
      setVerifyBanner(verified);
      // Bersihin query string biar kalau di-refresh nggak muncul lagi
      router.replace(pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!verifyBanner) return null;

  return (
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
  );
}

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: 'Sign-in was denied. Your account or email may not be verified with that provider.',
  OAuthAccountNotLinked: 'That email is already registered with a different sign-in method. Try logging in with email/password instead.',
  OAuthSignin: 'Could not start sign-in with that provider. Please try again.',
  OAuthCallback: 'Sign-in with that provider failed. Please try again.',
  Callback: 'Sign-in failed. Please try again.',
  Configuration: 'Sign-in is temporarily unavailable. Please try again later.',
};

/**
 * Tangkap `?authError=...` yang dikirim balik oleh app/login/LoginRedirect.tsx
 * setelah Auth.js gagal OAuth (lihat komentar di app/login/page.tsx untuk
 * kenapa ini perlu). Sama seperti VerifyBanner, butuh Suspense boundary
 * sendiri karena pakai useSearchParams().
 */
function AuthErrorHandler({ onAuthError }: { onAuthError: () => void }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    const error = searchParams.get('authError');
    if (!error) return;
    showToast(AUTH_ERROR_MESSAGES[error] || 'Sign-in failed. Please try again.', 'error');
    onAuthError();
    router.replace(pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export function AppChrome({ children }: { children: React.ReactNode }) {
  const { toast, hideToast } = useToast();
  const { addons, theme, isUploadOpen, closeUpload, isAuthOpen, closeAuth, openUpload, openAuth, refetchAddons } = useAppShell();
  const navigate = useAppNavigate(addons);
  const pathname = usePathname();
  const currentView = pathToViewState(pathname);

  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    const set = FAVICONS.default;
    link.type = 'image/svg+xml';
    link.href = set[theme];
  }, [currentView, theme]);

  return (
    <div
      className={`${theme === 'dark' ? 'dark' : theme === 'oled' ? 'dark oled' : ''} theme-shell relative isolate min-h-[100dvh] bg-parchment text-ink-900 selection:bg-terracotta selection:text-ink-900`}
    >
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <BorderEffectStyles />
      {currentView !== 'landing' && (
        <Navbar
          onOpenUpload={openUpload}
          onOpenAuth={openAuth}
          onNavigate={navigate}
          currentView={currentView}
        />
      )}

      <Suspense fallback={null}>
        <VerifyBanner />
      </Suspense>

      <Suspense fallback={null}>
        <AuthErrorHandler onAuthError={openAuth} />
      </Suspense>

      <main id="main-content" tabIndex={-1} className="relative outline-none">
        <div key={pathname} className="w-full route-content-enter">
          {children}
        </div>
      </main>

      <Suspense fallback={null}>
        {isUploadOpen && (
          <UploadModal isOpen={isUploadOpen} onClose={closeUpload} onPublished={() => refetchAddons()} />
        )}
        {isAuthOpen && (
          <AuthModal isOpen={isAuthOpen} onClose={closeAuth} />
        )}
      </Suspense>

      <Toast toast={toast} onClose={hideToast} />
    </div>
  );
}
