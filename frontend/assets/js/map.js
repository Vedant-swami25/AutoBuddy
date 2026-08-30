/**
 * Nearby-garage map discovery & two-way synchronized garage list.
 */

let nearbyMapInstance = null;
let mapGarageMarkers = new Map();
let currentMappableGarages = [];
let selectedGarageId = null;
let userCoordinates = null;

function createGarageMarkerIcon(isSelected = false) {
  const cls = isSelected ? "ab-marker ab-marker-selected" : "ab-marker";
  return L.divIcon({
    className: "ab-marker-wrap",
    html: `<div class="${cls}"><span></span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -34]
  });
}

function createUserMarkerIcon() {
  return L.divIcon({
    className: "ab-marker-wrap",
    html: `<div class="ab-marker ab-marker-user"><span></span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16]
  });
}

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1);
}

function selectGarageOnMap(garageId, zoomTo = true) {
  selectedGarageId = garageId;
  const garage = currentMappableGarages.find((g) => g.id === garageId);
  if (!garage) return;

  // Highlight card in left list
  document.querySelectorAll(".map-garage-item").forEach((item) => {
    const isThis = item.dataset.id === garageId;
    item.classList.toggle("active", isThis);
    if (isThis) {
      item.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  });

  // Highlight marker & fly to coordinate
  mapGarageMarkers.forEach((marker, id) => {
    const isSelected = id === garageId;
    marker.setIcon(createGarageMarkerIcon(isSelected));
    if (isSelected) {
      marker.setZIndexOffset(1000);
      if (zoomTo && nearbyMapInstance) {
        nearbyMapInstance.flyTo([garage.lat, garage.lng], 15, { duration: 0.8 });
        marker.openPopup();
      }
    } else {
      marker.setZIndexOffset(0);
    }
  });

  sessionStorage.setItem("autobuddyActiveGarageId", garage.id);
}

function renderMapGaragesList(garagesToRender = currentMappableGarages) {
  const container = document.getElementById("mapGaragesList");
  if (!container) return;

  if (!garagesToRender.length) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 24px; text-align: center; color: var(--text-secondary);">
        No matching workshops found in this sector.
      </div>
    `;
    return;
  }

  container.innerHTML = garagesToRender.map((g) => {
    const dist = userCoordinates
      ? calculateDistanceKm(userCoordinates.lat, userCoordinates.lng, g.lat, g.lng)
      : null;
    const distNum = dist !== null ? Number(dist) : null;
    const etaMin = distNum !== null && !isNaN(distNum) ? Math.round(distNum * 4) : (g.etaMinutes || 15);
    const distText = dist ? `${dist} km • ~${etaMin} min` : `~${etaMin} min`;
    const ownerName = g.mechanic || g.ownerName || "AutoBuddy Certified Workshop";
    const isSelected = g.id === selectedGarageId;

    return `
      <article class="map-garage-item ${isSelected ? "active" : ""}" data-id="${g.id}" onclick="selectGarageOnMap('${g.id}', true)">
        <div class="map-garage-item-top">
          <div>
            <h3 class="map-garage-name">${g.name}</h3>
            <span style="font-size: 0.8rem; color: var(--text-secondary);">${g.address || g.city || "Pune, Maharashtra"}</span>
          </div>
          <span class="badge ${g.verified ? "success-chip" : "neutral"}">★ ${g.rating || 4.8}</span>
        </div>

        <div class="map-garage-meta-row">
          <span>👤 <strong class="map-garage-owner">${ownerName}</strong></span>
          <span>•</span>
          <span style="color: var(--accent-primary); font-weight: 600;">📞 AutoBuddy Helpline: +91 1800-889-2889</span>
        </div>

        <div class="map-garage-footer">
          <span class="map-garage-eta">⚡ ${distText}</span>
          <button type="button" class="map-garage-book-btn" onclick="event.stopPropagation(); bookGarageDirectly('${g.id}')">Book Visit</button>
        </div>
      </article>
    `;
  }).join("");
}

function handleMapSearch(query) {
  const q = String(query || "").toLowerCase().trim();
  if (!q) {
    renderMapGaragesList(currentMappableGarages);
    return;
  }

  const filtered = currentMappableGarages.filter((g) => {
    return (
      (g.name && g.name.toLowerCase().includes(q)) ||
      (g.address && g.address.toLowerCase().includes(q)) ||
      (g.city && g.city.toLowerCase().includes(q)) ||
      (g.mechanic && g.mechanic.toLowerCase().includes(q)) ||
      (g.services && g.services.some((s) => s.toLowerCase().includes(q)))
    );
  });

  renderMapGaragesList(filtered);
}

async function loadMap() {
  const mapElement = document.getElementById("map");
  if (!mapElement) return;

  if (!isLeafletAvailable()) {
    setStatus("mapStatus", "Map library could not be loaded. Check your internet connection.", "error");
    return;
  }

  const coordinates = await requestCurrentLocationForAction("mapStatus", "nearby garage map");
  const lat = Number(coordinates?.lat) || 18.5204;
  const lng = Number(coordinates?.lng) || 73.8567;
  userCoordinates = { lat, lng };

  if (nearbyMapInstance?.remove) {
    nearbyMapInstance.remove();
    nearbyMapInstance = null;
  }

  if (mapElement._leaflet_id) {
    mapElement._leaflet_id = null;
    mapElement.innerHTML = "";
  }

  const map = L.map("map").setView([lat, lng], 13);
  nearbyMapInstance = map;

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  map.whenReady(() => map.invalidateSize());

  // User coordinate pin
  L.marker([lat, lng], { icon: createUserMarkerIcon() }).addTo(map)
    .bindPopup("<strong style='font-size:0.9rem;'>📍 Your Current Location</strong>")
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

    if (userCoordinates && hasValidCoordinates(userCoordinates)) {
      mappableGarages.sort((a, b) => {
        const distA = Number(calculateDistanceKm(userCoordinates.lat, userCoordinates.lng, a.lat, a.lng)) || 999;
        const distB = Number(calculateDistanceKm(userCoordinates.lat, userCoordinates.lng, b.lat, b.lng)) || 999;
        return distA - distB;
      });
    }

    currentMappableGarages = mappableGarages;
    mapGarageMarkers.clear();

    mappableGarages.forEach((garage) => {
      const marker = L.marker([garage.lat, garage.lng], { icon: createGarageMarkerIcon(false) }).addTo(map);
      const ownerName = garage.mechanic || garage.ownerName || "AutoBuddy Certified Workshop";

      const popupHtml = `
        <div class="map-popup">
          <strong>${garage.name}</strong>
          <span>👤 ${ownerName}</span>
          <span>📍 ${garage.address || garage.city || "Pune"}</span>
          <span>📞 <strong>AutoBuddy Helpline:</strong> +91 1800-889-2889</span>
          <span>★ ${garage.rating || 4.8} Rating · ${garage.verified ? "Verified Partner" : "Workshop"}</span>
          <button type="button" onclick="bookGarageDirectly('${garage.id}')">Book Visit</button>
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on("click", () => {
        selectGarageOnMap(garage.id, false);
      });

      mapGarageMarkers.set(garage.id, marker);
    });

    renderMapGaragesList();

    // Bind search input
    const searchInput = document.getElementById("mapSearchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => handleMapSearch(e.target.value));
    }

    setStatus("mapStatus", `${mappableGarages.length} verified partner garages available in your area.`, "success");
  } catch (error) {
    console.error("Map loading error:", error);
    setStatus("mapStatus", "Could not load garage markers. Using offline database.", "warning");
    currentMappableGarages = GARAGE_FALLBACKS;
    renderMapGaragesList();
  }
}

async function useMyCurrentLocation(event) {
  const button = event?.currentTarget;
  setButtonLoading(button, true, "Locating...");

  try {
    const coords = await requestCurrentLocationForAction("mapStatus", "nearby garage map", {
      force: true,
      timeout: 10000
    });
    if (coords) {
      userCoordinates = coords;
      await loadMap();
    }
  } finally {
    setButtonLoading(button, false, "📍 Center My Location");
  }
}

function bookGarageDirectly(garageId) {
  const garage = currentMappableGarages.find((g) => g.id === garageId) || GARAGE_FALLBACKS.find((g) => g.id === garageId);
  if (!garage) return;

  if (typeof window.bookGarage === "function") {
    window.bookGarage(garage);
  } else {
    window.location.href = `garage.html?selected=${encodeURIComponent(garage.id)}`;
  }
}

window.selectGarageOnMap = selectGarageOnMap;
window.bookGarageDirectly = bookGarageDirectly;
window.useMyCurrentLocation = useMyCurrentLocation;

document.addEventListener("DOMContentLoaded", () => {
  if (getCurrentPage() === "map.html") {
    loadMap();
  }
});
