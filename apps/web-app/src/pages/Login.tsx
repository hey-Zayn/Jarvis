import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AutoAwesome,
  Google,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Container,
  Divider,
  IconButton,
  InputAdornment,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAuthStore } from '@/store/authStore';
import { loginSchema, type LoginInput } from '@/lib/validators';
import { toast } from '@/hooks/useToast';

export function Login() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginInput) => {
    try {
      await login(data);
      toast({ title: 'Welcome back!', variant: 'success' });
      navigate('/workspace');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      toast({ title: 'Login failed', description: message, variant: 'destructive' });
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', py: { xs: 4, sm: 8 },
        background: 'radial-gradient(circle at 50% -10%, rgba(25, 118, 210, 0.18), transparent 38%), #121212',
      }}
    >
      <Container maxWidth="sm">
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center' }}>
            <Box sx={{ width: 52, height: 52, display: 'grid', placeItems: 'center', borderRadius: 2.5, color: 'primary.main', bgcolor: 'rgba(25, 118, 210, 0.14)', border: '1px solid rgba(25, 118, 210, 0.3)' }}>
              <AutoAwesome />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.03em' }}>Welcome back</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>Sign in to continue to your Jarvis workspace.</Typography>
            </Box>
          </Stack>

          <Paper component="section" elevation={0} sx={{ width: '100%', p: { xs: 3, sm: 4 }, borderRadius: 3, bgcolor: 'rgba(30, 30, 30, 0.82)', border: '1px solid rgba(255, 255, 255, 0.09)', boxShadow: '0 24px 80px rgba(0, 0, 0, 0.28)', backdropFilter: 'blur(18px)' }}>
            <Stack spacing={2.5}>
              <Button
                type="button"
                variant="outlined"
                size="large"
                fullWidth
                startIcon={<Google />}
                disabled={isLoading}
                sx={{ minHeight: 48, borderColor: 'rgba(255, 255, 255, 0.18)', color: 'text.primary', '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(25, 118, 210, 0.1)' } }}
              >
                Continue with Google
              </Button>

              <Divider sx={{ color: 'text.secondary', '&::before, &::after': { borderColor: 'divider' } }}>or continue with email</Divider>

              <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
                <Stack spacing={2.25}>
                  <TextField
                    {...register('email')}
                    id="email"
                    label="Email address"
                    type="email"
                    autoComplete="email"
                    fullWidth
                    autoFocus
                    disabled={isLoading}
                    error={Boolean(errors.email)}
                    helperText={errors.email?.message}
                  />

                  <Box>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography component="label" htmlFor="password" variant="body2" sx={{ fontWeight: 600 }}>Password</Typography>
                      <Link component={RouterLink} to="/forgot-password" variant="body2" underline="hover" color="primary.light">Forgot password?</Link>
                    </Stack>
                    <TextField
                      {...register('password')}
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      fullWidth
                      disabled={isLoading}
                      error={Boolean(errors.password)}
                      helperText={errors.password?.message}
                      slotProps={{ input: { endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowPassword((visible) => !visible)} edge="end" disabled={isLoading} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> } }}
                    />
                  </Box>

                  <Button type="submit" variant="contained" size="large" fullWidth disabled={isLoading} sx={{ minHeight: 48, mt: 0.5, fontWeight: 700 }}>
                    {isLoading ? 'Signing in…' : 'Sign in'}
                  </Button>
                </Stack>
              </Box>
            </Stack>
          </Paper>

          <Typography color="text.secondary" variant="body2" sx={{ textAlign: 'center' }}>
            Don&apos;t have an account?{' '}
            <Link component={RouterLink} to="/register" color="primary.light" underline="hover" sx={{ fontWeight: 600 }}>Create one</Link>
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
