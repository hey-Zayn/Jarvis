'use client';

import { cn } from '@/lib/utils';
import { Skeleton, SkeletonCard, SkeletonInput, SkeletonButton, SkeletonText } from '@/components/ui/skeleton';

interface AuthLayoutSkeletonProps {
  className?: string;
  showFooter?: boolean;
}

export function AuthLayoutSkeleton({ className, showFooter = true }: AuthLayoutSkeletonProps) {
  return (
    <div className={cn('min-h-screen flex items-center justify-center p-4 bg-zinc-950', className)}>
      <SkeletonCard className="w-full max-w-md glass-elevated">
        <SkeletonText lines={2} className="text-center" />
        <div className="h-px bg-zinc-800 mx-6 my-2" />
        <div className="space-y-4 pt-4">
          <SkeletonInput />
          <SkeletonInput />
          <SkeletonInput />
          <SkeletonInput />
          <SkeletonButton />
        </div>
        {showFooter && (
          <div className="flex justify-center pt-4 pb-6 border-t border-zinc-800">
            <Skeleton variant="text" width="40%" height={16} />
          </div>
        )}
      </SkeletonCard>
    </div>
  );
}