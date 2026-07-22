/**
 * Validates coordinate pairs shared by booking creation and route tracking.
 *
 * This logic lives outside route handlers so missing values and the 0,0
 * placeholder are interpreted consistently across backend features.
 */
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

module.exports = { getCoordinatePair };
