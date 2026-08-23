// Shared UI tokens keep spacing, motion, and component states predictable.
export const SPACING = {
  xs: '8px',
  sm: '16px',
  md: '24px',
  lg: '32px',
  xl: '48px',
  xxl: '64px',
  section: '80px',
} as const;

export const BORDER_RADIUS = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  full: '9999px',
} as const;

export const ANIMATION = {
  spring: { type: 'spring', stiffness: 400, damping: 30, mass: 1 },
  springBouncy: { type: 'spring', stiffness: 300, damping: 20, mass: 1 },
  springGentle: { type: 'spring', stiffness: 200, damping: 25, mass: 1 },
  easeOut: { type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.3 },
  easeIn: { type: 'tween', ease: [0.7, 0, 0.84, 0], duration: 0.2 },
} as const;

export const Z_INDEX = {
  dropdown: 100,
  sticky: 200,
  backdrop: 300,
  modal: 400,
  toast: 500,
} as const;

export const HAPTIC_PATTERNS = {
  light: () => typeof navigator !== 'undefined' && navigator.vibrate?.(10),
  medium: () => typeof navigator !== 'undefined' && navigator.vibrate?.(20),
  success: () => typeof navigator !== 'undefined' && navigator.vibrate?.([15, 50, 20]),
  error: () => typeof navigator !== 'undefined' && navigator.vibrate?.([20, 40, 20, 40, 30]),
};

export const getButtonClasses = (
  variant: 'primary' | 'secondary' | 'ghost' | 'danger',
  size: 'sm' | 'md' | 'lg' = 'md',
) => {
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-[background-color,border-color,box-shadow,transform,opacity,color] duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none select-none';
  const sizes = {
    sm: 'min-h-9 px-3 text-xs',
    md: 'min-h-11 px-4 text-sm',
    lg: 'min-h-12 px-5 text-sm',
  };
  const variants = {
    primary: 'bg-terracotta text-paper shadow-sm hover:bg-terracotta-text hover:shadow-card-hover',
    secondary: 'border border-parchment-border bg-parchment-raised text-ink-900 hover:border-terracotta/60 hover:bg-ink-900/[0.03] shadow-sm',
    ghost: 'text-ink-900/70 hover:bg-ink-900/[0.05] hover:text-ink-900',
    danger: 'border border-danger/25 bg-danger/[0.08] text-danger hover:bg-danger hover:text-white',
  };
  return `${base} ${sizes[size]} ${variants[variant]}`;
};

export const getInputClasses = (hasError = false) =>
  `w-full min-h-11 rounded-xl border bg-parchment-raised px-4 py-3 text-sm font-medium text-ink-900 placeholder:text-ink-900/40 outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-out ${
    hasError
      ? 'border-danger focus:border-danger focus:ring-4 focus:ring-danger/15'
      : 'border-parchment-border hover:border-ink-900/25 focus:border-terracotta focus:ring-4 focus:ring-terracotta/15'
  }`;
