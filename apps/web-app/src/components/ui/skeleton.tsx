'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  animation = 'pulse',
  ...props
}: SkeletonProps) {
  const baseStyles = 'bg-zinc-800 rounded animate-pulse';
  
  const variantStyles = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const animationStyles = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  return (
    <div
      className={cn(
        baseStyles,
        variantStyles[variant],
        animationStyles[animation],
        className
      )}
      style={{
        width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
        height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
        ...props.style,
      }}
      {...props}
    />
  );
}

export function SkeletonText({ lines = 3, className, ...props }: { lines?: number; className?: string } & Omit<SkeletonProps, 'variant'>) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} variant="text" width={i === lines - 1 ? '60%' : '100%'} {...props} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm p-6 space-y-4', className)} {...props}>
      <Skeleton variant="circular" width={48} height={48} />
      <SkeletonText lines={2} />
      <Skeleton variant="rectangular" width="100%" height={120} />
      <div className="flex gap-2">
        <Skeleton variant="rectangular" width={120} height={40} />
        <Skeleton variant="rectangular" width={100} height={40} />
      </div>
    </div>
  );
}

export function SkeletonInput({ label = true, className, ...props }: { label?: boolean; className?: string } & Omit<SkeletonProps, 'variant'>) {
  return (
    <div className={cn('space-y-1.5 w-full', className)}>
      {label && <Skeleton variant="text" width="30%" height={16} />}
      <Skeleton variant="rectangular" width="100%" height={40} {...props} />
    </div>
  );
}

export function SkeletonButton({ className, ...props }: Omit<SkeletonProps, 'variant'> & { className?: string }) {
  return (
    <Skeleton variant="rectangular" width="100%" height={44} className={cn('rounded-md', className)} {...props} />
  );
}