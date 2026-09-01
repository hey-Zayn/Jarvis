import { useState, type ChangeEvent } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AutoAwesome, CheckCircle, Female, Male, Visibility, VisibilityOff } from '@mui/icons-material';
import {
  Box,
  Button,
  Container,
  IconButton,
  InputAdornment,
  LinearProgress,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAuthStore } from '@/store/authStore';
import { registerSchema, type RegisterInput } from '@/lib/validators';
import { toast } from '@/hooks/useToast';

export function Register() {
  const navigate = useNavigate();
  const { register: registerUser, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState('');

  const getPasswordStrength = (value: string) => {
    let score = 0;
    if (value.length >= 8) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/[a-z]/.test(value)) score++;
    if (/[0-9]/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;
    return Math.min(score, 4);
  };

  const strength = getPasswordStrength(password);
  const strengthLabels = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'];
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { voicePreference: 'female' },
  });
  const selectedVoice = watch('voicePreference');

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

  const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setPassword(value);
    setValue('password', value, { shouldValidate: true, shouldDirty: true });
  };

  const passwordAdornment = (visible: boolean, toggle: () => void, label: string) => (
    <InputAdornment position="end">
      <IconButton onClick={toggle} edge="end" disabled={isLoading} aria-label={label}>
        {visible ? <VisibilityOff /> : <Visibility />}
      </IconButton>
    </InputAdornment>
  );

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: { xs: 4, sm: 6 }, background: 'radial-gradient(circle at 50% -10%, rgba(25, 118, 210, 0.18), transparent 38%), #121212' }}>
      <Container maxWidth="sm">
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center' }}>
            <Box sx={{ width: 52, height: 52, display: 'grid', placeItems: 'center', borderRadius: 2.5, color: 'primary.main', bgcolor: 'rgba(25, 118, 210, 0.14)', border: '1px solid rgba(25, 118, 210, 0.3)' }}>
              <AutoAwesome />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.03em' }}>Create your account</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>Set up your Jarvis workspace in a few steps.</Typography>
            </Box>
          </Stack>

          <Paper component="section" elevation={0} sx={{ width: '100%', p: { xs: 3, sm: 4 }, borderRadius: 3, bgcolor: 'rgba(30, 30, 30, 0.82)', border: '1px solid rgba(255, 255, 255, 0.09)', boxShadow: '0 24px 80px rgba(0, 0, 0, 0.28)', backdropFilter: 'blur(18px)' }}>
            <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
              <Stack spacing={2.25}>
                <TextField {...register('displayName')} id="displayName" label="Display name" type="text" autoComplete="name" fullWidth autoFocus disabled={isLoading} error={Boolean(errors.displayName)} helperText={errors.displayName?.message} slotProps={{ htmlInput: { maxLength: 100 } }} />
                <TextField {...register('email')} id="email" label="Email address" type="email" autoComplete="email" fullWidth disabled={isLoading} error={Boolean(errors.email)} helperText={errors.email?.message} />

                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Choose your Jarvis voice</Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    {([
                      { value: 'female' as const, title: 'Woman', description: 'Clear and natural', Icon: Female },
                      { value: 'male' as const, title: 'Man', description: 'Firm and low-toned', Icon: Male },
                    ]).map(({ value, title, description, Icon }) => (
                      <Paper
                        key={value}
                        component="button"
                        type="button"
                        onClick={() => setValue('voicePreference', value, { shouldDirty: true, shouldValidate: true })}
                        elevation={0}
                        sx={{ flex: 1, textAlign: 'left', p: 1.5, cursor: 'pointer', color: 'inherit', borderRadius: 2, border: '1px solid', borderColor: selectedVoice === value ? 'primary.main' : 'divider', bgcolor: selectedVoice === value ? 'rgba(25,118,210,0.12)' : 'transparent', transition: 'border-color 160ms ease-out, background-color 160ms ease-out, transform 160ms ease-out', '&:hover': { borderColor: 'primary.light' }, '&:active': { transform: 'scale(0.98)' } }}
                        aria-pressed={selectedVoice === value}
                      >
                        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                          <Icon color={selectedVoice === value ? 'primary' : 'action'} />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{title}</Typography>
                            <Typography variant="caption" color="text.secondary">{description}</Typography>
                          </Box>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                </Box>

                <Box>
                  <TextField {...register('password')} id="password" label="Password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" fullWidth disabled={isLoading} error={Boolean(errors.password)} helperText={errors.password?.message} onChange={handlePasswordChange} slotProps={{ input: { endAdornment: passwordAdornment(showPassword, () => setShowPassword((visible) => !visible), showPassword ? 'Hide password' : 'Show password') } }} />
                  <Stack spacing={1} sx={{ mt: 1.25 }}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">Password strength: {strengthLabels[strength]}</Typography>
                      <CheckCircle sx={{ fontSize: 16, color: strength >= 3 ? 'primary.light' : 'text.secondary' }} />
                    </Stack>
                    <LinearProgress variant="determinate" value={(strength / 4) * 100} sx={{ height: 5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.1)', '& .MuiLinearProgress-bar': { borderRadius: 3 } }} />
                    <Typography variant="caption" color="text.secondary">
                      {password.length < 8 ? 'Use at least 8 characters.' : 'Add uppercase, lowercase, numbers, and symbols for maximum strength.'}
                    </Typography>
                  </Stack>
                </Box>

                <TextField {...register('confirmPassword')} id="confirmPassword" label="Confirm password" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" fullWidth disabled={isLoading} error={Boolean(errors.confirmPassword)} helperText={errors.confirmPassword?.message} slotProps={{ input: { endAdornment: passwordAdornment(showConfirmPassword, () => setShowConfirmPassword((visible) => !visible), showConfirmPassword ? 'Hide password' : 'Show password') } }} />

                <Button type="submit" variant="contained" size="large" fullWidth disabled={isLoading} sx={{ minHeight: 48, mt: 0.5, fontWeight: 700 }}>{isLoading ? 'Creating account…' : 'Create account'}</Button>

                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', lineHeight: 1.6 }}>
                  By creating an account, you agree to our <Link component={RouterLink} to="/terms" color="primary.light" underline="hover">Terms of Service</Link> and <Link component={RouterLink} to="/privacy" color="primary.light" underline="hover">Privacy Policy</Link>.
                </Typography>
              </Stack>
            </Box>
          </Paper>

          <Typography color="text.secondary" variant="body2" sx={{ textAlign: 'center' }}>
            Already have an account? <Link component={RouterLink} to="/login" color="primary.light" underline="hover" sx={{ fontWeight: 600 }}>Sign in</Link>
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
