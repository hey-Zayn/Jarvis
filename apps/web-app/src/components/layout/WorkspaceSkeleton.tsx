'use client';

import { cn } from '@/lib/utils';
import { Skeleton, SkeletonCard, SkeletonText, SkeletonButton } from '@/components/ui/skeleton';

interface WorkspaceSkeletonProps {
  className?: string;
}

export function WorkspaceSkeleton({ className }: WorkspaceSkeletonProps) {
  return (
    <div className={cn('min-h-screen bg-zinc-950 flex', className)}>
      {/* Sidebar Skeleton */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-zinc-950/80 backdrop-blur-sm border-r border-zinc-800 flex flex-col">
        <div className="flex h-16 items-center justify-between px-4 border-b border-zinc-800">
          <Skeleton variant="circular" width={32} height={32} />
          <Skeleton variant="circular" width={32} height={32} />
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" width="80%" height={40} className="mx-auto" />
          ))}
        </nav>
        <div className="p-4 border-t border-zinc-800">
          <SkeletonButton width="100%" />
          <SkeletonButton width="100%" className="mt-2" />
        </div>
      </aside>

      {/* Main Content Skeleton */}
      <div className="flex-1 flex flex-col min-w-0 ml-64">
        {/* Header Skeleton */}
        <header className="h-16 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex h-full items-center justify-end gap-4 px-4 md:px-6">
            <Skeleton variant="circular" width={40} height={40} />
          </div>
        </header>

        <main className="flex-1 overflow-hidden p-4 md:p-6">
          <div className="flex h-full flex-col items-center justify-center text-center p-8">
            <SkeletonCard className="w-full max-w-2xl glass-elevated">
              <SkeletonText lines={2} className="text-center" />
              <div className="flex items-center justify-center gap-4">
                <Skeleton variant="circular" width={80} height={80} />
                <Skeleton variant="circular" width={48} height={48} />
              </div>
              <Skeleton variant="rectangular" width="100%" height={80} className="rounded-lg" />
              <div className="flex gap-2">
                <Skeleton variant="rectangular" width="100%" height={40} className="flex-1" />
                <Skeleton variant="rectangular" width={48} height={48} />
              </div>
            </SkeletonCard>
          </div>
        </main>
      </div>
    </div>
  );
}