'use client';

import { useCallback } from 'react';
import { AlertCircle, CheckCircle2, ShieldCheck, Zap } from '@/components/icons/animated';
import { AuthCard } from '@/components/AuthCard';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: 'Sign-in was denied. Check that your provider account has a verified email.',
  OAuthAccountNotLinked: 'That email is already registered with another sign-in method. Try email and password instead.',
  OAuthSignin: 'We could not start sign-in with that provider. Please try again.',
  OAuthCallback: 'The provider sign-in could not be completed. Please try again or use email and password.',
  Callback: 'Sign-in could not be completed. Please try again.',
  Configuration: 'Sign-in is temporarily unavailable. Please try again later.',
};

export function LoginPageClient({ error }: { error?: string }) {
  const handleSuccess = useCallback(() => {
    window.location.assign('/');
  }, []);

  return (
    <section aria-labelledby="login-page-title" className="min-h-[calc(100dvh-4rem)] bg-parchment">
      <div className="mx-auto grid min-h-[calc(100dvh-4rem)] w-full max-w-6xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-16 lg:px-8 lg:py-12">
        <div className="max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-parchment-border bg-parchment-raised px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-terracotta-text">
            <Zap size={14} aria-hidden="true" />
            Voltra Marketplace
          </div>
          <h1 id="login-page-title" className="max-w-[12ch] text-4xl font-bold leading-[1.05] tracking-tight text-ink-900 sm:text-5xl">
            Keep exploring better add-ons.
          </h1>
          <p className="mt-5 max-w-[48ch] text-base leading-7 text-ink-900/65">
            Sign in to save favorites, publish your own work, and pick up where you left off across Voltra.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="flex items-start gap-3 rounded-2xl border border-parchment-border bg-parchment-raised p-4 shadow-card">
              <ShieldCheck className="mt-0.5 shrink-0 text-terracotta-text" size={19} aria-hidden="true" />
              <div><p className="text-sm font-bold text-ink-900">One account, every provider</p><p className="mt-1 text-xs leading-5 text-ink-900/60">Use Google, GitHub, or email without creating duplicate profiles.</p></div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-parchment-border bg-parchment-raised p-4 shadow-card">
              <CheckCircle2 className="mt-0.5 shrink-0 text-success" size={19} aria-hidden="true" />
              <div><p className="text-sm font-bold text-ink-900">Built for quick returns</p><p className="mt-1 text-xs leading-5 text-ink-900/60">Your library and saved add-ons stay close whenever inspiration strikes.</p></div>
            </div>
          </div>
        </div>

        <div className="w-full">
          {error && (
            <div role="alert" aria-live="assertive" className="mb-4 flex items-start gap-3 rounded-2xl border border-danger/20 bg-danger/[0.06] p-4 shadow-card">
              <AlertCircle className="mt-0.5 shrink-0 text-danger" size={18} aria-hidden="true" />
              <p className="text-sm font-medium leading-6 text-ink-900">{AUTH_ERROR_MESSAGES[error] || 'Sign-in failed. Please try again.'}</p>
            </div>
          )}
          <AuthCard onSuccess={handleSuccess} />
        </div>
      </div>
    </section>
  );
}
