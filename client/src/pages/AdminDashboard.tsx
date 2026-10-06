/**
 * File: AdminDashboard.tsx
 * Purpose: Displays the administrative dashboard for managing the vehicle fleet and viewing announcements.
 * What it has: A grid displaying active vehicles and a list of current system announcements.
 * Why it exists: To give administrators a high-level overview of system status.
 * Technologies used: React, Material UI (MUI), Axios for data fetching.
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Grid, Box, Chip, Paper, List, ListItem, ListItemText, ListItemAvatar, Avatar } from '@mui/material';
import { Info, AlertCircle } from 'lucide-react';
// import axios from 'axios';

function AdminDashboard() {
  const [vehicleFleet, setVehicleFleet] = useState<any[]>([]);
  const [systemAnnouncements, setSystemAnnouncements] = useState<any[]>([]);
  
  // Load data when the page first opens
  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      // In a real scenario, this would use axios to fetch from a backend API
      // Example: const vehiclesResponse = await axios.get('/api/vehicles');
      
      // Using mock data for demonstration
      const mockVehicles = [
        { vehicleID: 101, imageUrls: ['https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=500&q=80'] },
        { vehicleID: 102, imageUrls: ['https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=500&q=80'] },
      ];
      
      const mockAnnouncements = [
        { id: 1, title: 'Route 1 Delay', message: 'Due to traffic, Route 1 is delayed by 15 mins.', type: 'warning' },
        { id: 2, title: 'New Fleet Added', message: 'Three new buses have been added to the city center route.', type: 'info' }
      ];

      setVehicleFleet(mockVehicles);
      setSystemAnnouncements(mockAnnouncements);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 4, color: '#1e3a8a' }}>
        Admin Dashboard
      </Typography>

      <Grid container spacing={4}>
        {/* Vehicles Section */}
        <Grid item xs={12} md={8}>
          <Typography variant="h5" sx={{ mb: 2 }}>Vehicle Fleet</Typography>
          <Grid container spacing={2}>
            {vehicleFleet.map((vehicle) => (
              <Grid item xs={12} sm={6} key={vehicle.vehicleID}>
                <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
                  <Box
                    component="img"
                    sx={{ height: 140, width: '100%', objectFit: 'cover' }}
                    alt={`Vehicle ${vehicle.vehicleID}`}
                    src={vehicle.imageUrls[0] || 'https://via.placeholder.com/300x140?text=No+Image'}
                  />
                  <CardContent>
                    <Typography gutterBottom variant="h6" component="div">
                      Vehicle #{vehicle.vehicleID}
                    </Typography>
                    <Chip label="Active" color="success" size="small" />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>

        {/* Announcements Section */}
        <Grid item xs={12} md={4}>
          <Typography variant="h5" sx={{ mb: 2 }}>Announcements</Typography>
          <Paper sx={{ p: 0, boxShadow: 3, borderRadius: 2 }}>
            <List sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: 2 }}>
              {systemAnnouncements.map((announcement) => {
                const isWarning = announcement.type === 'warning';
                return (
                  <ListItem key={announcement.id} alignItems="flex-start" divider>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: isWarning ? '#f59e0b' : '#3b82f6' }}>
                        {isWarning ? <AlertCircle /> : <Info />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={announcement.title}
                      secondary={
                        <Typography sx={{ display: 'inline' }} component="span" variant="body2" color="text.primary">
                          {announcement.message}
                        </Typography>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default AdminDashboard;
