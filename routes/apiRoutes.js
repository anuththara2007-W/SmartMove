const express = require('express');
const router = express.Router();
const oracleController = require('../controllers/oracleController');
const mongoController = require('../controllers/mongoController');

// --- Oracle Endpoints ---
router.get('/routes', oracleController.getRoutes);
router.post('/routes', oracleController.createRoute);
router.put('/routes/:id', oracleController.updateRoute);
router.delete('/routes/:id', oracleController.deleteRoute);

router.post('/tickets', oracleController.bookTicket);
router.get('/tickets', oracleController.getTickets);
router.put('/tickets/:ticketID/status', oracleController.updateTicketStatus); // Admin panel read

router.get('/reports/revenue', oracleController.getRevenue);
router.get('/reports/routes', oracleController.getFrequentRoutes);

router.get('/payments', oracleController.getPayments);
router.post('/payments', oracleController.createPayment);
router.put('/payments/:id', oracleController.updatePayment);
router.delete('/payments/:id', oracleController.deletePayment);

router.get('/drivers', oracleController.getDrivers);
router.post('/drivers', oracleController.createDriver);
router.put('/drivers/:id', oracleController.updateDriver);
router.delete('/drivers/:id', oracleController.deleteDriver);

router.get('/passengers', oracleController.getPassengers);
router.post('/passengers', oracleController.createPassenger);
router.put('/passengers/:id', oracleController.updatePassenger);
router.delete('/passengers/:id', oracleController.deletePassenger);
router.get('/passengers/:passengerId/history', oracleController.getPassengerHistory);

router.get('/vehicles', oracleController.getVehicles);
router.post('/vehicles', oracleController.createVehicle);
router.put('/vehicles/:id', oracleController.updateVehicle);
router.delete('/vehicles/:id', oracleController.deleteVehicle);

router.get('/trips', oracleController.getTrips);
router.post('/trips', oracleController.createTrip);
router.put('/trips/:id', oracleController.updateTrip);
router.delete('/trips/:id', oracleController.deleteTrip);

// --- MongoDB Endpoints ---
router.get('/reviews', mongoController.getAllReviews);
router.post('/reviews', mongoController.submitReview);
router.get('/reviews/route/:id', mongoController.getReviewsByRoute);
router.get('/vehicles/top-rated', mongoController.getTopRatedVehicles);
router.get('/reviews/search', mongoController.searchReviews);
router.get('/announcements', mongoController.getAnnouncements);
router.post('/announcements', mongoController.postAnnouncement);
router.get('/vehicles/documents', mongoController.getVehicleDocuments);
router.post('/vehicles/documents', mongoController.postVehicleDocument);
router.get('/images', mongoController.getImages);
router.post('/images', mongoController.addImage);
router.delete('/images/:id', mongoController.deleteImage);
module.exports = router;
