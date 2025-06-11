const { gpsEmitter } = require('./gps.js');
const axios = require('axios');
const osmtogeojson = require('osmtogeojson');
const { JSDOM } = require('jsdom');
const haversine = require('haversine-distance');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const turf = require('@turf/turf');
require('dotenv').config();

// Setup fake DOM for osmtogeojson
global.DOMParser = new JSDOM().window.DOMParser;

// Supabase Config
const supabaseUrl = process.env.SUPABASEURL;
const supabaseKey = process.env.SUPABASEKEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Paths
const bucketName = 'geofiles';
const supabasePaths = {
  geojson: 'geojsons/WaterBody.geojson',
  path: 'paths/generatedPath.json',
  cache: 'cache/last_location_cache.json',
};

const localFiles = {
  geojson: './data/WaterBody.geojson',
  path: './data/generatedPath.json',
  cache: './data/last_location_cache.json',
};

// Helper: Ensure local folder exists
function ensureFolder(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// GPS Emitter
gpsEmitter.on('coordinatesUpdated', async (coordinates) => {
  console.log('\n📥 New GPS Coordinate Received');
  const { lat, lon } = coordinates;

  try {
    // STEP 1: Download last_location_cache.json if exists
    let lastData = null;
    const { data: cacheData, error: cacheError } = await supabase
      .storage
      .from(bucketName)
      .download(supabasePaths.cache);

    if (!cacheError && cacheData) {
      const text = await cacheData.text();
      lastData = JSON.parse(text);
      console.log(`📂 Last GPS Cache Downloaded from Supabase (${supabasePaths.cache})`);
      console.log(`🗂️ Saving cache locally to: ${localFiles.cache}`);
      ensureFolder(localFiles.cache);
      fs.writeFileSync(localFiles.cache, JSON.stringify(lastData, null, 2));
    } else {
      console.warn(`⚠️ No previous GPS cache found. Proceeding without it.`);
    }

    if (lastData) {
      const prevCoords = { lat: lastData.lat, lon: lastData.lon };
      const distance = haversine(prevCoords, coordinates);

      console.log(`📏 Distance from last coordinate: ${distance.toFixed(2)} meters`);

      if (distance < 50) {
        console.log(`🟡 Within 50m. Skipping new Overpass query.`);
        return;
      }
    }

    // STEP 2: Query Overpass API
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
    const params = new URLSearchParams();
    params.append('data', query);

    console.log('🌐 Querying Overpass API...');
    const response = await axios.post(
      'https://overpass-api.de/api/interpreter',
      params.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const osmData = response.data;

    if (!osmData.elements || osmData.elements.length === 0) {
      console.error('❌ No waterbody data found near location.');
      return;
    }

    const fullGeoJSON = osmtogeojson(osmData);
    console.log('✅ Received OSM Data and converted to GeoJSON');

    // STEP 3: Find nearest water polygon
    const features = fullGeoJSON.features.filter(f => f.geometry?.type === 'Polygon');
    if (features.length === 0) {
      console.error('❌ No Polygon features found.');
      return;
    }

    const nearestFeature = features
      .map(f => {
        const coords = f.geometry.coordinates[0];
        const centerLat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
        const centerLon = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
        return { feature: f, distance: haversine({ lat, lon }, { lat: centerLat, lon: centerLon }) };
      })
      .sort((a, b) => a.distance - b.distance)[0].feature;

    const geojson = {
      type: 'FeatureCollection',
      features: [nearestFeature],
    };

    // Save GeoJSON locally
    ensureFolder(localFiles.geojson);
    fs.writeFileSync(localFiles.geojson, JSON.stringify(geojson, null, 2));
    console.log(`💾 GeoJSON saved locally at: ${localFiles.geojson}`);

    // STEP 4: Generate sweep path
    const bbox = turf.bbox(nearestFeature);
    const [minLng, minLat, maxLng, maxLat] = bbox;
    const numberOfSweeps = Math.floor(500 / 2);
    const latStep = (maxLat - minLat) / numberOfSweeps;

    const pathPoints = [];
    let isLeftToRight = true;

    for (let i = 0; i < numberOfSweeps; i++) {
      const sweepLat = minLat + i * latStep;
      const line = turf.lineString([
        [minLng - 0.001, sweepLat],
        [maxLng + 0.001, sweepLat]
      ]);

      const clipped = turf.lineIntersect(line, nearestFeature);

      if (clipped.features.length < 2) continue;

      const points = clipped.features.map(f => f.geometry.coordinates);
      points.sort((a, b) => a[0] - b[0]);

      const [start, end] = isLeftToRight ? [points[0], points[1]] : [points[1], points[0]];

      pathPoints.push({ lat: start[1], lon: start[0] });
      pathPoints.push({ lat: end[1], lon: end[0] });

      isLeftToRight = !isLeftToRight;
    }

    ensureFolder(localFiles.path);
    fs.writeFileSync(localFiles.path, JSON.stringify(pathPoints, null, 2));
    console.log(`💾 Generated path saved locally at: ${localFiles.path}`);

    // STEP 5: Upload back to Supabase
    const uploadFile = async (supabasePath, localPath, contentType) => {
      const buffer = fs.readFileSync(localPath);
      const { error } = await supabase
        .storage
        .from(bucketName)
        .upload(
          supabasePath,
          buffer,
          { contentType, upsert: true }
        );

      if (error) {
        console.error(`❌ Failed to upload ${supabasePath}:`, error.message);
      } else {
        console.log(`✅ Uploaded to Supabase: ${supabasePath}`);
      }
    };

    await uploadFile(supabasePaths.geojson, localFiles.geojson, 'application/json');
    await uploadFile(supabasePaths.path, localFiles.path, 'application/json');

    // Upload new cache
    const newCache = { lat, lon };
    ensureFolder(localFiles.cache);
    fs.writeFileSync(localFiles.cache, JSON.stringify(newCache, null, 2));
    await uploadFile(supabasePaths.cache, localFiles.cache, 'application/json');

    console.log('🚀 All uploads completed.');

  } catch (err) {
    console.error('❌ Error during processing:', err.message);
  }
});
