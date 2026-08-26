'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Bookmark, ChevronDown, Flame, LogIn, LogOut, Menu, Settings as SettingsIcon, Shield, Upload, UserRound, X, Zap } from '@/components/icons/animated';
import { useAuth } from '@/hooks/useAuth';
import { ViewState } from '@/types';
import { ProfileAvatar } from './borderEffects';
import { getButtonClasses, HAPTIC_PATTERNS } from '@/lib/designSystem';

interface NavbarProps {
  onOpenUpload: () => void;
  onOpenAuth: () => void;
  onNavigate: (view: ViewState) => void;
  currentView: ViewState;

}

interface MobileBottomNavProps {
  user: { displayName?: string; photoURL?: string | null; profileBorder?: string; role?: string } | null;
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  onOpenAuth: () => void;
  onOpenUpload: () => void;
  onLogout: () => void;
}

function MobileBottomNav({ user, currentView, onNavigate, onOpenAuth, onOpenUpload, onLogout }: MobileBottomNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const act = (callback: () => void) => { HAPTIC_PATTERNS.light(); callback(); };
  const active = (view: string) => view === 'library' ? currentView === 'library' || currentView === 'bookmarks' : currentView === view;
  const closeAnd = (callback: () => void) => act(() => { callback(); setIsOpen(false); });

  return <>
    <div className={`${isOpen ? 'block' : 'hidden'} fixed inset-0 z-[190] bg-ink-900/35 sm:hidden`} onClick={() => setIsOpen(false)} />
    <div className={`${isOpen ? 'flex' : 'hidden'} fixed inset-x-4 bottom-[calc(72px+env(safe-area-inset-bottom))] z-[210] flex-col gap-2 rounded-2xl border border-parchment-border bg-parchment-raised p-3 shadow-card-float sm:hidden`} role="dialog" aria-modal="true" aria-labelledby="quick-actions-title">
      <div className="flex items-center justify-between border-b border-parchment-border px-1 pb-3">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-terracotta-text">Your space</p><span id="quick-actions-title" className="text-sm font-bold">Quick actions</span></div>
        <button type="button" onClick={() => setIsOpen(false)} aria-label="Close menu" className="rounded-lg p-2 text-ink-900/55 hover:bg-ink-900/[0.05]"><X size={16} /></button>
      </div>
      {user ? <button type="button" onClick={() => closeAnd(() => onNavigate('profile'))} className="flex items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-ink-900/[0.04]">
        <ProfileAvatar photoURL={user.photoURL ?? null} displayName={user.displayName || 'User'} borderValue={user.profileBorder ?? 'none'} sizeClassName="h-10 w-10" textSizeClassName="text-sm" />
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{user.displayName}</span><span className="block text-xs text-ink-900/55">Open profile</span></span><ChevronDown size={15} className="-rotate-90 text-ink-900/40" />
      </button> : <button type="button" onClick={() => closeAnd(onOpenAuth)} className={`${getButtonClasses('primary', 'md')} w-full`}><LogIn size={16} /> Sign in</button>}
      {user && <button type="button" onClick={() => closeAnd(onOpenUpload)} className={`${getButtonClasses('secondary', 'md')} w-full`}><Upload size={16} /> Publish an add-on</button>}
      <button type="button" onClick={() => closeAnd(() => onNavigate('streak'))} className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold hover:bg-ink-900/[0.04]"><Flame size={16} /> Streak</button>
      <button type="button" onClick={() => closeAnd(() => onNavigate('settings'))} className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold hover:bg-ink-900/[0.04]"><SettingsIcon size={16} /> Settings</button>
      {user?.role === 'admin' && <button type="button" onClick={() => closeAnd(() => onNavigate('admin'))} className={`${getButtonClasses('secondary', 'md')} w-full`}><Shield size={16} /> Admin</button>}
      {user && <button type="button" onClick={() => closeAnd(onLogout)} className="flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold text-danger hover:bg-danger/[0.07]"><LogOut size={14} />Log out</button>}
    </div>
    <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-[150] flex items-stretch justify-around gap-1 border-t border-parchment-border bg-parchment-raised/95 px-1 shadow-[0_-4px_16px_rgba(23,35,41,0.06)] backdrop-blur sm:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <button type="button" onClick={() => act(() => onNavigate('home'))} className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-bold ${active('home') ? 'text-terracotta-text' : 'text-ink-900/70'}`}><Zap size={18} />Explore</button>
      <button type="button" onClick={() => act(() => onNavigate('library'))} aria-current={active('library') ? 'page' : undefined} className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-bold ${active('library') ? 'text-terracotta-text' : 'text-ink-900/70'}`}><Bookmark size={18} preset="tap-fold" />Bookmark</button>
      <button type="button" onClick={() => act(() => setIsOpen(value => !value))} aria-expanded={isOpen} className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-bold ${isOpen ? 'text-terracotta-text' : 'text-ink-900/70'}`}>{isOpen ? <X size={18} preset="tap-spin" /> : <Menu size={18} preset="tap-spin" />}Menu</button>
    </nav>
  </>;
}

export function Navbar({ onOpenUpload, onOpenAuth, onNavigate, currentView }: NavbarProps) {
  const { user, logout } = useAuth();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const isHome = currentView === 'home';
  const isStreak = currentView === 'streak';
  const isLibrary = currentView === 'library' || currentView === 'bookmarks';
  const isSettings = currentView === 'settings';

  useEffect(() => {
    if (!profileMenuOpen) return;
    const closeOnOutside = (event: MouseEvent) => { if (!profileMenuRef.current?.contains(event.target as Node)) setProfileMenuOpen(false); };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setProfileMenuOpen(false); };
    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.removeEventListener('mousedown', closeOnOutside); document.removeEventListener('keydown', closeOnEscape); };
  }, [profileMenuOpen]);

  const goFromProfile = (view: ViewState) => { HAPTIC_PATTERNS.light(); onNavigate(view); setProfileMenuOpen(false); };

  return <>
    <nav aria-label="Primary navigation" className="sticky top-0 z-[100] border-b border-parchment-border bg-parchment-raised/90 shadow-[0_1px_0_rgba(23,35,41,0.02)] backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <button type="button" onClick={() => onNavigate('home')} className="group flex items-center gap-3 text-left"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-900 text-terracotta shadow-sm transition-transform duration-200 group-hover:-rotate-3 group-active:scale-95"><Zap size={18} /></span><span className="text-lg font-bold tracking-tight">Voltra</span></button>
        <div className="hidden items-center gap-1 rounded-2xl border border-parchment-border bg-parchment px-1.5 py-1.5 sm:flex">
          <button type="button" onClick={() => onNavigate('home')} aria-current={isHome ? 'page' : undefined} className={`rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${isHome ? 'bg-ink-900 text-paper' : 'text-ink-900/65 hover:bg-ink-900/[0.05]'}`}>Explore</button>
          <button type="button" onClick={() => onNavigate('library')} aria-current={isLibrary ? 'page' : undefined} className={`rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${isLibrary ? 'bg-ink-900 text-paper' : 'text-ink-900/65 hover:bg-ink-900/[0.05]'}`}><span className="inline-flex items-center gap-2"><Bookmark size={15} />Bookmark</span></button>
          <button type="button" onClick={() => onNavigate('streak')} className={`rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${isStreak ? 'bg-ink-900 text-paper' : 'text-ink-900/65 hover:bg-ink-900/[0.05]'}`}><span className="inline-flex items-center gap-2"><Flame size={15} />Streak</span></button>
          <button type="button" onClick={() => onNavigate('settings')} aria-current={isSettings ? 'page' : undefined} className={`rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${isSettings ? 'bg-ink-900 text-paper' : 'text-ink-900/65 hover:bg-ink-900/[0.05]'}`}><span className="inline-flex items-center gap-2"><SettingsIcon size={15} />Settings</span></button>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          {user ? <>
            <button type="button" onClick={onOpenUpload} className={getButtonClasses('primary', 'sm')}><Upload size={15} />Publish</button>
            {user.role === 'admin' && <button type="button" onClick={() => onNavigate('admin')} className={getButtonClasses('secondary', 'sm')}><Shield size={15} />Admin</button>}
            <div className="relative" ref={profileMenuRef}>
              <button type="button" onClick={() => setProfileMenuOpen(value => !value)} aria-haspopup="menu" aria-expanded={profileMenuOpen} aria-controls="profile-menu" className={`flex min-h-10 items-center gap-2 rounded-xl border px-2.5 text-sm font-bold transition-[border-color,background-color,box-shadow] ${profileMenuOpen ? 'border-terracotta bg-terracotta/10 shadow-sm' : 'border-parchment-border bg-parchment-raised hover:border-terracotta/70'}`}>
                <ProfileAvatar photoURL={user.photoURL} displayName={user.displayName} borderValue={user.profileBorder} sizeClassName="h-7 w-7" textSizeClassName="text-[10px]" /><span className="max-w-28 truncate">{user.displayName}</span><ChevronDown size={15} className={`text-ink-900/45 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {profileMenuOpen && <div id="profile-menu" role="menu" className="absolute right-0 top-full mt-3 w-[min(320px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-parchment-border bg-parchment-raised p-2 shadow-card-float">
                <div className="flex items-center gap-3 rounded-xl bg-parchment px-3 py-3"><ProfileAvatar photoURL={user.photoURL} displayName={user.displayName} borderValue={user.profileBorder} sizeClassName="h-11 w-11" textSizeClassName="text-sm" /><div className="min-w-0"><p className="truncate text-sm font-bold text-ink-900">{user.displayName}</p><p className="mt-0.5 truncate text-xs text-ink-900/55">Your Voltra profile</p></div></div>
                <div className="mt-2 grid gap-1">
                  <button type="button" role="menuitem" onClick={() => goFromProfile('profile')} className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold hover:bg-ink-900/[0.05]"><UserRound size={16} />View profile</button>
                  <button type="button" role="menuitem" onClick={() => { HAPTIC_PATTERNS.light(); onOpenUpload(); setProfileMenuOpen(false); }} className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold hover:bg-ink-900/[0.05]"><Upload size={16} />Publish an add-on</button>
                  <button type="button" role="menuitem" onClick={() => goFromProfile('library')} className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold hover:bg-ink-900/[0.05]"><Bookmark size={16} />Bookmark <span className="ml-auto text-xs font-medium text-ink-900/45">Bookmarks + liked</span></button>
                  <button type="button" role="menuitem" onClick={() => goFromProfile('streak')} className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold hover:bg-ink-900/[0.05]"><Flame size={16} />Streak</button>
                  <button type="button" role="menuitem" onClick={() => goFromProfile('settings')} className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold hover:bg-ink-900/[0.05]"><SettingsIcon size={16} />Settings</button>
                </div>
                {user.role === 'admin' && <button type="button" role="menuitem" onClick={() => goFromProfile('admin')} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold hover:bg-ink-900/[0.05]"><Shield size={16} />Admin</button>}
                <button type="button" role="menuitem" onClick={() => { logout(); setProfileMenuOpen(false); }} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold text-danger hover:bg-danger/[0.07]"><LogOut size={16} />Log out</button>
              </div>}
            </div>
          </> : <button type="button" onClick={onOpenAuth} className={getButtonClasses('primary', 'sm')}><LogIn size={15} />Sign in</button>}
        </div>
      </div>
    </nav>
    <MobileBottomNav user={user} currentView={currentView} onNavigate={onNavigate} onOpenAuth={onOpenAuth} onOpenUpload={onOpenUpload} onLogout={logout} />
  </>;
}
