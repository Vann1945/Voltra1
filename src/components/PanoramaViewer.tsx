import React, { useCallback, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ImageOff, MoveHorizontal, RotateCcw, Scan } from 'lucide-react';

interface PanoramaViewerProps {
  src: string;
  alt: string;
}

export function PanoramaViewer({ src, alt }: PanoramaViewerProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const lastPointerXRef = useRef<number | null>(null);

  const updateProgress = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const maxScroll = viewport.scrollWidth - viewport.clientWidth;
    setProgress(maxScroll > 0 ? Math.round((viewport.scrollLeft / maxScroll) * 100) : 100);
  }, []);

  const scrollByViewport = useCallback((direction: 'left' | 'right') => {
    viewportRef.current?.scrollBy({
      left: direction === 'left' ? -Math.max(viewportRef.current.clientWidth * 0.72, 240) : Math.max(viewportRef.current.clientWidth * 0.72, 240),
      behavior: 'smooth',
    });
  }, []);

  const resetPosition = useCallback(() => {
    viewportRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      scrollByViewport('left');
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      scrollByViewport('right');
    } else if (event.key === 'Home') {
      event.preventDefault();
      resetPosition();
    } else if (event.key === 'End') {
      event.preventDefault();
      viewportRef.current?.scrollTo({ left: viewportRef.current.scrollWidth, behavior: 'smooth' });
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    viewportRef.current?.setPointerCapture(event.pointerId);
    lastPointerXRef.current = event.clientX;
    setIsDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !viewportRef.current || lastPointerXRef.current === null) return;
    viewportRef.current.scrollLeft -= event.clientX - lastPointerXRef.current;
    lastPointerXRef.current = event.clientX;
    updateProgress();
  };

  const stopDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    if (viewportRef.current?.hasPointerCapture(event.pointerId)) {
      viewportRef.current.releasePointerCapture(event.pointerId);
    }
    lastPointerXRef.current = null;
    setIsDragging(false);
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-parchment-border bg-parchment-raised shadow-card" aria-labelledby="panorama-heading">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-parchment-border px-6 py-5 sm:px-8">
        <div>
          <div className="flex items-center gap-2 text-terracotta-text">
            <Scan size={16} aria-hidden="true" />
            <p className="text-xs font-bold uppercase tracking-[0.16em]">Interactive preview</p>
          </div>
          <h2 id="panorama-heading" className="mt-2 text-xl font-bold tracking-[-0.02em] text-ink-900">Explore the panorama</h2>
          <p className="mt-1 text-sm font-medium text-ink-900/55">Drag the canvas or use the arrow controls to view the full scene.</p>
        </div>
        <button
          type="button"
          onClick={resetPosition}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-parchment-border bg-parchment px-3 text-xs font-bold text-ink-900/70 transition-[background-color,border-color,transform,color] duration-200 hover:border-terracotta/60 hover:bg-ink-900/[0.03] hover:text-ink-900 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2"
        >
          <RotateCcw size={15} aria-hidden="true" />
          Reset view
        </button>
      </div>

      <div className="relative bg-ink-900">
        <div
          ref={viewportRef}
          tabIndex={hasError ? -1 : 0}
          role="region"
          aria-label={`${alt}. Use left and right arrow keys to explore.`}
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDragging}
          onPointerCancel={stopDragging}
          onScroll={updateProgress}
          className={`group relative flex h-[260px] select-none overflow-x-auto overflow-y-hidden overscroll-x-contain outline-none [scrollbar-width:none] sm:h-[360px] [&::-webkit-scrollbar]:hidden ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-terracotta`}
          style={{ touchAction: 'pan-x', WebkitUserSelect: 'none' }}
        >
          {!isLoaded && !hasError && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-ink-900" aria-live="polite">
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-xs font-bold text-white/75">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-white/90" aria-hidden="true" />
                Loading panorama…
              </div>
            </div>
          )}

          {hasError ? (
            <div className="flex h-full min-w-full flex-col items-center justify-center gap-3 px-6 text-center text-white/70">
              <ImageOff size={28} strokeWidth={1.6} aria-hidden="true" />
              <div>
                <p className="text-sm font-bold text-white/90">Panorama unavailable</p>
                <p className="mt-1 text-xs font-medium">This image could not be loaded right now.</p>
              </div>
            </div>
          ) : (
            <img
              src={src}
              alt={alt}
              draggable={false}
              loading="lazy"
              decoding="async"
              onLoad={() => {
                setIsLoaded(true);
                requestAnimationFrame(updateProgress);
              }}
              onError={() => { setIsLoaded(false); setHasError(true); }}
              className={`h-full w-auto max-w-none object-contain transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          )}
        </div>

        {!hasError && isLoaded && (
          <>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-ink-900/55 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" aria-hidden="true" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-ink-900/55 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" aria-hidden="true" />
            <button
              type="button"
              onClick={() => scrollByViewport('left')}
              aria-label="Move panorama left"
              className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl border border-white/15 bg-ink-900/75 text-white shadow-card opacity-100 backdrop-blur-sm transition-[opacity,transform,background-color] duration-200 hover:bg-ink-900 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta active:scale-[0.97]"
            >
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => scrollByViewport('right')}
              aria-label="Move panorama right"
              className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl border border-white/15 bg-ink-900/75 text-white shadow-card opacity-100 backdrop-blur-sm transition-[opacity,transform,background-color] duration-200 hover:bg-ink-900 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta active:scale-[0.97]"
            >
              <ChevronRight size={20} aria-hidden="true" />
            </button>
            <div className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-ink-900/70 px-3 py-2 text-[11px] font-bold text-white/75 backdrop-blur-sm">
              <MoveHorizontal size={14} aria-hidden="true" />
              <span>{progress}% explored</span>
            </div>
          </>
        )}
      </div>

      <div className="h-1 bg-ink-900/[0.08]" aria-hidden="true">
        <div className="h-full bg-terracotta transition-[width] duration-150 ease-out" style={{ width: `${hasError ? 0 : Math.max(progress, isLoaded ? 4 : 0)}%` }} />
      </div>
    </section>
  );
}
