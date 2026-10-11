
// Import Mongoose, a library used to connect Node.js with MongoDB
//Mongoose is a library that helps Node.js communicate with MongoDB easily.
const mongoose = require('mongoose');

// load env 
require('dotenv').config();

// Define an asynchronous function to connect to MongoDB.
//Mongoose is a library that helps Node.js communicate with MongoDB easily.
const connectMongoDB = async () => {
    try {
                // If neither exists, use the local MongoDB database URL.
        const mongoURI =
            process.env.MONGO_URI ||
            process.env.MONGODB_URI ||
            'mongodb://localhost:27017/smartmove';

        // await prevents the function from continuing before the attempt completes.
        await mongoose.connect(mongoURI);

        // Display a success message if the connection succeeds.
        console.log('Successfully connected to MongoDB!');

    } catch (error) {
        // Catch connection errors and display the error message.
        console.error('MongoDB Connection Error:', error.message);

        // Stop the Node.js application with exit code 1,
        // indicating that the application encountered a failure.
        process.exit(1);
    }
};

// Export the connection function so another file can import and call it.
module.exports = connectMongoDB;
