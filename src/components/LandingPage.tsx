import React from 'react';
import {
  Zap, ArrowRight, Blocks, ShieldCheck, Rocket, Star, Check,
  Github, Twitter, MessageCircle, Youtube, Download, Users, Sparkles,
} from 'lucide-react';
import { ViewState } from '../App';

interface LandingPageProps {
  onNavigate: (view: ViewState) => void;
}

const FEATURES = [
  {
    icon: Blocks,
    title: 'Every Add-on Type',
    desc: 'Resource packs, mods, shaders, data packs, worlds and skins — all in one organized marketplace built for Minecraft creators.',
  },
  {
    icon: ShieldCheck,
    title: 'Reviewed & Safe',
    desc: 'Every upload is checked by our admin team before it goes live, so what you download is exactly what it says on the label.',
  },
  {
    icon: Rocket,
    title: 'Instant Publishing',
    desc: 'Upload your creation in three quick steps — cover images, description, license — and share it with the community today.',
  },
];

const TESTIMONIALS = [
  {
    name: 'Jaxon R.',
    role: 'Resource Pack Creator',
    quote: 'I moved three of my packs here in one afternoon. The upload flow is the fastest I have used out of any marketplace.',
  },
  {
    name: 'Mira Studios',
    role: 'Mod Developer Team',
    quote: 'Review turnaround is quick and the download stats actually help us understand what our players want next.',
  },
  {
    name: 'BlockyBuilds',
    role: 'World Builder',
    quote: 'Clean, no clutter, no fake download counts. Just a straightforward place to put my worlds in front of real players.',
  },
];

const PRICING = [
  {
    name: 'Explorer',
    price: 'Free',
    period: 'forever',
    features: ['Browse & download unlimited add-ons', 'Like and follow creators', 'Basic profile customization', 'Community support'],
    cta: 'Start Exploring',
    highlight: false,
  },
  {
    name: 'Creator',
    price: '$6',
    period: '/ month',
    features: ['Everything in Explorer', 'Unlimited uploads', 'Priority review queue', 'Animated profile borders', 'Download analytics dashboard'],
    cta: 'Become a Creator',
    highlight: true,
  },
  {
    name: 'Studio',
    price: '$19',
    period: '/ month',
    features: ['Everything in Creator', 'Team accounts (up to 5)', 'Featured placement credits', 'Direct support channel', 'Early access to new tools'],
    cta: 'Go Studio',
    highlight: false,
  },
];

