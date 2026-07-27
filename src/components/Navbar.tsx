import React, { useState, useEffect } from 'react';
import { Upload, LogIn, LogOut, Zap, User as UserIcon, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ViewState } from '../App';
import { FadeImage } from './FadeImage';

interface NavbarProps {
  onOpenUpload: () => void;
  onOpenAuth: () => void;
  onNavigate: (view: ViewState) => void;
  currentView: ViewState;
}

export function Navbar({ onOpenUpload, onOpenAuth, onNavigate, currentView }: NavbarProps) {
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getBorderClass = (borderType?: string) => {
    switch (borderType) {
      case 'gold': return 'ring-1 ring-amber-400';
      case 'neon': return 'ring-1 ring-cyan-400';
      case 'fire': return 'ring-1 ring-rose-500';
      case 'void': return 'ring-1 ring-purple-500';
      default: return 'border border-zinc-700/50';
    }
  };

  return (
    <header className={`sticky top-0 z-50 w-full transition-all duration-300 ${
      scrolled 
        ? 'bg-zinc-950/85 backdrop-blur-xl border-b border-zinc-800/80 shadow-lg shadow-black/20' 
        : 'bg-transparent border-b border-transparent shadow-none'
    }`}>
      <nav 
        className={`mx-auto flex items-center justify-between max-w-7xl px-4 sm:px-6 lg:px-8 transition-all duration-300 ${scrolled ? 'h-14' : 'h-16'}`} 
        aria-label="Main Navigation"
      >
        <button 
          onClick={() => onNavigate('home')} 
          className="flex items-center gap-2.5 group focus:outline-none rounded-lg px-2 py-1 transition-colors hover:bg-zinc-800/50"
          aria-label="Voltra Home"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-white border border-zinc-700/60 shadow-sm transition-transform duration-200 group-hover:scale-105">
            <Zap size={15} strokeWidth={2} className="fill-white/20 text-white" aria-hidden="true" />
          </div>
          <span className="text-base font-semibold tracking-tight text-white">
            Voltra
          </span>
        </button>

        <div className="flex items-center gap-2.5 sm:gap-3">
          {user ? (
            <div className="flex items-center gap-2.5">
              <button
                onClick={onOpenUpload}
                className="flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3.5 py-1.5 text-xs font-medium text-zinc-900 shadow-sm transition-all hover:bg-white active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                aria-label="Publish Add-on"
              >
                <Upload size={13} aria-hidden="true" strokeWidth={2} />
                <span className="hidden sm:inline-block">Publish</span>
              </button>
              
              {user.role === 'admin' && (
                <button
                  onClick={() => onNavigate('admin')}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-all hover:bg-zinc-800 hover:text-white active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
                  aria-label="Admin Panel"
                >
                  <Shield size={13} aria-hidden="true" />
                  <span className="hidden sm:inline-block">Admin</span>
                </button>
              )}
              
              <button
                onClick={() => onNavigate(currentView === 'home' ? 'profile' : 'home')}
                className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/80 py-1 pl-1 pr-2.5 text-xs font-medium text-zinc-300 transition-all hover:bg-zinc-800 hover:text-white active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
                aria-label={currentView === 'home' ? 'Go to Profile' : 'Go to Home'}
              >
                {user.photoURL ? (
                  <div className={`h-6 w-6 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700/50 ${getBorderClass(user.profileBorder)}`}>
                    <FadeImage src={user.photoURL} alt={`${user.displayName}'s avatar`} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                ) : (
                  <div className={`h-6 w-6 rounded-full bg-zinc-800 flex items-center justify-center text-[11px] font-medium border border-zinc-700/50 ${getBorderClass(user.profileBorder)}`} aria-hidden="true">
                    {user.displayName.charAt(0)}
                  </div>
                )}
                <span className="hidden sm:inline-block">{currentView === 'home' ? 'Profile' : 'Home'}</span>
              </button>

              <div className="h-4 w-[1px] bg-zinc-800 hidden sm:block mx-0.5" aria-hidden="true"></div>

              <button
                onClick={logout}
                className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800/80 hover:text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut size={15} aria-hidden="true" strokeWidth={2} />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3.5 py-1.5 text-xs font-medium text-zinc-900 shadow-sm transition-all hover:bg-white active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
              aria-label="Sign In"
            >
              <LogIn size={13} aria-hidden="true" strokeWidth={2} />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}
