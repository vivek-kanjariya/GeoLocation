const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const morgan = require('morgan');
require('dotenv').config();

// Import routes and services
const { router: gpsRouter } = require('./routes/gps');
const waterDescriptionRoute = require('./routes/waterDescription');

// Initialize services or listeners
require('./Utils/openaiClient.js');
require('./routes/OverPassCalc');
require('./routes/pathGen');

// Create Express app
const app = express();

// --- Middlewares ---

// Logger
app.use(morgan('dev'));

// Body parser
app.use(bodyParser.json());

// Static file serving
app.use('/data', express.static(path.join(__dirname, 'data')));
app.use(express.static(path.join(__dirname, 'public')));

// --- Routes ---

// API Routes
app.use('/api', waterDescriptionRoute);    // Water info-related APIs
app.use('/api', gpsRouter);                 // GPS APIs
app.use('/getinfo', gpsRouter);              // (Optional) Separate route for GPS info

// Serve Dashboard page
app.get('/Dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'Main.html'));
});

// Serve activity logs as JSON
app.get('/api/logs', (req, res) => {
  const logsPath = path.join(__dirname, 'logs', 'activity.log');

  fs.readFile(logsPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading log file:', err);
      return res.status(500).json({ error: 'Something broke on the server!' });
    }
    res.json({ logs: data });
  });
});

// Srerve Logs page
app.get('/logs', (eq, res) => {
  res.sendFile(path.join(__dirname, 'public', 'logs.html'));
});

// --- Error Handling ---

// 404 - Not Found Handler
app.use((req, res) => {
  res.status(404).send('Dear User, 404 Not Found! Server is running, Waiting for GPS Signal...');
});

// General Error Handler
app.use((err, req, res, next) => {
  console.error('🔥 Error:', err.stack);
  res.status(500).json({ error: 'Something broke on the server!' });
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
