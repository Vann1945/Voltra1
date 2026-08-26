'use client';

/**
 * Rebuild 1:1 dari animasi SparklesIcon di lucide-animated.com (pqoqubbw/icons,
 * https://lucide-animated.com/icons/sparkles). Dua motion terpisah persis
 * seperti aslinya:
 *  - sparkle utama (bentuk berlian besar): bounce kecil + fill currentColor
 *  - 4 garis bintang kecil di pojok: blink/kedip dengan delay 1s
 * Sama seperti ZapMotion.tsx, satu-satunya perubahan dari versi asli adalah
 * tambahan trigger onPointerDown untuk HP (versi asli cuma hover mouse).
 *
 * `variant` prop (opsional, default "default" = perilaku asli 1:1 di atas,
 * jadi drop-in di semua pemakaian lama) nambah 2 rasa animasi lain:
 *  - "burst"  → sparkle utama membesar + 4 bintang mekar keluar dari pusat
 *               bareng-bareng (bukan bergantian), buat momen "hore!" (mis.
 *               berhasil publish, achievement)
 *  - "gentle" → gerakan lebih halus & pelan, bintang kedip satu-satu
 *               (stagger), cocok buat tempat kecil/dekat teks biar nggak
 *               terlalu ramai
 *
 * Ref diteruskan langsung ke elemen <svg> (bukan imperative handle custom)
 * supaya tipe-nya identik dengan `LucideIcon` biasa
 * (ForwardRefExoticComponent<Omit<LucideProps,"ref"> & RefAttributes<SVGSVGElement>>)
 * — project ini di beberapa tempat menyimpan komponen icon di variable
 * bertipe komponen icon biasa, jadi Sparkles tetap bisa dipakai sebagai
 * ikon drop-in tanpa mengubah kode pemakaiannya.
 */
import type { Variants } from 'motion/react';
import { motion, useAnimation } from 'motion/react';
import type { LucideProps } from 'lucide-react';
import React, { forwardRef, useCallback, useRef } from 'react';

export type SparklesVariant = 'default' | 'burst' | 'gentle';

const SPARKLE_VARIANTS_BY_STYLE: Record<SparklesVariant, Variants> = {
  default: {
    initial: { y: 0, scale: 1, fill: 'none' },
    hover: { y: [0, -1, 0, 0], scale: 1, fill: 'currentColor', transition: { duration: 1, bounce: 0.3 } },
  },
  burst: {
    initial: { y: 0, scale: 1, fill: 'none' },
    hover: { scale: [1, 1.3, 1], fill: 'currentColor', transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  },
  gentle: {
    initial: { y: 0, scale: 1, fill: 'none' },
    hover: { y: [0, -0.5, 0], fill: 'currentColor', transition: { duration: 1.2, ease: 'easeInOut' } },
  },
};

const STAR_VARIANTS_BY_STYLE: Record<SparklesVariant, Variants> = {
  default: {
    initial: { opacity: 1, x: 0, y: 0 },
    blink: () => ({
      opacity: [0, 1, 0, 0, 0, 0, 1],
      transition: { duration: 2, type: 'spring', stiffness: 70, damping: 10, mass: 0.4 },
    }),
  },
  burst: {
    initial: { opacity: 1, scale: 1 },
    blink: () => ({
      scale: [1, 1.6, 1],
      opacity: [1, 1, 1],
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    }),
  },
  gentle: {
    initial: { opacity: 1 },
    blink: (i: number) => ({
      opacity: [1, 0.2, 1],
      transition: { duration: 1.4, delay: i * 0.15, ease: 'easeInOut' },
    }),
  },
};

export const SparklesMotion = forwardRef<SVGSVGElement, LucideProps & { variant?: SparklesVariant }>(
  ({ size = 24, className, onMouseEnter, onMouseLeave, onPointerDown, color = 'currentColor', strokeWidth = 2, variant = 'default', ...rest }, ref) => {
    const sparkleControls = useAnimation();
    const starControls = useAnimation();
    const svgRef = useRef<SVGSVGElement>(null);
    const sparkleVariants = SPARKLE_VARIANTS_BY_STYLE[variant];
    const starVariants = STAR_VARIANTS_BY_STYLE[variant];

    const setRefs = useCallback(
      (node: SVGSVGElement | null) => {
        (svgRef as React.MutableRefObject<SVGSVGElement | null>).current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as React.MutableRefObject<SVGSVGElement | null>).current = node;
      },
      [ref]
    );

    const trigger = useCallback(() => {
      sparkleControls.start('hover');
      starControls.start('blink', { delay: 1 });
    }, [sparkleControls, starControls]);

    const reset = useCallback(() => {
      sparkleControls.start('initial');
      starControls.start('initial');
    }, [sparkleControls, starControls]);

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<SVGSVGElement>) => {
        trigger();
        onMouseEnter?.(e);
      },
      [trigger, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<SVGSVGElement>) => {
        reset();
        onMouseLeave?.(e);
      },
      [reset, onMouseLeave]
    );

    const handlePointerDown = useCallback(
      (e: React.PointerEvent<SVGSVGElement>) => {
        if (e.pointerType !== 'mouse') {
          reset();
          requestAnimationFrame(trigger);
        }
        onPointerDown?.(e);
      },
      [reset, trigger, onPointerDown]
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
          animate={sparkleControls}
          initial="initial"
          d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
          variants={sparkleVariants}
        />
        <motion.path animate={starControls} initial="initial" custom={0} d="M20 3v4" variants={starVariants} />
        <motion.path animate={starControls} initial="initial" custom={1} d="M22 5h-4" variants={starVariants} />
        <motion.path animate={starControls} initial="initial" custom={2} d="M4 17v2" variants={starVariants} />
        <motion.path animate={starControls} initial="initial" custom={3} d="M5 18H3" variants={starVariants} />
      </svg>
    );
  }
);
SparklesMotion.displayName = 'SparklesMotion';
