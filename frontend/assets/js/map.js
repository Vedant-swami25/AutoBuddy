/**
 * Nearby-garage map selection, rendering, and map-page booking behavior.
 *
 * This code was moved out of app.js so this file has one feature-focused
 * responsibility while preserving the original browser behavior.
 */

let nearbyMapInstance = null;

function updateMapBookingCard(garage) {
  const meta = document.getElementById("mapGarageMeta");
  const button = document.getElementById("mapBookButton");

  if (!meta || !button) {
    return;
  }

  if (!garage) {
    meta.textContent = "Select a garage marker to see its details and book a visit directly from this page.";
    button.disabled = true;
    delete button.dataset.garageId;
    return;
  }

  meta.textContent = `${garage.name} • ${garage.city || "Nearby"} • ${garage.etaMinutes || 28} min away • Rating ${garage.rating || 4.7}`;
  button.disabled = false;
  button.dataset.garageId = garage.id;
}

function getGarageById(garageId) {
  return getMapGarageIndex().find((garage) => garage.id === garageId) || GARAGE_FALLBACKS.find((garage) => garage.id === garageId) || null;
}

function setSelectedMapGarage(garage) {
  if (!garage) {
    updateMapBookingCard(null);
    return;
  }

  sessionStorage.setItem("autobuddyActiveGarageId", garage.id);
  updateMapBookingCard(garage);
}

async function loadMap() {
  const mapElement = document.getElementById("map");
  if (!mapElement) {
    return;
  }

  if (!isLeafletAvailable()) {
    setStatus("mapStatus", "Map library could not be loaded. Please check your internet connection and refresh the page.", "error");
    showToast("Map library failed to load.", "error");
    return;
  }

  const coordinates = await requestCurrentLocationForAction("mapStatus", "nearby garage map");
  const lat = Number(coordinates?.lat);
  const lng = Number(coordinates?.lng);
  const isDemoLocation = getSavedLocationSource() === "demo";

  if (!hasValidCoordinates({ lat, lng })) {
    setStatus("mapStatus", "No saved location was found. Redirecting you back to the home page.", "warning");
    showToast("Location not found. Returning home.", "warning");
    window.setTimeout(() => {
      window.location.href = "index.html";
    }, 1200);
    return;
  }

  if (nearbyMapInstance?.remove) {
    nearbyMapInstance.remove();
    nearbyMapInstance = null;
  }

  if (mapElement._leaflet_id) {
    mapElement._leaflet_id = null;
    mapElement.innerHTML = "";
  }

  const map = L.map("map").setView([lat, lng], isDemoLocation ? 12 : 14);
  nearbyMapInstance = map;

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  map.whenReady(() => map.invalidateSize());

  L.marker([lat, lng]).addTo(map)
    .bindPopup("You are here")
    .openPopup();

  try {
    let garages;

    try {
      garages = await fetchGarages();
    } catch (error) {
      garages = GARAGE_FALLBACKS;
    }

    let mappableGarages = getMappableGarages(garages);
    if (!mappableGarages.length) {
      mappableGarages = getMappableGarages(GARAGE_FALLBACKS);
    }

    setMapGarageIndex(mappableGarages);
    updateMapBookingCard(null);

    mappableGarages.forEach((garage) => {
      const marker = L.marker([garage.lat, garage.lng]).addTo(map);
      const popupHtml = `
        <div class="map-popup">
          <strong>${garage.name}</strong><br>
          ${garage.address || garage.city || "Pune"}<br>
          ${garage.hours || "Open today"} â€¢ Rating ${garage.rating || 4.7}<br>
          ${garage.verified ? "Verified garage" : "Pending verification"}<br>
          <button type="button" onclick="bookGarageFromMapPopup('${garage.id}')">Book Visit</button>
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on("click", () => {
        setSelectedMapGarage(garage);
      });
    });

    if (mappableGarages.length && isDemoLocation) {
      setStatus("mapStatus", `Using ${DEFAULT_DEMO_LOCATION.label} demo coordinates. ${mappableGarages.length} nearby garages have been added to the map.`, "warning");
    } else if (mappableGarages.length) {
      setStatus("mapStatus", `${mappableGarages.length} nearby garages have been added to the map.`, "success");
    } else {
      setStatus("mapStatus", "The map loaded, but no garage locations are available yet.", "warning");
    }
  } catch (error) {
    setStatus("mapStatus", "The map loaded, but nearby garage data could not be fetched.", "error");
    showToast("Could not load garage markers.", "error");
  }
}

async function useMyCurrentLocation(event) {
  const button = event?.currentTarget;
  setButtonLoading(button, true, "Use My Current Location");

  try {
    await requestCurrentLocationForAction("mapStatus", "nearby garage map", {
      force: true,
      timeout: 12000
    });
    await loadMap();
  } finally {
    setButtonLoading(button, false, "Use My Current Location");
  }
}

window.bookGarageFromMapPopup = (garageId) => {
  const garage = getGarageById(garageId);
  if (!garage) {
    showToast("Could not find that garage.", "error");
    return;
  }

  setSelectedMapGarage(garage);
  const button = document.getElementById("mapBookButton");
  if (button) {
    bookGarage(garage, button);
  }
};

window.bookSelectedGarageFromMap = bookSelectedGarageFromMap;
window.bookPricedService = bookPricedService;
window.useMyCurrentLocation = useMyCurrentLocation;
