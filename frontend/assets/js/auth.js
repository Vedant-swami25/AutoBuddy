/**
 * Route protection, login submission, session persistence, and login-page setup.
 *
 * This code was moved out of app.js so this file has one feature-focused
 * responsibility while preserving the original browser behavior.
 */

function getCurrentPage() {
  const page = window.location.pathname.split("/").pop();
  return page || "index.html";
}

function getAuthSession() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || "null");
  } catch (error) {
    return null;
  }
}

function isAuthenticated() {
  const session = getAuthSession();
  return Boolean(session?.name && session?.mobile);
}

function getRedirectTarget() {
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get("redirect");

  if (!redirect || redirect.includes("login.html")) {
    return "index.html";
  }

  return redirect;
}

function guardRoute() {
  const isPublicPage = document.body.dataset.publicPage === "true";
  const loggedIn = isAuthenticated();
  const currentPage = getCurrentPage();

  if (!isPublicPage && !loggedIn) {
    const redirectTarget = encodeURIComponent(currentPage);
    window.location.replace(`login.html?redirect=${redirectTarget}`);
    return false;
  }

  if (isPublicPage && loggedIn) {
    window.location.replace(getRedirectTarget());
    return false;
  }

  return true;
}

function logout() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  showToast("You have been signed out.", "success");
  window.setTimeout(() => {
    window.location.replace("login.html");
  }, 250);
}

function persistLoginSession(session) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

function shouldUseLocalLoginFallback(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("404") ||
    message.includes("405") ||
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("login failed") ||
    message.includes("mongodb") ||
    message.includes("mongoose") ||
    message.includes("operation")
  );
}

function handleLoginSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const name = document.getElementById("loginName")?.value.trim();
  const email = document.getElementById("loginEmail")?.value.trim();
  const mobile = document.getElementById("loginMobile")?.value.trim();
  const district = document.getElementById("loginDistrict")?.value.trim();
  const state = document.getElementById("loginState")?.value.trim();
  const lat = Number(localStorage.getItem("lat"));
  const lng = Number(localStorage.getItem("lng"));

  if (!name || !email || !mobile || !district || !state) {
    setStatus("loginStatus", "Please complete your name, email, mobile number, district, and state.", "error");
    showToast("Complete all login fields.", "error");
    return;
  }

  if (!/^\d{10}$/.test(mobile)) {
    setStatus("loginStatus", "Please enter a valid 10-digit mobile number.", "error");
    showToast("A valid mobile number is required.", "error");
    return;
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    setStatus("loginStatus", "Please enter a valid email address.", "error");
    showToast("A valid email address is required.", "error");
    return;
  }

  setButtonLoading(button, true, "Continue to AutoBuddy");
  setStatus("loginStatus", "Authenticating your AutoBuddy account...", "neutral");

  saveLogin({
    name,
    email,
    mobile,
    district,
    state,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null
  }).then((payload) => {
    completeLogin({
      name: payload.user.name,
      email: payload.user.email,
      mobile: payload.user.mobile,
      district: payload.user.district,
      state: payload.user.state,
      lat: payload.user.lat,
      lng: payload.user.lng,
      loggedInAt: payload.user.createdAt
    });
  }).catch((error) => {
    if (shouldUseLocalLoginFallback(error)) {
      completeLogin(
        {
          name,
          email,
          mobile,
          district,
          state,
          lat: Number.isFinite(lat) ? lat : null,
          lng: Number.isFinite(lng) ? lng : null,
          loggedInAt: new Date().toISOString()
        },
        "Backend login route is unavailable here, so you were signed in locally."
      );
      return;
    }

    setStatus("loginStatus", error.message || "Login failed. Please try again.", "error");
    showToast("Login failed. Please try again.", "error");
  }).finally(() => {
    setButtonLoading(button, false, "Continue to AutoBuddy");
  });
}

function initLoginForm() {
  const form = document.getElementById("loginForm");
  if (!form) {
    return;
  }

  form.addEventListener("submit", handleLoginSubmit);
}

