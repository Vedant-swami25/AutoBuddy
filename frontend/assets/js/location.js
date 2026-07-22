/**
 * Browser geolocation and reverse-geocoding behavior used by login and map flows.
 *
 * This code was moved out of app.js so this file has one feature-focused
 * responsibility while preserving the original browser behavior.
 */

async function autofillLocationFromCoordinates(latitude, longitude) {
  const districtInput = document.getElementById("loginDistrict");
  const stateInput = document.getElementById("loginState");
  const helper = document.getElementById("locationHelper");

  if (!districtInput || !stateInput || !helper) {
    return;
  }

  helper.textContent = "Location access granted. Filling district and state...";

  try {
    const payload = await reverseGeocode(latitude, longitude);

    if (!districtInput.value) {
      districtInput.value = payload.district || "";
    }
    if (!stateInput.value) {
      stateInput.value = payload.state || "";
    }
    helper.textContent = "District and state were filled from your current location. You can still edit them.";
  } catch (error) {
    helper.textContent = error.message || "We could not auto-fill district and state from your location.";
  }
}

function requestLoginLocationAccess() {
  const loginForm = document.getElementById("loginForm");
  const helper = document.getElementById("locationHelper");

  if (!loginForm || !helper) {
    return;
  }

  if (!navigator.geolocation) {
    helper.textContent = "Location access is not supported on this device. Please enter district and state manually.";
    return;
  }

  helper.textContent = "Requesting location access to help fill district and state...";

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      persistUserCoordinates({ lat: latitude, lng: longitude }, "current");
      autofillLocationFromCoordinates(latitude, longitude);
    },
    () => {
      helper.textContent = "Location access was not allowed. Please enter district and state manually.";
    },
    {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 300000
    }
  );
}

function getSavedUserCoordinates() {
  return getCoordinatePair(
    localStorage.getItem("lat"),
    localStorage.getItem("lng")
  );
}

function getSavedLocationSource() {
  return localStorage.getItem(LOCATION_SOURCE_KEY) || "";
}

function persistUserCoordinates(coordinates, source = "current") {
  if (!hasValidCoordinates(coordinates)) {
    return;
  }

  localStorage.setItem("lat", coordinates.lat);
  localStorage.setItem("lng", coordinates.lng);
  localStorage.setItem(LOCATION_SOURCE_KEY, source);
}

function getDefaultDemoCoordinates() {
  return {
    lat: DEFAULT_DEMO_LOCATION.lat,
    lng: DEFAULT_DEMO_LOCATION.lng
  };
}

function isLocalhostOrigin() {
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

function canUseBrowserGeolocation() {
  return Boolean(
    navigator.geolocation &&
    (window.isSecureContext || isLocalhostOrigin())
  );
}

async function getGeolocationPermissionState() {
  if (!navigator.permissions?.query) {
    return "unknown";
  }

  try {
    const permission = await navigator.permissions.query({ name: "geolocation" });
    return permission.state;
  } catch (error) {
    return "unknown";
  }
}

function applyDemoLocation(statusId, message) {
  const fallback = getDefaultDemoCoordinates();
  persistUserCoordinates(fallback, "demo");

  if (statusId && document.getElementById(statusId)) {
    setStatus(statusId, message, "warning");
  } else {
    setActiveStatus(message, "warning");
  }

  return fallback;
}

async function requestCurrentLocationForAction(statusId, purpose = "this action", options = {}) {
  const updateStatus = (message, type) => {
    if (statusId && document.getElementById(statusId)) {
      setStatus(statusId, message, type);
      return;
    }
    setActiveStatus(message, type);
  };

  const savedCoordinates = getSavedUserCoordinates();
  const savedSource = getSavedLocationSource();
  const shouldForceRequest = options.force === true;
  const permissionState = await getGeolocationPermissionState();

  if (
    savedCoordinates &&
    savedSource !== "demo" &&
    !shouldForceRequest
  ) {
    updateStatus("Using previously captured current location.", "success");
    return Promise.resolve(savedCoordinates);
  }

  if (savedCoordinates && savedSource === "demo" && permissionState === "denied" && !shouldForceRequest) {
    updateStatus(`Location permission is still denied. Using ${DEFAULT_DEMO_LOCATION.label} demo coordinates.`, "warning");
    return Promise.resolve(savedCoordinates);
  }

  if (!canUseBrowserGeolocation()) {
    return Promise.resolve(applyDemoLocation(
      statusId,
      `Location access requires HTTPS or localhost. Using ${DEFAULT_DEMO_LOCATION.label} demo coordinates so ${purpose} can continue.`
    ));
  }

  updateStatus(`Requesting your location for ${purpose}...`, "neutral");

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        persistUserCoordinates(coordinates, "current");
        updateStatus("Location captured successfully.", "success");
        resolve(coordinates);
      },
      (error) => {
        const wasDenied = error.code === error.PERMISSION_DENIED;
        const message = wasDenied
          ? `Location permission was denied. Using ${DEFAULT_DEMO_LOCATION.label} demo coordinates so the app remains usable.`
          : `We could not read your location right now. Using ${DEFAULT_DEMO_LOCATION.label} demo coordinates so ${purpose} can continue.`;
        const fallback = applyDemoLocation(statusId, message);
        showToast(wasDenied ? "Location permission denied. Demo location applied." : "Location unavailable. Demo location applied.", "warning");
        resolve(fallback);
      },
      {
        enableHighAccuracy: true,
        timeout: options.timeout || 10000,
        maximumAge: options.force ? 0 : 120000
      }
    );
  });
}

async function getLocation(event) {
  const button = event?.currentTarget;
  setButtonLoading(button, true);
  setActiveStatus("Requesting your location so we can find nearby garages...", "neutral");

  if (!canUseBrowserGeolocation()) {
    setButtonLoading(button, false);
    applyDemoLocation(
      null,
      `Location access requires HTTPS or localhost. Opening the map with ${DEFAULT_DEMO_LOCATION.label} demo coordinates.`
    );
    showToast("Using demo location for nearby garages.", "warning");
    window.setTimeout(() => {
      window.location.href = "map.html";
    }, 650);
    return;
  }

  await requestCurrentLocationForAction("mapStatus", "nearby garage map", {
    force: true,
    timeout: 10000
  });

  setButtonLoading(button, false);
  window.location.href = "map.html";
}


