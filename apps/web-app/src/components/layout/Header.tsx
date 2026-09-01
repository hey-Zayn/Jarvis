import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logout, Menu, Settings } from '@mui/icons-material';
import { Avatar, Box, IconButton, MenuItem, Popover, Stack, Tooltip, Typography } from '@mui/material';
import { useAuthStore } from '@/store/authStore';

interface HeaderProps { onMenuClick: () => void }

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const initials = user?.displayName?.slice(0, 1).toUpperCase() || 'J';
  return <Box component="header" sx={{ height: 72, px: { xs: 2, sm: 3, lg: 4 }, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'rgba(18,18,18,0.82)', backdropFilter: 'blur(16px)', position: 'sticky', top: 0, zIndex: 10 }}>
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
      <IconButton onClick={onMenuClick} aria-label="Open navigation" sx={{ display: { xs: 'inline-flex', md: 'none' }, color: 'text.secondary' }}><Menu /></IconButton>
      <Box><Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.12em', lineHeight: 1 }}>Jarvis workspace</Typography><Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' }, color: 'text.secondary', mt: 0.5 }}>Your intelligent command center</Typography></Box>
    </Stack>
    <Tooltip title="Account menu"><IconButton onClick={(event) => setAnchorEl(event.currentTarget)} aria-label="Open account menu"><Avatar sx={{ width: 38, height: 38, bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 700 }}>{initials}</Avatar></IconButton></Tooltip>
    <Popover open={Boolean(anchorEl)} anchorEl={anchorEl} onClose={() => setAnchorEl(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}><Box sx={{ p: 1, minWidth: 190 }}><MenuItem onClick={() => { setAnchorEl(null); navigate('/settings'); }}><Settings fontSize="small" sx={{ mr: 1.5 }} />Settings</MenuItem><MenuItem onClick={logout} sx={{ color: 'error.light' }}><Logout fontSize="small" sx={{ mr: 1.5 }} />Sign out</MenuItem></Box></Popover>
  </Box>;
}
