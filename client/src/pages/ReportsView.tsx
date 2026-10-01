/**
 * File: ReportsView.tsx
 * Purpose: Displays statistical data and reports regarding the transport system.
 * What it has: Total revenue summary and a table of the most frequent routes.
 * Why it exists: To help management analyze performance and make data-driven decisions.
 * Technologies used: React, Material UI (MUI) components (Table, Card).
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Grid, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { TrendingUp, Map } from 'lucide-react';
// import axios from 'axios';

function ReportsView() {
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [popularRoutes, setPopularRoutes] = useState<any[]>([]);

  // Fetch data when the page loads
  useEffect(() => {
    loadReportData();
  }, []);

  async function loadReportData() {
    try {
      // Mock data for the demonstration
      const simulatedRevenue = 12540.50;
      const simulatedRoutes = [
        { routeId: 1, routeName: 'Campus to City Center', tripCount: 150 },
        { routeId: 2, routeName: 'City Center to Tech Park', tripCount: 120 },
        { routeId: 3, routeName: 'Tech Park to Mall', tripCount: 95 },
      ];

      setTotalRevenue(simulatedRevenue);
      setPopularRoutes(simulatedRoutes);
    } catch (error) {
      console.error('Failed to load report data:', error);
    }
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 4, color: '#1e3a8a' }}>
        Reports & Analytics
      </Typography>

      <Grid container spacing={4}>
        {/* Revenue Card Section */}
        <Grid item xs={12} md={4}>
          <Card sx={{ boxShadow: 3, borderRadius: 2, background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', color: 'white' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 4 }}>
              <Box>
                <Typography variant="h6" sx={{ opacity: 0.9 }}>Total Revenue (Month)</Typography>
                <Typography variant="h3" fontWeight="bold">${totalRevenue.toLocaleString()}</Typography>
              </Box>
              <TrendingUp size={48} opacity={0.8} />
            </CardContent>
          </Card>
        </Grid>

        {/* Popular Routes Table Section */}
        <Grid item xs={12} md={8}>
          <Typography variant="h5" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <Map style={{ marginRight: '8px' }} /> Frequent Routes
          </Typography>
          <TableContainer component={Paper} sx={{ boxShadow: 3, borderRadius: 2 }}>
            <Table>
              <TableHead sx={{ backgroundColor: '#f1f5f9' }}>
                <TableRow>
                  <TableCell><strong>Route ID</strong></TableCell>
                  <TableCell><strong>Route Name</strong></TableCell>
                  <TableCell align="right"><strong>Trip Count</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {popularRoutes.map((routeData) => (
                  <TableRow key={routeData.routeId} hover>
                    <TableCell>{routeData.routeId}</TableCell>
                    <TableCell>{routeData.routeName}</TableCell>
                    <TableCell align="right">{routeData.tripCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    </Box>
  );
}

export default ReportsView;
