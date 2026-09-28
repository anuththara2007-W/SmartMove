import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Bus, LayoutDashboard, BarChart3, Users } from 'lucide-react';
import { AppBar, Toolbar, Typography, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Box, CssBaseline } from '@mui/material';

const drawerWidth = 240;

const Layout = () => {
  const location = useLocation();

  const menuItems = [
    { text: 'Passenger View', icon: <Users />, path: '/' },//errors
    { text: 'Admin Dashboard', icon: <LayoutDashboard />, path: '/admin' },
    { text: 'Reports', icon: <BarChart3 />, path: '/reports' },
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
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton 
                  component={Link} 
                  to={item.path}
                  selected={location.pathname === item.path}
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
                  <ListItemIcon sx={{ color: location.pathname === item.path ? '#1d4ed8' : 'inherit' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
