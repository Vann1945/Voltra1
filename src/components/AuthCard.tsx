import React, { useState, useRef, useEffect } from 'react';
import { Mail, Lock, ArrowRight, AlertCircle, CheckCircle2, User as UserIcon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import { getButtonClasses, getInputClasses } from '../lib/designSystem';
import { motion, AnimatePresence } from 'motion/react';
import { loadRecaptcha } from '../lib/recaptcha.client';

type AuthView = 'login' | 'register' | 'forgot' | 'unverified';

interface AuthCardProps {
  onSuccess?: () => void;
}

declare global {
  interface Window {
    grecaptcha: any;
  }
}

function RecaptchaWidget({ onChange }: { onChange: (token: string | null) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
    if (!siteKey) {
      console.warn('VITE_RECAPTCHA_SITE_KEY belum diset — reCAPTCHA tidak akan tampil.');
      setStatus('error');
      return;
    }

    let cancelled = false;
    setStatus('loading');
    widgetIdRef.current = null;
    if (containerRef.current) containerRef.current.innerHTML = '';

    loadRecaptcha()
      .then(() => {
        if (cancelled) return;
        if (containerRef.current && window.grecaptcha && widgetIdRef.current === null) {
          try {
            widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
              sitekey: siteKey,
              callback: (token: string) => onChange(token),
              'expired-callback': () => onChange(null),
            });
            setStatus('ready');
          } catch (err) {
            console.warn('Failed to render reCAPTCHA widget.', err);
            setStatus('error');
          }
        }
      })
      .catch(() => {
        if (cancelled) return;
        console.warn('Failed to load reCAPTCHA.');
        setStatus('error');
      });

    return () => { cancelled = true; };
  }, [onChange, retryCount]);

  return (
    <div className="my-2">
      <div ref={containerRef} />
      {status === 'error' && (
        <button
          type="button"
          onClick={() => setRetryCount(c => c + 1)}
          className="text-xs font-semibold text-ink-900/60 underline hover:text-ink-900"
        >
          Couldn't load reCAPTCHA — tap to retry
        </button>
      )}
    </div>
  );
}

