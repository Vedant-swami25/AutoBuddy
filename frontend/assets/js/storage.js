/**
 * Typed access to browser storage for sessions, bookings, and map state.
 *
 * Provides central access to auth sessions, persistent storage, and local bookings.
 */

function getAuthSession() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || "null");
  } catch (error) {
    return null;
  }
}

function persistLoginSession(session) {
  if (!session) return;
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

function clearLoginSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(ACTIVE_BOOKING_KEY);
  sessionStorage.removeItem("autobuddyActiveGarageId");
  sessionStorage.removeItem("autobuddyActiveBooking");
}

function getStoredBookings() {
  try {
    return JSON.parse(localStorage.getItem(BOOKING_STORAGE_KEY) || "[]");
  } catch (error) {
    return [];
  }
}

function saveStoredBookings(bookings) {
  localStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify(bookings || []));
  if (typeof toggleTrackingLinkVisibility === "function") {
    toggleTrackingLinkVisibility();
  }
}

function getBookingOwnerMobile(booking) {
  return String(booking?.user?.mobile || "");
}

function getCurrentUserMobile() {
  return String(getAuthSession()?.mobile || "");
}

function getUserScopedBookings(bookings) {
  const mobile = getCurrentUserMobile();
  if (!mobile) {
    return bookings;
  }

  return bookings.filter((booking) => getBookingOwnerMobile(booking) === mobile);
}

function storeBookingLocally(booking) {
  const bookings = getStoredBookings();
  bookings.unshift(booking);
  saveStoredBookings(bookings);
  return booking;
}

function setActiveBooking(booking) {
  if (booking === null) {
    localStorage.removeItem(ACTIVE_BOOKING_KEY);
  } else {
    localStorage.setItem(ACTIVE_BOOKING_KEY, JSON.stringify(booking));
  }

  if (typeof toggleTrackingLinkVisibility === "function") {
    toggleTrackingLinkVisibility();
  }
  if (typeof window !== "undefined" && typeof window.renderFloatingTrackerLauncher === "function") {
    window.renderFloatingTrackerLauncher();
  }
}

function getActiveBooking() {
  try {
    return JSON.parse(localStorage.getItem(ACTIVE_BOOKING_KEY) || "null");
  } catch (error) {
    return null;
  }
}

function getMapGarageIndex() {
  const garages = [...GARAGE_FALLBACKS];
  try {
    const selected = JSON.parse(sessionStorage.getItem(MAP_SELECTED_GARAGE_KEY) || "null");
    if (Array.isArray(selected)) {
      return selected;
    }
  } catch (error) {
    // Ignore bad session data.
  }
  return garages;
}

function setMapGarageIndex(garages) {
  sessionStorage.setItem(MAP_SELECTED_GARAGE_KEY, JSON.stringify(garages));
}

// Global attachments
window.getAuthSession = getAuthSession;
window.persistLoginSession = persistLoginSession;
window.clearLoginSession = clearLoginSession;
window.getStoredBookings = getStoredBookings;
window.saveStoredBookings = saveStoredBookings;
window.storeBookingLocally = storeBookingLocally;
window.setActiveBooking = setActiveBooking;
window.getActiveBooking = getActiveBooking;
