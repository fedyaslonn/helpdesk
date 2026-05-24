import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Drawer, Box, useMediaQuery, useTheme } from '@mui/material';
import Header from './Header';
import SidebarNav from './Sidebar';

const DRAWER_WIDTH = 240;

const Layout = () => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  const closeMobile = () => setMobileOpen(false);

  const drawerContent = (
    <Box className="flex h-full flex-col border-r border-slate-200 bg-white pt-2">
      <SidebarNav onNavigate={closeMobile} />
    </Box>
  );

  return (
    <div className="flex min-h-screen flex-col bg-hd-page">
      <Header onMenuClick={handleDrawerToggle} />

      <div className="flex flex-1 min-w-0">
        {isDesktop ? (
          <Box
            component="aside"
            className="hidden shrink-0 md:block"
            sx={{ width: DRAWER_WIDTH }}
          >
            {drawerContent}
          </Box>
        ) : (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={closeMobile}
            ModalProps={{ keepMounted: true }}
            sx={{
              display: { xs: 'block', md: 'none' },
              '& .MuiDrawer-paper': {
                width: DRAWER_WIDTH,
                boxSizing: 'border-box',
              },
            }}
          >
            {drawerContent}
          </Drawer>
        )}

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
