import React from 'react';
import { Check } from 'lucide-react';
import { FadeImage } from './FadeImage';

export interface BorderEffect {
  value: string;
  label: string;
  family:
    | 'none' | 'sparkle' | 'orbit' | 'shine' | 'pulse' | 'confetti'
    | 'electric' | 'comet' | 'firefly' | 'ripple' | 'aurora' | 'rainbow'
    | 'halo' | 'meteor' | 'starburst';
  colors: string[];
}

export const BORDER_OPTIONS: BorderEffect[] = [
  { value: 'none', label: 'None', family: 'none', colors: [] },
  { value: 'sparkle-white', label: 'Sparkle', family: 'sparkle', colors: ['#ffffff'] },
  { value: 'sparkle-gold', label: 'Golden Sparkle', family: 'sparkle', colors: ['#facc15'] },
  { value: 'sparkle-cyan', label: 'Frost Sparkle', family: 'sparkle', colors: ['#67e8f9'] },
  { value: 'sparkle-toxic', label: 'Toxic Sparkle', family: 'sparkle', colors: ['#a3e635'] },
  { value: 'sparkle-pink', label: 'Pink Sparkle', family: 'sparkle', colors: ['#f472b6'] },
  { value: 'orbit-classic', label: 'Orbit', family: 'orbit', colors: ['#22d3ee', '#e879f9', '#fcd34d'] },
  { value: 'orbit-fire', label: 'Fire Orbit', family: 'orbit', colors: ['#ef4444', '#f97316', '#facc15'] },
  { value: 'orbit-void', label: 'Void Orbit', family: 'orbit', colors: ['#a855f7', '#6366f1', '#f472b6'] },
  { value: 'orbit-ocean', label: 'Ocean Orbit', family: 'orbit', colors: ['#2dd4bf', '#3b82f6', '#34d399'] },
  { value: 'orbit-platinum', label: 'Platinum Orbit', family: 'orbit', colors: ['#e5e7eb', '#9ca3af', '#f8fafc'] },
  { value: 'shine-white', label: 'Shine Sweep', family: 'shine', colors: ['#ffffff'] },
  { value: 'shine-gold', label: 'Golden Shine', family: 'shine', colors: ['#fbbf24'] },
  { value: 'shine-crimson', label: 'Crimson Shine', family: 'shine', colors: ['#ef4444'] },
  { value: 'shine-emerald', label: 'Emerald Shine', family: 'shine', colors: ['#34d399'] },
  { value: 'shine-sapphire', label: 'Sapphire Shine', family: 'shine', colors: ['#60a5fa'] },
  { value: 'pulse-violet', label: 'Pulse', family: 'pulse', colors: ['#8b5cf6'] },
  { value: 'pulse-rose', label: 'Rose Pulse', family: 'pulse', colors: ['#fb7185'] },
  { value: 'pulse-azure', label: 'Azure Pulse', family: 'pulse', colors: ['#38bdf8'] },
  { value: 'pulse-jade', label: 'Jade Pulse', family: 'pulse', colors: ['#4ade80'] },
  { value: 'pulse-amber', label: 'Amber Pulse', family: 'pulse', colors: ['#fbbf24'] },
  { value: 'confetti-mix', label: 'Confetti', family: 'confetti', colors: ['#f43f5e', '#facc15', '#22d3ee', '#a855f7', '#34d399', '#fb923c', '#60a5fa', '#f472b6'] },
  { value: 'confetti-gold', label: 'Golden Confetti', family: 'confetti', colors: ['#fbbf24', '#fde68a', '#f59e0b', '#fcd34d'] },
  { value: 'confetti-pastel', label: 'Pastel Confetti', family: 'confetti', colors: ['#fbcfe8', '#bfdbfe', '#bbf7d0', '#fef08a', '#ddd6fe'] },
  { value: 'electric-blue', label: 'Electric Blue', family: 'electric', colors: ['#38bdf8'] },
  { value: 'electric-violet', label: 'Electric Violet', family: 'electric', colors: ['#a78bfa'] },
  { value: 'comet-gold', label: 'Golden Comet', family: 'comet', colors: ['#fbbf24'] },
  { value: 'comet-cyan', label: 'Cyan Comet', family: 'comet', colors: ['#22d3ee'] },
  { value: 'comet-rose', label: 'Rose Comet', family: 'comet', colors: ['#fb7185'] },
  { value: 'firefly-amber', label: 'Amber Firefly', family: 'firefly', colors: ['#fbbf24'] },
  { value: 'firefly-emerald', label: 'Emerald Firefly', family: 'firefly', colors: ['#34d399'] },
  { value: 'ripple-silver', label: 'Silver Ripple', family: 'ripple', colors: ['#d1d5db'] },
  { value: 'ripple-teal', label: 'Teal Ripple', family: 'ripple', colors: ['#2dd4bf'] },
  { value: 'aurora', label: 'Aurora', family: 'aurora', colors: ['#2dd4bf', '#3b82f6', '#6366f1', '#8b5cf6'] },
  { value: 'rainbow', label: 'Rainbow', family: 'rainbow', colors: [] },
  { value: 'halo-white', label: 'Halo', family: 'halo', colors: ['#ffffff'] },
  { value: 'halo-ruby', label: 'Ruby Halo', family: 'halo', colors: ['#f43f5e'] },
  { value: 'shadow-pulse', label: 'Shadow', family: 'halo', colors: ['#52525b'] },
  { value: 'meteor', label: 'Meteor Shower', family: 'meteor', colors: ['#7dd3fc'] },
  { value: 'starburst-gold', label: 'Starburst', family: 'starburst', colors: ['#fbbf24'] },
];

