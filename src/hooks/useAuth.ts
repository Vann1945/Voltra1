'use client';

import { useCallback, useEffect, useState } from 'react';
import { getFirebaseAuth } from '@/firebase';
import { User } from '@/types';

type AuthJsSession = {
  user?: { uid: string; email: string; name: string; image?: string; role?: string };
  firebaseToken?: string;
} | null;

export const PROFILE_UPDATED_EVENT = 'voltra:profile-updated';
export type ProfileUpdate = Pick<User, 'uid' | 'displayName' | 'photoURL' | 'bio' | 'profileBorder'>;

type AuthRedirectResponse = { url?: string; error?: string };

async function readJsonResponse<T>(res: Response): Promise<T | null> {
  if (!res.ok) return null;
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();
  if (!text.trim() || !contentType.includes('application/json')) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function fetchSession(): Promise<AuthJsSession> {
  try {
    const res = await fetch('/api/auth/session', {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    });
    const data = await readJsonResponse<AuthJsSession>(res);
    return data?.user ? data : null;
  } catch {
    return null;
  }
}

async function getCsrfToken(): Promise<string> {
  try {
    const res = await fetch('/api/auth/csrf', {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    });
    const data = await readJsonResponse<{ csrfToken?: string }>(res);
    return data?.csrfToken || '';
  } catch {
    return '';
  }
}

// PENTING: @auth/core (>=0.37, termasuk 0.41.3 yang dipakai proyek ini) TIDAK LAGI
// mendukung request GET langsung ke /api/auth/signin/:provider — itu akan selalu
// dilempar sebagai "UnknownAction: Unsupported action." di server (lihat
// https://github.com/nextauthjs/next-auth/issues/13269). Satu-satunya cara yang
// didukung adalah POST dengan csrfToken. Karena itu fallback di bawah ini memakai
// submit <form method="POST"> asli (bukan window.location.assign ke URL GET),
// supaya tetap jalan sebagai navigasi browser biasa walau fetch/JSON di atas gagal.
function navigateToOAuthProvider(provider: 'google' | 'github', csrfToken: string) {
  const callbackUrl = window.location.href;
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = `/api/auth/signin/${provider}`;
  form.style.display = 'none';

  const fields: Record<string, string> = { csrfToken, callbackUrl };
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}

async function startOAuthLogin(provider: 'google' | 'github') {
  const csrfToken = await getCsrfToken();
  const res = await fetch(`/api/auth/signin/${provider}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    credentials: 'same-origin',
    body: new URLSearchParams({
      csrfToken,
      callbackUrl: window.location.href,
      json: 'true',
    }),
  });

  const data = await readJsonResponse<AuthRedirectResponse>(res);
  if (data?.url) {
    window.location.assign(data.url);
    return;
  }

  // Auth.js dapat mengembalikan redirect/HTML bila proxy atau cookie belum siap.
  // Fallback tetap harus lewat POST (lihat catatan di atas navigateToOAuthProvider),
  // bukan GET, supaya tidak crash dengan UnknownAction di server.
  navigateToOAuthProvider(provider, csrfToken);
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    const session = await fetchSession();
    if (!session?.user) {
      setUser(null);
      setLoading(false);
      return;
    }
    setUser(session.user as unknown as User);
    setLoading(false);
    if (session.firebaseToken) {
      try {
        const firebaseAuth = await getFirebaseAuth();
        if (firebaseAuth) {
          const { signInWithCustomToken } = await import('firebase/auth');
          await signInWithCustomToken(firebaseAuth, session.firebaseToken);
        }
      } catch (err) {
        console.error('Failed to sign in to Firebase with custom token:', err);
      }
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    const handleProfileUpdated = (event: Event) => {
      const detail = (event as CustomEvent<ProfileUpdate>).detail;
      if (!detail?.uid) return;
      setUser(current => {
        if (!current || current.uid !== detail.uid) return current;
        return { ...current, ...detail };
      });
    };

    window.addEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated);
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated);
  }, []);

  const loginWithGoogle = useCallback(async () => {
    try {
      await startOAuthLogin('google');
    } catch (err) {
      console.error('Google login failed:', err);
      navigateToOAuthProvider('google', await getCsrfToken());
    }
  }, []);

  const loginWithGithub = useCallback(async () => {
    try {
      await startOAuthLogin('github');
    } catch (err) {
      console.error('GitHub login failed:', err);
      navigateToOAuthProvider('github', await getCsrfToken());
    }
  }, []);

  const loginWithCredentials = useCallback(
    async (email: string, password: string, recaptchaToken: string) => {
      try {
        const csrfToken = await getCsrfToken();
        const res = await fetch('/api/auth/callback/credentials', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          credentials: 'same-origin',
          body: new URLSearchParams({ csrfToken, email, password, recaptchaToken, json: 'true' }),
        });
        const data = await readJsonResponse<AuthRedirectResponse>(res);
        if (!data?.url) throw new Error('AUTH_RESPONSE_INVALID');
        const url = new URL(data.url, window.location.origin);
        const error = url.searchParams.get('error');
        if (error) {
          const messages: Record<string, string> = {
            INVALID_CREDENTIALS: 'Incorrect email or password.',
            EMAIL_NOT_VERIFIED: 'Email not yet verified. Check your inbox.',
            RECAPTCHA_FAILED: 'reCAPTCHA verification failed. Please try again.',
            TOO_MANY_ATTEMPTS: 'Too many login attempts. Please wait a few minutes and try again.',
          };
          // Ditandai eksplisit sebagai "known auth error" (bukan di-cek lewat
          // substring teks pesan) supaya catch block di bawah bisa
          // membedakannya secara andal dari error tak terduga (network/parse
          // error dst). Sebelumnya ini dicek pakai `.includes('Login failed')`,
          // yang cuma cocok untuk pesan fallback generik — 4 pesan spesifik di
          // atas (salah password, email belum diverifikasi, dll) malah selalu
          // ketiban pesan generik "Authentication server error" di bawah,
          // termasuk bikin redirect ke tampilan "verify email" di AuthCard ikut
          // gagal karena pesannya sudah keburu diganti.
          const knownAuthError = new Error(messages[error] || 'Login failed. Please try again.');
          (knownAuthError as Error & { isKnownAuthError?: boolean }).isKnownAuthError = true;
          throw knownAuthError;
        }
        await refreshSession();
      } catch (err: any) {
        if (err?.isKnownAuthError) throw err;
        console.error('Credentials login failed:', err);
        throw new Error('Authentication server error. Please try again later.');
      }
    },
    [refreshSession]
  );

  const logout = useCallback(async () => {
    try {
      const csrfToken = await getCsrfToken();
      await fetch('/api/auth/signout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        credentials: 'same-origin',
        body: new URLSearchParams({ csrfToken, json: 'true' }),
      });
      const firebaseAuth = await getFirebaseAuth();
      if (firebaseAuth) {
        const { signOut } = await import('firebase/auth');
        await signOut(firebaseAuth);
      }
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  return { user, loading, login: loginWithGoogle, loginWithGoogle, loginWithGithub, loginWithCredentials, logout };
}
