const { gpsEmitter } = require('./gps.js');           // 📡 Import GPS coordinate emitter
const axios = require('axios');                      // 🌐 To fetch data from Overpass API
const osmtogeojson = require('osmtogeojson');        // 🔄 Convert OSM data to GeoJSON
const fs = require('fs');                            // 📁 For file read/write
const { JSDOM } = require('jsdom');                  // 🧠 For simulating DOM in Node
const haversine = require('haversine-distance');     // 📏 For GPS-to-GPS distance calculations

// 🧠 Setup a fake DOM environment so osmtogeojson works
global.DOMParser = new JSDOM().window.DOMParser;

// 📂 Define file paths
const geojsonPath = './data/WaterBody.geojson';          // Final GeoJSON file path
const cachePath = './data/last_location_cache.json';     // Stores last GPS coordinates used

// 📡 Listen for real-time GPS updates
gpsEmitter.on('coordinatesUpdated', async (coordinates) => {
  console.log('📥 New GPS Coordinate Received:', coordinates);
  const { lat, lon } = coordinates;

  // ⏪ STEP 1: Check if we've already processed this location
  if (fs.existsSync(cachePath)) {
    const lastData = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    const prevCoords = { lat: lastData.lat, lon: lastData.lon };

    // 📏 Measure distance between current and last location
    const distance = haversine(prevCoords, coordinates);

    // ✅ Skip processing if distance is < 50 meters
    if (distance < 50) {
      console.log(`🟡 Already processed similar location (only ${distance.toFixed(2)} meters away). Skipping GeoJSON generation.`);
      return;
    }
  }

  // 🌍 STEP 2: Build Overpass API query to fetch natural waterbodies near the coordinates
  const query = `
[out:json][timeout:25];
(
  way(around:10000, ${lat}, ${lon})["natural"="water"];
  relation(around:10000, ${lat}, ${lon})["natural"="water"];
);
out body;
>;
out skel qt;
`;

  try {
    // 🌐 Send POST request to Overpass API with the query
    const response = await axios.post(
      'https://overpass-api.de/api/interpreter',
      query,
      { headers: { 'Content-Type': 'text/plain' } }
    );

    const osmData = response.data;

    // ❌ If no waterbodies found, stop
    if (!osmData.elements || osmData.elements.length === 0) {
      console.log('❌ No waterbody found near the coordinates.');
      return;
    }

    // 🔄 Convert OSM data to GeoJSON format
    const fullGeoJSON = osmtogeojson(osmData);

    // 📍 STEP 3: Find the nearest waterbody polygon from current location
    const featuresWithDistance = fullGeoJSON.features
      .filter(f => f.geometry?.type === 'Polygon')   // Only polygons (no lines or points)
      .map(feature => {
        const coords = feature.geometry.coordinates[0];
        const centerLat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
        const centerLon = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;

        const distance = haversine({ lat, lon }, { lat: centerLat, lon: centerLon });
        return { feature, distance };
      });

    const nearestFeature = featuresWithDistance
      .sort((a, b) => a.distance - b.distance)[0]?.feature;

    if (!nearestFeature) {
      console.log('❌ No valid polygon waterbody found.');
      return;
    }

    // 🌐 Create a single-feature GeoJSON object
    const geojson = {
      type: 'FeatureCollection',
      features: [nearestFeature],
    };

    // 💾 Save the GeoJSON to a clean, fixed file
    fs.writeFileSync(geojsonPath, JSON.stringify(geojson, null, 2));
    console.log(`✅ Waterbody GeoJSON saved at: ${geojsonPath}`);

    // 🧠 Update cache with current coordinates
    fs.writeFileSync(cachePath, JSON.stringify({ lat, lon }, null, 2));
    console.log('💾 GPS location cached to avoid duplicates.');

  } catch (error) {
    console.error('❌ Error fetching or processing Overpass API data:', error.message);
  }
});
