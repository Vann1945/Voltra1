import React, { useState } from 'react';
import { cn } from '../lib/utils';
import { Skeleton } from './Skeleton';

interface FadeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  containerClassName?: string;
}

export const FadeImage = React.memo(function FadeImage({ className, containerClassName, src, alt, loading = "lazy", ...props }: FadeImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div className={cn("relative overflow-hidden", containerClassName)}>
      {!isLoaded && !hasError && (
        <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
      )}
      <img
        src={src}
        alt={alt || "Image"}
        loading={loading}
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
    </div>
  );
});
