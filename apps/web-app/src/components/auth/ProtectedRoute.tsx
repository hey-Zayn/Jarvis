import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { WorkspaceSkeleton } from '@/components/layout/WorkspaceSkeleton';

export function ProtectedRoute() {
  const { isAuthenticated, isHydrating, hydrate } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (isHydrating) {
    return <WorkspaceSkeleton />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export function PublicRoute() {
  const { isAuthenticated, isHydrating, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (isHydrating) {
    return <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="animate-pulse bg-zinc-800 rounded-xl w-full max-w-md mx-4 h-96" />
    </div>;
  }

  if (isAuthenticated) {
    return <Navigate to="/workspace" replace />;
  }

  return <Outlet />;
}