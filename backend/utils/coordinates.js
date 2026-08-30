function getCoordinatePair(lat, lng) {
  const hasMissingValue =
    lat === null ||
    lat === undefined ||
    lat === "" ||
    lng === null ||
    lng === undefined ||
    lng === "";
  const coordinates = {
    lat: Number(lat),
    lng: Number(lng)
  };
  const isNullIsland =
    Math.abs(coordinates.lat) < 0.000001 &&
    Math.abs(coordinates.lng) < 0.000001;

  return !hasMissingValue &&
    Number.isFinite(coordinates.lat) &&
    Number.isFinite(coordinates.lng) &&
    !isNullIsland
    ? coordinates
    : null;
}

/**
 * Calculates distance in kilometers between two GPS coordinates using the Haversine formula.
 */
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const p1 = getCoordinatePair(lat1, lon1);
  const p2 = getCoordinatePair(lat2, lon2);
  if (!p1 || !p2) return null;

  const R = 6371; // Radius of the Earth in km
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLon = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10;
}

module.exports = {
  calculateDistanceKm,
  getCoordinatePair
};
