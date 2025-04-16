const fs = require('fs');
const path = require('path');
const turf = require('@turf/turf');

const folderPath = './data';
const pathFile = './data/generatedPath.json';

// ✅ Get the latest `.geojson` file in the folder
function getLatestGeoJSONFile(folderPath) {
  try {
    const files = fs.readdirSync(folderPath)
      .filter(file => file.endsWith('.geojson'))
      .map(file => ({
        name: file,
        time: fs.statSync(path.join(folderPath, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    return files.length > 0 ? path.join(folderPath, files[0].name) : null;
  } catch (error) {
    console.error('❌ Error reading directory:', error.message);
    return null;
  }
}

// 🧠 Create a zig-zag path over the water polygon
function generateCoveragePath(polygon, targetPoints = 500) {
  const bbox = turf.bbox(polygon);
  const [minLng, minLat, maxLng, maxLat] = bbox;

  const numberOfSweeps = Math.floor(targetPoints / 2);
  const latStep = (maxLat - minLat) / numberOfSweeps;

  const pathPoints = [];
  let isLeftToRight = true;

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

    pathPoints.push({ lat: start[1], lon: start[0] });
    pathPoints.push({ lat: end[1], lon: end[0] });

    isLeftToRight = !isLeftToRight;
  }

  return pathPoints;
}

// 🧭 Generate the path from a GeoJSON polygon and save to file
function generatePathFromGeoJSON(geojsonFilePath) {
  try {
    const data = fs.readFileSync(geojsonFilePath);
    const geojson = JSON.parse(data);
    const polygon = geojson.features[0];

    if (!polygon || polygon.geometry.type !== 'Polygon') {
      console.log('❌ GeoJSON does not contain a valid polygon.');
      return null;
    }

    const pathPoints = generateCoveragePath(polygon, 200);

    if (!pathPoints || pathPoints.length === 0) {
      console.log('❌ Failed to generate coverage path.');
      return null;
    }

    fs.writeFileSync(pathFile, JSON.stringify(pathPoints, null, 2));
    console.log(`✅ Coverage path saved to: ${pathFile}`);
    return pathFile;

  } catch (error) {
    console.error('❌ Error processing GeoJSON:', error.message);
    return null;
  }
}

// 🔄 MAIN LOGIC – Always regenerate path if geojson was updated
function ensureCoveragePathIsFresh() {
  const latestFile = getLatestGeoJSONFile(folderPath);

  if (!latestFile) {
    console.log('❌ No .geojson files found in:', folderPath);
    return;
  }

  console.log('📥 Latest .geojson file found:', latestFile);

  const geoMTime = fs.statSync(latestFile).mtime.getTime();
  const pathMTime = fs.existsSync(pathFile)
    ? fs.statSync(pathFile).mtime.getTime()
    : 0;

  if (geoMTime > pathMTime) {
    console.log('🔁 GeoJSON updated. Regenerating path...');
    generatePathFromGeoJSON(latestFile);
  } else {
    console.log('✅ Path file is already up-to-date with GeoJSON.');
  }
}

// 🚀 Run
ensureCoveragePathIsFresh();
