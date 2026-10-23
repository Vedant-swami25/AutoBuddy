/**
 * Shared JSON request handling with automatic session credential attachment.
 */

async function requestJson(url, options = {}) {
  const session = typeof getAuthSession === "function" ? getAuthSession() : null;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (session?.mobile) {
    headers["x-user-mobile"] = session.mobile;
    if (session.id) headers["x-user-id"] = session.id;
    if (session.role) headers["x-user-role"] = session.role;
    if (session.role === "admin") {
      headers["x-admin-mobile"] = session.mobile;
    }
  }

  const response = await fetch(url, { ...options, headers });
  
  // Handle error responses
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    let payload = null;

    try {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const errorPayload = await response.json();
        payload = errorPayload;
        if (errorPayload?.message) {
          message = errorPayload.message;
        }
      } else {
        message = await response.text() || message;
      }
    } catch (error) {
      // Ignore parsing errors and fall back to default message
      console.warn("Could not parse error response:", error);
    }

    const err = new Error(message);
    err.status = response.status;
    err.payload = payload;
    throw err;
  }

  // Handle success responses - safely parse JSON
  try {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.warn("Could not parse response JSON:", error);
    throw new Error("Invalid response format from server");
  }
}

// Authentication & OTP APIs
function signinOtpApi(payload) {
  return requestJson(`${API}/auth/signin-otp`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

function verifySigninApi(payload) {
  return requestJson(`${API}/auth/verify-signin`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

function signupOtpApi(payload) {
  return requestJson(`${API}/auth/signup-otp`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

function signupApi(payload) {
  return requestJson(`${API}/auth/signup`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

function sendOtpApi(payload) {
  return requestJson(`${API}/auth/send-otp`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

function verifyOtpApi(payload) {
  return requestJson(`${API}/auth/verify-otp`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

function checkAccountApi(mobile, role) {
  return requestJson(`${API}/auth/check-account?mobile=${encodeURIComponent(mobile)}&role=${encodeURIComponent(role)}`);
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

function fetchBookingByIdApi(bookingId) {
  return requestJson(`${API}/book/${encodeURIComponent(bookingId)}`);
}

function updateBookingStatusApi(bookingId, payload) {
  return requestJson(`${API}/book/${encodeURIComponent(bookingId)}/status`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

function cancelBookingRequest(bookingId) {
  return requestJson(`${API}/book/${encodeURIComponent(bookingId)}/cancel`, {
    method: "POST"
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
    body: JSON.stringify(payload)
  });
}

// Export all API functions to global window scope
if (typeof window !== 'undefined') {
  // Authentication APIs
  window.signinOtpApi = signinOtpApi;
  window.verifySigninApi = verifySigninApi;
  window.signupOtpApi = signupOtpApi;
  window.signupApi = signupApi;
  window.sendOtpApi = sendOtpApi;
  window.verifyOtpApi = verifyOtpApi;
  window.checkAccountApi = checkAccountApi;
  window.reverseGeocode = reverseGeocode;
  
  // Booking APIs
  window.createBooking = createBooking;
  window.fetchBookings = fetchBookings;
  window.fetchUserBookings = fetchUserBookings;
  window.fetchLatestBooking = fetchLatestBooking;
  window.fetchGarageBookings = fetchGarageBookings;
  window.fetchBookingByIdApi = fetchBookingByIdApi;
  window.updateBookingStatusApi = updateBookingStatusApi;
  window.cancelBookingRequest = cancelBookingRequest;
  
  // Garage APIs
  window.fetchGarages = fetchGarages;
  window.fetchGarageById = fetchGarageById;
  window.submitGarageApplication = submitGarageApplication;
}
