/**
 * File: Layout.tsx
 * Purpose: Provides a consistent layout structure across all pages.
 * It includes a top navigation bar and a side drawer with navigation links.
 * Why it exists: To prevent code duplication for the navigation menu on every page.
 * Technologies used: React, React Router DOM, Material UI (MUI), Lucide React (icons).
 */

import { Outlet, Link, useLocation } from 'react-router-dom';
import { Bus, LayoutDashboard, BarChart3, Users } from 'lucide-react';
import { AppBar, Toolbar, Typography, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Box, CssBaseline } from '@mui/material';

const SIDEBAR_WIDTH = 240;

function MainLayout() {
  const currentLocation = useLocation();

  const navigationLinks = [
    { label: 'Passenger View', icon: <Users />, urlPath: '/' },
    { label: 'Admin Dashboard', icon: <LayoutDashboard />, urlPath: '/admin' },
    { label: 'Reports', icon: <BarChart3 />, urlPath: '/reports' },
  ];

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, backgroundColor: '#1e40af' }}>
        <Toolbar>
          <Bus style={{ marginRight: '12px' }} />
          <Typography variant="h6" noWrap component="div">
            SmartMove Transport Solutions
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Drawer
        variant="permanent"
        sx={{
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: SIDEBAR_WIDTH, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {navigationLinks.map((navItem) => {
              const isCurrentlySelected = currentLocation.pathname === navItem.urlPath;
              return (
                <ListItem key={navItem.label} disablePadding>
                  <ListItemButton 
                    component={Link} 
                    to={navItem.urlPath}
                    selected={isCurrentlySelected}
                    sx={{
                      '&.Mui-selected': {
                        backgroundColor: '#eff6ff',
                        color: '#1d4ed8',
                        '& .MuiListItemIcon-root': {
                          color: '#1d4ed8',
                        }
                      }
                    }}
                  >
                    <ListItemIcon sx={{ color: isCurrentlySelected ? '#1d4ed8' : 'inherit' }}>
                      {navItem.icon}
                    </ListItemIcon>
                    <ListItemText primary={navItem.label} />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>
      </Drawer>
      
      <Box component="main" sx={{ flexGrow: 1, p: 3, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
        <Toolbar />
        {/* The Outlet component renders the current page content based on the route */}
        <Outlet />
      </Box>
    </Box>
  );
}

export default MainLayout;
