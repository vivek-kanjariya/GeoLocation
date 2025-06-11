const fs = require('fs');
const turf = require('@turf/turf');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  'https://jbgoqlqhnxfzqtyymkvl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpiZ29xbHFobnhmenF0eXlta3ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5MDM0MTMsImV4cCI6MjA2MDQ3OTQxM30.ZNbYEDGonIDpWQO4jW9LIyOcnMoqtKrXwZ7lCFrmfM4'
);

// Paths
const localGeoFile = './data/WaterBody.geojson';
const pathFile = './data/generatedPath.json';

// Helper to calculate distance in meters
function calculateDistance(point1, point2) {
  const from = turf.point([point1.lon, point1.lat]);
  const to = turf.point([point2.lon, point2.lat]);
  return turf.distance(from, to) * 1000; // meters
}

// Generate coverage path
function generateCoveragePath(polygon, targetPoints = 500) {
  const bbox = turf.bbox(polygon);
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const numberOfSweeps = Math.floor(targetPoints / 2);
  const latStep = (maxLat - minLat) / numberOfSweeps;

  const pathPoints = [];
  let isLeftToRight = true;
  let previousPoint = null;

  for (let i = 0; i < numberOfSweeps; i++) {
    const lat = minLat + i * latStep;
    const longLine = turf.lineString([
      [minLng - 0.001, lat],
      [maxLng + 0.001, lat]
    ]);

    const clipped = turf.lineIntersect(longLine, polygon);
    if (clipped.features.length < 2) continue;

    const intersections = clipped.features.map(f => f.geometry.coordinates);
    intersections.sort((a, b) => a[0] - b[0]);

    const [start, end] = isLeftToRight
      ? [intersections[0], intersections[1]]
      : [intersections[1], intersections[0]];

    const newStart = { lat: start[1], lon: start[0] };
    const newEnd = { lat: end[1], lon: end[0] };

    if (previousPoint === null) {
      pathPoints.push(newStart);
      previousPoint = newStart;
    }

    if (calculateDistance(previousPoint, newStart) > 50) {
      pathPoints.push(newStart);
      previousPoint = newStart;
    }

    if (calculateDistance(previousPoint, newEnd) > 50) {
      pathPoints.push(newEnd);
      previousPoint = newEnd;
    }

    isLeftToRight = !isLeftToRight;
  }

  return pathPoints;
}

// Download WaterBody.geojson from Supabase
async function downloadWaterBodyGeoJSON(bucketName) {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .download('geojsons/WaterBody.geojson');

    if (error) {
      throw new Error(`Download failed: ${error.message}`);
    }

    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    fs.writeFileSync(localGeoFile, buffer);
    console.log('✅ WaterBody.geojson downloaded successfully.');
    return localGeoFile;
  } catch (error) {
    console.error(`❌ Error downloading WaterBody.geojson: ${error.message}`);
    return null;
  }
}

// Generate path from local WaterBody.geojson
function generatePathFromGeoJSON(geojsonFilePath) {
  try {
    const data = fs.readFileSync(geojsonFilePath);
    const geojson = JSON.parse(data);
    const polygon = geojson.features[0];

    if (!polygon || polygon.geometry.type !== 'Polygon') {
      throw new Error('GeoJSON does not contain a valid polygon.');
    }

    const pathPoints = generateCoveragePath(polygon, 200);

    if (!pathPoints || pathPoints.length === 0) {
      throw new Error('Failed to generate coverage path.');
    }

    fs.writeFileSync(pathFile, JSON.stringify(pathPoints, null, 2));
    console.log(`✅ Coverage path saved to: ${pathFile}`);
    return pathFile;

  } catch (error) {
    console.error('❌ Error processing GeoJSON:', error.message);
    return null;
  }
}

// Upload generated path to Supabase
async function uploadGeneratedPath(bucketName) {
  try {
    const fileBuffer = fs.readFileSync(pathFile);
    const { error } = await supabase.storage
      .from(bucketName)
      .upload('paths/generatedPath.json', fileBuffer, {
        contentType: 'application/json',
        upsert: true
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    console.log('✅ Uploaded and replaced generatedPath.json on Supabase.');
  } catch (error) {
    console.error(`❌ Error uploading generated path: ${error.message}`);
  }
}

// Upload WaterBody.geojson back to Supabase
async function uploadWaterBodyGeoJSON(bucketName) {
  try {
    const fileBuffer = fs.readFileSync(localGeoFile);
    const { error } = await supabase.storage
      .from(bucketName)
      .upload('geojsons/WaterBody.geojson', fileBuffer, {
        contentType: 'application/geo+json',
        upsert: true
      });

    if (error) {
      throw new Error(`Upload WaterBody.geojson failed: ${error.message}`);
    }

    console.log('✅ Uploaded and replaced WaterBody.geojson on Supabase.');
  } catch (error) {
    console.error(`❌ Error uploading WaterBody.geojson: ${error.message}`);
  }
}

// Main flow
async function main() {
  const bucket = 'geofiles';

  const geoFile = await downloadWaterBodyGeoJSON(bucket);
  if (!geoFile) return;

  const result = generatePathFromGeoJSON(geoFile);
  if (!result) return;

  await uploadGeneratedPath(bucket);
  await uploadWaterBodyGeoJSON(bucket);
}

// Run main
main();
