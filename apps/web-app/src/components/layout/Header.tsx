import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AccountCircle, Logout, Menu, Settings } from '@mui/icons-material';
import { AppBar, Avatar, Box, Divider, IconButton, ListItemIcon, Menu as AccountMenu, MenuItem, Stack, Toolbar, Tooltip, Typography } from '@mui/material';
import { useAuthStore } from '@/store/authStore';

interface HeaderProps { onMenuClick: () => void }
const pageTitles: Record<string, string> = { '/workspace': 'Workspace', '/history': 'Conversation history', '/memory': 'Vector memory', '/settings': 'Settings' };

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const initials = user?.displayName?.slice(0, 1).toUpperCase() || user?.email?.slice(0, 1).toUpperCase() || 'J';
  const title = pageTitles[location.pathname] || 'Jarvis workspace';

  return <AppBar position="sticky" elevation={0} color="transparent" component="header" sx={{ zIndex: (theme) => theme.zIndex.drawer - 1, bgcolor: 'rgba(18,18,18,0.82)', borderBottom: '1px solid', borderColor: 'divider', backdropFilter: 'blur(18px)' }}>
    <Toolbar sx={{ minHeight: { xs: 64, sm: 72 }, px: { xs: 1.5, sm: 3, lg: 4 }, gap: 1.5 }}>
      <IconButton onClick={onMenuClick} aria-label="Open navigation" sx={{ display: { xs: 'inline-flex', md: 'none' }, color: 'text.secondary', '&:active': { transform: 'scale(0.96)' } }}><Menu /></IconButton>
      <Box sx={{ flex: 1, minWidth: 0 }}><Typography variant="overline" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' }, letterSpacing: '0.12em', lineHeight: 1 }}>Jarvis workspace</Typography><Typography variant="h6" noWrap sx={{ mt: { sm: 0.5 }, fontWeight: 750, letterSpacing: '-0.02em' }}>{title}</Typography></Box>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}><Stack sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'flex-end' }}><Typography variant="body2" noWrap sx={{ maxWidth: 190, fontWeight: 600 }}>{user?.displayName || 'Jarvis user'}</Typography><Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}><Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'success.main' }} /><Typography variant="caption" color="text.secondary">Online</Typography></Stack></Stack><Tooltip title="Account menu"><IconButton onClick={(event) => setAnchorEl(event.currentTarget)} aria-label="Open account menu" sx={{ p: 0.5, '&:active': { transform: 'scale(0.96)' } }}><Avatar sx={{ width: 38, height: 38, bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 700, boxShadow: '0 4px 16px rgba(25,118,210,0.25)' }}>{initials}</Avatar></IconButton></Tooltip></Stack>
    </Toolbar>
    <AccountMenu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} slotProps={{ paper: { sx: { mt: 1, minWidth: 210, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', backgroundImage: 'none' } } }}>
      <MenuItem disabled><ListItemIcon><AccountCircle fontSize="small" /></ListItemIcon><Box sx={{ minWidth: 0 }}><Typography variant="body2" noWrap>{user?.email || 'Account'}</Typography><Typography variant="caption" color="text.secondary">Signed in</Typography></Box></MenuItem><Divider /><MenuItem onClick={() => { setAnchorEl(null); navigate('/settings'); }}><ListItemIcon><Settings fontSize="small" /></ListItemIcon>Settings</MenuItem><MenuItem onClick={() => { setAnchorEl(null); logout(); }} sx={{ color: 'error.light' }}><ListItemIcon><Logout fontSize="small" color="error" /></ListItemIcon>Sign out</MenuItem>
    </AccountMenu>
  </AppBar>;
}
