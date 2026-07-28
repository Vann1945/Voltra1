import React, { useState } from 'react';
import { Mail, Lock, Loader2, AlertCircle, CheckCircle2, User as UserIcon } from 'lucide-react';
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
    if (!val.trim()) return 'Required';
    return '';
  };

  const validateEmail = (val: string) => {
    if (!val) return 'Required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'Invalid email';
    return '';
  };

  const validatePassword = (val: string) => {
    if (view === 'forgot' || view === 'unverified') return '';
    if (!val) return 'Required';
    if (val.length < 6) return 'Min 6 chars';
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
      return 'Unauthorized domain.';
    }
    const msgs: Record<string, string> = {
      'auth/wrong-password': 'Incorrect password.',
      'auth/user-not-found': 'Account not found.',
      'auth/email-already-in-use': 'Email taken.',
      'auth/invalid-email': 'Invalid email.',
      'auth/invalid-credential': 'Incorrect email or password.',
      'auth/weak-password': 'Password too weak.',
      'auth/too-many-requests': 'Too many attempts.'
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
        setSuccessMsg('Reset link sent.');
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
    <div className="w-full max-w-[420px]">
      <div className="bg-zinc-900/60 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-10 shadow-[0_16px_48px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] relative overflow-hidden">
        
        <div className="mb-10 text-center relative z-10">
          <h1 className="text-base font-medium text-white tracking-tight">
            {view === 'login' && 'Sign In'}
            {view === 'register' && 'Create Account'}
            {view === 'forgot' && 'Reset Password'}
            {view === 'unverified' && 'Verify Email'}
          </h1>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              key="error"
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2">
                <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={14} />
                <p className="text-xs text-red-300 leading-relaxed font-light">{error}</p>
              </div>
            </motion.div>
          )}
          {successMsg && (
            <motion.div 
              key="success"
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-2">
                <CheckCircle2 className="text-emerald-400 shrink-0 mt-0.5" size={14} />
                <p className="text-xs text-emerald-300 leading-relaxed font-light">{successMsg}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {view === 'unverified' ? (
          <div className="space-y-5 relative z-10">
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex flex-col items-center text-center gap-3">
              <p className="text-xs text-zinc-300 leading-relaxed">
                Verification link sent to <span className="text-white font-medium">{unverifiedUser?.email}</span>.
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
                  setSuccessMsg('Email resent.');
                } catch (err: any) {
                  setError(handleFirebaseError(err));
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="w-full bg-white text-black hover:bg-zinc-200 hover:scale-105 active:scale-95 text-sm font-bold rounded-full py-4 flex items-center justify-center transition-all disabled:opacity-50 shadow-[0_4px_16px_rgba(255,255,255,0.2),inset_0_1px_0_rgba(255,255,255,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Resend Email'}
            </button>
            <button 
              onClick={async () => {
                await signOut(auth);
                switchView('login');
              }}
              className="w-full text-xs text-zinc-400 hover:text-white transition-colors"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {view === 'register' && (
                <motion.div 
                  key="name-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <div className="relative">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                      <UserIcon size={14} />
                    </div>
                    <input 
                      type="text" 
                      value={name}
                      onChange={handleNameChange}
                      onBlur={() => setNameError(validateName(name))}
                      disabled={loading}
                      className={cn(
                        "w-full bg-zinc-950/80 border rounded-full py-4 pl-12 pr-4 text-sm font-medium text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/20 focus:bg-zinc-900 transition-all disabled:opacity-50 shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)]",
                        nameError ? "border-red-500/50 focus:border-red-500" : "border-transparent"
                      )
                      }
                      placeholder="Name"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1">
              <div className="relative">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                  <Mail size={14} />
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={() => setEmailError(validateEmail(email))}
                  disabled={loading}
                  className={cn(
                        "w-full bg-zinc-950/80 border rounded-full py-4 pl-12 pr-4 text-sm font-medium text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/20 focus:bg-zinc-900 transition-all disabled:opacity-50 shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)]",
                        emailError ? "border-red-500/50 focus:border-red-500" : "border-transparent"
                      )
                  }
                  placeholder="Email"
                />
              </div>
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
                  <div className="relative">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                      <Lock size={14} />
                    </div>
                    <input 
                      type="password" 
                      value={password}
                      onChange={handlePasswordChange}
                      onBlur={() => setPasswordError(validatePassword(password))}
                      disabled={loading}
                      className={cn(
                        "w-full bg-zinc-950/80 border rounded-full py-4 pl-12 pr-4 text-sm font-medium text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/20 focus:bg-zinc-900 transition-all disabled:opacity-50 shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)]",
                        passwordError ? "border-red-500/50 focus:border-red-500" : "border-transparent"
                      )
                      }
                      placeholder="Password"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-white hover:bg-zinc-200 hover:scale-105 active:scale-95 text-black text-sm font-bold rounded-full py-4 flex items-center justify-center transition-all disabled:opacity-50 shadow-[0_4px_16px_rgba(255,255,255,0.2),inset_0_1px_0_rgba(255,255,255,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <span>
                  {view === 'login' && 'Sign In'}
                  {view === 'register' && 'Sign Up'}
                  {view === 'forgot' && 'Send Link'}
                </span>
              )}
            </button>
          </form>
        )}

        {view !== 'forgot' && view !== 'unverified' && (
          <>
            <div className="my-8 flex items-center gap-4 relative z-10">
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-xs text-zinc-600 uppercase font-bold tracking-widest">or</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>

            <button 
              type="button" 
              onClick={handleGoogle}
              disabled={loading}
              className="w-full bg-zinc-950/80 hover:bg-zinc-900 border border-white/5 text-white text-sm font-bold rounded-full py-4 flex items-center justify-center gap-3 transition-all disabled:opacity-50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              <svg width="14" height="14" viewBox="0 0 24 24">
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
        <div className="mt-6 text-center text-sm font-medium text-zinc-500">
          {view === 'login' && (
            <div className="flex items-center justify-center gap-4">
              <button onClick={() => switchView('forgot')} className="hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded px-2 py-1">Forgot password?</button>
              <button onClick={() => switchView('register')} className="hover:text-white transition-colors">Sign up</button>
            </div>
          )}
          {view === 'register' && (
            <button onClick={() => switchView('login')} className="hover:text-white transition-colors">Sign in instead</button>
          )}
          {view === 'forgot' && (
            <button onClick={() => switchView('login')} className="hover:text-white transition-colors">Back to sign in</button>
          )}
        </div>
      )}
    </div>
  );
}