export function getBorderEffect(value?: string | null): BorderEffect {
  return BORDER_OPTIONS.find(o => o.value === value) || BORDER_OPTIONS[0];
}

function polarToPercent(angleDeg: number, radiusPercent: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    left: 50 + radiusPercent * Math.cos(rad),
    top: 50 + radiusPercent * Math.sin(rad),
  };
}

const SPARKLE_ANGLES = [0, 60, 120, 180, 240, 300];
const FIREFLY_ANGLES = [20, 90, 160, 230, 300];
const ELECTRIC_ANGLES = [30, 120, 210, 300];
const STARBURST_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
const CONFETTI_SPOTS = [
  { angle: 10, radius: 62, size: 6, delay: 0 },
  { angle: 55, radius: 58, size: 5, delay: 0.2 },
  { angle: 95, radius: 64, size: 7, delay: 0.4 },
  { angle: 140, radius: 57, size: 5, delay: 0.1 },
  { angle: 180, radius: 63, size: 6, delay: 0.5 },
  { angle: 220, radius: 59, size: 5, delay: 0.3 },
  { angle: 265, radius: 65, size: 6, delay: 0.6 },
  { angle: 310, radius: 58, size: 5, delay: 0.15 },
];

export function renderBorderDecoration(effect: BorderEffect): React.ReactNode {
  const { family, colors } = effect;
  const c0 = colors[0] || '#010013';

  switch (family) {
    case 'sparkle':
      return SPARKLE_ANGLES.map((angle, i) => {
        const { left, top } = polarToPercent(angle, 54);
        return (
          <span
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full profile-sparkle pointer-events-none"
            style={{ left: `${left}%`, top: `${top}%`, backgroundColor: c0, boxShadow: `0 0 6px 1px ${c0}cc`, animationDelay: `${i * 0.25}s` }}
          />
        );
      });

    case 'orbit':
      return (
        <>
          <div className="absolute inset-0 profile-orbit-a pointer-events-none">
            <span className="absolute h-2 w-2 rounded-full border border-ink-900" style={{ top: 0, left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: colors[0] }} />
          </div>
          <div className="absolute inset-0 profile-orbit-b pointer-events-none">
            <span className="absolute h-1.5 w-1.5 rounded-full border border-ink-900" style={{ top: 0, left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: colors[1] || c0 }} />
          </div>
          <div className="absolute inset-0 profile-orbit-c pointer-events-none">
            <span className="absolute h-1.5 w-1.5 rounded-full border border-ink-900" style={{ top: 0, left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: colors[2] || c0 }} />
          </div>
        </>
      );

    case 'shine':
      return (
        <div
          className="absolute -inset-1 rounded-full profile-ring-mask pointer-events-none"
          style={{ background: `conic-gradient(from 0deg, transparent 0%, transparent 75%, ${c0} 88%, transparent 100%)` }}
        />
      );

    case 'rainbow':
      return (
        <div
          className="absolute -inset-1 rounded-full profile-ring-mask pointer-events-none"
          style={{ background: 'conic-gradient(#ef4444, #f97316, #facc15, #4ade80, #22d3ee, #3b82f6, #a855f7, #ef4444)' }}
        />
      );

    case 'aurora':
      return (
        <div
          className="absolute -inset-1 rounded-full profile-ring-mask profile-ring-mask-slow pointer-events-none"
          style={{ background: `conic-gradient(${colors.join(', ')}, ${colors[0]})` }}
        />
      );

    case 'pulse':
      return (
        <>
          <div className="absolute inset-0 rounded-full profile-pulse-ring pointer-events-none" style={{ borderColor: c0 }} />
          <div className="absolute inset-0 rounded-full profile-pulse-ring pointer-events-none" style={{ borderColor: c0, animationDelay: '1s' }} />
        </>
      );

    case 'ripple':
      return (
        <>
          <div className="absolute inset-0 rounded-full profile-ripple-ring pointer-events-none" style={{ borderColor: c0 }} />
          <div className="absolute inset-0 rounded-full profile-ripple-ring pointer-events-none" style={{ borderColor: c0, animationDelay: '0.8s' }} />
          <div className="absolute inset-0 rounded-full profile-ripple-ring pointer-events-none" style={{ borderColor: c0, animationDelay: '1.6s' }} />
        </>
      );

    case 'halo':
      return <div className="absolute -inset-1 rounded-full profile-halo pointer-events-none" style={{ boxShadow: `0 0 12px 3px ${c0}` }} />;

    case 'confetti':
      return CONFETTI_SPOTS.map((p, i) => {
        const { left, top } = polarToPercent(p.angle, p.radius);
        return (
          <span
            key={i}
            className="absolute profile-confetti pointer-events-none border border-ink-900"
            style={{ left: `${left}%`, top: `${top}%`, width: p.size, height: p.size, backgroundColor: colors[i % colors.length], animationDelay: `${p.delay}s` }}
          />
        );
      });

    case 'electric':
      return ELECTRIC_ANGLES.map((angle, i) => {
        const { left, top } = polarToPercent(angle, 58);
        return (
          <span
            key={i}
            className="absolute profile-electric-bolt pointer-events-none"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: 8,
              height: 14,
              backgroundColor: c0,
              clipPath: 'polygon(50% 0%, 20% 45%, 45% 45%, 30% 100%, 80% 40%, 55% 40%, 70% 0%)',
              transform: `translate(-50%, -50%) rotate(${angle + 90}deg)`,
              filter: `drop-shadow(0 0 4px ${c0})`,
              animationDelay: `${i * 0.18}s`,
            }}
          />
        );
      });

    case 'comet':
      return (
        <div className="absolute inset-0 profile-orbit-a pointer-events-none">
          {[0, -12, -24, -36].map((offset, i) => (
            <div key={i} className="absolute inset-0" style={{ transform: `rotate(${offset}deg)` }}>
              <span
                className="absolute rounded-full"
                style={{
                  top: 0,
                  left: '50%',
                  width: `${8 - i * 1.5}px`,
                  height: `${8 - i * 1.5}px`,
                  backgroundColor: c0,
                  opacity: 1 - i * 0.22,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            </div>
          ))}
        </div>
      );

    case 'firefly':
      return FIREFLY_ANGLES.map((angle, i) => {
        const { left, top } = polarToPercent(angle, i % 2 === 0 ? 56 : 46);
        return (
          <span
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full profile-firefly pointer-events-none"
            style={{ left: `${left}%`, top: `${top}%`, backgroundColor: c0, boxShadow: `0 0 5px 1px ${c0}aa`, animationDelay: `${i * 0.4}s` }}
          />
        );
      });

    case 'meteor':
      return (
        <div className="absolute -inset-2 pointer-events-none" style={{ overflow: 'visible' }}>
          <span
            className="absolute profile-meteor"
            style={{ width: 3, height: 22, background: `linear-gradient(to bottom, transparent, ${c0})`, left: '50%', top: '50%' }}
          />
        </div>
      );

    case 'starburst':
      return (
        <div className="absolute inset-0 profile-orbit-c pointer-events-none">
          {STARBURST_ANGLES.map((angle, i) => (
            <div key={i} className="absolute inset-0" style={{ transform: `rotate(${angle}deg)` }}>
              <span
                className="absolute"
                style={{ top: '-8%', left: '50%', width: 2, height: '10%', backgroundColor: c0, transform: 'translateX(-50%)', boxShadow: `0 0 4px ${c0}` }}
              />
            </div>
          ))}
        </div>
      );

    default:
      return null;
  }
}

