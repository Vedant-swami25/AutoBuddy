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

module.exports = { reverseGeocode };
