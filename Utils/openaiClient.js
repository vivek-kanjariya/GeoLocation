const { OpenAI } = require("openai");
const fetch = require('node-fetch');
require('dotenv').config();

// 🧠 OpenRouter + OpenAI setup
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

// 🧠 AI-Powered Waterbody Description using GPS coordinates
async function getWaterbodyDescription({ lat, lon }) {
  try {
    // 1. Reverse geocode first
    const location = await reverseGeocode(lat, lon);

    // 2. Create prompt
    const prompt = `
You're given GPS coordinates:
- Latitude: ${lat}
- Longitude: ${lon}
${console.log("Coordinates Given to GPT",lat,lon)}

This is near or in the following location:
- Country: ${location.country}
- State: ${location.state}
- City/Area: ${location.city}

📝 Please describe the **nearest lake, reservoir, or waterbody or famous Landmark** to these coordinates.
Include:
- Its name (or best guess)
- What country/state it's in
- Why it's interesting or special
- Fun facts, usage (fishing, tourism?), or historical/cultural value
- Keep it 5-6 lines, simple and friendly to general users.
`;

    // 3. Query OpenRouter
    const chat = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // or gpt-4 if allowed in OpenRouter
      messages: [
        { role: "system", content: "You are a helpful assistant with knowledge of geography and natural waterbodies." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
    });

    return {
      location,
      description: chat.choices[0].message.content.trim()
    };

  } catch (err) {
    console.error('🛑 Error in getWaterbodyDescription:', err.message);
    throw err;
  }
}

module.exports = { getWaterbodyDescription };
