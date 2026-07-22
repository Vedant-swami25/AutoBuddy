/**
 * Shared JSON request handling for all AutoBuddy integrations.
 *
 * This code was moved out of app.js so this file has one feature-focused
 * responsibility while preserving the original browser behavior.
 */

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const errorPayload = await response.json();
      if (errorPayload?.message) {
        message = errorPayload.message;
      }
    } catch (error) {
      // Ignore JSON parsing errors and fall back to the default message.
    }

    throw new Error(message);
  }
  return response.json();
}

// Authentication API used by the login page.
function saveLogin(payload) {
  return requestJson(`${API}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

// Location API used to fill district and state from browser coordinates.
function reverseGeocode(latitude, longitude) {
  return requestJson(
    `${API}/location/reverse?lat=${encodeURIComponent(latitude)}&lng=${encodeURIComponent(longitude)}`
  );
}

// Booking APIs shared by dashboard, services, garages, and tracking pages.
function createBooking(payload) {
  return requestJson(`${API}/book`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

function fetchBookings() {
  return requestJson(`${API}/book`);
}

function fetchLatestBooking(mobile) {
  return requestJson(`${API}/book/latest?mobile=${encodeURIComponent(mobile)}`);
}

function cancelBookingRequest(bookingId) {
  return requestJson(`${API}/book/${encodeURIComponent(bookingId)}/cancel`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    }
  });
}

// Garage APIs shared by list, map, and partner pages.
function fetchGarages() {
  return requestJson(`${API}/garage`);
}

function submitGarageRequest(payload) {
  return requestJson(`${API}/garage/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

// External routing integration used only by the live tracking map.
function fetchDrivingRoute(origin, destination) {
  const originPoint = `${encodeURIComponent(origin.lng)},${encodeURIComponent(origin.lat)}`;
  const destinationPoint = `${encodeURIComponent(destination.lng)},${encodeURIComponent(destination.lat)}`;
  return requestJson(
    `https://router.project-osrm.org/route/v1/driving/${originPoint};${destinationPoint}?overview=full&geometries=geojson`
  );
}

