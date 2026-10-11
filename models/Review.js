const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    passengerID: {
        type: Number
    },
    passengerId: {
        type: Number
    },
    routeID: {
        type: Number,
        index: true
    },
    routeId: {
        type: Number,
        index: true
    },
    driverID: {
        type: Number,
        default: 999
    },
    driverId: {
        type: Number,
        default: 999
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    feedback: {
        type: String
    },
    feedbackText: {
        type: String
    }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Pre-validate hook to synchronize both naming conventions
reviewSchema.pre('validate', function(next) {
    const pId = this.passengerID ?? this.passengerId;
    if (pId !== undefined && pId !== null && !isNaN(pId)) {
        this.passengerID = Number(pId);
        this.passengerId = Number(pId);
    } else {
        return next(new Error('Path `passengerID` is required.'));
    }

    const rId = this.routeID ?? this.routeId;
    if (rId !== undefined && rId !== null && !isNaN(rId)) {
        this.routeID = Number(rId);
        this.routeId = Number(rId);
    } else {
        return next(new Error('Path `routeID` is required.'));
    }

    const dId = this.driverID ?? this.driverId ?? 999;
    this.driverID = Number(dId);
    this.driverId = Number(dId);

    const fb = this.feedback ?? this.feedbackText;
    if (fb && String(fb).trim().length > 0) {
        this.feedback = String(fb).trim();
        this.feedbackText = String(fb).trim();
    } else {
        return next(new Error('Path `feedback` is required.'));
    }

    next();
});

// Text index for search functionality
reviewSchema.index({ feedback: 'text', feedbackText: 'text' });

module.exports = mongoose.model('Review', reviewSchema);
