const express = require('express');
const EventEmitter = require('events');
const router = express.Router();

// Create a new EventEmitter instance
const gpsEmitter = new EventEmitter();

// 🌍 Global variable to store the latest GPS position
let initialPosition = null;

/**
 * ✅ GET route to retrieve the last stored GPS position (for testing)
 */
router.get('/getinfo', (req, res) => {
  console.log('📦 Current GPS:', initialPosition);
  res.json({ position: initialPosition });
});

/**
 * 📥 POST route to receive and process new GPS data
 */
router.post('/gps', (req, res) => {
  const { lat, lon, timestamp } = req.body;

  // Validate the received GPS data
  if (!lat || !lon) {
    return res.status(400).json({ error: '❗ lat and lon are required' });
  }

  // Store the new GPS data globally
  initialPosition = { lat, lon, timestamp };
  console.log('📍 New GPS Received:', initialPosition);

  // Emit the coordinates to other listeners (services)
  gpsEmitter.emit('coordinatesUpdated', initialPosition);

  // Respond to the client
  res.json({
    message: '✅ GPS received and sent to other services!',
    position: initialPosition,
    path: `🚤 Path planned near (${lat}, ${lon})`,
  });
});

// Export the router and gpsEmitter to be used in the main server and other services
module.exports = { router, gpsEmitter };
