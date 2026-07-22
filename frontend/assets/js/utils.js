/**
 * Reusable page, coordinate, garage-normalization, and collection helpers.
 *
 * This code was moved out of app.js so this file has one feature-focused
 * responsibility while preserving the original browser behavior.
 */

function hasValidCoordinates(point) {
  const hasMissingValue =
    point?.lat === null ||
    point?.lat === undefined ||
    point?.lat === "" ||
    point?.lng === null ||
    point?.lng === undefined ||
    point?.lng === "";
  const lat = Number(point?.lat);
  const lng = Number(point?.lng);
  const isNullIsland = Math.abs(lat) < 0.000001 && Math.abs(lng) < 0.000001;
  return !hasMissingValue && Number.isFinite(lat) && Number.isFinite(lng) && !isNullIsland;
}

function getCoordinatePair(lat, lng, fallback = null) {
  const coordinates = {
    lat: Number(lat),
    lng: Number(lng)
  };

  return hasValidCoordinates(coordinates) ? coordinates : fallback;
}

function normalizeGarage(garage) {
  if (!garage) {
    return null;
  }

  const coordinates = getCoordinatePair(garage.lat, garage.lng);

  return {
    ...garage,
    id: String(garage.id || garage._id || `GAR-${coordinates?.lat}-${coordinates?.lng}`),
    name: garage.name || "AutoBuddy Garage",
    lat: coordinates?.lat ?? null,
    lng: coordinates?.lng ?? null,
    services: garage.services || garage.specialties || [],
    vehicleTypes: garage.vehicleTypes || []
  };
}

function getMappableGarages(garages) {
  const normalizedGarages = Array.isArray(garages) ? garages.map(normalizeGarage).filter(Boolean) : [];
  return normalizedGarages.filter(hasValidCoordinates);
}

function isLeafletAvailable() {
  return typeof L !== "undefined" && typeof L.map === "function" && typeof L.marker === "function";
}

function mergeBookings(primaryBookings, secondaryBookings) {
  const merged = [];
  const seen = new Set();

  [...primaryBookings, ...secondaryBookings].forEach((booking) => {
    if (!booking?.id || seen.has(booking.id)) {
      return;
    }
    seen.add(booking.id);
    merged.push(booking);
  });

  return merged.sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));
}

