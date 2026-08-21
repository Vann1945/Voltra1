import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Upload,
  LogIn,
  LogOut,
  Shield,
  LayoutGrid,
  List,
  Settings2,
  Flame,
  Zap,
  Palette,
  SunMedium,
  MoonStar,
  Monitor,
  Rows3,
  X,
  Home,
  Menu,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ViewState } from '../App';
import { ProfileAvatar } from './borderEffects';

interface NavbarProps {
  onOpenUpload: () => void;
  onOpenAuth: () => void;
  onNavigate: (view: ViewState) => void;
  currentView: ViewState;
  theme: 'light' | 'dark' | 'oled';
  onToggleTheme: () => void;
  onSetTheme: (theme: 'light' | 'dark' | 'oled') => void;
  layoutMode: 'grid' | 'list';
  onSetLayoutMode: (m: 'grid' | 'list') => void;
}

interface MobileBottomNavProps {
  user: { displayName?: string; photoURL?: string | null; profileBorder?: string; role?: string } | null;
  currentView: ViewState;
  layoutMode: 'grid' | 'list';
  theme: 'light' | 'dark' | 'oled';
  onNavigate: (view: ViewState) => void;
  onOpenAuth: () => void;
  onOpenUpload: () => void;
  onSetLayoutMode: (m: 'grid' | 'list') => void;
  onToggleTheme: () => void;
  onLogout: () => void;
}

interface ThemeToggleProps {
  theme: 'light' | 'dark' | 'oled';
  onToggle?: () => void;
}

interface WindowThemeToggleProps {
  theme: 'light' | 'dark' | 'oled';
  onToggle: () => void;
}

export function WindowThemeToggle({ theme, onToggle }: WindowThemeToggleProps) {
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
        .wtt-card:hover .wtt-frame { box-shadow: 0 34px 90px rgba(0,0,0,0.52), 0 0 48px rgba(255,138,69,0.24); }
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
        aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        className="wtt-card block w-full text-left rounded-3xl p-4 bg-parchment-raised shadow-card-float"
      >
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-[11px] font-bold tracking-wide uppercase text-ink-900/50">
            Voltra
          </span>
          <span className="text-sm font-bold text-ink-900">Appearance</span>
        </div>
        <div
          className="wtt-frame relative w-full aspect-[4/3] rounded-2xl overflow-hidden border-4 border-ink shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
        >
          <div
            className="wtt-sky absolute inset-0"
            style={{
              background: theme === 'light'
                ? 'linear-gradient(180deg, #f6a56c 0%, #ffd0a3 55%, #fff0d9 100%)'
                : 'linear-gradient(180deg, #1c0d08 0%, #3b1b10 55%, #71351c 100%)',
            }}
          />
          <div
            className="absolute inset-0 transition-opacity duration-700"
            style={{ opacity: theme === 'light' ? 0 : 1 }}
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
              opacity: theme === 'light' ? 1 : 0,
              transform: theme === 'light' ? 'scale(1) translateY(0)' : 'scale(0.5) translateY(10px)',
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
              opacity: theme === 'light' ? 0 : 1,
              transform: theme === 'light' ? 'scale(0.5) translateY(-10px)' : 'scale(1) translateY(0)',
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
                opacity: theme === 'light' ? 0.95 : 0.25,
              }}
            />
          ))}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-3 py-2 bg-gradient-to-t from-black/30 to-transparent">
            <div className="flex items-center gap-1.5">
              {theme === 'light' ? (
                <SunMedium size={13} className="text-white drop-shadow" strokeWidth={2.5} />
              ) : (
                <MoonStar size={13} className="text-white drop-shadow" strokeWidth={2.5} />
              )}
              <span className="text-xs font-bold text-white drop-shadow">
                {theme === 'light' ? 'Light mode' : theme === 'dark' ? 'Dark mode' : 'OLED'}
              </span>
            </div>
            <span className="text-[10px] font-medium text-white/80 drop-shadow">Tap to switch</span>
          </div>
        </div>
      </button>
    </div>
  );
}

export function ThemeToggle({ theme }: ThemeToggleProps) {
  return (
    <div
      aria-hidden="true"
      title={theme === 'light' ? 'Theme: Light' : theme === 'dark' ? 'Theme: Dark' : 'Theme: OLED'}
      className={`flex h-9 w-9 items-center justify-center rounded-lg border border-parchment-border ${
        theme === 'light' ? 'bg-terracotta text-ink-900' : 'bg-ink-900 text-paper'
      }`}
    >
      <Zap size={16} strokeWidth={2.5} className="drop-shadow-sm" />
    </div>
  );
}

