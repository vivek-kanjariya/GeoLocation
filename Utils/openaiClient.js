const { OpenAI } = require("openai");
const fetch = require('node-fetch');
const { gpsEmitter } = require("../routes/gps.js");
require('dotenv').config();

// 📡 Listening to GPS Coordinates
gpsEmitter.on('coordinatesUpdated', async (coordinates) => {
  console.log("Received coordinates:", coordinates);
  try {
    const result = await getWaterbodyDescription(coordinates);
    console.log("🌊 Waterbody Info:", result);
  } catch (error) {
    console.error('Error fetching waterbody description:', error.message);
  }
});

// 🚀 OpenRouter + OpenAI setup
const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENAI_API_KEY,
});

// 🌍 Reverse geocode using OpenStreetMap
async function reverseGeocode(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
  const res = await fetch(url);
  const data = await res.json();

  return {
    country: data.address?.country || 'Unknown',
    state: data.address?.state || 'Unknown',
    city: data.address?.city || data.address?.town || data.address?.village || 'Unknown',
    display_name: data.display_name || 'Unknown location',
  };
}

// AI-Powered Waterbody Description using GPS coordinates
async function getWaterbodyDescription({ lat, lon }) {
  try {
    const location = await reverseGeocode(lat, lon);

    const prompt = `
You're given GPS coordinates:
- Latitude: ${lat}
- Longitude: ${lon}

This is near or in the following location:
- Country: ${location.country}
- State: ${location.state}
- City/Area: ${location.city}

📝 Please describe the **nearest lake, reservoir, waterbody, or famous landmark** near these coordinates.
`;

    const chat = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant with knowledge of geography and natural waterbodies." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
    });

    console.log("💬 Full API Response:", JSON.stringify(chat, null, 2)); // <-- PRINT full OpenRouter reply

    if (!chat.choices || chat.choices.length === 0) {
      throw new Error('No choices returned from OpenAI API');
    }

    const description = chat.choices[0].message.content.trim();

    const GptDescription = { location, description };

    console.log("🌊 Waterbody Info:", GptDescription);

    return GptDescription;

  } catch (err) {
    console.error('🛑 Error in getWaterbodyDescription:', err.message);
    throw err;
  }
}

module.exports = { getWaterbodyDescription };
