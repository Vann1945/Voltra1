import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, Loader2, AlertCircle, CheckCircle2, User as UserIcon } from 'lucide-react';
import { auth } from '../firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  User
} from 'firebase/auth';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

type AuthView = 'login' | 'register' | 'forgot' | 'unverified';

interface AuthCardProps {
  onSuccess?: () => void;
}

export function AuthCard({ onSuccess }: AuthCardProps) {
  const [view, setView] = useState<AuthView>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [unverifiedUser, setUnverifiedUser] = useState<User | null>(null);
  
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Clear errors when switching views
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
    if (view === 'forgot' || view === 'unverified') return ''; // Password not needed
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

  const handleFirebaseError = (err: any) => {
    if (err.code === 'auth/unauthorized-domain') {
      return 'This domain is not authorized. Please add this app\'s URL to the Authorized Domains in your Firebase Console (Authentication > Settings > Authorized Domains).';
    }
    const msgs: Record<string, string> = {
      'auth/wrong-password': 'Incorrect password.',
      'auth/user-not-found': 'No account found with this email.',
      'auth/email-already-in-use': 'Email is already taken.',
      'auth/invalid-email': 'Invalid email format.',
      'auth/invalid-credential': 'Incorrect email or password.',
      'auth/weak-password': 'Password should be at least 6 characters.',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later.'
    };
    return msgs[err.code] || err.message;
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(handleFirebaseError(err));
      }
    } finally {
      setLoading(false);
    }
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
    
    setLoading(true);
    setError('');
    setSuccessMsg('');
    
    try {
      if (view === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        setSuccessMsg('Password reset link sent! Please check your inbox.');
        setView('login');
        setPassword('');
      } else if (view === 'register') {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await import('firebase/auth').then(m => m.updateProfile(cred.user, { displayName: name }));
        await sendEmailVerification(cred.user);
        setUnverifiedUser(cred.user);
        setView('unverified');
        setPassword('');
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        if (!cred.user.emailVerified) {
          setUnverifiedUser(cred.user);
          setView('unverified');
          setPassword('');
          return;
        }
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      setError(handleFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[360px]">
      <div className="bg-black/40/90 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
            {view === 'login' && 'Welcome back'}
            {view === 'register' && 'Create an account'}
            {view === 'forgot' && 'Reset password'}
            {view === 'unverified' && 'Verify your email'}
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 font-normal">
            {view === 'login' && 'Enter your details to sign in.'}
            {view === 'register' && 'Sign up to get started.'}
            {view === 'forgot' && 'Enter your email to receive a reset link.'}
            {view === 'unverified' && 'Please verify your email address to continue.'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              key="error"
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
                <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={16} />
                <p className="text-sm text-red-300 leading-relaxed font-light">{error}</p>
              </div>
            </motion.div>
          )}
          {successMsg && (
            <motion.div 
              key="success"
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-3">
                <CheckCircle2 className="text-emerald-400 shrink-0 mt-0.5" size={16} />
                <p className="text-sm text-emerald-300 leading-relaxed font-light">{successMsg}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {view === 'unverified' ? (
          <div className="space-y-6">
            <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col items-center text-center gap-4">
              <Mail className="text-amber-400" size={32} />
              <p className="text-sm text-amber-200/80 leading-relaxed font-light">
                We've sent a verification link to <span className="font-medium text-amber-200">{unverifiedUser?.email}</span>. 
                Please check your inbox and click the link to verify your account.
              </p>
            </div>
            <button 
              onClick={async () => {
                if (!unverifiedUser) return;
                setLoading(true);
                setError('');
                setSuccessMsg('');
                try {
                  await sendEmailVerification(unverifiedUser);
                  setSuccessMsg('Verification email resent! Check your inbox.');
                } catch (err: any) {
                  setError(handleFirebaseError(err));
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/5 text-white font-medium rounded-full py-3 px-4 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Resend Verification Email'}
            </button>
            <button 
              onClick={async () => {
                await signOut(auth);
                switchView('login');
              }}
              className="w-full bg-transparent hover:bg-white/5 text-slate-400 hover:text-white font-medium rounded-full py-3 px-4 transition-all"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence mode="wait">
              {view === 'register' && (
                <motion.div 
                  key="name-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5 overflow-hidden"
                >
                  <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest pl-1">
                    Name
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                      <UserIcon size={16} />
                    </div>
                    <input 
                      type="text" 
                      value={name}
                      onChange={handleNameChange}
                      onBlur={() => setNameError(validateName(name))}
                      disabled={loading}
                      className={cn(
                        "w-full bg-white/5 border rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 transition-all disabled:opacity-50",
                        nameError 
                          ? "border-red-500/30 focus:border-red-500/50 focus:ring-red-500/20" 
                          : "border-white/10 focus:border-white/30 focus:ring-white/20"
                      )}
                      placeholder="John Doe"
                    />
                  </div>
                  <AnimatePresence>
                    {nameError && (
                      <motion.p 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-xs text-red-400 pl-1"
                      >
                        {nameError}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest pl-1">
                Email
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                  <Mail size={16} />
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={() => setEmailError(validateEmail(email))}
                  disabled={loading}
                  className={cn(
                    "w-full bg-white/5 border rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 transition-all disabled:opacity-50",
                    emailError 
                      ? "border-red-500/30 focus:border-red-500/50 focus:ring-red-500/20" 
                      : "border-white/10 focus:border-white/30 focus:ring-white/20"
                  )}
                  placeholder="you@example.com"
                />
              </div>
              <AnimatePresence>
                {emailError && (
                  <motion.p 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs text-red-400 pl-1"
                  >
                    {emailError}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence mode="wait">
              {view !== 'forgot' && (
                <motion.div 
                  key="password-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5 overflow-hidden"
                >
                  <div className="flex items-center justify-between pl-1">
                    <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">
                      Password
                    </label>
                    {view === 'login' && (
                      <button 
                        type="button" 
                        onClick={() => switchView('forgot')}
                        className="text-xs text-slate-400 hover:text-white transition-colors font-medium"
                      >
                        Forgot?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                      <Lock size={16} />
                    </div>
                    <input 
                      type="password" 
                      value={password}
                      onChange={handlePasswordChange}
                      onBlur={() => setPasswordError(validatePassword(password))}
                      disabled={loading}
                      className={cn(
                        "w-full bg-white/5 border rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 transition-all disabled:opacity-50",
                        passwordError 
                          ? "border-red-500/30 focus:border-red-500/50 focus:ring-red-500/20" 
                          : "border-white/10 focus:border-white/30 focus:ring-white/20"
                      )}
                      placeholder="••••••••"
                    />
                  </div>
                  <AnimatePresence>
                    {passwordError && (
                      <motion.p 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-xs text-red-400 pl-1"
                      >
                        {passwordError}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full mt-2 bg-white hover:bg-zinc-200 text-black text-sm font-medium rounded-xl py-2.5 px-4 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-95"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <span>
                    {view === 'login' && 'Sign In'}
                    {view === 'register' && 'Sign Up'}
                    {view === 'forgot' && 'Send Reset Link'}
                  </span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {view !== 'forgot' && view !== 'unverified' && (
          <>
            <div className="flex items-center gap-3 my-8">
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">or continue with</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>

            <button 
              type="button" 
              onClick={handleGoogle}
              disabled={loading}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/5 text-white text-sm font-medium rounded-xl py-2.5 px-4 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </button>
          </>
        )}

      </div>

      {view !== 'unverified' && (
        <div className="mt-6 text-center text-sm text-slate-500">
          {view === 'login' && (
            <>
              Don't have an account?{' '}
              <button 
                onClick={() => switchView('register')}
                className="text-white hover:text-slate-300 font-medium transition-colors"
              >
                Sign up
              </button>
            </>
          )}
          {view === 'register' && (
            <>
              Already have an account?{' '}
              <button 
                onClick={() => switchView('login')}
                className="text-white hover:text-slate-300 font-medium transition-colors"
              >
                Sign in
              </button>
            </>
          )}
          {view === 'forgot' && (
            <>
              Remember your password?{' '}
              <button 
                onClick={() => switchView('login')}
                className="text-white hover:text-slate-300 font-medium transition-colors"
              >
                Back to sign in
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
