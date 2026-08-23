import React, { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '../lib/utils';
import { Skeleton } from './Skeleton';

interface FadeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  containerClassName?: string;
  fallback?: React.ReactNode;
  fallbackSrc?: string;
}

function normalizeImageSource(value: unknown): string {
  if (typeof value !== 'string') return '';
  const source = value.trim();
  if (!source) return '';
  if (source.startsWith('//')) return `https:${source}`;
  if (source.startsWith('data:image/')) return source;
  try {
    const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
    const url = new URL(source, origin);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return url.href;
  } catch {
    return '';
  }
}

export function FadeImage({ className, containerClassName, src, alt, fallback, fallbackSrc, onError, onLoad, ...props }: FadeImageProps) {
  const normalizedSrc = normalizeImageSource(src);
  const normalizedFallbackSrc = normalizeImageSource(fallbackSrc);
  const [activeSrc, setActiveSrc] = useState(normalizedSrc);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(!normalizedSrc);

  useEffect(() => {
    setActiveSrc(normalizedSrc);
    setIsLoaded(false);
    setHasError(!normalizedSrc);
  }, [normalizedSrc]);

  const accessibleAlt = alt || 'Image';

  return (
    <div className={cn('relative overflow-hidden', containerClassName)} aria-busy={!isLoaded && !hasError}>
      {!isLoaded && !hasError && <Skeleton aria-hidden="true" className="absolute inset-0 h-full w-full rounded-none" />}
      {hasError ? (
        <div
          role="img"
          aria-label={`${accessibleAlt} unavailable`}
          className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-ink-900/[0.04] text-ink-900/45"
        >
          {fallback || (
            <>
              <ImageOff aria-hidden="true" size={20} strokeWidth={1.75} />
              <span className="text-[10px] font-bold uppercase tracking-wide">No image</span>
            </>
          )}
        </div>
      ) : (
        <img
          {...props}
          src={activeSrc}
          alt={alt || ''}
          decoding="async"
          className={cn('transition-opacity duration-300 ease-out', isLoaded ? 'opacity-100' : 'opacity-0', className)}
          onLoad={(event) => {
            setIsLoaded(true);
            onLoad?.(event);
          }}
          onError={(event) => {
            if (normalizedFallbackSrc && activeSrc !== normalizedFallbackSrc) {
              setActiveSrc(normalizedFallbackSrc);
              setIsLoaded(false);
              setHasError(false);
              return;
            }
            setHasError(true);
            setIsLoaded(true);
            onError?.(event);
          }}
        />
      )}
    </div>
  );
}
