// Import Mongoose to work with MongoDB.
const mongoose = require('mongoose');

// Define the structure and validation rules for announcements.
const announcementSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true // Title must be provided.
    },
    message: {
        type: String,
        required: true // Message must be provided.
    },
    type: {
        type: String,
        enum: ['info', 'warning', 'alert'], // Allow only these three types.
        default: 'info' // Use 'info' if no type is specified.
    },
    active: {
        type: Boolean,
        default: true // Announcements are active by default.
    }
}, { timestamps: true }); // Automatically add createdAt and updatedAt.

// Create and export the Announcement model for database operations.
module.exports = mongoose.model('Announcement', announcementSchema);