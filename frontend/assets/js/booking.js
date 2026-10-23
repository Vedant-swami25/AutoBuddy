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
    { key: "enroute", label: "Service Partner Assigned", threshold: 0.5 },
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
  let targetBooking = typeof booking === "object" ? booking : null;
  const bookingId = typeof booking === "string" ? booking : (booking.id || "");

  if (!targetBooking && typeof currentUserBookings !== "undefined" && Array.isArray(currentUserBookings)) {
    targetBooking = currentUserBookings.find((b) => b.id === bookingId);
  }

  const status = String(targetBooking?.status || "").toLowerCase();
  if (status === "cancelled" || status === "rejected" || status === "declined") {
    if (typeof showToast === "function") {
      showToast(`Tracking is unavailable for ${status} bookings.`, "warning");
    }
    return;
  }

  if (typeof setActiveBooking === "function" && targetBooking) {
    setActiveBooking(targetBooking);
  }
  window.location.href = `map.html?tracking=${encodeURIComponent(bookingId)}`;
}

function isPendingBooking(booking) {
  if (!booking) {
    return false;
  }

  const status = String(booking.status || "").toLowerCase();
  if (status === "cancelled" || status === "rejected" || status === "declined") {
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

function renderFloatingTrackerLauncher() {
  const activeBooking = typeof getActiveBooking === "function" ? getActiveBooking() : null;
  const session = typeof getAuthSession === "function" ? getAuthSession() : null;
  const currentPage = typeof getCurrentPage === "function" ? getCurrentPage() : "";

  const params = new URLSearchParams(window.location.search);
  const isCurrentlyTracking = currentPage === "map.html" && (params.has("tracking") || params.has("booking"));

  const isEligible = Boolean(
    session &&
    activeBooking &&
    activeBooking.id &&
    activeBooking.status !== "completed" &&
    activeBooking.status !== "cancelled" &&
    activeBooking.status !== "rejected" &&
    activeBooking.status !== "declined" &&
    !isCurrentlyTracking &&
    currentPage !== "login.html" &&
    currentPage !== "admin-dashboard.html" &&
    currentPage !== "owner-dashboard.html"
  );

  let launcher = document.getElementById("floatingTrackerLauncher");
  if (!isEligible) {
    if (launcher) launcher.remove();
    return;
  }

  if (!launcher) {
    launcher = document.createElement("button");
    launcher.type = "button";
    launcher.id = "floatingTrackerLauncher";
    launcher.className = "floating-tracker";
    launcher.setAttribute("aria-label", "Open live booking tracking");
    launcher.addEventListener("click", () => {
      const target = typeof getActiveBooking === "function" ? getActiveBooking() : null;
      if (target) {
        openTrackingForBooking(target);
      }
    });
    document.body.appendChild(launcher);
  }

  const status = (activeBooking.status || "pending").toLowerCase();
  const statusLabel =
    status === "accepted" ? "Service Partner Assigned" :
    status === "in_progress" ? "Service In Progress" : "Booking Confirmed";
  const garageName = activeBooking.garage || activeBooking.service || "AutoBuddy Service";

  launcher.innerHTML = `
    <span class="floating-tracker-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 14.5a1 1 0 0 1-2 0V11h-3a1 1 0 0 1 0-2h4a1 1 0 0 1 1 1Zm0-8.25a1.25 1.25 0 1 1-1.25 1.25A1.25 1.25 0 0 1 13 8.25Z" />
      </svg>
    </span>
    <span class="floating-tracker-copy">
      <strong>Live Tracking • ${statusLabel}</strong>
      <small>${garageName}</small>
    </span>
  `;
}

window.enrichStoredBooking = enrichStoredBooking;
window.openTrackingForBooking = openTrackingForBooking;
window.isPendingBooking = isPendingBooking;
window.getPendingBooking = getPendingBooking;
window.hasPendingBooking = hasPendingBooking;
window.toggleTrackingLinkVisibility = toggleTrackingLinkVisibility;
window.shouldUseLocalBookingFallback = shouldUseLocalBookingFallback;
window.renderFloatingTrackerLauncher = renderFloatingTrackerLauncher;

document.addEventListener("DOMContentLoaded", () => {
  renderFloatingTrackerLauncher();
});
