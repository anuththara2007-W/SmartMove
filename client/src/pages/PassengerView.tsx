/**
 * File: PassengerView.tsx
 * Purpose: Provides the interface for passengers to view available routes, book tickets, and leave reviews.
 * What it has: A list of travel routes with booking options, and a review submission form.
 * Why it exists: To serve as the primary portal for user (passenger) interactions.
 * Technologies used: React, Material UI (MUI), Axios for sending requests.
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Button, TextField, Box, Rating, Grid, Alert } from '@mui/material';
import axios from 'axios';

function PassengerView() {
  const [availableRoutes, setAvailableRoutes] = useState<any[]>([]);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [passengerFeedback, setPassengerFeedback] = useState('');
  const [starRating, setStarRating] = useState<number | null>(3);
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(null);

  // Load routes when the component mounts
  useEffect(() => {
    loadAvailableRoutes();
  }, []);

  async function loadAvailableRoutes() {
    try {
      // Mocking route data for display purposes
      const mockRoutes = [
        { id: 1, name: 'Campus to City Center' },
        { id: 2, name: 'City Center to Tech Park' }
      ];
      setAvailableRoutes(mockRoutes);
    } catch (error) {
      console.error('Error fetching routes:', error);
    }
  }

  async function handleBookTicket(routeId: number) {
    try {
      // Send a request to book a ticket
      await axios.post('http://localhost:3000/api/tickets', {
        passengerID: 101, // Mock user ID
        routeID: routeId,
        amount: 2.5,
        paymentMethod: 'Credit Card'
      });
      alert('Ticket Booked Successfully!');
    } catch (error) {
      console.error('Error booking ticket:', error);
      alert('Failed to book ticket. Please try again.');
    }
  }

  async function handleSubmitReview() {
    setIsSubmittingReview(true);
    setSubmissionMessage(null);
    
    try {
      // Send review data to the server
      await axios.post('http://localhost:3000/api/reviews', {
        passengerID: 101,
        routeID: 1,
        driverID: 201,
        rating: starRating,
        feedback: passengerFeedback
      });
      
      setSubmissionMessage('Thank you! Your review was submitted successfully.');
      setPassengerFeedback(''); // Clear the form
      setStarRating(3); // Reset rating
    } catch (error) {
      console.error('Error submitting review:', error);
      setSubmissionMessage('We encountered a problem submitting your review.');
    } finally {
      setIsSubmittingReview(false);
    }
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 4, color: '#1e3a8a' }}>
        Passenger View
      </Typography>

      <Grid container spacing={4}>
        {/* Routes Section */}
        <Grid item xs={12} md={6}>
          <Typography variant="h5" sx={{ mb: 2 }}>Available Routes</Typography>
          {availableRoutes.map((route) => (
            <Card key={route.id} sx={{ mb: 2, boxShadow: 3, borderRadius: 2 }}>
              <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">{route.name}</Typography>
                <Button variant="contained" color="primary" onClick={() => handleBookTicket(route.id)}>
                  Book Ticket
                </Button>
              </CardContent>
            </Card>
          ))}
        </Grid>

        {/* Review Section */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2, boxShadow: 3, borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h5" sx={{ mb: 2 }}>Leave a Review</Typography>
              
              {/* Show success or error message if it exists */}
              {submissionMessage && (
                <Alert severity={submissionMessage.includes('success') ? 'success' : 'error'} sx={{ mb: 2 }}>
                  {submissionMessage}
                </Alert>
              )}
              
              <Box sx={{ mb: 2 }}>
                <Typography component="legend">Rating</Typography>
                <Rating
                  name="user-rating"
                  value={starRating}
                  onChange={(event, newRating) => {
                    setStarRating(newRating);
                  }}
                />
              </Box>
              
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Your Feedback"
                value={passengerFeedback}
                onChange={(event) => setPassengerFeedback(event.target.value)}
                sx={{ mb: 2 }}
              />
              
              <Button 
                variant="contained" 
                color="secondary" 
                onClick={handleSubmitReview}
                disabled={isSubmittingReview || passengerFeedback.trim() === ''}
                fullWidth
              >
                {isSubmittingReview ? 'Submitting Please Wait...' : 'Submit Review'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default PassengerView;
