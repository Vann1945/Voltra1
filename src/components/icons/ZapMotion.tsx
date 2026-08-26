'use client';

/**
 * Rebuild 1:1 dari animasi ZapIcon di lucide-animated.com (pqoqubbw/icons,
 * https://lucide-animated.com/icons/zap — source: lucide-animated.com/r/zap.json).
 * Path & variants motion-nya persis sama seperti punya mereka (garis petir
 * "digambar ulang" pakai pathLength 0→1 + fade). Yang beda cuma pembungkusnya:
 * versi asli cuma trigger di mouseenter/mouseleave (murni desktop), di sini
 * ditambah onPointerDown biar animasinya juga kerasa pas di-tap di HP —
 * konsisten sama semua icon lain di project ini (lihat AnimatedIcon.tsx).
 *
 * `variant` prop (opsional, default "draw" = perilaku asli 1:1 di atas,
 * jadi drop-in di semua pemakaian lama) nambah 2 rasa animasi lain buat
 * konteks yang beda:
 *  - "flash"  → kedipan energi cepat (opacity + scale), cocok buat badge
 *               "instant"/"cepat" atau notifikasi real-time
 *  - "charge" → "ngisi tenaga" dulu (scale membesar + glow) baru mletik,
 *               cocok buat tombol aksi berat (publish, boost, dst.)
 *
 * Ref diteruskan langsung ke elemen <svg> (bukan imperative handle custom)
 * supaya tipe-nya identik dengan `LucideIcon` biasa
 * (ForwardRefExoticComponent<Omit<LucideProps,"ref"> & RefAttributes<SVGSVGElement>>)
 * — dibutuhkan karena project ini di beberapa tempat menyimpan komponen icon
 * di variable bertipe `typeof Flame` (mis. `Milestone.icon` di StreakApp.tsx),
 * jadi Zap harus tetap bisa "drop-in" di situ tanpa ubah kode pemakaiannya.
 */
import type { Variants } from 'motion/react';
import { motion, useAnimation } from 'motion/react';
import type { LucideProps } from 'lucide-react';
import React, { forwardRef, useCallback, useRef } from 'react';

export type ZapVariant = 'draw' | 'flash' | 'charge';

const PATH_VARIANTS_BY_STYLE: Record<ZapVariant, Variants> = {
  draw: {
    normal: { opacity: 1, pathLength: 1, scale: 1, filter: 'drop-shadow(0 0 0 transparent)', transition: { duration: 0.6, opacity: { duration: 0.1 } } },
    animate: { opacity: [0, 1], pathLength: [0, 1], scale: 1, filter: 'drop-shadow(0 0 0 transparent)', transition: { duration: 0.6, opacity: { duration: 0.1 } } },
  },
  flash: {
    normal: { opacity: 1, pathLength: 1, scale: 1, filter: 'drop-shadow(0 0 0 transparent)' },
    animate: {
      opacity: [1, 0.25, 1, 0.4, 1],
      scale: [1, 1.08, 0.97, 1.04, 1],
      pathLength: 1,
      filter: 'drop-shadow(0 0 0 transparent)',
      transition: { duration: 0.45, ease: 'easeInOut' },
    },
  },
  charge: {
    normal: { opacity: 1, pathLength: 1, scale: 1, filter: 'drop-shadow(0 0 0 transparent)' },
    animate: {
      scale: [1, 1.22, 1],
      filter: ['drop-shadow(0 0 0 transparent)', 'drop-shadow(0 0 5px currentColor)', 'drop-shadow(0 0 0 transparent)'],
      pathLength: 1,
      opacity: 1,
      transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
    },
  },
};

interface ZapMotionProps extends LucideProps {
  variant?: ZapVariant;
}

export const ZapMotion = forwardRef<SVGSVGElement, ZapMotionProps>(
  ({ size = 24, className, onMouseEnter, onMouseLeave, onPointerDown, color = 'currentColor', strokeWidth = 2, variant = 'draw', ...rest }, ref) => {
    const controls = useAnimation();
    const svgRef = useRef<SVGSVGElement>(null);
    const pathVariants = PATH_VARIANTS_BY_STYLE[variant];

    const setRefs = useCallback(
      (node: SVGSVGElement | null) => {
        (svgRef as React.MutableRefObject<SVGSVGElement | null>).current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as React.MutableRefObject<SVGSVGElement | null>).current = node;
      },
      [ref]
    );

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<SVGSVGElement>) => {
        controls.start('animate');
        onMouseEnter?.(e);
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<SVGSVGElement>) => {
        controls.start('normal');
        onMouseLeave?.(e);
      },
      [controls, onMouseLeave]
    );

    // `mouseenter` gak pernah nyala di layar sentuh — tap yang bikin
    // animasinya kerasa di HP, replay dari awal tiap di-tap.
    const handlePointerDown = useCallback(
      (e: React.PointerEvent<SVGSVGElement>) => {
        if (e.pointerType !== 'mouse') {
          controls.start('normal');
          requestAnimationFrame(() => controls.start('animate'));
        }
        onPointerDown?.(e);
      },
      [controls, onPointerDown]
    );

    return (
      <svg
        ref={setRefs}
        fill="none"
        height={size}
        width={size}
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onPointerDown={handlePointerDown}
        {...rest}
      >
        <motion.path
          animate={controls}
          initial="normal"
          d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"
          variants={pathVariants}
        />
      </svg>
    );
  }
);
ZapMotion.displayName = 'ZapMotion';
