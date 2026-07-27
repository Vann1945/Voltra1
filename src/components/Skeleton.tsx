import React from 'react';
import { cn } from '../lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-white/5/50", className)}
      {...props}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="flex flex-col overflow-hidden rounded-[2rem] bg-slate-900/40 border border-white/5 h-[420px]">
      <Skeleton className="h-48 w-full rounded-none" />
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <div className="space-y-2 mb-6">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
