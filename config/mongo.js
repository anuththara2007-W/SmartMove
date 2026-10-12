//Import mongoose (connect Node.js with MongoDB)
const mongoose = require('mongoose');
//Load env varibles from.env file
require('dotenv').config();

const connectMongoDB = async () => {
    try {
        const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/smartmove'; //default mongoDB port
        await mongoose.connect(mongoURI);
        console.log('Successfully connected to MongoDB!');
    } catch (error) {
        console.error('MongoDB Connection Error:', error.message);
        process.exit(1);
    }
};

module.exports = connectMongoDB;
