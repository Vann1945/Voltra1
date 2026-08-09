import { useState, useEffect, useCallback } from 'react';
import { signInWithCustomToken, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../firebase';
import { User } from '../types';

type AuthJsSession = {
  user?: { uid: string; email: string; name: string; image?: string; role?: string };
  firebaseToken?: string;
} | null;

async function fetchSession(): Promise<AuthJsSession> {
  const res = await fetch('/api/auth/session');
  if (!res.ok) return null;
  const data = await res.json();
  return data?.user ? data : null;
}

async function getCsrfToken(): Promise<string> {
  const res = await fetch('/api/auth/csrf');
  const data = await res.json();
  return data.csrfToken;
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
        await signInWithCustomToken(auth, session.firebaseToken);
      } catch (err) {
        console.error('Failed to sign in to Firebase with custom token:', err);
      }
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const loginWithGoogle = useCallback(async () => {
    const csrfToken = await getCsrfToken();
    const res = await fetch('/api/auth/signin/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ csrfToken, callbackUrl: window.location.href, json: 'true' }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }, []);

  const loginWithGithub = useCallback(async () => {
    const csrfToken = await getCsrfToken();
    const res = await fetch('/api/auth/signin/github', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ csrfToken, callbackUrl: window.location.href, json: 'true' }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }, []);

  const loginWithCredentials = useCallback(
    async (email: string, password: string, recaptchaToken: string) => {
      const csrfToken = await getCsrfToken();
      const res = await fetch('/api/auth/callback/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ csrfToken, email, password, recaptchaToken, json: 'true' }),
      });
      const data = await res.json();
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
    },
    [refreshSession]
  );

  const logout = useCallback(async () => {
    try {
      const csrfToken = await getCsrfToken();
      await fetch('/api/auth/signout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ csrfToken, json: 'true' }),
      });
      await firebaseSignOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  return { user, loading, login: loginWithGoogle, loginWithGoogle, loginWithGithub, loginWithCredentials, logout };
}
