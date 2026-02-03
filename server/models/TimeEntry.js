const mongoose = require('mongoose');

const TimeEntrySchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    checkIn: {
        type: String, // Storing as "HH:mm" 24h format
        required: true
    },
    lunchOut: {
        type: String,
        required: false
    },
    lunchIn: {
        type: String,
        required: false
    },
    checkOut: {
        type: String,
        required: true
    },
    isSpecialDay: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('TimeEntry', TimeEntrySchema);
