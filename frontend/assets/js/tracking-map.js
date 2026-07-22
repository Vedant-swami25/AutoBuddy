/**
 * Leaflet map setup, road-route geometry, and live vehicle rendering.
 *
 * These functions live separately because map rendering is independent from
 * booking history and tracking-page orchestration.
 */


let trackingMapInstance = null;
let currentTrackingBookings = [];
let trackingMapLayers = [];
const trackingRouteCache = new Map();
function ensureTrackingMap() {
  const mapElement = document.getElementById("trackingMap");
  if (!mapElement || typeof L === "undefined") {
    return null;
  }

  if (!trackingMapInstance) {
    trackingMapInstance = L.map("trackingMap", {
      zoomControl: true
    }).setView([18.5204, 73.8567], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap"
    }).addTo(trackingMapInstance);

    trackingMapInstance.whenReady(() => trackingMapInstance.invalidateSize());
  }

  return trackingMapInstance;
}

function clearTrackingMapLayers() {
  trackingMapLayers.forEach((layer) => layer.remove());
  trackingMapLayers = [];
}

function getTrackingRouteCacheKey(origin, destination) {
  return [
    Number(origin.lat).toFixed(5),
    Number(origin.lng).toFixed(5),
    Number(destination.lat).toFixed(5),
    Number(destination.lng).toFixed(5)
  ].join("|");
}

function calculateRouteDistance(pointA, pointB) {
  const lat1 = (pointA.lat * Math.PI) / 180;
  const lat2 = (pointB.lat * Math.PI) / 180;
  const latDelta = ((pointB.lat - pointA.lat) * Math.PI) / 180;
  const lngDelta = ((pointB.lng - pointA.lng) * Math.PI) / 180;
  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(lngDelta / 2) * Math.sin(lngDelta / 2);
  return 6371000 * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

async function getRoadRoutePoints(origin, destination) {
  if (!hasValidCoordinates(origin) || !hasValidCoordinates(destination)) {
    return null;
  }

  const cacheKey = getTrackingRouteCacheKey(origin, destination);
  if (trackingRouteCache.has(cacheKey)) {
    return trackingRouteCache.get(cacheKey);
  }

  try {
    const payload = await fetchDrivingRoute(origin, destination);

    const coordinates = payload?.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      throw new Error("Route geometry is unavailable.");
    }

    const points = coordinates.map(([lng, lat]) => ({ lat, lng }));
    trackingRouteCache.set(cacheKey, points);
    return points;
  } catch (error) {
    return null;
  }
}

function getPointAlongRoute(points, progress) {
  if (!Array.isArray(points) || !points.length) {
    return null;
  }

  if (points.length === 1) {
    return points[0];
  }

  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const segments = [];
  let totalDistance = 0;

  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const distance = calculateRouteDistance(start, end);
    segments.push({ start, end, distance });
    totalDistance += distance;
  }

  if (totalDistance <= 0) {
    return points[0];
  }

  let targetDistance = totalDistance * clampedProgress;

  for (const segment of segments) {
    if (targetDistance <= segment.distance) {
      const ratio = segment.distance === 0 ? 0 : targetDistance / segment.distance;
      return {
        lat: segment.start.lat + ((segment.end.lat - segment.start.lat) * ratio),
        lng: segment.start.lng + ((segment.end.lng - segment.start.lng) * ratio)
      };
    }

    targetDistance -= segment.distance;
  }

  return points[points.length - 1];
}

function createTrackingVanIcon() {
  return L.divIcon({
    className: "tracking-van-marker",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -14],
    html: `
      <span class="tracking-van-badge" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6H15a2 2 0 0 1 1.8 1.1l.9 1.9H20A2 2 0 0 1 22 11v5.5a1.5 1.5 0 0 1-1.5 1.5H19a3 3 0 0 1-6 0h-2a3 3 0 0 1-6 0H3.5A1.5 1.5 0 0 1 2 16.5V11a2.5 2.5 0 0 1 1-2.5Zm5 8a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm8 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM5 9v4h11V9H5Z"/>
        </svg>
      </span>
    `
  });
}

async function renderTrackingMap(booking) {
  const map = ensureTrackingMap();
  const route = booking?.route;

  if (!map) {
    return;
  }

  clearTrackingMapLayers();

  if (
    !hasValidCoordinates(route?.origin) ||
    !hasValidCoordinates(route?.destination) ||
    !hasValidCoordinates(route?.vanPosition)
  ) {
    map.setView([18.5204, 73.8567], 12);
    return;
  }

  const roadPoints =
    await getRoadRoutePoints(route.origin, route.destination) ||
    [
      { lat: route.origin.lat, lng: route.origin.lng },
      { lat: route.destination.lat, lng: route.destination.lng }
    ];
  const routeCoordinates = roadPoints.map((point) => [point.lat, point.lng]);
  const progress = (booking.progressPercent || 0) / 100;
  const liveVanPoint = getPointAlongRoute(roadPoints, progress) || route.vanPosition;

  const routeLine = L.polyline(routeCoordinates, {
    color: "#34d399",
    weight: 5,
    opacity: 0.85
  }).addTo(map);

  const destinationMarker = L.marker([route.destination.lat, route.destination.lng]).addTo(map)
    .bindPopup("Your location");

  const vanMarker = L.marker([liveVanPoint.lat, liveVanPoint.lng], {
    icon: createTrackingVanIcon()
  }).addTo(map).bindPopup(`${booking.vehicle || "Service van"}<br>${booking.trackingStatus || "On the way"}`);

  trackingMapLayers = [routeLine, destinationMarker, vanMarker];

  const bounds = L.latLngBounds([
    [route.origin.lat, route.origin.lng],
    [route.destination.lat, route.destination.lng],
    [liveVanPoint.lat, liveVanPoint.lng]
  ]);
  map.fitBounds(bounds.pad(0.22));
}

