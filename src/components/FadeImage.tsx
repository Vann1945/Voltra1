import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '../lib/utils';
import { Skeleton } from './Skeleton';

interface FadeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  containerClassName?: string;
}

export function FadeImage({ className, containerClassName, src, alt, ...props }: FadeImageProps) {
  const normalizedSrc = typeof src === 'string' ? src.trim() : '';
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(!normalizedSrc);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(!normalizedSrc);
  }, [normalizedSrc]);

  return (
    <div className={cn('relative overflow-hidden', containerClassName)} aria-busy={!isLoaded && !hasError}>
      {!isLoaded && !hasError && <Skeleton aria-hidden="true" className="absolute inset-0 h-full w-full rounded-none" />}
      {hasError ? (
        <div
          role="img"
          aria-label={`${alt || 'Image'} unavailable`}
          className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-ink-900/[0.04] text-ink-900/45"
        >
          <ImageOff aria-hidden="true" size={20} strokeWidth={1.75} />
          <span className="text-[10px] font-bold uppercase tracking-wide">No image</span>
        </div>
      ) : (
        <img
          {...props}
          src={normalizedSrc}
          alt={alt || ''}
          decoding="async"
          className={cn('transition-opacity duration-300 ease-out', isLoaded ? 'opacity-100' : 'opacity-0', className)}
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            setHasError(true);
            setIsLoaded(true);
          }}
        />
      )}
    </div>
  );
}
