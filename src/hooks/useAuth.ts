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

function navigateToOAuthProvider(provider: 'google' | 'github') {
  const callbackUrl = `${window.location.origin}${window.location.pathname}${window.location.search}`;
  const params = new URLSearchParams({ callbackUrl });
  window.location.assign(`/api/auth/signin/${provider}?${params.toString()}`);
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
  // Navigasi langsung tetap berada dalam alur provider yang benar dan tidak
  // mencoba JSON.parse terhadap halaman HTML.
  navigateToOAuthProvider(provider);
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
      navigateToOAuthProvider('google');
    }
  }, []);

  const loginWithGithub = useCallback(async () => {
    try {
      await startOAuthLogin('github');
    } catch (err) {
      console.error('GitHub login failed:', err);
      navigateToOAuthProvider('github');
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
          throw new Error(messages[error] || 'Login failed. Please try again.');
        }
        await refreshSession();
      } catch (err: any) {
        if (err.message && err.message.includes('Login failed')) throw err;
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
