'use client';

import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import type { LucideIcon, LucideProps } from 'lucide-react';

export interface IconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

export type AnimationPreset =
  | 'none'
  | 'spin-once' | 'spin-ccw' | 'tick'
  | 'tilt' | 'swing' | 'wiggle' | 'shake'
  | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right'
  | 'pop-clean' | 'squeeze' | 'draw' | 'glow-pulse'
  | 'flicker' | 'ring-expand' | 'blur-focus' | 'corner-peek' | 'fade-flip'
  | 'tap-glow' | 'tap-fold' | 'tap-spin';

interface AnimatedIconProps extends LucideProps {
  icon: LucideIcon;
  preset: AnimationPreset;
}

const ANIM_MS = 620;

export const AnimatedIcon = forwardRef<IconHandle, AnimatedIconProps>(
  ({ icon: Icon, preset, className, onMouseEnter, onPointerDown, ...rest }, ref) => {
    const [playing, setPlaying] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isControlled = useRef(false);

    const trigger = useCallback(() => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
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