export function LandingPage({ onNavigate }: LandingPageProps) {
  return (
    <div className="min-h-[100dvh] bg-white text-ink">
      {/* ─── Navbar ─── */}
      <nav className="sticky top-0 z-[100] w-full bg-white border-b border-ink/10">
        <div className="mx-auto flex h-[65px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="flex h-9 w-9 items-center justify-center bg-ink border border-ink/10 rounded-lg shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
              <Zap size={18} strokeWidth={2.5} className="text-gold" />
            </div>
            <span className="text-[20px] font-bold text-ink tracking-tight uppercase">Voltra</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-bold text-ink uppercase tracking-wide hover:text-gold transition-colors">Features</a>
            <a href="#testimonials" className="text-sm font-bold text-ink uppercase tracking-wide hover:text-gold transition-colors">Testimonials</a>
            <a href="#pricing" className="text-sm font-bold text-ink uppercase tracking-wide hover:text-gold transition-colors">Pricing</a>
          </div>

          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 bg-white border border-ink/10 rounded-lg px-5 py-2 text-sm font-bold text-ink uppercase shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all hover:shadow-[0_6px_20px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 cursor-pointer"
          >
            Explore Marketplace
            <ArrowRight size={15} />
          </button>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative border-b border-ink/10 bg-white overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Copy */}
          <div>
            <div className="inline-flex items-center gap-2 bg-gold border border-ink/10 rounded-lg px-4 py-1.5 mb-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
              <Sparkles size={13} className="text-ink" />
              <span className="text-xs font-bold text-ink uppercase tracking-widest">The Add-on Marketplace</span>
            </div>
            <h1 className="text-5xl sm:text-6xl font-bold text-ink tracking-tight leading-[0.95] mb-6">
              Build. Share.<br />
              <span className="text-[#800000] italic">Play More.</span>
            </h1>
            <p className="text-base sm:text-lg font-normal text-ink/60 max-w-md mb-10 leading-relaxed">
              Voltra is where Minecraft creators publish add-ons and players find their next favorite pack — reviewed, organized, and free of clutter.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => onNavigate('home')}
                className="flex items-center gap-2 bg-white border border-ink/10 rounded-lg px-7 py-4 text-sm font-bold text-ink uppercase shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all hover:shadow-[0_6px_20px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 cursor-pointer"
              >
                Explore Add-ons
                <ArrowRight size={17} />
              </button>
              <a
                href="#features"
                className="flex items-center gap-2 bg-white border border-ink/10 rounded-lg px-7 py-4 text-sm font-bold text-ink uppercase shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all hover:shadow-[0_6px_20px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 cursor-pointer"
              >
                Learn More
              </a>
            </div>

            <div className="mt-12 flex items-center gap-8">
              <div>
                <p className="text-3xl font-bold text-ink">12K+</p>
                <p className="text-xs font-medium text-ink/50 uppercase tracking-widest">Add-ons</p>
              </div>
              <div className="w-px h-10 bg-ink/10" />
              <div>
                <p className="text-3xl font-bold text-ink">480K+</p>
                <p className="text-xs font-medium text-ink/50 uppercase tracking-widest">Downloads</p>
              </div>
              <div className="w-px h-10 bg-ink/10" />
              <div>
                <p className="text-3xl font-bold text-ink">6K+</p>
                <p className="text-xs font-medium text-ink/50 uppercase tracking-widest">Creators</p>
              </div>
            </div>
          </div>

          {/* Abstract 3D-ish visual via pure CSS — stacked blocky cards */}
          <div className="relative h-[420px] hidden lg:block" aria-hidden="true">
            <div className="absolute top-6 left-4 w-52 h-64 bg-white border border-ink/10 rounded-lg shadow-[0_2px_12px_rgba(0,0,0,0.06)] rotate-[-8deg]" />
            <div className="absolute top-24 left-40 w-52 h-64 bg-gold border border-ink/10 rounded-lg shadow-[0_2px_12px_rgba(0,0,0,0.06)] rotate-[4deg]" />
            <div className="absolute top-4 left-64 w-52 h-64 bg-ink border border-ink/10 rounded-lg shadow-[0_2px_12px_rgba(0,0,0,0.06)] rotate-[-2deg] flex items-center justify-center">
              <Blocks size={72} strokeWidth={1.5} className="text-white" />
            </div>
            <div className="absolute bottom-6 left-24 flex items-center gap-2 bg-white border border-ink/10 rounded-lg px-4 py-2 shadow-[0_2px_12px_rgba(0,0,0,0.06)] rotate-[-2deg]">
              <Download size={16} className="text-ink" />
              <span className="text-xs font-bold uppercase">New Download!</span>
            </div>
            <div className="absolute top-2 right-6 flex items-center gap-2 bg-ink border border-ink/10 rounded-lg px-4 py-2 shadow-[0_2px_12px_rgba(0,0,0,0.06)] rotate-[2deg]">
              <Star size={16} className="text-gold fill-gold" />
              <span className="text-xs font-bold uppercase text-gold">Top Rated</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="border-b border-ink/10 bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-ink tracking-tight mb-4">Why Creators Pick Voltra</h2>
            <p className="text-base font-normal text-ink/60 max-w-xl mx-auto">Everything you need to publish, discover, and manage Minecraft add-ons — nothing you don't.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className={`bg-white border border-ink/10 rounded-lg shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-8 transition-all hover:shadow-[0_6px_20px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 cursor-default ${
                  i === 0 ? 'lg:col-span-5' : i === 1 ? 'lg:col-span-4' : 'lg:col-span-3'
                }`}
              >
                <div className="w-14 h-14 bg-ink border border-ink/10 rounded-lg flex items-center justify-center mb-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                  <f.icon size={26} className="text-gold" strokeWidth={2} />
                </div>
                <h3 className="text-xl font-bold text-ink mb-3">{f.title}</h3>
                <p className="text-sm font-medium text-ink/60 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section id="testimonials" className="border-b border-ink/10 bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-ink tracking-tight mb-4">Loved By Creators</h2>
            <p className="text-base font-normal text-ink/60 max-w-xl mx-auto">Real feedback from people publishing their work on Voltra every week.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={t.name}
                className={`bg-white border border-ink/10 rounded-lg shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-7 flex flex-col transition-all hover:shadow-[0_6px_20px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 cursor-default ${
                  i === 0 ? 'lg:col-span-4' : i === 1 ? 'lg:col-span-5' : 'lg:col-span-3'
                }`}
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => <Star key={i} size={16} className="fill-gold text-ink" strokeWidth={1.5} />)}
                </div>
                <p className="text-sm italic font-normal text-ink/80 leading-relaxed mb-6 flex-1">"{t.quote}"</p>
                <div className="flex items-center gap-3 border-t border-ink/10 pt-4">
                  <div className="w-10 h-10 bg-[#000080] border border-ink/10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-ink">{t.name}</p>
                    <p className="text-xs font-medium text-ink/50">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="border-b border-ink/10 bg-gold py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-ink tracking-tight mb-4">Simple Pricing</h2>
            <p className="text-base font-normal text-ink/70 max-w-xl mx-auto">Start free. Upgrade only when you're ready to publish at scale.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {PRICING.map((tier, i) => (
              <div
                key={tier.name}
                className={`relative border p-8 flex flex-col bg-white ${
                  i === 0 ? 'lg:col-span-3' : i === 1 ? 'lg:col-span-5' : 'lg:col-span-4'
                } ${
                  tier.highlight ? 'border-gold shadow-[0_6px_24px_rgba(0,0,0,0.1)] lg:-translate-y-4' : 'border-ink/10 shadow-[0_2px_12px_rgba(0,0,0,0.06)]'
                }`}
              >
                {tier.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gold border border-ink/10 rounded-lg px-4 py-1 text-xs font-bold uppercase tracking-wide text-ink shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-bold text-ink mb-2">{tier.name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold text-ink">{tier.price}</span>
                  <span className="text-sm font-normal text-ink/50">{tier.period}</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm font-normal text-ink/80">
                      <Check size={16} className="text-ink shrink-0 mt-0.5" strokeWidth={3} />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => onNavigate('home')}
                  className={`flex items-center justify-center gap-2 border border-ink/10 rounded-lg px-5 py-3.5 text-sm font-bold uppercase transition-all cursor-pointer ${
                    tier.highlight
                      ? 'bg-white text-ink shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.1)] hover:-translate-y-0.5'
                      : 'bg-white text-ink shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.1)] hover:-translate-y-0.5'
                  }`}
                >
                  {tier.cta}
                  <ArrowRight size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="border-b border-ink/10 bg-ink py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-16 h-16 bg-gold border border-ink/10 rounded-lg flex items-center justify-center mx-auto mb-8 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <Users size={28} className="text-ink" />
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-6">
            Ready to Join the Community?
          </h2>
          <p className="text-base font-normal text-white/70 max-w-lg mx-auto mb-10">
            Thousands of creators are already publishing add-ons on Voltra. Your next favorite pack — or your own — is one click away.
          </p>
          <button
            onClick={() => onNavigate('home')}
            className="inline-flex items-center gap-2 bg-gold border border-ink/10 rounded-lg px-8 py-4 text-sm font-bold text-ink uppercase shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all hover:shadow-[0_6px_20px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 cursor-pointer"
          >
            Get Started — It's Free
            <ArrowRight size={17} />
          </button>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-white pt-16 pb-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-9 w-9 items-center justify-center bg-ink border border-ink/10 rounded-lg shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                  <Zap size={18} strokeWidth={2.5} className="text-gold" />
                </div>
                <span className="text-lg font-bold text-ink uppercase tracking-tight">Voltra</span>
              </div>
              <p className="text-sm font-medium text-ink/50 max-w-xs leading-relaxed">
                The reviewed, organized marketplace for Minecraft add-ons — built by creators, for creators.
              </p>
              <div className="flex items-center gap-2 mt-6">
                <a href="#" aria-label="GitHub" className="p-2.5 border border-ink/10 rounded-lg bg-white text-ink shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all hover:shadow-[0_6px_20px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 cursor-pointer">
                  <Github size={16} />
                </a>
                <a href="#" aria-label="Twitter" className="p-2.5 border border-ink/10 rounded-lg bg-white text-ink shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all hover:shadow-[0_6px_20px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 cursor-pointer">
                  <Twitter size={16} />
                </a>
                <a href="#" aria-label="Discord" className="p-2.5 border border-ink/10 rounded-lg bg-white text-ink shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all hover:shadow-[0_6px_20px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 cursor-pointer">
                  <MessageCircle size={16} />
                </a>
                <a href="#" aria-label="YouTube" className="p-2.5 border border-ink/10 rounded-lg bg-white text-ink shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all hover:shadow-[0_6px_20px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 cursor-pointer">
                  <Youtube size={16} />
                </a>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-ink uppercase tracking-widest mb-4">Product</h4>
              <ul className="space-y-2.5 text-sm font-normal text-ink/60">
                <li><a href="#features" className="hover:text-ink transition-colors cursor-pointer">Features</a></li>
                <li><a href="#pricing" className="hover:text-ink transition-colors cursor-pointer">Pricing</a></li>
                <li><a href="#" onClick={e => { e.preventDefault(); onNavigate('home'); }} className="hover:text-ink transition-colors cursor-pointer">Marketplace</a></li>
                <li><a href="#" className="hover:text-ink transition-colors cursor-pointer">Changelog</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-ink uppercase tracking-widest mb-4">Company</h4>
              <ul className="space-y-2.5 text-sm font-normal text-ink/60">
                <li><a href="#" className="hover:text-ink transition-colors cursor-pointer">About</a></li>
                <li><a href="#" className="hover:text-ink transition-colors cursor-pointer">Blog</a></li>
                <li><a href="#" className="hover:text-ink transition-colors cursor-pointer">Contact</a></li>
                <li><a href="#" className="hover:text-ink transition-colors cursor-pointer">Careers</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-ink uppercase tracking-widest mb-4">Legal</h4>
              <ul className="space-y-2.5 text-sm font-normal text-ink/60">
                <li><a href="#" className="hover:text-ink transition-colors cursor-pointer">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-ink transition-colors cursor-pointer">Terms of Use</a></li>
                <li><a href="#" className="hover:text-ink transition-colors cursor-pointer">DMCA</a></li>
                <li><a href="#" className="hover:text-ink transition-colors cursor-pointer">Cookie Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-ink/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs font-normal text-ink/50">© 2026 Voltra. All rights reserved.</p>
            <p className="text-xs font-normal text-ink/50">Not affiliated with Mojang or Microsoft.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