export function AuthCard({ onSuccess }: AuthCardProps) {
  const { loginWithGoogle, loginWithGithub, loginWithCredentials } = useAuth();
  const [view, setView] = useState<AuthView>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);

  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const switchView = (newView: AuthView) => {
    setView(newView);
    setError('');
    setSuccessMsg('');
    setNameError('');
    setEmailError('');
    setPasswordError('');
  };

  const validateName = (val: string) => {
    if (view !== 'register') return '';
    if (!val.trim()) return 'Name is required.';
    return '';
  };

  const validateEmail = (val: string) => {
    if (!val) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'Please enter a valid email address.';
    return '';
  };

  const validatePassword = (val: string) => {
    if (view === 'forgot' || view === 'unverified') return '';
    if (!val) return 'Password is required.';
    if (val.length < 6) return 'Password must be at least 6 characters.';
    return '';
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (nameError) setNameError(validateName(e.target.value));
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailError) setEmailError(validateEmail(e.target.value));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (passwordError) setPasswordError(validatePassword(e.target.value));
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleGithub = async () => {
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await loginWithGithub();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with GitHub.');
    } finally {
      setLoading(false);
    }
  };

  const requireRecaptcha = () => {
    if (!recaptchaToken) {
      setError('Please complete the reCAPTCHA verification.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nErr = validateName(name);
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    if (nErr || eErr || pErr) {
      setNameError(nErr);
      setEmailError(eErr);
      setPasswordError(pErr);
      return;
    }
    if (view !== 'forgot' && !requireRecaptcha()) return;

    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      if (view === 'forgot') {
        const res = await fetch('/api/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, recaptchaToken }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to send reset link.');
        setSuccessMsg('Password reset link sent! Check your inbox.');
        setView('login');
        setPassword('');
      } else if (view === 'register') {
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, recaptchaToken }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed.');
        setView('unverified');
        setPassword('');
      } else {
        await loginWithCredentials(email, password, recaptchaToken!);
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      if (err.message === 'EMAIL_NOT_VERIFIED' || err.message?.includes('belum diverifikasi')) {
        setView('unverified');
      } else {
        setError(err.message || 'Something went wrong.');
      }
    } finally {
      setLoading(false);
      if (window.grecaptcha) window.grecaptcha.reset();
      setRecaptchaToken(null);
    }
  };

  const handleResendVerification = async () => {
    try {
      await fetch('/api/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSuccessMsg('Verification email resent!');
    } catch {
      setError('Failed to resend verification email.');
    }
  };

  const inputClass = (hasError: boolean) => cn(getInputClasses(hasError), 'pl-12');

  return (
    <div className="w-full max-w-[420px]">
      <div className="bg-parchment-raised rounded-lg shadow-card neumorph p-8 sm:p-10 glass">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-ink-900 tracking-tight">
            {view === 'login' && 'Welcome back'}
            {view === 'register' && 'Create account'}
            {view === 'forgot' && 'Reset password'}
            {view === 'unverified' && 'Verify email'}
          </h1>
          <p className="text-sm text-ink-900/70 mt-1 font-medium">
            {view === 'login' && 'Enter your details to sign in.'}
            {view === 'register' && 'Sign up to get started.'}
            {view === 'forgot' && 'Enter your email to get a reset link.'}
            {view === 'unverified' && 'Check your inbox and verify your email.'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              className="mb-5 overflow-hidden"
            >
              <div className="p-4 bg-danger/[0.06] border border-danger/20 rounded-lg flex items-start gap-3">
                <AlertCircle className="text-danger shrink-0 mt-0.5" size={16} />
                <p className="text-sm text-ink-900 font-medium">{error}</p>
              </div>
            </motion.div>
          )}
          {successMsg && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              className="mb-5 overflow-hidden"
            >
              <div className="p-4 bg-success/[0.08] border border-success/20 rounded-lg flex items-start gap-3">
                <CheckCircle2 className="text-success shrink-0 mt-0.5" size={16} />
                <p className="text-sm text-ink-900 font-medium">{successMsg}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {view === 'unverified' ? (
          <div className="text-center space-y-5 py-4">
            <div className="w-14 h-14 bg-terracotta-soft/[0.06] border border-terracotta-soft/20 rounded-lg flex items-center justify-center mx-auto">
              <Mail size={26} className="text-terracotta-soft" />
            </div>
            <p className="text-sm font-medium text-ink-900">
              We sent a verification email to <span className="underline">{email}</span>. Please verify to continue.
            </p>
            <button
              onClick={handleResendVerification}
 className="w-full bg-parchment-raised rounded-lg py-3 text-sm font-semibold text-ink-900 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-px"
            >
              Resend Email
            </button>
            <button
              onClick={() => switchView('login')}
              className="w-full border border-parchment-border rounded-lg bg-parchment-raised py-3 text-sm font-semibold text-ink-900 transition-all hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-px"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence>
              {view === 'register' && (
                <motion.div
                  key="name-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1 overflow-hidden"
                >
                  <label className="block text-xs font-bold text-ink-900 uppercase tracking-widest">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-900/50 pointer-events-none" />
                    <input
                      type="text"
                      value={name}
                      onChange={handleNameChange}
                      onBlur={() => setNameError(validateName(name))}
                      disabled={loading}
                      className={inputClass(!!nameError)}
                      placeholder="Your name"
                    />
                  </div>
                  {nameError && <p className="text-xs font-bold text-danger">{nameError}</p>}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-ink-900 uppercase tracking-widest">
                Email
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-900/50 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={() => setEmailError(validateEmail(email))}
                  disabled={loading}
                  className={inputClass(!!emailError)}
                  placeholder="you@example.com"
                />
              </div>
              {emailError && <p className="text-xs font-bold text-danger">{emailError}</p>}
            </div>

            <AnimatePresence mode="wait">
              {view !== 'forgot' && (
                <motion.div
                  key="password-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1 overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-ink-900 uppercase tracking-widest">
                      Password
                    </label>
                    {view === 'login' && (
                      <button
                        type="button"
                        onClick={() => switchView('forgot')}
                        className="text-xs font-bold text-ink-900 underline hover:text-terracotta-text transition-colors"
                      >
                        Forgot?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-900/50 pointer-events-none" />
                    <input
                      type="password"
                      value={password}
                      onChange={handlePasswordChange}
                      onBlur={() => setPasswordError(validatePassword(password))}
                      disabled={loading}
                      className={inputClass(!!passwordError)}
                      placeholder="••••••••"
                    />
                  </div>
                  {passwordError && <p className="text-xs font-bold text-danger">{passwordError}</p>}
                </motion.div>
              )}
            </AnimatePresence>

            <RecaptchaWidget onChange={setRecaptchaToken} />

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-terracotta rounded-lg py-3.5 px-4 flex items-center justify-center gap-2 font-semibold text-ink-900 uppercase text-sm shadow-card btn-3d disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-full">
                  <div className="h-7 w-full">
                    <div className="">
                      <div className="relative">
                        <div className="h-7 w-full rounded-lg bg-ink-900/[0.06] border border-parchment-border before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-ink/10 before:to-transparent" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <span>
                    {view === 'login' && 'Sign In'}
                    {view === 'register' && 'Sign Up'}
                    {view === 'forgot' && 'Send Reset Link'}
                  </span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        )}

        {view !== 'forgot' && view !== 'unverified' && (
          <>
            <div className="flex items-center gap-3 my-7">
              <div className="flex-1 h-[2px] bg-ink-900/20" />
              <span className="text-[10px] font-bold text-ink-900 uppercase tracking-widest">or</span>
              <div className="flex-1 h-[2px] bg-ink-900/20" />
            </div>

            {loading ? (
              <div className="w-full bg-parchment-raised rounded-lg py-3.5 px-4" />
            ) : (
            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className={`w-full disabled:opacity-50 disabled:cursor-not-allowed ${getButtonClasses('secondary', 'md')}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>
            )}

            {loading ? (
              <div className="w-full mt-3 bg-parchment-raised rounded-lg py-3.5 px-4" />
            ) : (
            <button
              type="button"
              onClick={handleGithub}
              disabled={loading}
              className={`w-full mt-3 disabled:opacity-50 disabled:cursor-not-allowed ${getButtonClasses('secondary', 'md')}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#000">
                <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.1 3.29 9.42 7.86 10.96.57.1.78-.25.78-.55 0-.27-.01-1.16-.02-2.1-3.2.7-3.87-1.36-3.87-1.36-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.17.08 1.78 1.2 1.78 1.2 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.64 1.59.24 2.76.12 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.7 5.39-5.27 5.67.42.36.78 1.07.78 2.15 0 1.56-.01 2.81-.01 3.19 0 .3.21.66.79.55A10.99 10.99 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
              </svg>
              Continue with GitHub
            </button>
            )}
          </>
        )}
      </div>

      {view !== 'unverified' && (
        <div className="mt-5 text-center text-sm font-bold text-ink-900">
          {view === 'login' && (
            <>
              No account?{' '}
              <button onClick={() => switchView('register')} className="underline hover:text-terracotta-text transition-colors">
                Sign up
              </button>
            </>
          )}
          {view === 'register' && (
            <>
              Already have an account?{' '}
              <button onClick={() => switchView('login')} className="underline hover:text-terracotta-text transition-colors">
                Sign in
              </button>
            </>
          )}
          {view === 'forgot' && (
            <>
              Remember it?{' '}
              <button onClick={() => switchView('login')} className="underline hover:text-terracotta-text transition-colors">
                Back to sign in
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
