// designSystem.ts
// Standardized constants for spacing, animation, and UI components
// Based on 8-pt grid system and modern micro-interaction principles

export const SPACING = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
  section: '64px',
} as const;

export const BORDER_RADIUS = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  full: '9999px',
} as const;

export const ANIMATION = {
  spring: {
    type: 'spring',
    stiffness: 400,
    damping: 30,
    mass: 1,
  },
  springBouncy: {
    type: 'spring',
    stiffness: 300,
    damping: 20,
    mass: 1,
  },
  springGentle: {
    type: 'spring',
    stiffness: 200,
    damping: 25,
    mass: 1,
  },
  easeOut: {
    type: 'tween',
    ease: [0.16, 1, 0.3, 1], // easeOutExpo
    duration: 0.3,
  },
  easeIn: {
    type: 'tween',
    ease: [0.7, 0, 0.84, 0], // easeInExpo
    duration: 0.2,
  },
} as const;

export const Z_INDEX = {
  dropdown: 100,
  sticky: 200,
  backdrop: 300,
  modal: 400,
  toast: 500,
} as const;

export const HAPTIC_PATTERNS = {
  light: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
  },
  medium: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(20);
    }
  },
  success: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([15, 50, 20]);
    }
  },
  error: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([20, 40, 20, 40, 30]);
    }
  }
};

// Helper for standardized button classes
export const getButtonClasses = (variant: 'primary' | 'secondary' | 'ghost' | 'danger', size: 'sm' | 'md' | 'lg' = 'md') => {
  const base = 'inline-flex items-center justify-center font-bold uppercase tracking-wide transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 active:scale-[0.98] select-none';
  
  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
    md: 'px-5 py-2.5 text-sm rounded-xl gap-2',
    lg: 'px-8 py-4 text-base rounded-2xl gap-3',
  };
  
  const variants = {
    primary: 'bg-terracotta text-ink-900 shadow-[0_2px_10px_rgba(232,117,59,0.2)] hover:shadow-[0_4px_16px_rgba(232,117,59,0.3)] hover:brightness-105 active:brightness-95',
    secondary: 'bg-parchment-raised text-ink-900 border border-parchment-border shadow-sm hover:bg-ink-900/5 active:bg-ink-900/10',
    ghost: 'text-ink-900/70 hover:text-ink-900 hover:bg-ink-900/5 active:bg-ink-900/10',
    danger: 'bg-danger/10 text-danger border border-danger/20 hover:bg-danger hover:text-white active:brightness-95',
  };
  
  return `${base} ${sizes[size]} ${variants[variant]}`;
};

// Helper for standard input classes
export const getInputClasses = (hasError = false) => {
  return `w-full rounded-xl bg-parchment-raised px-4 py-3 text-sm font-medium text-ink-900 placeholder:text-ink-900/40 outline-none transition-all ${
    hasError 
      ? 'border-2 border-danger focus:border-danger focus:ring-4 focus:ring-danger/10' 
      : 'border border-parchment-border focus:border-terracotta focus:ring-4 focus:ring-terracotta/10 hover:border-ink-900/20'
  }`;
};
