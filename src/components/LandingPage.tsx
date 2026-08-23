import {
  ArrowRight,
  Blocks,
  CheckCircle2,
  Download,
  Search,
  ShieldCheck,
  Upload,
  Users,
  Zap,
} from 'lucide-react';
import { ViewState } from '../App';
import { getButtonClasses } from '../lib/designSystem';

interface LandingPageProps {
  onNavigate: (view: ViewState) => void;
}

const BENEFITS = [
  {
    icon: Search,
    title: 'Find faster',
    description: 'Search one organized library by category, tag, or creator and get to the right add-on quickly.',
  },
  {
    icon: ShieldCheck,
    title: 'Know what to expect',
    description: 'Every published project is reviewed before it appears in the marketplace.',
  },
  {
    icon: Upload,
    title: 'Share your work',
    description: 'Publish covers, a clear description, and a download link in one calm, guided flow.',
  },
];

const STEPS = [
  ['01', 'Choose a project', 'Browse by category or use search to find your next build.'],
  ['02', 'Open the details', 'Review screenshots, creator information, ratings, and download links.'],
  ['03', 'Make it yours', 'Download a project or sign in to publish your own creation.'],
];

export function LandingPage({ onNavigate }: LandingPageProps) {
  return (
    <div className="min-h-[100dvh] bg-parchment text-ink-900">
      <nav className="sticky top-0 z-[100] border-b border-parchment-border bg-parchment/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-3 text-left">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-900 text-terracotta shadow-sm">
              <Zap size={18} strokeWidth={2.5} />
            </span>
            <span className="text-lg font-bold tracking-tight">Voltra</span>
          </button>
          <div className="hidden items-center gap-8 text-sm font-semibold text-ink-900/65 md:flex">
            <a href="#why-voltra" className="transition-colors hover:text-ink-900">Why Voltra</a>
            <a href="#how-it-works" className="transition-colors hover:text-ink-900">How it works</a>
          </div>
          <button type="button" onClick={() => onNavigate('home')} className={getButtonClasses('primary', 'sm')}>
            Explore marketplace <ArrowRight size={15} />
          </button>
        </div>
      </nav>

      <main>
        <section className="border-b border-parchment-border bg-ink-900 text-paper">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1.05fr_.95fr] lg:px-8">
            <div className="max-w-2xl">
              <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-paper/20 bg-paper/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-paper/80">
                <Blocks size={14} /> Minecraft add-ons, without the noise
              </p>
              <h1 className="max-w-xl text-4xl font-bold leading-[1.05] tracking-[-0.04em] sm:text-6xl">
                Build your next world with better add-ons.
              </h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-paper/70 sm:text-lg">
                Voltra makes it simple to discover community projects, understand what you are downloading, and share the work you are proud of.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button type="button" onClick={() => onNavigate('home')} className={getButtonClasses('primary', 'lg')}>
                  Start exploring <ArrowRight size={17} />
                </button>
                <button type="button" onClick={() => onNavigate('home')} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-paper/20 px-5 text-sm font-bold text-paper transition-colors hover:bg-paper/10">
                  See the marketplace
                </button>
              </div>
              <div className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-paper/15 pt-6">
                <div><p className="text-xl font-bold">Open</p><p className="mt-1 text-xs text-paper/55">community library</p></div>
                <div><p className="text-xl font-bold">Reviewed</p><p className="mt-1 text-xs text-paper/55">before publishing</p></div>
                <div><p className="text-xl font-bold">Creator-led</p><p className="mt-1 text-xs text-paper/55">built to share</p></div>
              </div>
            </div>

            <div className="hidden lg:block" aria-hidden="true">
              <div className="mx-auto max-w-md rounded-3xl border border-paper/15 bg-paper/[0.06] p-5 shadow-card-float">
                <div className="flex items-center justify-between border-b border-paper/10 pb-4">
                  <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-paper/50">Featured project</p><p className="mt-1 text-lg font-bold">A new way to explore</p></div>
                  <span className="rounded-lg bg-terracotta px-2.5 py-1 text-xs font-bold text-ink-900">Ready</span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="h-36 rounded-2xl bg-paper/10" />
                  <div className="space-y-3"><div className="h-7 w-3/4 rounded-lg bg-paper/15" /><div className="h-4 w-full rounded bg-paper/10" /><div className="h-4 w-5/6 rounded bg-paper/10" /><div className="mt-5 h-10 rounded-xl bg-terracotta/80" /></div>
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-paper/10 pt-4 text-xs font-semibold text-paper/55"><span className="flex items-center gap-1.5"><Download size={13} /> Clear details</span><span className="flex items-center gap-1.5"><CheckCircle2 size={13} /> Reviewed</span></div>
              </div>
            </div>
          </div>
        </section>

        <section id="why-voltra" className="border-b border-parchment-border bg-parchment-raised py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-[0.16em] text-terracotta-text">A calmer marketplace</p><h2 className="mt-3 text-3xl font-bold tracking-[-0.03em] sm:text-4xl">Everything you need to choose with confidence.</h2><p className="mt-4 text-base leading-7 text-ink-900/60">Less decoration. Better information. A more useful path from discovery to download.</p></div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {BENEFITS.map(({ icon: Icon, title, description }) => <article key={title} className="rounded-2xl border border-parchment-border bg-parchment p-6 shadow-card"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink-900 text-terracotta"><Icon size={20} /></div><h3 className="mt-6 text-lg font-bold">{title}</h3><p className="mt-3 text-sm leading-6 text-ink-900/60">{description}</p></article>)}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-b border-parchment-border bg-parchment py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="grid gap-12 lg:grid-cols-[.7fr_1.3fr]"><div><p className="text-sm font-bold uppercase tracking-[0.16em] text-terracotta-text">How it works</p><h2 className="mt-3 text-3xl font-bold tracking-[-0.03em] sm:text-4xl">From idea to playable in three steps.</h2><p className="mt-4 text-base leading-7 text-ink-900/60">The interface stays out of the way so the project stays in focus.</p></div><div className="divide-y divide-parchment-border rounded-2xl border border-parchment-border bg-parchment-raised px-6 shadow-card">{STEPS.map(([number, title, description]) => <div key={number} className="grid gap-3 py-6 sm:grid-cols-[64px_180px_1fr] sm:items-start"><span className="text-sm font-bold text-terracotta-text">{number}</span><h3 className="font-bold">{title}</h3><p className="text-sm leading-6 text-ink-900/60">{description}</p></div>)}</div></div></div>
        </section>

        <section className="bg-terracotta py-16 sm:py-20"><div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8"><div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-[0.16em] text-ink-900/60">Ready when you are</p><h2 className="mt-3 text-3xl font-bold tracking-[-0.03em] sm:text-4xl">Find a project worth playing tonight.</h2><p className="mt-4 max-w-xl text-base leading-7 text-ink-900/70">Browse the marketplace for free, then come back whenever you are ready to share your own work.</p></div><button type="button" onClick={() => onNavigate('home')} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-ink-900 px-5 text-sm font-bold text-paper shadow-sm transition-transform hover:-translate-y-0.5 active:scale-[0.98]">Open marketplace <ArrowRight size={17} /></button></div></section>
      </main>

      <footer className="bg-parchment-raised"><div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-ink-900/55 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"><div className="flex items-center gap-2 font-bold text-ink-900"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink-900 text-terracotta"><Zap size={14} /></span>Voltra</div><p>Made for creators and players. Not affiliated with Mojang or Microsoft.</p><a href="https://github.com/Vann1945/Voltra1" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-semibold text-ink-900 hover:text-terracotta-text"><Users size={15} /> View source</a></div></footer>
    </div>
  );
}
