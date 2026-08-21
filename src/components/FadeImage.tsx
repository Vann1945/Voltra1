import React, { useState, useEffect } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '../lib/utils';
import { Skeleton } from './Skeleton';

interface FadeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  containerClassName?: string;
}

export function FadeImage({ className, containerClassName, src, alt, ...props }: FadeImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Kalau `src` berubah (mis. komponen dipakai ulang untuk data berbeda tanpa
  // remount), reset state supaya skeleton/error lama tidak nyangkut nempel.
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  return (
    <div className={cn("relative overflow-hidden", containerClassName)}>
      {!isLoaded && !hasError && (
        <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
      )}
      {hasError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-ink-900/[0.04] text-ink-900/35">
          <ImageOff size={20} strokeWidth={1.75} />
          <span className="text-[10px] font-bold uppercase tracking-wide">No image</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          decoding="async"
          className={cn(
            "transition-opacity duration-700 ease-in-out",
            isLoaded ? "opacity-100" : "opacity-0",
            className
          )}
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            setHasError(true);
            setIsLoaded(true); // Stop showing skeleton
          }}
          {...props}
        />
      )}
    </div>
  );
}
