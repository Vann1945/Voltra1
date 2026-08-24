import { ArrowLeft, Check, LayoutGrid, List, MoonStar, Settings as SettingsIcon, SunMedium } from 'lucide-react';
import { ViewState } from '../App';

interface SettingsPageProps {
  theme: 'light' | 'dark' | 'oled';
  layoutMode: 'grid' | 'list';
  onSetTheme: (theme: 'light' | 'dark' | 'oled') => void;
  onSetLayoutMode: (mode: 'grid' | 'list') => void;
  onNavigate: (view: ViewState) => void;
}

const THEME_OPTIONS = [
  { value: 'light' as const, label: 'Light', description: 'Warm parchment surfaces', icon: SunMedium },
  { value: 'dark' as const, label: 'Dark', description: 'Low-light contrast', icon: MoonStar },
  { value: 'oled' as const, label: 'OLED', description: 'Deep black surfaces', icon: MoonStar },
];

export function SettingsPage({ theme, layoutMode, onSetTheme, onSetLayoutMode, onNavigate }: SettingsPageProps) {
  return (
    <section className="min-h-[calc(100dvh-64px)] bg-parchment pb-32" aria-labelledby="settings-heading">
      <div className="border-b border-parchment-border bg-parchment-raised">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="mb-8 inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold text-ink-900/65 transition-colors hover:bg-ink-900/[0.04] hover:text-ink-900 focus-visible:ring-2 focus-visible:ring-terracotta"
          >
            <ArrowLeft size={16} aria-hidden="true" /> Back to Marketplace
          </button>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ink-900 text-terracotta shadow-sm">
              <SettingsIcon size={22} aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-terracotta-text">Preferences</p>
              <h1 id="settings-heading" className="mt-2 text-4xl font-bold tracking-[-0.04em] text-ink-900 sm:text-5xl">Settings</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-ink-900/60">Choose how Voltra Marketplace looks and how add-ons are arranged. Your preferences are saved on this device.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-4xl gap-6 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <section className="rounded-2xl border border-parchment-border bg-parchment-raised p-5 shadow-card sm:p-6" aria-labelledby="layout-heading">
          <div className="flex items-start gap-3">
            <LayoutGrid size={18} className="mt-0.5 text-terracotta-text" aria-hidden="true" />
            <div>
              <h2 id="layout-heading" className="text-lg font-bold text-ink-900">Marketplace layout</h2>
              <p className="mt-1 text-sm leading-6 text-ink-900/55">Switch between a visual grid and a compact list for browsing add-ons.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Marketplace layout">
            {([
              { value: 'grid' as const, label: 'Grid', description: 'See covers and details at a glance', icon: LayoutGrid },
              { value: 'list' as const, label: 'List', description: 'Scan more add-ons in less space', icon: List },
            ]).map(option => {
              const Icon = option.icon;
              const selected = layoutMode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onSetLayoutMode(option.value)}
                  className={`flex min-h-20 items-center gap-3 rounded-xl border p-4 text-left transition-[border-color,background-color,transform] duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta active:translate-y-px ${selected ? 'border-terracotta bg-terracotta/10' : 'border-parchment-border bg-parchment hover:border-terracotta/60'}`}
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selected ? 'bg-terracotta text-ink-900' : 'bg-ink-900/[0.05] text-ink-900/60'}`}>
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-ink-900">{option.label}</span><span className="mt-1 block text-xs text-ink-900/55">{option.description}</span></span>
                  {selected && <Check size={17} className="shrink-0 text-terracotta-text" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-parchment-border bg-parchment-raised p-5 shadow-card sm:p-6" aria-labelledby="theme-heading">
          <div className="flex items-start gap-3">
            <SunMedium size={18} className="mt-0.5 text-terracotta-text" aria-hidden="true" />
            <div>
              <h2 id="theme-heading" className="text-lg font-bold text-ink-900">Theme</h2>
              <p className="mt-1 text-sm leading-6 text-ink-900/55">Choose the surface contrast that feels best for your session.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Theme">
            {THEME_OPTIONS.map(option => {
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
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${selected ? 'bg-terracotta text-ink-900' : 'bg-ink-900/[0.05] text-ink-900/60'}`}><Icon size={17} aria-hidden="true" /></span>
                  <span className="flex w-full items-center justify-between gap-2"><span><span className="block text-sm font-bold text-ink-900">{option.label}</span><span className="mt-1 block text-xs text-ink-900/55">{option.description}</span></span>{selected && <Check size={16} className="shrink-0 text-terracotta-text" aria-hidden="true" />}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </section>
  );
}
