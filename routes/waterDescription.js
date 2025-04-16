const express = require('express');
const { getWaterbodyDescription } = require('../Utils/openaiClient');
const { gpsEmitter } = require('./gps'); // ✅ Import gpsEmitter properly

const router = express.Router();

let latestCoordinates = null;

// ✅ Listen to coordinates emitted by gps.js
gpsEmitter.on('coordinatesUpdated', (position) => {
  console.log('📡 Received new coordinates from GPS:', position);
  // Convert point to a minimal polygon (fake waterbody shape for AI)
  latestCoordinates = [[
    [position.lon, position.lat],
    [position.lon + 0.0002, position.lat],
    [position.lon + 0.0002, position.lat + 0.0002],
    [position.lon, position.lat + 0.0002],
    [position.lon, position.lat] // Close the loop
  ]];
});

/**
 * 🌊 GET route to return AI-generated waterbody description
 */
router.get('/water-description', async (req, res) => {
  try {
    if (!latestCoordinates) {
      return res.status(400).json({ error: 'No coordinates received yet from GPS.' });
    }

    const description = await getWaterbodyDescription(latestCoordinates);
    res.json({ description });

  } catch (err) {
    console.error('❌ Error generating description from OpenAI:', err.message);
    res.status(500).json({ error: 'Something went wrong while fetching description.' });
  }
});

module.exports = router;
