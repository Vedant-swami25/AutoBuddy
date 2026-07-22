/**
 * Tracking data/service helpers: fetching bookings, background sync, and page controller.
 * Extracted from tracking.js to keep data logic separate from rendering.
 */

let bookingBackgroundRefreshHandle = null;

async function fetchBookingsForCurrentUser() {
  const session = getAuthSession();
  const localBookings = getUserScopedBookings(getStoredBookings()).map((booking) => enrichStoredBooking(booking));

  if (!session?.mobile) {
    return localBookings;
  }

  try {
    const remoteBookings = await fetchBookings();
    const filteredRemoteBookings = remoteBookings.filter((booking) => getBookingOwnerMobile(booking) === session.mobile);
    return mergeBookings(filteredRemoteBookings, localBookings);
  } catch (error) {
    return localBookings;
  }
}

async function cancelBooking(bookingId, event) {
  event.stopPropagation(); // Prevent triggering the card click

  if (!confirm("Are you sure you want to cancel this booking?")) {
    return;
  }

  try {
    await cancelBookingRequest(bookingId);

    showToast("Booking cancelled successfully", "success");

    // Refresh the booking list
    const bookings = await fetchBookingsForCurrentUser();
    renderBookingHistory(bookings, null);

    // If this was the active booking, clear it and stop tracking.
    const activeBooking = getActiveBooking();
    if (activeBooking && activeBooking.id === bookingId) {
      setActiveBooking(null);
      renderFloatingTrackerLauncher();
      if (getCurrentPage() === "tracking.html") {
        window.location.replace("garage.html?notice=No active booking found.");
      }
    }

  } catch (error) {
    console.error("Cancel booking error:", error);
    showToast("Failed to cancel booking: " + (error.message || "Unknown error"), "error");
  }
}

async function syncLatestTrackingBooking() {
  const session = getAuthSession();
  const existingBooking = getActiveBooking() || getLatestStoredBookingForUser();

  if (!session?.mobile || !existingBooking) {
    renderFloatingTrackerLauncher();
    if (bookingBackgroundRefreshHandle) {
      window.clearInterval(bookingBackgroundRefreshHandle);
      bookingBackgroundRefreshHandle = null;
    }
    return null;
  }

  try {
    const latestBooking = await fetchLatestBooking(session.mobile);
    if (isPendingBooking(latestBooking)) {
      setActiveBooking(latestBooking);
    } else {
      setActiveBooking(null);
    }
    renderFloatingTrackerLauncher();
    return isPendingBooking(latestBooking) ? latestBooking : null;
  } catch (error) {
    const fallbackBooking = enrichStoredBooking(existingBooking);
    if (isPendingBooking(fallbackBooking)) {
      setActiveBooking(fallbackBooking);
    } else {
      setActiveBooking(null);
    }
    renderFloatingTrackerLauncher();
    return isPendingBooking(fallbackBooking) ? fallbackBooking : null;
  }
}

function startBookingBackgroundTracker() {
  if (bookingBackgroundRefreshHandle) {
    window.clearInterval(bookingBackgroundRefreshHandle);
  }

  syncLatestTrackingBooking();

  const existingBooking = getActiveBooking() || getLatestStoredBookingForUser();
  if (!existingBooking) {
    return;
  }

  bookingBackgroundRefreshHandle = window.setInterval(() => {
    syncLatestTrackingBooking();
    if (getCurrentPage() === "tracking.html") {
      loadTracking();
    }
  }, 15000);
}

window.openBookingFromHistory = (bookingId) => {
  const booking = currentTrackingBookings.find((item) => item.id === bookingId) || getActiveBooking();
  if (!booking || !isPendingBooking(booking)) {
    setActiveBooking(null);
    renderFloatingTrackerLauncher();
    window.location.replace("garage.html?notice=No active booking found.");
    return;
  }
  openTrackingForBooking(booking);
};

async function loadTracking() {
  const status = document.getElementById("trackingStatus");
  if (!status) {
    return;
  }

  const trackingTarget = getTrackingTargetBooking();
  const targetId = trackingTarget?.id || new URLSearchParams(window.location.search).get("booking");
  const bookings = await fetchBookingsForCurrentUser();
  currentTrackingBookings = bookings;

  renderBookingHistory(bookings, targetId);

  const liveBooking = bookings.find((booking) => booking.id === targetId) || bookings[0] || enrichStoredBooking(trackingTarget);

  if (!liveBooking) {
    setActiveBooking(null);
    renderFloatingTrackerLauncher();
    window.location.replace("garage.html?notice=No active booking found.");
    return;
  }

  if (!isPendingBooking(liveBooking)) {
    setActiveBooking(null);
    renderFloatingTrackerLauncher();
    window.location.replace("garage.html?notice=No active booking found.");
    return;
  }

  setActiveBooking(liveBooking);
  renderTrackingBooking(liveBooking);
  renderFloatingTrackerLauncher();
  setStatus("trackingStatus", "Your booking history and live tracker are ready.", "success");
}

function refreshTracking() {
  loadTracking();
}

window.cancelBooking = cancelBooking;
window.refreshTracking = refreshTracking;
