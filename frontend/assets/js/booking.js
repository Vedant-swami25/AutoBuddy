/**
 * Shared booking state, progress enrichment, and local fallback business rules.
 */

function enrichStoredBooking(booking) {
  if (!booking) {
    return null;
  }

  const trackStages = [
    { key: "confirmed", label: "Booking confirmed", threshold: 0.05 },
    { key: "assigned", label: "Service partner assigned", threshold: 0.22 },
    { key: "enroute", label: "On the way", threshold: 0.5 },
    { key: "nearby", label: "Service expert is nearby", threshold: 0.8 },
    { key: "arrived", label: "Arrived at your location", threshold: 1 }
  ];

  const now = Date.now();
  const startedAt = new Date(booking.createdAt).getTime();
  const totalMs = Math.max((booking.travelMinutes || 30) * 60 * 1000, 1);
  const elapsedMs = Math.max(now - startedAt, 0);
  const progress = Math.min(elapsedMs / totalMs, 1);
  const etaMinutes = Math.max(Math.ceil(((1 - progress) * totalMs) / 60000), 0);
  const currentStage =
    trackStages.find((stage) => progress <= stage.threshold) || trackStages[trackStages.length - 1];
  const destination = {
    lat: Number(booking.location?.lat),
    lng: Number(booking.location?.lng)
  };
  const origin = {
    lat: Number(booking.garageLocation?.lat ?? booking.garageLat),
    lng: Number(booking.garageLocation?.lng ?? booking.garageLng)
  };
  const safeDestination = typeof hasValidCoordinates === "function" && hasValidCoordinates(destination)
    ? destination
    : null;
  const safeOrigin = typeof hasValidCoordinates === "function" && hasValidCoordinates(origin)
    ? origin
    : safeDestination
      ? { lat: safeDestination.lat + 0.028, lng: safeDestination.lng - 0.024 }
      : null;

  return {
    ...booking,
    etaMinutes,
    progressPercent: Math.round(progress * 100),
    trackingStatus: currentStage.label,
    timeline: trackStages.map((stage) => ({
      key: stage.key,
      label: stage.label,
      done: progress >= stage.threshold,
      active: stage.key === currentStage.key
    })),
    route: safeDestination && safeOrigin
      ? {
          destination: safeDestination,
          origin: safeOrigin,
          vanPosition: {
            lat: safeOrigin.lat + ((safeDestination.lat - safeOrigin.lat) * progress),
            lng: safeOrigin.lng + ((safeDestination.lng - safeOrigin.lng) * progress)
          }
        }
      : {
          destination: null,
          origin: null,
          vanPosition: null
        }
  };
}

function openTrackingForBooking(booking) {
  if (!booking) return;
  if (typeof setActiveBooking === "function") {
    setActiveBooking(booking);
  }
  window.location.href = `tracking.html?booking=${encodeURIComponent(booking.id)}`;
}

function isPendingBooking(booking) {
  if (!booking) {
    return false;
  }

  if (String(booking.status).toLowerCase() === "cancelled" || String(booking.status).toLowerCase() === "rejected") {
    return false;
  }

  const progress = Number(booking.progressPercent);
  return Number.isFinite(progress) ? progress < 100 : true;
}

function getPendingBooking() {
  const activeBooking = typeof getActiveBooking === "function" ? getActiveBooking() : null;
  if (isPendingBooking(activeBooking)) {
    return activeBooking;
  }

  const storedBookings = typeof getStoredBookings === "function"
    ? getUserScopedBookings(getStoredBookings()).map(enrichStoredBooking)
    : [];
  return storedBookings.find(isPendingBooking) || null;
}

function hasPendingBooking() {
  const activeBooking = typeof getActiveBooking === "function" ? getActiveBooking() : null;
  const session = typeof getAuthSession === "function" ? getAuthSession() : null;
  return Boolean(session?.mobile && isPendingBooking(activeBooking));
}

function toggleTrackingLinkVisibility() {
  const trackingLinks = document.querySelectorAll('a[href="tracking.html"]');
  const shouldShow = hasPendingBooking();
  trackingLinks.forEach((link) => {
    link.hidden = !shouldShow;
  });
}

function shouldUseLocalBookingFallback(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("405") ||
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("mongodb") ||
    message.includes("mongoose")
  );
}

window.enrichStoredBooking = enrichStoredBooking;
window.openTrackingForBooking = openTrackingForBooking;
window.isPendingBooking = isPendingBooking;
window.getPendingBooking = getPendingBooking;
window.hasPendingBooking = hasPendingBooking;
window.toggleTrackingLinkVisibility = toggleTrackingLinkVisibility;
window.shouldUseLocalBookingFallback = shouldUseLocalBookingFallback;
