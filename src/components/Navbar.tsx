import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Upload, LogIn, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ViewState } from '../App';
import { ProfileAvatar } from './borderEffects';

interface NavbarProps {
  onOpenUpload: () => void;
  onOpenAuth: () => void;
  onNavigate: (view: ViewState) => void;
  currentView: ViewState;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

interface ThemeToggleProps {
  isDarkMode: boolean;
  onToggle: () => void;
}

interface WindowThemeToggleProps {
  isDarkMode: boolean;
  onToggle: () => void;
}

export function WindowThemeToggle({ isDarkMode, onToggle }: WindowThemeToggleProps) {
  const stars = React.useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        top: `${8 + ((i * 37) % 70)}%`,
        left: `${5 + ((i * 53) % 90)}%`,
        size: i % 3 === 0 ? 2.5 : 1.5,
        delay: (i % 5) * 0.4,
      })),
    []
  );

  return (
    <div className="w-full max-w-sm mx-auto select-none">
      <style>{`
        .wtt-card { transition: transform 0.28s cubic-bezier(0.16,1,0.3,1), filter 0.28s ease; }
        .wtt-card:hover { transform: translateY(-6px) scale(1.015); filter: brightness(1.05); }
        .wtt-card:hover .wtt-frame { box-shadow: 0 34px 90px rgba(0,0,0,0.52), 0 0 48px rgba(255,190,100,0.22); }
        .wtt-card:active { transform: translateY(-1px) scale(0.985); transition-duration: 0.12s; }
        .wtt-frame { transition: box-shadow 0.28s ease, background 0.6s ease; }
        .wtt-sky { transition: background 0.7s ease; }
        .wtt-cloud { transition: opacity 0.6s ease, filter 0.6s ease; }
        .wtt-sun { transition: opacity 0.6s ease, transform 0.6s ease; }
        .wtt-moon { transition: opacity 0.6s ease, transform 0.6s ease; }
        .wtt-star { animation: wtt-twinkle 2.4s ease-in-out infinite; }
        @keyframes wtt-twinkle { 0%,100% { opacity: 0.15; } 50% { opacity: 1; } }
      `}</style>

      <button
        type="button"
        onClick={onToggle}
        aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        className="wtt-card block w-full text-left rounded-3xl p-4 bg-paper shadow-card-float"
      >
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-[11px] font-bold tracking-wide uppercase text-ink/50">
            Voltra
          </span>
          <span className="text-sm font-bold text-ink">Appearance</span>
        </div>
        <div
          className="wtt-frame relative w-full aspect-[4/3] rounded-2xl overflow-hidden border-4 border-ink shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
        >
          <div
            className="wtt-sky absolute inset-0"
            style={{
              background: isDarkMode
                ? 'linear-gradient(180deg, #0d1128 0%, #1a1f3d 55%, #2a2650 100%)'
                : 'linear-gradient(180deg, #6fb3e0 0%, #9ed4ef 55%, #cfeaf7 100%)',
            }}
          />
          <div
            className="absolute inset-0 transition-opacity duration-700"
            style={{ opacity: isDarkMode ? 1 : 0 }}
          >
            {stars.map((s, i) => (
              <div
                key={i}
                className="wtt-star absolute rounded-full bg-white"
                style={{
                  top: s.top,
                  left: s.left,
                  width: s.size,
                  height: s.size,
                  animationDelay: `${s.delay}s`,
                }}
              />
            ))}
          </div>

          <div
            className="wtt-sun absolute rounded-full"
            style={{
              top: '18%',
              right: '20%',
              width: 46,
              height: 46,
              background: 'radial-gradient(circle, #ffe27a 0%, #ffc23c 60%, #ffb020 100%)',
              boxShadow: '0 0 40px 14px rgba(255,190,60,0.55)',
              opacity: isDarkMode ? 0 : 1,
              transform: isDarkMode ? 'scale(0.5) translateY(10px)' : 'scale(1) translateY(0)',
            }}
          />
          <div
            className="wtt-moon absolute rounded-full"
            style={{
              top: '14%',
              right: '16%',
              width: 42,
              height: 42,
              background: 'radial-gradient(circle at 35% 35%, #e8ecf5 0%, #b9c2d6 55%, #8f9ab3 100%)',
              boxShadow: '0 0 26px 6px rgba(180,190,220,0.35)',
              opacity: isDarkMode ? 1 : 0,
              transform: isDarkMode ? 'scale(1) translateY(0)' : 'scale(0.5) translateY(-10px)',
            }}
          />
          {[
            { top: '55%', left: '8%', w: 120, h: 44, blur: 0 },
            { top: '68%', left: '48%', w: 150, h: 50, blur: 0 },
            { top: '38%', left: '62%', w: 90, h: 34, blur: 1 },
          ].map((c, i) => (
            <div
              key={i}
              className="wtt-cloud absolute rounded-full bg-white"
              style={{
                top: c.top,
                left: c.left,
                width: c.w,
                height: c.h,
                filter: `blur(${c.blur}px)`,
                opacity: isDarkMode ? 0.25 : 0.95,
              }}
            />
          ))}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-3 py-2 bg-gradient-to-t from-black/30 to-transparent">
            <div className="flex items-center gap-1.5">
              {isDarkMode ? (
                <Moon size={13} className="text-white drop-shadow" fill="white" strokeWidth={0} />
              ) : (
                <Sun size={13} className="text-white drop-shadow" fill="white" strokeWidth={0} />
              )}
              <span className="text-xs font-bold text-white drop-shadow">
                {isDarkMode ? 'Dark mode' : 'Light mode'}
              </span>
            </div>
            <span className="text-[10px] font-medium text-white/80 drop-shadow">Tap to switch</span>
          </div>
        </div>
      </button>
    </div>
  );
}

