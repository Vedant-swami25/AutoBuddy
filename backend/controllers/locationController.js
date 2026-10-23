/**
 * Reverse-geocoding handlers.
 */
const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";

function readAddressLocation(address) {
  return {
    district:
      address.state_district ||
      address.city_district ||
      address.county ||
      address.city ||
      address.town ||
      address.village ||
      "",
    state: address.state || ""
  };
}

async function reverseGeocode(req, res) {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ message: "Latitude and longitude are required." });
  }

  try {
    const response = await fetch(
      `${NOMINATIM_REVERSE_URL}?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`,
      {
        headers: {
          "User-Agent": "AutoBuddy/1.0"
        }
      }
    );

    if (!response.ok) {
      return res.status(502).json({ message: "We could not fetch your location details right now." });
    }

    const payload = await response.json();
    const location = readAddressLocation(payload?.address || {});

    return res.json({
      ...location,
      lat,
      lng
    });
  } catch (error) {
    return res.status(502).json({
      message: "We could not auto-fill district and state from your location."
    });
  }
}

/**
 * Expose OpenStreetMap configuration
 * No API key needed - using free OSRM and CartoDB tiles
 */
function getMapConfig(_req, res) {
  const osmApiKey = process.env.OPENSTREETMAP_API_KEY || process.env.MAP_API_KEY || "";
  return res.json({
    osmApiKey,
    tileProvider: "openstreetmap",
    routingProvider: "osrm",
    status: "ok",
    message: "OpenStreetMap services enabled"
  });
}

/**
 * OpenStreetMap Road Routing for Live Booking Tracking
 * Uses free OSRM (OpenStreetMap Routing Machine) service - no API key needed.
 * Returns real street coordinates [[lat, lng], ...] for map polyline.
 */
async function getRouteDirections(req, res) {
  const startLat = Number(req.query.startLat);
  const startLng = Number(req.query.startLng);
  const endLat = Number(req.query.endLat);
  const endLng = Number(req.query.endLng);

  // Validate coordinates range
  if (!Number.isFinite(startLat) || !Number.isFinite(startLng) || !Number.isFinite(endLat) || !Number.isFinite(endLng)) {
    return res.status(400).json({ message: "Valid start and end coordinates are required." });
  }
  
  if (Math.abs(startLat) > 90 || Math.abs(startLng) > 180 || Math.abs(endLat) > 90 || Math.abs(endLng) > 180) {
    return res.status(400).json({ message: "Invalid coordinate range. Latitude must be -90 to 90, Longitude must be -180 to 180." });
  }

  // Use free OSRM (OpenStreetMap Routing Machine) with timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
    const osrmRes = await fetch(osrmUrl, { 
      headers: { "User-Agent": "AutoBuddy/1.0" },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (osrmRes.ok) {
      const osrmData = await osrmRes.json();
      const route = osrmData.routes?.[0];
      
      if (route?.geometry?.coordinates) {
        const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        const distanceKm = Number(((route.distance || 0) / 1000).toFixed(1));
        const durationMinutes = Math.max(2, Math.round((route.duration || 0) / 60));
        
        return res.json({
          provider: "openstreetmap-osrm-free",
          hasApiKey: false,
          coordinates: coords,
          distanceKm,
          durationMinutes,
          status: "ok"
        });
      }
    }
  } catch (osrmErr) {
    if (osrmErr.name === 'AbortError') {
      console.warn("OSRM routing request timeout, falling back to simulated interpolation");
    } else {
      console.warn("OSRM routing request error, falling back to simulated interpolation:", osrmErr.message);
    }
  }

  // Graceful fallback: interpolate realistic curve points between coordinates
  const steps = 12;
  const coords = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const curveOffset = Math.sin(t * Math.PI) * 0.003;
    const lat = startLat + (endLat - startLat) * t + curveOffset;
    const lng = startLng + (endLng - startLng) * t - curveOffset * 0.5;
    coords.push([Number(lat.toFixed(6)), Number(lng.toFixed(6))]);
  }

  const distKm = Math.hypot(endLat - startLat, endLng - startLng) * 111;

  return res.json({
    provider: "openstreetmap-fallback",
    hasApiKey: false,
    coordinates: coords,
    distanceKm: Number(distKm.toFixed(1)),
    durationMinutes: Math.max(3, Math.round(distKm * 3.5)),
    status: "fallback"
  });
}

module.exports = {
  getMapConfig,
  getRouteDirections,
  reverseGeocode
};
