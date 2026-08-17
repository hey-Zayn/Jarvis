'use client';

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { toast } from '@/hooks/useToast';
import { z } from 'zod';
import { apiClient } from '@/lib/api';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export function ForgotPassword() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsLoading(true);
    try {
      await apiClient.forgotPassword(data.email);
      
      toast({ 
        title: 'Email sent!', 
        description: 'If an account exists, you\'ll receive a password reset link.', 
        variant: 'success' 
      });
      navigate('/login');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send reset email';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Forgot password?"
      description="Enter your email and we'll send you a link to reset your password"
      footer={
        <p className="text-sm text-zinc-400">
          <Link to="/login" className="flex items-center gap-1 text-violet-400 hover:text-violet-300 font-medium">
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="pl-10"
              {...register('email')}
              error={errors.email?.message}
              disabled={isLoading}
            />
          </div>
        </div>

        <Button type="submit" className="w-full" size="lg" loading={isLoading}>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Send reset link
        </Button>

        <p className="text-xs text-center text-zinc-500">
          Didn't receive an email? Check your spam folder or{' '}
          <Link to="/register" className="text-violet-400 hover:text-violet-300 underline">
            create an account
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}