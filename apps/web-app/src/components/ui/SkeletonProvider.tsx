'use client';

import { ReactNode } from 'react';
import { AuthLayoutSkeleton } from '@/components/auth/AuthLayoutSkeleton';
import { WorkspaceSkeleton } from '@/components/layout/WorkspaceSkeleton';

interface SkeletonFallbackProps {
  type: 'auth' | 'workspace';
}

export function SkeletonFallback({ type }: SkeletonFallbackProps) {
  switch (type) {
    case 'auth':
      return <AuthLayoutSkeleton />;
    case 'workspace':
      return <WorkspaceSkeleton />;
    default:
      return <AuthLayoutSkeleton />;
  }
}

export function WithSkeleton({ 
  children, 
  fallbackType = 'auth',
  isLoading 
}: { 
  children: ReactNode; 
  fallbackType?: 'auth' | 'workspace';
  isLoading: boolean;
}) {
  if (isLoading) {
    return <SkeletonFallback type={fallbackType} />;
  }
  return <>{children}</>;
}