function MobileBottomNav({
  user,
  currentView,
  layoutMode,
  theme,
  onNavigate,
  onOpenAuth,
  onOpenUpload,
  onSetLayoutMode,
  onToggleTheme,
  onLogout,
}: MobileBottomNavProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const themeLabel = theme === 'light' ? 'Light mode' : theme === 'dark' ? 'Dark mode' : 'OLED mode';

  const closeSheet = () => setIsSheetOpen(false);

  return (
    <>
      <AnimatePresence>
        {isSheetOpen && (
          <React.Fragment>
            <motion.div
              key="mobile-nav-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSheet}
              className="fixed inset-0 z-[190] bg-ink-900/40 sm:hidden"
            />
            <motion.div
              key="mobile-nav-sheet"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-[200] mx-3 flex flex-col gap-2 sm:hidden"
            >
              {user ? (
                <button
                  type="button"
                  onClick={() => { onNavigate(currentView === 'profile' ? 'home' : 'profile'); closeSheet(); }}
                  className="flex items-center gap-3 rounded-2xl bg-parchment-raised px-4 py-3.5 text-left shadow-card"
                >
                  <ProfileAvatar
                    photoURL={user.photoURL ?? null}
                    displayName={user.displayName}
                    borderValue={user.profileBorder ?? 'none'}
                    sizeClassName="h-9 w-9"
                    textSizeClassName="text-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink-900">{user.displayName}</p>
                    <p className="text-xs font-medium text-ink-900/50">View profile</p>
                  </div>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { onOpenAuth(); closeSheet(); }}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-terracotta px-4 py-3.5 text-sm font-bold text-ink-900 shadow-card"
                >
                  <LogIn size={16} />
                  Sign in
                </button>
              )}

              {user && (
                <button
                  type="button"
                  onClick={() => { onOpenUpload(); closeSheet(); }}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-parchment-raised px-4 py-3.5 text-sm font-bold text-ink-900 shadow-card"
                >
                  <Upload size={16} />
                  Publish
                </button>
              )}

              {user?.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => { onNavigate('admin'); closeSheet(); }}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-terracotta px-4 py-3.5 text-sm font-bold text-ink-900 shadow-card"
                >
                  <Shield size={16} />
                  Admin
                </button>
              )}

              <div className="flex gap-1.5 rounded-2xl bg-parchment-raised p-1.5 shadow-card">
                <button
                  type="button"
                  onClick={() => onSetLayoutMode('grid')}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold uppercase transition-all ${
                    layoutMode === 'grid' ? 'bg-terracotta text-ink-900' : 'text-ink-900/60'
                  }`}
                >
                  <LayoutGrid size={14} /> Grid
                </button>
                <button
                  type="button"
                  onClick={() => onSetLayoutMode('list')}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold uppercase transition-all ${
                    layoutMode === 'list' ? 'bg-terracotta text-ink-900' : 'text-ink-900/60'
                  }`}
                >
                  <List size={14} /> List
                </button>
              </div>

              <button
                type="button"
                onClick={onToggleTheme}
                className="flex items-center justify-center gap-2 rounded-2xl bg-parchment-raised px-4 py-3.5 text-sm font-bold text-ink-900 shadow-card"
              >
                <SunMedium size={16} />
                Change theme · {themeLabel}
              </button>

              {user && (
                <button
                  type="button"
                  onClick={() => { onLogout(); closeSheet(); }}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-parchment-raised px-4 py-3.5 text-sm font-bold text-ink-900/70 shadow-card"
                >
                  <LogOut size={16} />
                  Log out
                </button>
              )}
            </motion.div>
          </React.Fragment>
        )}
      </AnimatePresence>

      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-[150] flex items-stretch justify-around border-t border-parchment-border bg-parchment-raised sm:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <button
          type="button"
          onClick={() => { onNavigate('home'); closeSheet(); }}
          className={`flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-bold uppercase tracking-wide transition-colors ${
            currentView === 'home' ? 'text-terracotta-text' : 'text-ink-900/70'
          }`}
        >
          <Home size={20} strokeWidth={currentView === 'home' ? 2.5 : 2} />
          Home
        </button>
        <button
          type="button"
          onClick={() => { onNavigate('streak'); closeSheet(); }}
          className={`flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-bold uppercase tracking-wide transition-colors ${
            currentView === 'streak' ? 'text-terracotta-text' : 'text-ink-900/70'
          }`}
        >
          <Flame size={20} strokeWidth={currentView === 'streak' ? 2.5 : 2} />
          Streak
        </button>
        <button
          type="button"
          onClick={() => setIsSheetOpen((v) => !v)}
          className={`flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-bold uppercase tracking-wide transition-colors ${
            isSheetOpen ? 'text-terracotta-text' : 'text-ink-900/70'
          }`}
        >
          {isSheetOpen ? <X size={20} /> : <Menu size={20} />}
          Menu
        </button>
      </nav>
    </>
  );
}

