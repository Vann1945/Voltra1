import React, { useState } from 'react';
import { Lock, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Skeleton } from './Skeleton';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { getButtonClasses, getInputClasses } from '../lib/designSystem';

interface ResetPasswordPageProps {
  token: string;
  uid: string;
  onNavigate: (view: 'home') => void;
}

export function ResetPasswordPage({ token, uid, onNavigate }: ResetPasswordPageProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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

  const inputClass = (hasError: boolean) => cn(getInputClasses(hasError), 'pl-12');

  return (
    <div className="min-h-[70dvh] flex items-center justify-center p-4">
      <div className="w-full max-w-[420px]">
        <div className="bg-parchment-raised rounded-lg shadow-card neumorph p-8 sm:p-10 glass">
          {success ? (
            <div className="text-center space-y-5 py-4">
              <div className="w-14 h-14 bg-success/[0.08] border border-success/20 rounded-lg flex items-center justify-center mx-auto">
                <CheckCircle2 size={26} className="text-success" />
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
              <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-ink-900 tracking-tight">
                  Reset password
                </h1>
                <p className="text-sm text-ink-900/70 mt-1 font-medium">
                  Enter your new password below.
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
              </AnimatePresence>

              {!token || !uid ? (
                <p className="text-sm font-medium text-danger">
                  This reset link is invalid or incomplete. Please request a new one from the sign-in form.
                </p>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-ink-900 uppercase tracking-widest">
                      New password
                    </label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-900/50 pointer-events-none" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onBlur={() => password && validate()}
                        disabled={loading}
                        className={inputClass(!!passwordError)}
                        placeholder="••••••••"
                      />
                    </div>
                    {passwordError && <p className="text-xs font-bold text-danger">{passwordError}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-ink-900 uppercase tracking-widest">
                      Confirm password
                    </label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-900/50 pointer-events-none" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onBlur={() => confirmPassword && validate()}
                        disabled={loading}
                        className={inputClass(!!confirmError)}
                        placeholder="••••••••"
                      />
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
                      className={`w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed ${getButtonClasses('primary', 'md')}`}
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
