import { AutoAwesome, Bolt, CheckCircle, GraphicEq } from '@mui/icons-material';
import { Box, Chip, Grid, Paper, Stack, Typography } from '@mui/material';
import { VoiceWorkspace } from '@/components/voice/VoiceWorkspace';

const metrics = [
  { label: 'Agent status', value: 'Ready', icon: CheckCircle, color: '#66bb6a' },
  { label: 'Response target', value: '< 200ms', icon: Bolt, color: '#42a5f5' },
  { label: 'Voice engine', value: 'Listening enabled', icon: GraphicEq, color: '#90caf9' },
];

export function Workspace() {
  return <Stack spacing={{ xs: 2.5, md: 3 }}>
    <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
      <Box><Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.03em' }}>Good to see you.</Typography><Typography color="text.secondary" sx={{ mt: 0.75 }}>Ask Jarvis anything, or start with a focused action.</Typography></Box>
      <Chip icon={<AutoAwesome />} label="AI workspace online" color="primary" variant="outlined" sx={{ borderRadius: 2, '& .MuiChip-icon': { color: 'primary.light' } }} />
    </Stack>
    <Grid container spacing={2}>
      {metrics.map(({ label, value, icon: Icon, color }) => <Grid key={label} size={{ xs: 12, sm: 4 }}><Paper elevation={0} sx={{ p: 2, height: '100%', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}><Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}><Box sx={{ display: 'grid', placeItems: 'center', width: 36, height: 36, borderRadius: 1.5, bgcolor: `${color}18`, color }}><Icon fontSize="small" /></Box><Box><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="body2" sx={{ fontWeight: 700, mt: 0.25 }}>{value}</Typography></Box></Stack></Paper></Grid>)}
    </Grid>
    <Paper elevation={0} sx={{ minHeight: { xs: 520, md: 600 }, overflow: 'hidden', bgcolor: 'rgba(30,30,30,0.72)', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}><VoiceWorkspace /></Paper>
  </Stack>;
}
