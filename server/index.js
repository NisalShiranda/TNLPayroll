const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const TimeEntry = require('./models/TimeEntry');
const Settings = require('./models/Settings');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/tnlpayroll';
mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

// Routes

// Get all entries
app.get('/api/entries', async (req, res) => {
    try {
        const entries = await TimeEntry.find().sort({ date: -1 });
        res.json(entries);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Add new entry
app.post('/api/entries', async (req, res) => {
    try {
        const newEntry = new TimeEntry(req.body);
        const savedEntry = await newEntry.save();
        res.status(201).json(savedEntry);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete entry
app.delete('/api/entries/:id', async (req, res) => {
    try {
        await TimeEntry.findByIdAndDelete(req.params.id);
        res.json({ message: 'Entry deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get Settings
app.get('/api/settings', async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings({ baseSalary: 30000 });
            await settings.save();
        }
        res.json(settings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update Settings
app.put('/api/settings', async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings();
        }
        settings.baseSalary = req.body.baseSalary;
        await settings.save();
        res.json(settings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
