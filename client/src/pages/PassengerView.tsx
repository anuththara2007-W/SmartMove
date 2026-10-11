
/**
 * File: PassengerView.tsx
 * Purpose: Allows passengers to view routes, book tickets, and submit reviews.
 * Technologies: React, Material UI (MUI), Axios.
 */

import { useState, useEffect } from 'react';
import {
  Card, CardContent, Typography, Button, TextField,
  Box, Rating, Grid, Alert
} from '@mui/material';
import axios from 'axios';

function PassengerView() {

  // Store available routes
  const [availableRoutes, setAvailableRoutes] = useState<any[]>([]);

  // Track whether a review is being submitted
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Store the passenger's feedback text
  const [passengerFeedback, setPassengerFeedback] = useState('');

  // Store the star rating; initially set to 3
  const [starRating, setStarRating] = useState<number | null>(3);

  // Store the success or error message
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(null);

  // Load routes when the component first opens
  useEffect(() => {
    loadAvailableRoutes();
  }, []);

  // Load available route data
  async function loadAvailableRoutes() {
    try {
      // Sample route data for demonstration
      const mockRoutes = [
        { id: 1, name: 'Campus to City Center' },
        { id: 2, name: 'City Center to Tech Park' }
      ];

      // Update the route state
      setAvailableRoutes(mockRoutes);
    } catch (error) {
      // Display errors in the browser console
      console.error('Error fetching routes:', error);
    }
  }

  // Book a ticket for the selected route
  async function handleBookTicket(routeId: number) {
    try {
      // Send ticket details to the backend API
      await axios.post('http://localhost:3000/api/tickets', {
        passengerID: 101, // Sample passenger ID
        routeID: routeId, // Selected route ID
        amount: 2.5, // Ticket price
        paymentMethod: 'Credit Card'
      });

      // Show a success message
      alert('Ticket Booked Successfully!');
    } catch (error) {
      // Handle ticket booking errors
      console.error('Error booking ticket:', error);
      alert('Failed to book ticket. Please try again.');
    }
  }

  // Submit the passenger's review
  async function handleSubmitReview() {

    // Show loading state and clear the previous message
    setIsSubmittingReview(true);
    setSubmissionMessage(null);

    try {
      // Send review details to the backend API
      await axios.post('http://localhost:3000/api/reviews', {
        passengerID: 101, // Sample passenger ID
        routeID: 1, // Route being reviewed
        driverID: 201, // Sample driver ID
        rating: starRating, // Selected star rating
        feedback: passengerFeedback // Written feedback
      });

      // Show success message after submission
      setSubmissionMessage(
        'Thank you! Your review was submitted successfully.'
      );

      // Clear the feedback field
      setPassengerFeedback('');

      // Reset the rating to 3 stars
      setStarRating(3);

    } catch (error) {
      // Show an error message if submission fails
      console.error('Error submitting review:', error);
      setSubmissionMessage(
        'We encountered a problem submitting your review.'
      );

    } finally {
      // Stop the loading state whether successful or not
      setIsSubmittingReview(false);
    }
  }

  // Render the passenger interface
  return (
    <Box>

      {/* Page heading */}
      <Typography
        variant="h4"
        sx={{ mb: 4, color: '#1e3a8a', fontWeight: 'bold' }}
      >
        Passenger View
      </Typography>

      {/* Main responsive grid */}
      <Grid container spacing={4}>

        {/* Available routes section */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Available Routes
          </Typography>

          {/* Create a card for each available route */}
          {availableRoutes.map((route) => (
            <Card
              key={route.id}
              sx={{ mb: 2, boxShadow: 3, borderRadius: 2 }}
            >
              <CardContent
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                {/* Display the route name */}
                <Typography variant="h6">
                  {route.name}
                </Typography>

                {/* Book the selected route's ticket */}
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => handleBookTicket(route.id)}
                >
                  Book Ticket
                </Button>
              </CardContent>
            </Card>
          ))}
        </Grid>

        {/* Review submission section */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ p: 2, boxShadow: 3, borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h5" sx={{ mb: 2 }}>
                Leave a Review
              </Typography>

              {/* Display success or error messages */}
              {submissionMessage && (
                <Alert
                  severity={
                    submissionMessage.includes('success')
                      ? 'success'
                      : 'error'
                  }
                  sx={{ mb: 2 }}
                >
                  {submissionMessage}
                </Alert>
              )}

              {/* Star rating input */}
              <Box sx={{ mb: 2 }}>
                <Typography component="legend">
                  Rating
                </Typography>

                <Rating
                  name="user-rating"
                  value={starRating}
                  onChange={(_, newRating) => {
                    // Update the selected rating
                    setStarRating(newRating);
                  }}
                />
              </Box>

              {/* Feedback text input */}
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Your Feedback"
                value={passengerFeedback}
                onChange={(event) =>
                  setPassengerFeedback(event.target.value)
                }
                sx={{ mb: 2 }}
              />

              {/* Submit button with loading and validation checks */}
              <Button
                variant="contained"
                color="secondary"
                onClick={handleSubmitReview}
                disabled={
                  isSubmittingReview ||
                  passengerFeedback.trim() === ''
                }
                fullWidth
              >
                {isSubmittingReview
                  ? 'Submitting Please Wait...'
                  : 'Submit Review'}
              </Button>

            </CardContent>
          </Card>
        </Grid>

      </Grid>
    </Box>
  );
}

// Export the component for use in other files
export default PassengerView;