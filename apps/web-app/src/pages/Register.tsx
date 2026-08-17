import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { useAuthStore } from '@/store/authStore';
import { registerSchema, type RegisterInput } from '@/lib/validators';
import { toast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

export function Register() {
  const navigate = useNavigate();
  const { register: registerUser, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState('');

  const getPasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;
    return Math.min(strength, 4);
  };

  const strength = getPasswordStrength(password);
  const strengthLabels = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'];
  const strengthColors = [
    'bg-gruvbox-red',
    'bg-gruvbox-orange',
    'bg-gruvbox-yellow',
    'bg-gruvbox-lime',
    'bg-gruvbox-green',
  ];

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    try {
      await registerUser(data);
      toast({ title: 'Account created!', description: 'Welcome to Jarvis', variant: 'success' });
      navigate('/workspace');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      toast({ title: 'Registration failed', description: message, variant: 'destructive' });
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    setValue('password', value, { shouldValidate: true });
  };

  return (
    <AuthLayout
      title="Create your account"
      description="Start your journey with Jarvis today"
      footer={
        <p className="text-sm text-gruvbox-gray">
          Already have an account?{' '}
          <Link to="/login" className="text-gruvbox-green hover:text-gruvbox-green-light font-medium">
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register('email')}
            error={errors.email?.message}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="displayName">Display Name</Label>
          <Input
            id="displayName"
            type="text"
            autoComplete="name"
            placeholder="John Doe"
            maxLength={100}
            {...register('displayName')}
            error={errors.displayName?.message}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              {...register('password')}
              error={errors.password?.message}
              disabled={isLoading}
              onChange={handlePasswordChange}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gruvbox-gray hover:text-gruvbox-fg transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gruvbox-gray">Strength: {strengthLabels[strength]}</span>
              <Shield className="h-3 w-3 text-gruvbox-green" />
            </div>
            <div className="h-1.5 bg-gruvbox-bg1 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-300 ease-out',
                  strengthColors[strength]
                )}
                style={{ width: `${(strength / 4) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gruvbox-gray">
              {password.length < 8
                ? 'Password must be at least 8 characters'
                : 'Add uppercase, lowercase, numbers, and symbols for maximum strength'}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              {...register('confirmPassword')}
              error={errors.confirmPassword?.message}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gruvbox-gray hover:text-gruvbox-fg transition-colors"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <Button type="submit" className="w-full" size="lg" loading={isLoading}>
          {isLoading ? 'Creating account...' : 'Create account'}
        </Button>

        <p className="text-xs text-center text-gruvbox-gray">
          By creating an account, you agree to our{' '}
          <Link to="/terms" className="text-gruvbox-green hover:text-gruvbox-green-light underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="text-gruvbox-green hover:text-gruvbox-green-light underline">
            Privacy Policy
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
