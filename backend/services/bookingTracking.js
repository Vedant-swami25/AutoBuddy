const { getCoordinatePair } = require("../utils/coordinates");

/**
 * Calculates live booking progress and route snapshots.
 *
 * This service was moved out of the booking route so HTTP handling remains
 * separate from tracking business rules and response enrichment.
 */
const TRACK_STAGES = [
  { key: "confirmed", label: "Booking confirmed", threshold: 0.05 },
  { key: "assigned", label: "Service partner assigned", threshold: 0.22 },
  { key: "enroute", label: "On the way", threshold: 0.5 },
  { key: "nearby", label: "Service expert is nearby", threshold: 0.8 },
  { key: "arrived", label: "Arrived at your location", threshold: 1 }
];

function getProgress(booking) {
  const now = Date.now();
  const startedAt = new Date(booking.createdAt).getTime();
  const totalMs = Math.max((booking.travelMinutes || 30) * 60 * 1000, 1);
  const elapsedMs = Math.max(now - startedAt, 0);
  const progress = Math.min(elapsedMs / totalMs, 1);
  const etaMinutes = Math.max(Math.ceil(((1 - progress) * totalMs) / 60000), 0);
  return { progress, etaMinutes };
}

function getRouteSnapshot(booking, progress) {
  const destination = getCoordinatePair(
    booking.location?.lat,
    booking.location?.lng
  );
  const origin = getCoordinatePair(
    booking.garageLocation?.lat,
    booking.garageLocation?.lng
  );

  if (!destination) {
    return {
      destination: null,
      origin: null,
      vanPosition: null
    };
  }

  const safeOrigin = origin || {
    lat: destination.lat + 0.028,
    lng: destination.lng - 0.024
  };

  return {
    destination,
    origin: safeOrigin,
    vanPosition: {
      lat: safeOrigin.lat + ((destination.lat - safeOrigin.lat) * progress),
      lng: safeOrigin.lng + ((destination.lng - safeOrigin.lng) * progress)
    }
  };
}

function enrichBooking(booking) {
  const { progress, etaMinutes } = getProgress(booking);
  const currentStage =
    TRACK_STAGES.find((stage) => progress <= stage.threshold) ||
    TRACK_STAGES[TRACK_STAGES.length - 1];

  const timeline = TRACK_STAGES.map((stage) => ({
    key: stage.key,
    label: stage.label,
    done: progress >= stage.threshold,
    active: stage.key === currentStage.key
  }));

  return {
    ...booking.toObject(),
    etaMinutes,
    progressPercent: Math.round(progress * 100),
    trackingStatus: currentStage.label,
    timeline,
    route: getRouteSnapshot(booking, progress)
  };
}

module.exports = {
  enrichBooking,
  getProgress
};