export function getBorderRingClass(effect: BorderEffect): string {
  return effect.family === 'none' ? 'border border-parchment-border' : 'border border-parchment-border ring-1 ring-terracotta/40';
}

export function BorderEffectStyles() {
  return (
    <style>{`
      :root {
        /* Hanya dua variable yang benar-benar dipakai (lihat body{} di bawah).
           Variable lain yang sebelumnya ada di sini (--color-accent, --color-gold,
           dst) sudah dihapus karena namanya bentrok secara makna dengan token
           Tailwind global di src/index.css (mis. --color-accent di sana = terracotta,
           sedangkan di sini dulu = abu-abu) padahal tidak dipakai di manapun —
           berpotensi membingungkan siapa pun yang baca kode ini nanti.
           Source of truth warna sekarang HANYA src/index.css @theme. */
        --color-primary: #f5f4ed;
        --color-ink: #141413;
      }

      body, .font-display {
        font-family: Inter, ui-sans-serif, system-ui, sans-serif;
      }
      .font-accent, .font-meta {
        font-family: Inter, ui-sans-serif, system-ui, sans-serif;
      }
      body {
        background-color: var(--color-parchment);
        color: var(--color-ink-900);
      }
      body.dark, .dark body, .oled body {
        background-color: var(--color-parchment);
        color: var(--color-ink-900);
      }

      /* ═══ Dark mode overrides ═══
         Terapkan lewat class .dark di root wrapper (App.tsx). Menargetkan
         literal string className Tailwind arbitrary-value lewat attribute
         selector, jadi tidak perlu ubah tiap komponen satu-satu. */

      /* halaman (background utama) */
      .dark [class*="bg-parchment"], .dark[class*="bg-parchment"] { background-color: var(--color-parchment) !important; }

      /* kartu / modal / form (surface) — urutan: umum dulu, varian opacity setelahnya */
      .dark [class*="bg-parchment-raised"], .dark[class*="bg-parchment-raised"] { background-color: var(--color-parchment-raised) !important; }
      .dark [class*="bg-parchment-raised/20"], .dark[class*="bg-parchment-raised/20"] { background-color: color-mix(in srgb, var(--color-parchment-raised) 20%, transparent) !important; }
      .dark [class*="bg-parchment-raised/60"], .dark[class*="bg-parchment-raised/60"] { background-color: color-mix(in srgb, var(--color-parchment-raised) 60%, transparent) !important; }
      .dark [class*="bg-parchment-raised/70"], .dark[class*="bg-parchment-raised/70"] { background-color: color-mix(in srgb, var(--color-parchment-raised) 70%, transparent) !important; }

      /* teks ink -> teks terang */
      .dark [class*="text-ink-900"], .dark[class*="text-ink-900"] { color: var(--color-ink-900) !important; }
      .dark [class*="text-ink-900/30"], .dark[class*="text-ink-900/30"] { color: color-mix(in srgb, var(--color-ink-900) 30%, transparent) !important; }
      .dark [class*="text-ink-900/40"], .dark[class*="text-ink-900/40"] { color: color-mix(in srgb, var(--color-ink-900) 40%, transparent) !important; }
      .dark [class*="text-ink-900/50"], .dark[class*="text-ink-900/50"] { color: color-mix(in srgb, var(--color-ink-900) 50%, transparent) !important; }
      .dark [class*="text-ink-900/60"], .dark[class*="text-ink-900/60"] { color: color-mix(in srgb, var(--color-ink-900) 60%, transparent) !important; }
      .dark [class*="text-ink-900/70"], .dark[class*="text-ink-900/70"] { color: color-mix(in srgb, var(--color-ink-900) 70%, transparent) !important; }
      .dark [class*="text-ink-900/80"], .dark[class*="text-ink-900/80"] { color: color-mix(in srgb, var(--color-ink-900) 80%, transparent) !important; }

      /* border ink -> border terang tipis (umum dulu, baru varian opacity spesifik) */
      .dark [class*="border-ink-900"], .dark[class*="border-ink-900"] { border-color: color-mix(in srgb, var(--color-ink-900) 30%, transparent) !important; }
      .dark [class*="border-parchment-border"], .dark[class*="border-parchment-border"] { border-color: color-mix(in srgb, var(--color-ink-900) 10%, transparent) !important; }
      .dark [class*="border-ink-900/15"], .dark[class*="border-ink-900/15"] { border-color: color-mix(in srgb, var(--color-ink-900) 15%, transparent) !important; }
      .dark [class*="border-ink-900/25"], .dark[class*="border-ink-900/25"] { border-color: color-mix(in srgb, var(--color-ink-900) 25%, transparent) !important; }
      .dark [class*="border-ink-900/40"], .dark[class*="border-ink-900/40"] { border-color: color-mix(in srgb, var(--color-ink-900) 40%, transparent) !important; }

      /* fill tipis / skeleton pulse / divider kecil (bukan scrim modal besar) */
      .dark [class*="bg-ink-900/5"], .dark[class*="bg-ink-900/5"] { background-color: color-mix(in srgb, var(--color-ink-900) 6%, transparent) !important; }
      .dark [class*="bg-ink-900/10"], .dark[class*="bg-ink-900/10"] { background-color: color-mix(in srgb, var(--color-ink-900) 10%, transparent) !important; }
      .dark [class*="bg-ink-900/20"], .dark[class*="bg-ink-900/20"] { background-color: color-mix(in srgb, var(--color-ink-900) 15%, transparent) !important; }

      /* placeholder & bintang rating */
      .dark [class*="placeholder-ink-900/40"]::placeholder, .dark[class*="placeholder-ink-900/40"]::placeholder { color: color-mix(in srgb, var(--color-ink-900) 40%, transparent) !important; }
      .dark [class*="fill-ink-900"], .dark[class*="fill-ink-900"] { fill: var(--color-ink-900) !important; }

      /* ring-shadow: ganti warna ring dari gelap ke terang biar tetap kelihatan di atas surface gelap */
      .dark [class*="shadow-card"],
      .dark[class*="shadow-card"] {
        box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-ink-900) 8%, transparent), 0 2px 12px rgba(0,0,0,0.35) !important;
      }
      .dark [class*="shadow-card-hover"],
      .dark[class*="shadow-card-hover"] {
        box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-ink-900) 10%, transparent), 0 6px 20px rgba(0,0,0,0.45) !important;
      }
      .dark [class*="hover:shadow-card-hover"]:hover,
      .dark[class*="hover:shadow-card-hover"]:hover {
        box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-ink-900) 10%, transparent), 0 6px 20px rgba(0,0,0,0.45) !important;
      }

      @keyframes sparkleTwinkle {
        0%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(0.4); }
        50% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      }
      .profile-sparkle { animation: sparkleTwinkle 1.8s ease-in-out infinite; }

      @keyframes orbitSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      .profile-orbit-a { animation: orbitSpin 3s linear infinite; }
      .profile-orbit-b { animation: orbitSpin 4.5s linear infinite reverse; }
      .profile-orbit-c { animation: orbitSpin 8s linear infinite; }

      .profile-ring-mask {
        -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px));
        mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px));
        animation: orbitSpin 2.5s linear infinite;
      }
      .profile-ring-mask-slow { animation: orbitSpin 7s linear infinite; filter: blur(1px); }

      @keyframes pulseRingAnim {
        0% { transform: scale(1); opacity: 0.6; }
        100% { transform: scale(1.35); opacity: 0; }
      }
      .profile-pulse-ring { border-width: 2px; border-style: solid; animation: pulseRingAnim 2s ease-out infinite; }

      @keyframes rippleRingAnim {
        0% { transform: scale(0.9); opacity: 0.55; }
        100% { transform: scale(1.5); opacity: 0; }
      }
      .profile-ripple-ring { border-width: 1px; border-style: solid; animation: rippleRingAnim 2.4s ease-out infinite; }

      @keyframes haloBreathe {
        0%, 100% { opacity: 0.35; filter: blur(1px); }
        50% { opacity: 0.9; filter: blur(0px); }
      }
      .profile-halo { animation: haloBreathe 2.6s ease-in-out infinite; }

      @keyframes confettiPop {
        0%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(0.3) rotate(0deg); }
        50% { opacity: 1; transform: translate(-50%, -50%) scale(1) rotate(20deg); }
      }
      .profile-confetti { animation: confettiPop 2.2s ease-in-out infinite; border-radius: 1px; }

      @keyframes electricFlicker {
        0%, 19%, 21%, 23%, 100% { opacity: 0.12; }
        20%, 22%, 50%, 52%, 74% { opacity: 1; }
        51%, 73%, 75% { opacity: 0.3; }
      }
      .profile-electric-bolt { animation: electricFlicker 1.6s steps(1) infinite; }

      @keyframes fireflyDrift {
        0%, 100% { opacity: 0; transform: translate(-50%, -50%) translate(0, 0); }
        30% { opacity: 1; }
        50% { opacity: 0.7; transform: translate(-50%, -50%) translate(3px, -4px); }
        70% { opacity: 1; }
      }
      .profile-firefly { animation: fireflyDrift 3s ease-in-out infinite; }

      @keyframes meteorStreak {
        0% { transform: translate(-160%, -160%) rotate(45deg); opacity: 0; }
        8% { opacity: 1; }
        30% { transform: translate(140%, 140%) rotate(45deg); opacity: 0; }
        100% { opacity: 0; }
      }
      .profile-meteor { animation: meteorStreak 3.2s linear infinite; }
    `}</style>
  );
}

