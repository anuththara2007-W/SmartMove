/**
 * File: Layout.tsx
 * Purpose: Creates a common layout for all pages.
 * Includes a top navigation bar, a sidebar, and a main content area.
 * Helps avoid repeating the same navigation code on every page.
 */

// Import components and hooks from React Router
import { Outlet, Link, useLocation } from 'react-router-dom';

// Import icons from Lucide React
import { Bus, LayoutDashboard, BarChart3, Users } from 'lucide-react';

// Import UI components from Material UI
import {
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  CssBaseline
} from '@mui/material';

// Store the sidebar width in one reusable constant
const SIDEBAR_WIDTH = 240;

// Create the main layout component
function MainLayout() {

  // Get information about the current URL
  const currentLocation = useLocation();

  // Store the labels, icons, and paths of sidebar links
  const navigationLinks = [
    { label: 'Passenger View', icon: <Users />, urlPath: '/' },
    { label: 'Admin Dashboard', icon: <LayoutDashboard />, urlPath: '/admin' },
    { label: 'Reports', icon: <BarChart3 />, urlPath: '/reports' },
  ];

  // Return the complete page layout
  return (
    // Use Flexbox to arrange the main layout sections
    <Box sx={{ display: 'flex' }}>

      {/* Apply consistent default styles across the application */}
      <CssBaseline />

      {/* Create the fixed top navigation bar */}
      <AppBar
        position="fixed"
        sx={{
          // Keep the header above the sidebar
          zIndex: (theme) => theme.zIndex.drawer + 1,

          // Set the header background color
          backgroundColor: '#1e40af'
        }}
      >
        {/* Arrange the header content */}
        <Toolbar>

          {/* Display the bus icon with space on its right */}
          <Bus style={{ marginRight: '12px' }} />

          {/* Display the application name */}
          <Typography variant="h6" noWrap component="div">
            SmartMove Transport Solutions
          </Typography>

        </Toolbar>
      </AppBar>

      {/* Create a sidebar that remains visible */}
      <Drawer
        variant="permanent"
        sx={{
          // Set the sidebar width to 240 pixels
          width: SIDEBAR_WIDTH,

          // Prevent the sidebar from shrinking
          flexShrink: 0,

          // Apply styling to the actual sidebar panel
          [`& .MuiDrawer-paper`]: {
            width: SIDEBAR_WIDTH,

            // Include padding and borders within the width
            boxSizing: 'border-box'
          },
        }}
      >

        {/* Leave space for the fixed top navigation bar */}
        <Toolbar />

        {/* Allow the sidebar content to scroll if necessary */}
        <Box sx={{ overflow: 'auto' }}>

          {/* Group all navigation links into a list */}
          <List>

            {/* Create a navigation item for each link in the array */}
            {navigationLinks.map((navItem) => {

              // Check whether this link matches the current URL
              const isCurrentlySelected =
                currentLocation.pathname === navItem.urlPath;

              // Return one sidebar navigation item
              return (
                <ListItem
                  // Give each item a unique key for React
                  key={navItem.label}

                  // Remove the default list item padding
                  disablePadding
                >

                  {/* Make the navigation row clickable */}
                  <ListItemButton
                    // Use React Router Link for page navigation
                    component={Link}

                    // Set the destination of this navigation link
                    to={navItem.urlPath}

                    // Highlight the item if it matches the current URL
                    selected={isCurrentlySelected}

                    // Style the selected navigation item
                    sx={{
                      '&.Mui-selected': {

                        // Set the selected item's background color
                        backgroundColor: '#eff6ff',

                        // Set the selected item's text color
                        color: '#1d4ed8',

                        // Change the icon color when the item is selected
                        '& .MuiListItemIcon-root': {
                          color: '#1d4ed8',
                        }
                      }
                    }}
                  >

                    {/* Display the navigation icon */}
                    <ListItemIcon
                      sx={{
                        // Use blue for the selected icon
                        // Otherwise, inherit the surrounding text color
                        color: isCurrentlySelected
                          ? '#1d4ed8'
                          : 'inherit'
                      }}
                    >
                      {/* Render the icon stored in the current array item */}
                      {navItem.icon}
                    </ListItemIcon>

                    {/* Display the navigation link's label */}
                    <ListItemText primary={navItem.label} />

                  </ListItemButton>
                </ListItem>
              );
            })}

          </List>
        </Box>
      </Drawer>

      {/* Create the main content area beside the sidebar */}
      <Box
        component="main"
        sx={{
          // Allow the content area to fill the remaining space
          flexGrow: 1,

          // Add 24 pixels of padding on all sides (MUI default spacing)
          p: 3,

          // Set a light background color
          backgroundColor: '#f8fafc',

          // Make the content area at least as tall as the viewport
          minHeight: '100vh'
        }}
      >

        {/* Leave space below the fixed top navigation bar */}
        <Toolbar />

        {/* Display the page matching the current route */}
        <Outlet />

      </Box>
    </Box>
  );
}

// Export the component so other files can import and use it
export default MainLayout;