export function Navbar({ onOpenUpload, onOpenAuth, onNavigate, currentView, theme, onToggleTheme, onSetTheme, layoutMode, onSetLayoutMode }: NavbarProps) {
  const { user, logout } = useAuth();
  const [isThemeCardOpen, setIsThemeCardOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const themeWrapperRef = useRef<HTMLDivElement>(null);
  const settingsWrapperRef = useRef<HTMLDivElement>(null);
  const themeOptions: Array<'light' | 'dark' | 'oled'> = ['light', 'dark', 'oled'];

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

  useEffect(() => {
    if (!isSettingsOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsWrapperRef.current && !settingsWrapperRef.current.contains(e.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSettingsOpen]);

  return (
    <>
    <nav className="sticky top-0 z-[100] w-full max-w-full overflow-x-clip bg-parchment-raised border-b border-parchment-border glass">
      <div className="mx-auto flex h-[65px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
          <div className="relative hidden sm:block" ref={themeWrapperRef}>
            <ThemeToggle theme={theme} />

            {isThemeCardOpen && (
              <div
                className="absolute left-0 top-full mt-3 w-[min(320px,calc(100vw-2rem))] z-[110]"
                style={{ animation: 'wtt-popover-in 0.2s cubic-bezier(0.16,1,0.3,1)' }}
              >
                <style>{`
                  @keyframes wtt-popover-in {
                    from { opacity: 0; transform: translateY(-8px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                  }
                `}</style>
                <WindowThemeToggle
                  theme={theme}
                  onToggle={() => {
                    onToggleTheme();
                    setIsThemeCardOpen(false);
                  }}
                />
              </div>
            )}
          </div>

          <span
            className="text-[20px] font-bold text-ink-900 tracking-tight uppercase cursor-pointer"
            onClick={() => onNavigate('home')}
          >
            Voltra
          </span>
        </div>


        <div className="hidden items-center gap-2 sm:flex sm:gap-3">
          <button
            type="button"
            onClick={() => onNavigate('streak')}
            className={`group/streak flex items-center rounded-lg px-3 py-2 text-sm font-bold transition-all ${
              currentView === 'streak' ? 'bg-terracotta text-ink-900 shadow-card' : 'bg-parchment-raised text-ink-900 shadow-card btn-3d'
            }`}
            title="Open streak"
          >
            <Flame size={15} className="shrink-0" />
            <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 ease-in-out group-hover/streak:max-w-[70px] group-hover/streak:opacity-100 group-hover/streak:ml-2">
              Streak
            </span>
          </button>

          <div className="relative" ref={settingsWrapperRef}>
            <button
              type="button"
              onClick={() => setIsSettingsOpen((v) => !v)}
              className="group/settings flex items-center rounded-lg bg-parchment-raised px-3 py-2 text-sm font-bold text-ink-900 shadow-card btn-3d"
              title="Open settings"
            >
              <Settings2 size={15} className="shrink-0" />
              <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 ease-in-out group-hover/settings:max-w-[70px] group-hover/settings:opacity-100 group-hover/settings:ml-2">
                Settings
              </span>
            </button>

            <AnimatePresence>
              {isSettingsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="absolute right-0 top-full z-[120] mt-3 w-[min(300px,calc(100vw-2rem))] rounded-[28px] border border-parchment-border bg-parchment-raised/95 p-4 shadow-[0_28px_80px_rgba(20,20,19,0.14),0_12px_28px_rgba(20,20,19,0.08),inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-xl"
                >
                  <div className="mb-4 flex items-center justify-between gap-3 border-b border-parchment-border pb-3">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-ink-900/45">Controls</p>
                      <h3 className="mt-1 text-base font-bold text-ink-900">Settings</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-terracotta text-ink-900 shadow-[0_6px_18px_rgba(217,119,87,0.18)]">
                        <Settings2 size={16} strokeWidth={2.2} />
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsSettingsOpen(false)}
                        aria-label="Close settings"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-parchment-border bg-parchment-raised text-ink-900/70 transition-all hover:border-ink-900/20 hover:text-ink-900"
                      >
                        <X size={14} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl bg-ink-900/[0.03] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
                      <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-900/55">
                        <Palette size={12} strokeWidth={2.2} />
                        Appearance
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {themeOptions.map((option) => {
                          const isActive = theme === option;
                          const label = option === 'light' ? 'Light' : option === 'dark' ? 'Dark' : 'OLED';
                          const Icon = option === 'light' ? SunMedium : option === 'dark' ? MoonStar : Monitor;

                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                onSetTheme(option);
                                setIsSettingsOpen(false);
                              }}
                              className={`rounded-xl border px-2 py-2.5 text-[10px] font-bold uppercase tracking-wide transition-all ${
                                isActive
                                  ? 'border-terracotta bg-terracotta text-ink-900 shadow-[0_8px_20px_rgba(217,119,87,0.18)]'
                                  : 'border-parchment-border bg-parchment-raised text-ink-900/70 hover:border-ink-900/20 hover:text-ink-900'
                              }`}
                            >
                              <div className="flex flex-col items-center justify-center gap-1">
                                <Icon size={14} strokeWidth={2.2} />
                                <span>{label}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-ink-900/[0.03] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
                      <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-900/55">
                        <Rows3 size={12} strokeWidth={2.2} />
                        Design
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onSetLayoutMode('grid');
                            setIsSettingsOpen(false);
                          }}
                          className={`rounded-xl border px-2 py-2.5 text-[10px] font-bold uppercase tracking-wide transition-all ${
                            layoutMode === 'grid'
                              ? 'border-terracotta bg-terracotta text-ink-900 shadow-[0_8px_20px_rgba(217,119,87,0.18)]'
                              : 'border-parchment-border bg-parchment-raised text-ink-900/70 hover:border-ink-900/20 hover:text-ink-900'
                          }`}
                        >
                          <div className="flex flex-col items-center justify-center gap-1">
                            <LayoutGrid size={14} strokeWidth={2.2} />
                            Grid
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onSetLayoutMode('list');
                            setIsSettingsOpen(false);
                          }}
                          className={`rounded-xl border px-2 py-2.5 text-[10px] font-bold uppercase tracking-wide transition-all ${
                            layoutMode === 'list'
                              ? 'border-terracotta bg-terracotta text-ink-900 shadow-[0_8px_20px_rgba(217,119,87,0.18)]'
                              : 'border-parchment-border bg-parchment-raised text-ink-900/70 hover:border-ink-900/20 hover:text-ink-900'
                          }`}
                        >
                          <div className="flex flex-col items-center justify-center gap-1">
                            <List size={14} strokeWidth={2.2} />
                            List
                          </div>
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-ink-900/[0.03] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
                      <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-900/55">
                        <Flame size={12} strokeWidth={2.2} />
                        Streak
                      </div>
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => {
                            onNavigate('streak');
                            setIsSettingsOpen(false);
                          }}
                          className="flex w-full items-center justify-between rounded-xl border border-parchment-border bg-parchment-raised px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-ink-900/80 transition-all hover:border-ink-900/20 hover:text-ink-900 hover:shadow-[0_8px_18px_rgba(0,0,0,0.04)]"
                        >
                          <span>Open Streak</span>
                          <Flame size={12} strokeWidth={2.2} />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onSetLayoutMode('list');
                            onNavigate('streak');
                            setIsSettingsOpen(false);
                          }}
                          className="flex w-full items-center justify-between rounded-xl border border-terracotta bg-terracotta px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-ink-900 transition-all hover:brightness-105 shadow-[0_8px_20px_rgba(217,119,87,0.16)]"
                        >
                          <span>Compact List</span>
                          <List size={12} strokeWidth={2.2} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {user ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenUpload}
                className="group/publish flex items-center bg-parchment-raised rounded-lg px-3 py-2 text-sm font-bold text-ink-900 shadow-card btn-3d"
              >
                <Upload size={15} className="shrink-0" />
                <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 ease-in-out group-hover/publish:max-w-[90px] group-hover/publish:opacity-100 group-hover/publish:ml-2">
                  Publish
                </span>
              </button>

              {user.role === 'admin' && (
                <button
                  onClick={() => onNavigate('admin')}
                  className="group/admin flex items-center bg-terracotta rounded-lg px-3 py-2 text-sm font-bold text-ink-900 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-px"
                >
                  <Shield size={15} className="shrink-0" />
                  <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 ease-in-out group-hover/admin:max-w-[90px] group-hover/admin:opacity-100 group-hover/admin:ml-2">
                    Admin
                  </span>
                </button>
              )}

              <button
                onClick={() => onNavigate(currentView === 'home' ? 'profile' : 'home')}
                className="group/profile flex items-center bg-parchment-raised rounded-lg px-3 py-2 text-sm font-bold text-ink-900 shadow-card btn-3d"
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
              <div className="h-6 w-px bg-ink-900/10 hidden sm:block" />
              <button
                onClick={logout}
                className="p-2 rounded-lg bg-parchment-raised text-ink-900 shadow-card btn-3d"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="group/signin flex items-center bg-parchment-raised rounded-lg px-3 py-2 text-sm font-bold text-ink-900 shadow-card btn-3d"
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

    <MobileBottomNav
      user={user}
      currentView={currentView}
      layoutMode={layoutMode}
      theme={theme}
      onNavigate={onNavigate}
      onOpenAuth={onOpenAuth}
      onOpenUpload={onOpenUpload}
      onSetLayoutMode={onSetLayoutMode}
      onToggleTheme={onToggleTheme}
      onLogout={logout}
    />
    </>
  );
}

