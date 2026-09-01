import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AddComment, ChevronLeft, ChevronRight, History, Logout, Memory, Settings } from '@mui/icons-material';
import { Box, Button, Divider, Drawer, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Stack, Tooltip, Typography } from '@mui/material';
import { useAuthStore } from '@/store/authStore';

const navigation = [
  { name: 'Workspace', href: '/workspace', icon: AddComment },
  { name: 'History', href: '/history', icon: History },
  { name: 'Memory', href: '/memory', icon: Memory },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface SidebarProps { mobileOpen: boolean; onMobileClose: () => void }

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { logout } = useAuthStore();
  const content = (
    <Stack sx={{ height: '100%', width: { xs: 280, md: collapsed ? 76 : 256 }, transition: 'width 180ms ease', bgcolor: 'background.paper' }}>
      <Stack direction="row" sx={{ minHeight: 72, px: 2, alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Box sx={{ width: 38, height: 38, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 2, bgcolor: 'primary.main', color: 'primary.contrastText' }}><AddComment fontSize="small" /></Box>
          {!collapsed && <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>Jarvis</Typography>}
        </Stack>
        <IconButton onClick={() => setCollapsed((value) => !value)} size="small" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} sx={{ display: { xs: 'none', md: 'inline-flex' }, color: 'text.secondary' }}>{collapsed ? <ChevronRight fontSize="small" /> : <ChevronLeft fontSize="small" />}</IconButton>
      </Stack>
      <Divider />
      <List sx={{ px: 1.25, py: 2, flex: 1 }}>
        {navigation.map((item) => {
          const active = location.pathname === item.href || (item.href !== '/workspace' && location.pathname.startsWith(item.href));
          const Icon = item.icon;
          return <ListItem key={item.href} disablePadding sx={{ mb: 0.5 }}><Tooltip title={collapsed ? item.name : ''} placement="right"><ListItemButton component={NavLink} to={item.href} onClick={onMobileClose} selected={active} sx={{ minHeight: 46, borderRadius: 2, justifyContent: collapsed ? 'center' : 'initial', '&.Mui-selected': { color: 'primary.light', bgcolor: 'rgba(25, 118, 210, 0.14)', border: '1px solid rgba(25, 118, 210, 0.28)' }, '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' } }}><ListItemIcon sx={{ minWidth: collapsed ? 0 : 40, justifyContent: 'center', color: 'inherit' }}><Icon fontSize="small" /></ListItemIcon>{!collapsed && <ListItemText primary={item.name} slotProps={{ primary: { sx: { fontSize: 14, fontWeight: 600 } } }} />}</ListItemButton></Tooltip></ListItem>;
        })}
      </List>
      <Stack spacing={1} sx={{ p: 1.5 }}>
        <Button component={NavLink} to="/workspace" onClick={onMobileClose} variant="contained" fullWidth startIcon={!collapsed ? <AddComment /> : undefined} sx={{ minHeight: 44, minWidth: 0, px: collapsed ? 1 : 2 }}>{collapsed ? <AddComment /> : 'New conversation'}</Button>
        <Button onClick={logout} variant="text" color="error" fullWidth startIcon={!collapsed ? <Logout /> : undefined} sx={{ minHeight: 42, minWidth: 0, px: collapsed ? 1 : 2 }}>{collapsed ? <Logout /> : 'Sign out'}</Button>
      </Stack>
    </Stack>
  );
  return <><Box component="nav" sx={{ display: { xs: 'none', md: 'block' }, flexShrink: 0, width: collapsed ? 76 : 256, transition: 'width 180ms ease' }}><Box sx={{ position: 'fixed', inset: '0 auto 0 0', borderRight: '1px solid', borderColor: 'divider' }}>{content}</Box></Box><Drawer open={mobileOpen} onClose={onMobileClose} sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { borderRight: '1px solid', borderColor: 'divider' } }}>{content}</Drawer></>;
}