interface ProfileAvatarProps {
  photoURL?: string | null;
  displayName?: string | null;
  borderValue?: string | null;
  sizeClassName?: string;
  textSizeClassName?: string;
  selected?: boolean;
  className?: string;
}

export function ProfileAvatar({
  photoURL,
  displayName,
  borderValue,
  sizeClassName = 'h-10 w-10',
  textSizeClassName = 'text-sm',
  selected,
  className = '',
}: ProfileAvatarProps) {
  const effect = getBorderEffect(borderValue);
  const fallback = (displayName || '?').charAt(0).toUpperCase();
  const hasPhoto = typeof photoURL === 'string' && photoURL.trim().length > 0;

  return (
    <div className={`relative ${sizeClassName} shrink-0 ${className}`}>
      {renderBorderDecoration(effect)}
      <div className={`relative h-full w-full overflow-hidden rounded-full bg-parchment-raised flex items-center justify-center transition-all ${getBorderRingClass(effect)}`}>
        {hasPhoto ? (
          <FadeImage
            src={photoURL}
            alt={displayName || 'avatar'}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
            fallback={<span className={`font-bold text-ink-900 ${textSizeClassName}`}>{fallback}</span>}
          />
        ) : (
          <span className={`font-bold text-ink-900 ${textSizeClassName}`}>{fallback}</span>
        )}
        {selected && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink-900/60">
            <Check size={16} className="text-terracotta-text" strokeWidth={3} />
          </div>
        )}
      </div>
    </div>
  );
}
