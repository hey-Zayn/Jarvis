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
  const width = collapsed ? 76 : 264;

  const content = <Stack sx={{ height: '100%', width: { xs: 292, md: width }, transition: 'width 180ms cubic-bezier(0.23, 1, 0.32, 1)', bgcolor: 'background.paper' }}>
    <Stack direction="row" sx={{ minHeight: 72, px: collapsed ? 1.25 : 2.25, alignItems: 'center', justifyContent: 'space-between' }}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
        <Box sx={{ width: 40, height: 40, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 2.25, color: 'primary.contrastText', bgcolor: 'primary.main', boxShadow: '0 8px 24px rgba(25,118,210,0.28)' }}><AddComment fontSize="small" /></Box>
        {!collapsed && <Box sx={{ minWidth: 0 }}><Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.03em' }}>Jarvis</Typography><Typography variant="caption" color="text.secondary">Command center</Typography></Box>}
      </Stack>
      <IconButton onClick={() => setCollapsed((value) => !value)} size="small" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} sx={{ display: { xs: 'none', md: 'inline-flex' }, color: 'text.secondary', '&:active': { transform: 'scale(0.96)' } }}>{collapsed ? <ChevronRight fontSize="small" /> : <ChevronLeft fontSize="small" />}</IconButton>
    </Stack>
    <Divider />
    <Box sx={{ px: collapsed ? 1 : 1.5, pt: 2 }}><Typography variant="overline" color="text.secondary" sx={{ display: collapsed ? 'none' : 'block', px: 1, letterSpacing: '0.12em', fontSize: 10 }}>Navigation</Typography></Box>
    <List sx={{ px: collapsed ? 1 : 1.5, py: 1.25, flex: 1 }}>
      {navigation.map((item) => {
        const active = location.pathname === item.href || (item.href !== '/workspace' && location.pathname.startsWith(item.href));
        const Icon = item.icon;
        return <ListItem key={item.href} disablePadding sx={{ mb: 0.75 }}><Tooltip title={collapsed ? item.name : ''} placement="right"><ListItemButton component={NavLink} to={item.href} onClick={onMobileClose} selected={active} aria-current={active ? 'page' : undefined} sx={{ minHeight: 46, borderRadius: 2, justifyContent: collapsed ? 'center' : 'flex-start', px: collapsed ? 1 : 1.5, color: active ? 'primary.light' : 'text.secondary', border: '1px solid transparent', position: 'relative', transition: 'background-color 160ms ease-out, border-color 160ms ease-out, color 160ms ease-out, transform 160ms ease-out', '&.Mui-selected': { bgcolor: 'rgba(25,118,210,0.14)', borderColor: 'rgba(66,165,245,0.28)', color: 'primary.light', '&:before': { content: '""', position: 'absolute', left: 0, top: 10, bottom: 10, width: 3, borderRadius: 3, bgcolor: 'primary.main' } }, '&:hover': { bgcolor: 'rgba(255,255,255,0.055)', borderColor: 'rgba(255,255,255,0.08)' }, '&:active': { transform: 'scale(0.985)' } }}><ListItemIcon sx={{ minWidth: collapsed ? 0 : 40, justifyContent: 'center', color: 'inherit' }}><Icon fontSize="small" /></ListItemIcon>{!collapsed && <ListItemText primary={item.name} slotProps={{ primary: { sx: { fontSize: 14, fontWeight: active ? 700 : 600 } } }} />}</ListItemButton></Tooltip></ListItem>;
      })}
    </List>
    <Stack spacing={1} sx={{ p: collapsed ? 1 : 1.5 }}>
      <Button component={NavLink} to="/workspace" onClick={onMobileClose} variant="contained" fullWidth startIcon={!collapsed ? <AddComment /> : undefined} aria-label="Start new conversation" sx={{ minHeight: 44, minWidth: 0, px: collapsed ? 1 : 2, '&:active': { transform: 'scale(0.98)' } }}>{collapsed ? <AddComment /> : 'New conversation'}</Button>
      <Button onClick={logout} variant="text" color="error" fullWidth startIcon={!collapsed ? <Logout /> : undefined} aria-label="Sign out" sx={{ minHeight: 42, minWidth: 0, px: collapsed ? 1 : 2, '&:active': { transform: 'scale(0.98)' } }}>{collapsed ? <Logout /> : 'Sign out'}</Button>
    </Stack>
  </Stack>;

  return <>
    <Box component="nav" aria-label="Primary navigation" sx={{ display: { xs: 'none', md: 'block' }, width, flexShrink: 0, transition: 'width 180ms cubic-bezier(0.23, 1, 0.32, 1)' }}><Drawer variant="permanent" open slotProps={{ paper: { component: 'aside' } }} sx={{ '& .MuiDrawer-paper': { width, boxSizing: 'border-box', borderRight: '1px solid', borderColor: 'divider', overflowX: 'hidden', transition: 'width 180ms cubic-bezier(0.23, 1, 0.32, 1)' } }}>{content}</Drawer></Box>
    <Drawer variant="temporary" open={mobileOpen} onClose={onMobileClose} ModalProps={{ keepMounted: true }} slotProps={{ paper: { component: 'aside' } }} sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { borderRight: '1px solid', borderColor: 'divider' } }}>{content}</Drawer>
  </>;
}
