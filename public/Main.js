document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("gpsForm");
    if (!form) {
      console.error("❌ gpsForm element not found!");
      return;
    }
  
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
  
      const lat = parseFloat(document.getElementById("lat").value);
      const lon = parseFloat(document.getElementById("lon").value);
      const timestamp = new Date().toISOString();
  
      const gpsData = { lat, lon, timestamp };
  
      try {
        const response = await fetch("/api/gps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(gpsData),
        });
  
        const result = await response.json();
        console.log("✅ Sent to server:", result);
      } catch (err) {
        console.error("❌ Error:", err.message);
      }
    });
  });
  