import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export function Dashboard() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: 'background.default' }}>
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Header onMenuClick={() => setMobileOpen(true)} />
        <Box component="main" sx={{ flex: 1, minWidth: 0, overflow: 'auto', p: { xs: 2, sm: 3, lg: 4 } }}><Outlet /></Box>
      </Box>
    </Box>
  );
}
