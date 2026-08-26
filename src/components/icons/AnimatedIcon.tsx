'use client';

import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import type { LucideIcon, LucideProps } from 'lucide-react';

/**
 * Engine animasi ringan untuk semua icon lucide-react di project ini.
 *
 * Versi sebelumnya pakai `motion/react` (framer-motion) dan bikin SETIAP
 * instance icon (96 export x dipakai ratusan kali di halaman ramai kayak
 * grid marketplace atau toolbar description editor) pasang gesture
 * recognizer (hover + pan/tap) penuh di JS main thread saat mount. Itu
 * yang bikin skor performance turun — kerjanya berat dan makin berat kalau
 * icon-nya banyak di satu layar, dan kerasa lebih parah lagi di HP karena
 * CPU-nya lebih lambat.
 *
 * Sekarang animasinya murni CSS `@keyframes` (lihat globals.css, cari
 * `.icon-anim-*`) — jalan di compositor thread, nyaris nggak makan waktu
 * JS. React di sini cuma nge-toggle satu class pas hover/tap, itu doang.
 */
export interface IconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

// Nama preset disusun biar tiap "keluarga" icon punya gerakan yang beda
// rasanya — bukan cuma variasi arah dari gerakan yang sama. Lihat
// globals.css untuk definisi keyframe masing-masing.
export type AnimationPreset =
  | 'none'
  | 'spin-once' | 'spin-ccw' | 'tick'
  | 'tilt' | 'swing' | 'wiggle' | 'shake'
  | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right'
  | 'pop-clean' | 'squeeze' | 'draw' | 'glow-pulse' | 'launch'
  | 'flicker' | 'ring-expand' | 'blur-focus' | 'corner-peek' | 'fade-flip'
  // 3 preset khusus bottom nav mobile (dipakai lewat prop `preset` di titik
  // pemakaian, lihat Navbar.tsx)
  | 'tap-glow' | 'tap-fold' | 'tap-spin';

interface AnimatedIconProps extends LucideProps {
  icon: LucideIcon;
  preset: AnimationPreset;
}

const ANIM_MS = 620; // durasi terpanjang di antara semua keyframe + jeda aman

export const AnimatedIcon = forwardRef<IconHandle, AnimatedIconProps>(
  ({ icon: Icon, preset, className, onMouseEnter, onPointerDown, ...rest }, ref) => {
    const [playing, setPlaying] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isControlled = useRef(false);

    const trigger = useCallback(() => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      // Restart animasi walau lagi jalan: matiin dulu satu frame, baru
      // nyalain lagi, biar CSS animation-nya beneran replay dari awal.
      setPlaying(false);
      requestAnimationFrame(() => {
        setPlaying(true);
        timeoutRef.current = setTimeout(() => setPlaying(false), ANIM_MS);
      });
    }, []);

    useImperativeHandle(ref, () => {
      isControlled.current = true;
      return {
        startAnimation: () => trigger(),
        stopAnimation: () => setPlaying(false),
      };
    }, [trigger]);

    const handleEnter = useCallback((e: React.MouseEvent<HTMLSpanElement>) => {
      if (!isControlled.current) trigger();
      onMouseEnter?.(e as unknown as React.MouseEvent<SVGSVGElement>);
    }, [trigger, onMouseEnter]);

    // `mouseenter` nggak pernah nyala di layar sentuh, jadi tap/pointerdown
    // yang bikin animasinya beneran kerasa di HP.
    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLSpanElement>) => {
      if (!isControlled.current && e.pointerType !== 'mouse') trigger();
      onPointerDown?.(e as unknown as React.PointerEvent<SVGSVGElement>);
    }, [trigger, onPointerDown]);

    if (preset === 'none') {
      return <Icon className={className} {...rest} />;
    }

    return (
      <span
        className={`inline-flex ${playing ? `icon-anim-${preset}` : ''} ${className || ''}`}
        onMouseEnter={handleEnter}
        onPointerDown={handlePointerDown}
      >
        <Icon {...rest} />
      </span>
    );
  }
);
AnimatedIcon.displayName = 'AnimatedIcon';

/**
 * Sama seperti AnimatedIcon, tapi buat SVG mentah yang bukan dari
 * lucide-react (logo brand kayak Google/GitHub di tombol OAuth) — bukan
 * `icon: LucideIcon` yang di-render, tapi `children` bebas apa saja.
 * Dipakai supaya icon non-lucide tetap ikut animasi hover/tap yang sama,
 * bukan diam saja seperti sebelumnya.
 */
interface AnimatedGlyphProps {
  preset: AnimationPreset;
  children: React.ReactNode;
  className?: string;
}

export function AnimatedGlyph({ preset, children, className }: AnimatedGlyphProps) {
  const [playing, setPlaying] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trigger = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setPlaying(false);
    requestAnimationFrame(() => {
      setPlaying(true);
      timeoutRef.current = setTimeout(() => setPlaying(false), ANIM_MS);
    });
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLSpanElement>) => {
    if (e.pointerType !== 'mouse') trigger();
  }, [trigger]);

  if (preset === 'none') {
    return <span className={className}>{children}</span>;
  }

  return (
    <span
      className={`inline-flex ${playing ? `icon-anim-${preset}` : ''} ${className || ''}`}
      onMouseEnter={trigger}
      onPointerDown={handlePointerDown}
    >
      {children}
    </span>
  );
}
