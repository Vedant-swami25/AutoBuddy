/**
 * Shared JSON request handling for all AutoBuddy integrations.
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
      // Ignore JSON parsing errors and fall back to default message.
    }

    throw new Error(message);
  }
  return response.json();
}

// Authentication & OTP APIs
function signinOtpApi(payload) {
  return requestJson(`${API}/auth/signin-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

function verifySigninApi(payload) {
  return requestJson(`${API}/auth/verify-signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

function signupOtpApi(payload) {
  return requestJson(`${API}/auth/signup-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

function signupApi(payload) {
  return requestJson(`${API}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

function sendOtpApi(payload) {
  return requestJson(`${API}/auth/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

function verifyOtpApi(payload) {
  return requestJson(`${API}/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

function checkAccountApi(mobile, role) {
  return requestJson(`${API}/auth/check-account?mobile=${encodeURIComponent(mobile)}&role=${encodeURIComponent(role)}`);
}

function saveLogin(payload) {
  return requestJson(`${API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

// Location API
function reverseGeocode(latitude, longitude) {
  return requestJson(
    `${API}/location/reverse?lat=${encodeURIComponent(latitude)}&lng=${encodeURIComponent(longitude)}`
  );
}

// Booking APIs
function createBooking(payload) {
  return requestJson(`${API}/book`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

function fetchBookings() {
  return requestJson(`${API}/book`);
}

function fetchUserBookings(sessionOrMobile) {
  if (typeof sessionOrMobile === "object" && sessionOrMobile !== null) {
    const params = new URLSearchParams();
    if (sessionOrMobile.id) params.append("userId", sessionOrMobile.id);
    if (sessionOrMobile.mobile) params.append("mobile", sessionOrMobile.mobile);
    return requestJson(`${API}/book/user?${params.toString()}`);
  }
  return requestJson(`${API}/book/user?mobile=${encodeURIComponent(sessionOrMobile)}`);
}

function fetchLatestBooking(mobile) {
  return requestJson(`${API}/book/latest?mobile=${encodeURIComponent(mobile)}`);
}

function fetchGarageBookings(garageId) {
  return requestJson(`${API}/book/garage?garageId=${encodeURIComponent(garageId)}`);
}

function updateBookingStatusApi(bookingId, payload) {
  return requestJson(`${API}/book/${encodeURIComponent(bookingId)}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

function cancelBookingRequest(bookingId) {
  return requestJson(`${API}/book/${encodeURIComponent(bookingId)}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });
}

// Garage APIs
function fetchGarages() {
  return requestJson(`${API}/garage`);
}

function fetchGarageById(garageId) {
  return requestJson(`${API}/garage/${encodeURIComponent(garageId)}`);
}

function submitGarageApplication(payload) {
  return requestJson(`${API}/garage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}
