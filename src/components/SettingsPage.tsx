import { ArrowLeft, Check, LayoutGrid, List, MoonStar, Settings as SettingsIcon, SunMedium } from '@/components/icons/animated';
import { ViewState } from '@/types';
import type { Language } from '@/providers/AppShellProvider';
import { useT } from '@/lib/i18n';
import { useState } from 'react';

interface SettingsPageProps {
  theme: 'light' | 'dark' | 'oled';
  layoutMode: 'grid' | 'list';
  onSetTheme: (theme: 'light' | 'dark' | 'oled') => void;
  onSetLayoutMode: (mode: 'grid' | 'list') => void;
  bookmarksLayoutMode: 'grid' | 'list';
  onSetBookmarksLayoutMode: (mode: 'grid' | 'list') => void;
  profileLayoutMode: 'grid' | 'list';
  onSetProfileLayoutMode: (mode: 'grid' | 'list') => void;
  language: Language;
  onSetLanguage: (language: Language) => void;
  onNavigate: (view: ViewState) => void;
}

function LayoutOptionCard({
  headingId,
  title,
  description,
  value,
  onChange,
  gridLabel,
  listLabel,
  gridDesc,
  listDesc,
}: {
  headingId: string;
  title: string;
  description: string;
  value: 'grid' | 'list';
  onChange: (mode: 'grid' | 'list') => void;
  gridLabel: string;
  listLabel: string;
  gridDesc: string;
  listDesc: string;
}) {
  const options = [
    { value: 'grid' as const, label: gridLabel, description: gridDesc, icon: LayoutGrid },
    { value: 'list' as const, label: listLabel, description: listDesc, icon: List },
  ];
  return (
    <section className="rounded-2xl border border-parchment-border bg-parchment-raised p-5 shadow-card sm:p-6" aria-labelledby={headingId}>
      <div className="flex items-start gap-3">
        <LayoutGrid size={18} className="mt-0.5 text-terracotta-text" aria-hidden="true" />
        <div>
          <h2 id={headingId} className="text-lg font-bold text-ink-900">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-ink-900/55">{description}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={title}>
        {options.map((option) => {
          const Icon = option.icon;
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              className={`flex min-h-20 items-center gap-3 rounded-xl border p-4 text-left transition-[border-color,background-color,transform] duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta active:translate-y-px ${selected ? 'border-terracotta bg-terracotta/10' : 'border-parchment-border bg-parchment hover:border-terracotta/60'}`}
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selected ? 'bg-terracotta text-ink-900' : 'bg-ink-900/[0.05] text-ink-900/60'}`}>
                <Icon size={18} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-ink-900">{option.label}</span>
                <span className="mt-1 block text-xs text-ink-900/55">{option.description}</span>
              </span>
              {selected && <Check size={17} className="shrink-0 text-terracotta-text" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function SettingsPage({
  theme,
  layoutMode,
  onSetTheme,
  onSetLayoutMode,
  bookmarksLayoutMode,
  onSetBookmarksLayoutMode,
  profileLayoutMode,
  onSetProfileLayoutMode,
  language,
  onSetLanguage,
  onNavigate,
}: SettingsPageProps) {
  const t = useT();
  const [showMore, setShowMore] = useState(false);
  const [pageSize, setPageSize] = useState(() => {
    try {
      const n = Number(localStorage.getItem('toolcoin_page_size') || 20);
      return Math.min(300, Math.max(20, Number.isFinite(n) ? n : 20));
    } catch {
      return 20;
    }
  });
  const commitPageSize = (n: number) => {
    const v = Math.min(300, Math.max(20, Math.round(n)));
    setPageSize(v);
    try {
      localStorage.setItem('toolcoin_page_size', String(v));
      window.dispatchEvent(new Event('toolcoin-page-size'));
    } catch { /* ignore */ }
  };


  const themeOptions = [
    { value: 'light' as const, label: t('settings.themeLight'), description: t('settings.themeLightDesc'), icon: SunMedium },
    { value: 'dark' as const, label: t('settings.themeDark'), description: t('settings.themeDarkDesc'), icon: MoonStar },
    { value: 'oled' as const, label: t('settings.themeOled'), description: t('settings.themeOledDesc'), icon: MoonStar },
  ];

  return (
    <section className="min-h-[calc(100dvh-64px)] bg-parchment pb-32" aria-labelledby="settings-heading">
      <div className="border-b border-parchment-border bg-parchment-raised">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="mb-8 inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold text-ink-900/65 transition-colors hover:bg-ink-900/[0.04] hover:text-ink-900 focus-visible:ring-2 focus-visible:ring-terracotta"
          >
            <ArrowLeft size={16} aria-hidden="true" /> {t('common.backToMarketplace')}
          </button>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ink-900 text-terracotta shadow-sm">
              <SettingsIcon size={22} aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-terracotta-text">{t('settings.preferences')}</p>
              <h1 id="settings-heading" className="mt-2 text-4xl font-bold tracking-[-0.04em] text-ink-900 sm:text-5xl">
                {t('settings.title')}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-ink-900/60">{t('settings.intro')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-4xl gap-6 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {/* Language — Indonesia first */}
        <section className="rounded-2xl border border-parchment-border bg-parchment-raised p-5 shadow-card sm:p-6" aria-labelledby="language-heading">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-lg" aria-hidden="true">文</span>
            <div>
              <h2 id="language-heading" className="text-lg font-bold text-ink-900">{t('settings.language')}</h2>
              <p className="mt-1 text-sm leading-6 text-ink-900/55">{t('settings.languageDesc')}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Language">
            {(
              [
                { value: 'id' as const, label: 'Bahasa Indonesia', description: t('settings.indonesian') },
                { value: 'en' as const, label: 'English', description: t('settings.english') },
              ]
            ).map((option) => {
              const selected = language === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onSetLanguage(option.value)}
                  className={`flex min-h-20 items-center justify-between gap-3 rounded-xl border p-4 text-left transition-[border-color,background-color,transform] duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta active:translate-y-px ${selected ? 'border-terracotta bg-terracotta/10' : 'border-parchment-border bg-parchment hover:border-terracotta/60'}`}
                >
                  <span>
                    <span className="block text-sm font-bold text-ink-900">{option.label}</span>
                    <span className="mt-1 block text-xs text-ink-900/55">{option.description}</span>
                  </span>
                  {selected && <Check size={17} className="shrink-0 text-terracotta-text" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </section>

        {/* Theme */}
        <section className="rounded-2xl border border-parchment-border bg-parchment-raised p-5 shadow-card sm:p-6" aria-labelledby="theme-heading">
          <div className="flex items-start gap-3">
            <SunMedium size={18} className="mt-0.5 text-terracotta-text" aria-hidden="true" />
            <div>
              <h2 id="theme-heading" className="text-lg font-bold text-ink-900">{t('settings.theme')}</h2>
              <p className="mt-1 text-sm leading-6 text-ink-900/55">{t('settings.themeDesc')}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Theme">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const selected = theme === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onSetTheme(option.value)}
                  className={`flex min-h-24 flex-col items-start gap-3 rounded-xl border p-4 text-left transition-[border-color,background-color,transform] duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta active:translate-y-px ${selected ? 'border-terracotta bg-terracotta/10' : 'border-parchment-border bg-parchment hover:border-terracotta/60'}`}
                >
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${selected ? 'bg-terracotta text-ink-900' : 'bg-ink-900/[0.05] text-ink-900/60'}`}>
                    <Icon size={17} aria-hidden="true" />
                  </span>
                  <span className="flex w-full items-center justify-between gap-2">
                    <span>
                      <span className="block text-sm font-bold text-ink-900">{option.label}</span>
                      <span className="mt-1 block text-xs text-ink-900/55">{option.description}</span>
                    </span>
                    {selected && <Check size={16} className="shrink-0 text-terracotta-text" aria-hidden="true" />}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Primary layout */}
        <LayoutOptionCard
          headingId="layout-heading"
          title={t('settings.layoutMarketplace')}
          description={t('settings.layoutMarketplaceDesc')}
          value={layoutMode}
          onChange={onSetLayoutMode}
          gridLabel={t('settings.layoutGrid')}
          listLabel={t('settings.layoutList')}
          gridDesc={t('settings.layoutGridDesc')}
          listDesc={t('settings.layoutListDesc')}
        />

        
        <section className="rounded-2xl border border-parchment-border bg-parchment-raised p-5 shadow-card sm:p-6" aria-labelledby="pagesize-heading">
          <div className="flex items-start gap-3">
            <LayoutGrid size={18} className="mt-0.5 text-terracotta-text" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h2 id="pagesize-heading" className="text-lg font-bold text-ink-900">Items per page</h2>
              <p className="mt-1 text-sm leading-6 text-ink-900/55">
                How many packs to load at once in the catalog (Add-Ons, worlds, texture packs, and the rest). Higher is heavier on the network.
              </p>
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-bold text-ink-900">{pageSize} items</span>
                  <span className="text-ink-900/45">20 – 300</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={300}
                  step={10}
                  value={pageSize}
                  onChange={(e) => commitPageSize(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-parchment accent-terracotta"
                  aria-label="Items per page"
                />
                <div className="mt-2 flex justify-between text-[11px] text-ink-900/40">
                  <span>20</span>
                  <span>100</span>
                  <span>200</span>
                  <span>300</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* More layouts collapsed */}
        <div className="rounded-2xl border border-parchment-border bg-parchment-raised p-4 sm:p-5">
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <span>
              <span className="block text-sm font-bold text-ink-900">{t('market.more')}</span>
              <span className="mt-0.5 block text-xs text-ink-900/50">
                {t('settings.layoutBookmarks')} · {t('settings.layoutProfile')}
              </span>
            </span>
            <span className="text-xs font-bold text-terracotta-text">{showMore ? '−' : '+'}</span>
          </button>
          {showMore && (
            <div className="mt-4 grid gap-4">
              <LayoutOptionCard
                headingId="bookmarks-layout-heading"
                title={t('settings.layoutBookmarks')}
                description={t('settings.layoutBookmarksDesc')}
                value={bookmarksLayoutMode}
                onChange={onSetBookmarksLayoutMode}
                gridLabel={t('settings.layoutGrid')}
                listLabel={t('settings.layoutList')}
                gridDesc={t('settings.layoutGridDesc')}
                listDesc={t('settings.layoutListDesc')}
              />
              <LayoutOptionCard
                headingId="profile-layout-heading"
                title={t('settings.layoutProfile')}
                description={t('settings.layoutProfileDesc')}
                value={profileLayoutMode}
                onChange={onSetProfileLayoutMode}
                gridLabel={t('settings.layoutGrid')}
                listLabel={t('settings.layoutList')}
                gridDesc={t('settings.layoutGridDesc')}
                listDesc={t('settings.layoutListDesc')}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
