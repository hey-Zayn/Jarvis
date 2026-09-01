import { useState } from 'react';
import { CheckCircle, Female, Male, Mic, MonitorHeart, Refresh, Save } from '@mui/icons-material';
import { Alert, Box, Button, Card, CardContent, CardHeader, Divider, FormControl, InputLabel, MenuItem, Select, Slider, Stack, Switch, Typography } from '@mui/material';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export function SettingsPage() {
  const { user, accessToken, setUser } = useAuthStore();
  const [voicePreference, setVoicePreference] = useState<'female' | 'male'>(user?.voicePreference || 'female');
  const [voiceVolume, setVoiceVolume] = useState(85);
  const [autoListen, setAutoListen] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const saveVoice = async () => {
    if (!accessToken || !user) return;
    setIsSaving(true); setMessage('');
    try {
      const response = await apiClient.updateProfile(accessToken, { displayName: user.displayName || 'Jarvis user', voicePreference });
      if (!response.status?.ok) throw new Error(response.status?.message || 'Could not save voice preference');
      setUser({ ...user, voicePreference }); setMessage('Voice preference saved.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save voice preference'); }
    finally { setIsSaving(false); }
  };
  const services = [['API Gateway', 'HTTP / NDJSON', '2ms'], ['Auth Service', 'gRPC / Proto v1', '8ms'], ['Agent Service', 'gRPC / LangGraph', '45ms'], ['Worker Service', 'BullMQ / Redis', '12ms'], ['Qdrant Vector DB', 'REST / Cosine', '4ms'], ['PostgreSQL DB', 'Prisma Client', '1ms']];

  return <Stack spacing={3}>
    <Box><Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.035em' }}>Settings</Typography><Typography color="text.secondary" sx={{ mt: 0.75 }}>Tune Jarvis for the way you work.</Typography></Box>
    {message && <Alert severity={message.includes('saved') ? 'success' : 'error'}>{message}</Alert>}
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.4fr) minmax(280px, 0.6fr)' }, gap: 3 }}>
      <Stack spacing={3}>
        <Card><CardHeader avatar={<Mic color="primary" />} title="Voice output" subheader="Select a compact voice profile for speech playback." /><CardContent><Stack spacing={2.5}><FormControl size="small" fullWidth><InputLabel id="voice-label">Voice profile</InputLabel><Select labelId="voice-label" value={voicePreference} label="Voice profile" onChange={(event) => setVoicePreference(event.target.value as 'female' | 'male')}><MenuItem value="female"><Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}><Female fontSize="small" color="primary" /><span>Woman — clear and natural</span></Stack></MenuItem><MenuItem value="male"><Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}><Male fontSize="small" color="primary" /><span>Man — firm and low-toned</span></Stack></MenuItem></Select></FormControl><Box><Stack direction="row" sx={{ justifyContent: 'space-between' }}><Typography variant="body2">Output volume</Typography><Typography variant="body2" color="text.secondary">{voiceVolume}%</Typography></Stack><Slider value={voiceVolume} onChange={(_, value) => setVoiceVolume(value as number)} aria-label="Output volume" sx={{ mt: 1 }} /></Box><Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}><Box><Typography variant="body2" sx={{ fontWeight: 600 }}>Continuous voice activation</Typography><Typography variant="caption" color="text.secondary">Listen again after Jarvis answers.</Typography></Box><Switch checked={autoListen} onChange={(event) => setAutoListen(event.target.checked)} slotProps={{ input: { 'aria-label': 'Continuous voice activation' } }} /></Stack><Button variant="contained" startIcon={<Save />} onClick={saveVoice} disabled={isSaving}>{isSaving ? 'Saving…' : 'Save voice preference'}</Button></Stack></CardContent></Card>
      </Stack>
      <Card sx={{ height: 'fit-content' }}><CardHeader avatar={<MonitorHeart color="success" />} title="System telemetry" subheader="Live service configuration" action={<Button size="small" startIcon={<Refresh />} aria-label="Refresh telemetry">Refresh</Button>} /><Divider /><CardContent><Stack spacing={1.5}>{services.map(([name, protocol, latency]) => <Stack key={name} direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}><Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}><CheckCircle color="success" sx={{ fontSize: 17 }} /><Box><Typography variant="body2" sx={{ fontWeight: 600 }}>{name}</Typography><Typography variant="caption" color="text.secondary">{protocol}</Typography></Box></Stack><Typography variant="caption" color="success.main" sx={{ fontFamily: 'monospace' }}>{latency}</Typography></Stack>)}</Stack></CardContent></Card>
    </Box>
  </Stack>;
}
