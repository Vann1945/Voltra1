'use client';

import React, { useMemo, useState } from 'react';
import { Lock, ArrowRight, AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, ShieldCheck } from '@/components/icons/animated';
import { Skeleton } from './Skeleton';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { getButtonClasses, getInputClasses } from '@/lib/designSystem';

interface ResetPasswordPageProps {
  token: string;
  uid: string;
  onNavigate: (view: 'home') => void;
}

type StrengthLevel = 0 | 1 | 2 | 3 | 4;

function scorePassword(password: string): StrengthLevel {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(4, score) as StrengthLevel;
}

const STRENGTH_META: Record<StrengthLevel, { label: string; color: string }> = {
  0: { label: 'Too short', color: 'bg-ink-900/15' },
  1: { label: 'Weak', color: 'bg-danger' },
  2: { label: 'Fair', color: 'bg-terracotta' },
  3: { label: 'Good', color: 'bg-terracotta-text' },
  4: { label: 'Strong', color: 'bg-success' },
};

export function ResetPasswordPage({ token, uid, onNavigate }: ResetPasswordPageProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const strength = useMemo(() => scorePassword(password), [password]);
  const strengthMeta = STRENGTH_META[strength];

  const validate = () => {
    let ok = true;
    if (!password || password.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      ok = false;
    } else {
      setPasswordError('');
    }
    if (confirmPassword !== password) {
      setConfirmError('Passwords do not match.');
      ok = false;
    } else {
      setConfirmError('');
    }
    return ok;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !uid) {
      setError('This reset link is invalid or incomplete.');
      return;
    }
    if (!validate()) return;

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, token, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password.');
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (hasError: boolean) => cn(getInputClasses(hasError), 'pl-12 pr-12');

  const requirements = [
    { met: password.length >= 6, label: 'At least 6 characters' },
    { met: /[A-Z]/.test(password) && /[a-z]/.test(password), label: 'Upper & lower case letters' },
    { met: /\d/.test(password), label: 'At least one number' },
  ];

  return (
    <div className="flex min-h-[80dvh] items-center justify-center p-4">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-parchment-border bg-parchment-raised shadow-card-float md:grid-cols-[0.9fr_1.1fr]">
        {/* Decorative side panel — hidden on small screens */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-ink-900 p-8 text-paper md:flex">
          <div className="pointer-events-none absolute inset-0 opacity-40" style={{ background: 'radial-gradient(circle at 20% 20%, rgba(217,119,87,0.35), transparent 55%), radial-gradient(circle at 80% 80%, rgba(217,119,87,0.2), transparent 50%)' }} />
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-terracotta text-ink-900 shadow-card">
              <KeyRound size={22} />
            </div>
            <h2 className="mt-6 text-2xl font-bold leading-snug">Keep your Voltra account secure</h2>
            <p className="mt-3 text-sm leading-6 text-paper/70">Choose a fresh password you haven't used before. We recommend a mix of letters, numbers, and symbols.</p>
          </div>
          <div className="relative space-y-3">
            {requirements.map(req => (
              <div key={req.label} className="flex items-center gap-2 text-sm font-medium text-paper/80">
                <span className={cn('flex h-5 w-5 items-center justify-center rounded-full border', req.met ? 'border-success bg-success/20 text-success' : 'border-paper/25 text-paper/40')}>
                  <CheckCircle2 size={13} />
                </span>
                {req.label}
              </div>
            ))}
          </div>
        </div>

        {/* Form panel */}
        <div className="p-8 sm:p-10">
          {success ? (
            <div className="space-y-5 py-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-success/20 bg-success/[0.08]">
                <ShieldCheck size={26} className="text-success" />
              </div>
              <h1 className="text-xl font-bold text-ink-900">Password reset!</h1>
              <p className="text-sm font-normal text-ink-900/70">
                Your password has been changed. You can now sign in with your new password.
              </p>
              <button
                onClick={() => onNavigate('home')}
                className={`w-full ${getButtonClasses('secondary', 'md')}`}
              >
                Back to home
              </button>
            </div>
          ) : (
            <>
              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-terracotta text-ink-900 shadow-card md:hidden">
                  <KeyRound size={20} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
                    Reset password
                  </h1>
                  <p className="mt-1 text-sm font-medium text-ink-900/70">
                    Enter your new password below.
                  </p>
                </div>
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
                    <div className="flex items-start gap-3 rounded-lg border border-danger/20 bg-danger/[0.06] p-4">
                      <AlertCircle className="mt-0.5 shrink-0 text-danger" size={16} />
                      <p className="text-sm font-medium text-ink-900">{error}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {!token || !uid ? (
                <p className="text-sm font-medium text-danger">
                  This reset link is invalid or incomplete. Please request a new one from the sign-in form.
                </p>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-widest text-ink-900">
                      New password
                    </label>
                    <div className="relative">
                      <Lock size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-900/50" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onBlur={() => password && validate()}
                        disabled={loading}
                        className={inputClass(!!passwordError)}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-900/45 hover:bg-ink-900/[0.05] hover:text-ink-900"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {password && (
                      <div className="pt-1">
                        <div className="flex gap-1">
                          {[0, 1, 2, 3].map(i => (
                            <span key={i} className={cn('h-1.5 flex-1 rounded-full transition-colors duration-300', i < strength ? strengthMeta.color : 'bg-ink-900/10')} />
                          ))}
                        </div>
                        <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-ink-900/45">{strengthMeta.label}</p>
                      </div>
                    )}
                    {passwordError && <p className="text-xs font-bold text-danger">{passwordError}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-widest text-ink-900">
                      Confirm password
                    </label>
                    <div className="relative">
                      <Lock size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-900/50" />
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onBlur={() => confirmPassword && validate()}
                        disabled={loading}
                        className={inputClass(!!confirmError)}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-900/45 hover:bg-ink-900/[0.05] hover:text-ink-900"
                        aria-label={showConfirm ? 'Hide password' : 'Show password'}
                        tabIndex={-1}
                      >
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {confirmError && <p className="text-xs font-bold text-danger">{confirmError}</p>}
                  </div>

                  {loading ? (
                    <div className="mt-2">
                      <Skeleton className="h-12 w-full rounded-lg" />
                    </div>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading}
                      className={`mt-2 w-full disabled:cursor-not-allowed disabled:opacity-50 ${getButtonClasses('primary', 'md')}`}
                    >
                      <span>Reset password</span>
                      <ArrowRight size={18} />
                    </button>
                  )}
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
