import React from 'react';
import { cn } from '../lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-ink/[0.06] border border-ink/10 rounded-lg',
        'before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-ink/10 before:to-transparent',
        className
      )}
      {...props}
    />
  );
}

export function SkeletonCard() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col overflow-hidden bg-paper rounded-lg shadow-card"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        <Skeleton className="h-full w-full rounded-none border-0" />
        <div className="absolute top-3 left-3">
          <Skeleton className="h-5 w-16 rounded-lg" />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-7 w-7 rounded-lg shrink-0" />
        </div>

        <div className="mt-2 flex gap-1.5">
          <Skeleton className="h-4 w-12 rounded-lg" />
          <Skeleton className="h-4 w-14 rounded-lg" />
        </div>

        <div className="mt-2.5 flex-1 space-y-2">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-4/5" />
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-ink/10 pt-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-7 rounded-full" />
            <Skeleton className="h-3.5 w-16" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-6" />
            <Skeleton className="h-4 w-6" />
            <Skeleton className="h-7 w-14 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AddonDetailSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 min-h-[100dvh]" aria-hidden="true">
      <Skeleton className="h-5 w-40 mb-8" />

      <div className="overflow-hidden rounded-lg bg-paper shadow-card">
        <Skeleton className="aspect-[21/9] w-full rounded-none border-x-0 border-t-0" />

        <div className="p-8">
          <div className="flex flex-wrap items-start justify-between gap-6 mb-8">
            <div className="flex-1 min-w-[200px]">
              <Skeleton className="h-6 w-28 mb-3" />
              <Skeleton className="h-9 w-2/3 mb-4" />
              <div className="flex items-center gap-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-11 w-11" />
              <Skeleton className="h-11 w-32" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 border-t border-ink/10 pt-8">
            <div className="lg:col-span-2 space-y-3">
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div>
              <Skeleton className="h-40 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
