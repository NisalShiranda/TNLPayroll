const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
    // Global Default (Fallback)
    baseSalary: { type: Number, default: 30000 },

    // Company Profile
    companyName: { type: String, default: 'TNL Garments' },
    companyAddress: { type: String, default: '123 Garment Factory Rd, Colombo' },
    companyPhone: { type: String, default: '+94 11 234 5678' },
    companyEmail: { type: String, default: 'info@tnlgarments.com' },

    // Payroll Configurations
    otDivisor: { type: Number, default: 240 }, // Hourly Rate = Base / 240
    currency: { type: String, default: 'LKR' },

    // Billing Cycle
    billingStartDay: { type: Number, default: 20 } // Cycle starts on 20th
});

// We'll treat this as a singleton collection mostly
module.exports = mongoose.model('Settings', SettingsSchema);
