import { useCallback } from 'react';
import { toast } from '@/hooks/useToast';

export function useErrorHandler() {
  const handleError = useCallback((error: unknown, context?: string) => {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    const title = context ? `Error in ${context}` : 'Error';
    
    console.error(`[${title}]`, error);
    
    toast({
      title,
      description: message,
      variant: 'destructive',
    });
  }, []);

  const handleAsyncError = useCallback(
    async <T,>(promise: Promise<T>, context?: string): Promise<T | null> => {
      try {
        return await promise;
      } catch (error) {
        handleError(error, context);
        return null;
      }
    },
    [handleError]
  );

  return { handleError, handleAsyncError };
}