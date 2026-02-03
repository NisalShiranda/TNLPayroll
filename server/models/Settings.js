const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
    baseSalary: {
        type: Number,
        required: true,
        default: 30000
    }
});

// We'll treat this as a singleton collection mostly
module.exports = mongoose.model('Settings', SettingsSchema);
