import { useState, useEffect, useCallback } from 'react';
import { signInWithCustomToken, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../firebase';
import { User } from '../types';

type AuthJsSession = {
  user?: { uid: string; email: string; name: string; image?: string; role?: string };
  firebaseToken?: string;
} | null;

async function fetchSession(): Promise<AuthJsSession> {
  try {
    const res = await fetch('/api/auth/session');
    if (!res.ok) return null;
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      return data?.user ? data : null;
    } catch (e) {
      console.error('Failed to parse session JSON:', text.substring(0, 50));
      return null;
    }
  } catch (err) {
    return null;
  }
}

async function getCsrfToken(): Promise<string> {
  try {
    const res = await fetch('/api/auth/csrf');
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      return data.csrfToken || '';
    } catch (e) {
      console.error('Failed to parse CSRF JSON:', text.substring(0, 50));
      return '';
    }
  } catch (err) {
    return '';
  }
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
    if (session.firebaseToken && auth) {
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
    try {
      const csrfToken = await getCsrfToken();
      const res = await fetch('/api/auth/signin/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ csrfToken, callbackUrl: window.location.href, json: 'true' }),
      });
      const text = await res.text();
      const data = JSON.parse(text);
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error('Google login failed:', err);
      window.location.href = '/api/auth/signin/google'; // fallback to standard navigation
    }
  }, []);

  const loginWithGithub = useCallback(async () => {
    try {
      const csrfToken = await getCsrfToken();
      const res = await fetch('/api/auth/signin/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ csrfToken, callbackUrl: window.location.href, json: 'true' }),
      });
      const text = await res.text();
      const data = JSON.parse(text);
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error('Github login failed:', err);
      window.location.href = '/api/auth/signin/github'; // fallback to standard navigation
    }
  }, []);

  const loginWithCredentials = useCallback(
    async (email: string, password: string, recaptchaToken: string) => {
      try {
        const csrfToken = await getCsrfToken();
        const res = await fetch('/api/auth/callback/credentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ csrfToken, email, password, recaptchaToken, json: 'true' }),
        });
        const text = await res.text();
        const data = JSON.parse(text);
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
        body: new URLSearchParams({ csrfToken, json: 'true' }),
      });
      if (auth) await firebaseSignOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  return { user, loading, login: loginWithGoogle, loginWithGoogle, loginWithGithub, loginWithCredentials, logout };
}
