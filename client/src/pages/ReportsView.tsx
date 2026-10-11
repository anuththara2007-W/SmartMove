
/**
 * File: ReportsView.tsx
 * Purpose: Displays transport revenue and popular routes.
 * Technologies: React and Material UI (MUI).
 */

import { useState, useEffect } from 'react';
import {
  Card, CardContent, Typography, Grid, Box,
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper
} from '@mui/material';

import { TrendingUp, Map } from 'lucide-react';

// import axios from 'axios'; // Can be used to fetch real report data.

function ReportsView() {  

  // Store total monthly revenue, initially zero
  const [totalRevenue, setTotalRevenue] = useState<number>(0);

  // Store popular route information
  const [popularRoutes, setPopularRoutes] = useState<any[]>([]);

  // Load report data when the component first opens
  useEffect(() => {
    loadReportData();
  }, []);

  // Load revenue and route statistics
  async function loadReportData() {
    try {
      // Sample revenue for demonstration
      const simulatedRevenue = 12540.50;

      // Sample routes and their trip counts
      const simulatedRoutes = [
        { routeId: 1, routeName: 'Campus to City Center', tripCount: 150 },
        { routeId: 2, routeName: 'City Center to Tech Park', tripCount: 120 },
        { routeId: 3, routeName: 'Tech Park to Mall', tripCount: 95 },
      ];

      // Update the revenue and route states
      setTotalRevenue(simulatedRevenue);
      setPopularRoutes(simulatedRoutes);

    } catch (error) {
      // Display errors in the browser console
      console.error('Failed to load report data:', error);
    }
  }

  // Render the reports and analytics page
  return (
    <Box>

      {/* Page heading */}
      <Typography
        variant="h4"
        sx={{ mb: 4, color: '#1e3a8a', fontWeight: 'bold' }}
      >
        Reports & Analytics
      </Typography>

      {/* Main responsive grid layout */}
      <Grid container spacing={4}>

        {/* Monthly revenue card */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card
            sx={{
              boxShadow: 3,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
              color: 'white'
            }}
          >
            <CardContent
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 4
              }}
            >
              <Box>
                {/* Display the revenue heading */}
                <Typography variant="h6" sx={{ opacity: 0.9 }}>
                  Total Revenue (Month)
                </Typography>

                {/* Format revenue with thousands separators */}
                <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                  ${totalRevenue.toLocaleString()}
                </Typography>
              </Box>

              {/* Revenue trend icon */}
              <TrendingUp size={48} opacity={0.8} />
            </CardContent>
          </Card>
        </Grid>

        {/* Popular routes table */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Typography
            variant="h5"
            sx={{ mb: 2, display: 'flex', alignItems: 'center' }}
          >
            {/* Icon beside the table heading */}
            <Map style={{ marginRight: '8px' }} />
            Frequent Routes
          </Typography>

          {/* Container for the table */}
          <TableContainer
            component={Paper}
            sx={{ boxShadow: 3, borderRadius: 2 }}
          >
            <Table>

              {/* Table column headings */}
              <TableHead sx={{ backgroundColor: '#f1f5f9' }}>
                <TableRow>
                  <TableCell><strong>Route ID</strong></TableCell>
                  <TableCell><strong>Route Name</strong></TableCell>
                  <TableCell align="right">
                    <strong>Trip Count</strong>
                  </TableCell>
                </TableRow>
              </TableHead>

              {/* Display each popular route */}
              <TableBody>
                {popularRoutes.map((routeData) => (
                  <TableRow key={routeData.routeId} hover>
                    <TableCell>{routeData.routeId}</TableCell>
                    <TableCell>{routeData.routeName}</TableCell>
                    <TableCell align="right">
                      {routeData.tripCount}
                    </TableCell>
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

// Export the component for use in other files
export default ReportsView;