const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    baseSalary: {
        type: Number,
        required: true,
        default: 30000
    },
    joinedDate: {
        type: Date,
        default: Date.now
    },
    email: {
        type: String,
        required: false
    }
});

module.exports = mongoose.model('Employee', EmployeeSchema);
