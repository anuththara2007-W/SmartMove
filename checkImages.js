require('dotenv').config();
const mongoose = require('mongoose');
const ResourceImage = require('./models/ResourceImage');

(async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const images = await ResourceImage.find();
        console.log(images);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
