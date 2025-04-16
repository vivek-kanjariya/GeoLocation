const express = require('express');
const path = require('path')
const bodyParser = require('body-parser');
const { router } = require('./routes/gps.js');  // Import the gps.js router
require('./routes/OverPassCalc.js');  // Import and run otherService.js to start listening for events
require('./routes/pathGen.js');  // Import and run otherService.js to start listening for events
const waterDescriptionRoute = require('./routes/waterDescription');
const morgan = require('morgan');


require('dotenv').config();


const app = express();

//All General Bhul Handeling 
// At the end of all routes
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

app.use(morgan('dev'));

// Use body parser middleware to parse JSON body data
app.use(bodyParser.json());

// 🔥 Serve static files from 'data' folder
app.use('/data', express.static(path.join(__dirname, 'data')));


app.use('/api', waterDescriptionRoute);

// Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Serve Main.html at root path
app.get('/Dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'Main.html'));
});

// Use the GPS routes from gps.js
app.use('/api', router);
app.use('/getinfo',router);

app.use((req, res) => {
  res.status(404).send('Dear User, 404 Not Found! Server is Fucking On so Go on This API Routes Instead :)');
});


// Start the server on port 3000
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
