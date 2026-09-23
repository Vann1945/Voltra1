'use client';

import React, { useCallback, useState } from 'react';

type FitCoverProps = {
  src?: string | null;
  alt?: string;
  className?: string;
  imgClassName?: string;
  loading?: 'eager' | 'lazy';
  preferWebp?: boolean;
  onError?: () => void;
  matchAspect?: boolean;
};

export function FitCover({
  src,
  alt = '',
  className = '',
  imgClassName = '',
  loading = 'lazy',
  preferWebp = false,
  onError,
  matchAspect = true,
}: FitCoverProps) {
  const raw = (src || '').trim();
  const [dead, setDead] = useState(false);
  const [ratio, setRatio] = useState<number | null>(null); 

  const onLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      setRatio(img.naturalWidth / img.naturalHeight);
    }
  }, []);

  if (!raw || dead) {
    return (
      <div className={`relative overflow-hidden bg-ink-900 ${className}`} aria-hidden={!alt}>
        <div className="absolute inset-0 bg-gradient-to-br from-ink-900 via-ink-900/80 to-terracotta/20" />
      </div>
    );
  }

  const aspectStyle =
    matchAspect && ratio
      ? { aspectRatio: `${ratio}` }
      : matchAspect
        ? { aspectRatio: '16 / 9' }
        : undefined;

  return (
    <div
      className={`relative w-full overflow-hidden bg-ink-900 ${className}`}
      style={aspectStyle}
    >
      <img
        src={raw}
        alt={alt}
        loading={loading}
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={onLoad}
        onError={() => {
          setDead(true);
          onError?.();
        }}
        className={`absolute inset-0 z-[1] h-full w-full object-contain object-center ${imgClassName}`}
      />
    </div>
  );
}