export function ThemeToggle({ isDarkMode, onToggle }: ThemeToggleProps) {
  const maskId = React.useId();

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`flex h-9 w-9 items-center justify-center rounded-lg shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-px ${
        isDarkMode ? 'bg-ink' : 'bg-accent'
      }`}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        className="transition-transform duration-500 ease-in-out"
        style={{ transform: isDarkMode ? 'rotate(-40deg)' : 'rotate(0deg)' }}
      >
        <g
          className="transition-all duration-500 ease-in-out"
          style={{
            opacity: isDarkMode ? 0 : 1,
            transform: isDarkMode ? 'scale(0.4)' : 'scale(1)',
            transformOrigin: '12px 12px',
          }}
        >
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <line
              key={deg}
              x1="12"
              y1="2.5"
              x2="12"
              y2="5"
              stroke="#f0eee2"
              strokeWidth="2"
              strokeLinecap="round"
              transform={`rotate(${deg} 12 12)`}
            />
          ))}
        </g>

        <mask id={maskId}>
          <rect x="0" y="0" width="24" height="24" fill="white" />
          <circle
            cx={isDarkMode ? 16.5 : 30}
            cy="9"
            r="6"
            fill="black"
            className="transition-all duration-500 ease-in-out"
          />
        </mask>
        <circle cx="12" cy="12" r="5.5" fill="#f0eee2" mask={`url(#${maskId})`} />
      </svg>
    </button>
  );
}

export function Navbar({ onOpenUpload, onOpenAuth, onNavigate, currentView, isDarkMode, onToggleDarkMode }: NavbarProps) {
  const { user, logout } = useAuth();
  const [isThemeCardOpen, setIsThemeCardOpen] = useState(false);
  const themeWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isThemeCardOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (themeWrapperRef.current && !themeWrapperRef.current.contains(e.target as Node)) {
        setIsThemeCardOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isThemeCardOpen]);

  return (
    <nav className="sticky top-0 z-[100] w-full bg-paper border-b border-ink/10">
      <div className="mx-auto flex h-[65px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="relative" ref={themeWrapperRef}>
            <ThemeToggle isDarkMode={isDarkMode} onToggle={() => setIsThemeCardOpen((v) => !v)} />

            {isThemeCardOpen && (
              <div
                className="absolute left-0 top-full mt-3 w-[320px] z-[110]"
                style={{ animation: 'wtt-popover-in 0.2s cubic-bezier(0.16,1,0.3,1)' }}
              >
                <style>{`
                  @keyframes wtt-popover-in {
                    from { opacity: 0; transform: translateY(-8px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                  }
                `}</style>
                <WindowThemeToggle
                  isDarkMode={isDarkMode}
                  onToggle={() => {
                    onToggleDarkMode();
                    setIsThemeCardOpen(false);
                  }}
                />
              </div>
            )}
          </div>

          <span
            className="text-[20px] font-bold text-ink tracking-tight uppercase cursor-pointer"
            onClick={() => onNavigate('home')}
          >
            Voltra
          </span>
        </div>


        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenUpload}
                className="group/publish flex items-center bg-paper rounded-lg px-3 py-2 text-sm font-bold text-ink shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-px"
              >
                <Upload size={15} className="shrink-0" />
                <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 ease-in-out group-hover/publish:max-w-[90px] group-hover/publish:opacity-100 group-hover/publish:ml-2">
                  Publish
                </span>
              </button>

              {user.role === 'admin' && (
                <button
                  onClick={() => onNavigate('admin')}
                  className="group/admin flex items-center bg-accent rounded-lg px-3 py-2 text-sm font-bold text-ink shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-px"
                >
                  <Shield size={15} className="shrink-0" />
                  <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 ease-in-out group-hover/admin:max-w-[90px] group-hover/admin:opacity-100 group-hover/admin:ml-2">
                    Admin
                  </span>
                </button>
              )}

              <button
                onClick={() => onNavigate(currentView === 'home' ? 'profile' : 'home')}
                className="group/profile flex items-center bg-paper rounded-lg px-3 py-2 text-sm font-bold text-ink shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-px"
              >
                <ProfileAvatar
                  photoURL={user.photoURL}
                  displayName={user.displayName}
                  borderValue={user.profileBorder}
                  sizeClassName="h-6 w-6"
                  textSizeClassName="text-xs"
                />
                <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 ease-in-out group-hover/profile:max-w-[90px] group-hover/profile:opacity-100 group-hover/profile:ml-2">
                  {currentView === 'home' ? 'Profile' : 'Home'}
                </span>
              </button>
              <div className="h-6 w-px bg-ink/10 hidden sm:block" />
              <button
                onClick={logout}
                className="p-2 rounded-lg bg-paper text-ink shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-px"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="group/signin flex items-center bg-paper rounded-lg px-3 py-2 text-sm font-bold text-ink shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-px"
            >
              <LogIn size={16} className="shrink-0" />
              <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 ease-in-out group-hover/signin:max-w-[90px] group-hover/signin:opacity-100 group-hover/signin:ml-2">
                Sign In
              </span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

