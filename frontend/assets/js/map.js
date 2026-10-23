/**
 * Nearby-garage map discovery & two-way synchronized garage list.
 */

let nearbyMapInstance = null;
let mapGarageMarkers = new Map();
let currentMappableGarages = [];
let selectedGarageId = null;
let userCoordinates = null;

function getOsmTileConfig() {
  // OpenStreetMap tiles — comprehensive India coverage via active OSM India community
  return {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors | <a href="https://openstreetmap.in" target="_blank" rel="noopener">OSM India</a>',
    maxZoom: 19
  };
}

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

  const isDark = document.body.getAttribute("data-theme") !== "light";
  const tileConfig = getOsmTileConfig(isDark);

  L.tileLayer(tileConfig.url, {
    attribution: tileConfig.attribution,
    maxZoom: tileConfig.maxZoom || 19
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

let trackingPollTimer = null;
let activeTrackingLayerGroup = null;
let vehicleAnimationTimer = null;

function getCoordinateAlongRoute(coords, progress) {
  if (!coords || !coords.length) return null;
  if (coords.length === 1 || progress <= 0) return coords[0];
  if (progress >= 1) return coords[coords.length - 1];

  let totalDist = 0;
  const dists = [];
  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const d = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    dists.push(d);
    totalDist += d;
  }

  if (totalDist === 0) return coords[0];

  const targetDist = progress * totalDist;
  let currentDist = 0;

  for (let i = 0; i < dists.length; i++) {
    const segmentDist = dists[i];
    if (currentDist + segmentDist >= targetDist) {
      const t = segmentDist > 0 ? (targetDist - currentDist) / segmentDist : 0;
      const p1 = coords[i];
      const p2 = coords[i + 1];
      return [
        p1[0] + (p2[0] - p1[0]) * t,
        p1[1] + (p2[1] - p1[1]) * t
      ];
    }
    currentDist += segmentDist;
  }

  return coords[coords.length - 1];
}

async function initBookingTrackingMap(bookingId) {
  const mapElement = document.getElementById("map");
  const sidebar = document.querySelector(".map-sidebar");
  if (!mapElement || !sidebar) return;

  if (vehicleAnimationTimer) {
    clearInterval(vehicleAnimationTimer);
    vehicleAnimationTimer = null;
  }

  // Initialize Map Instance if not already created
  if (!nearbyMapInstance) {
    nearbyMapInstance = L.map("map", {
      center: [18.5204, 73.8567],
      zoom: 13,
      zoomControl: true
    });

    const isDark = document.body.getAttribute("data-theme") !== "light";
    const tileConfig = getOsmTileConfig(isDark);

    L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom || 19
    }).addTo(nearbyMapInstance);
  }

  if (activeTrackingLayerGroup) {
    activeTrackingLayerGroup.clearLayers();
  } else {
    activeTrackingLayerGroup = L.layerGroup().addTo(nearbyMapInstance);
  }

  sidebar.innerHTML = `
    <div style="padding: 30px 16px; text-align: center; color: var(--text-secondary);">
      <div style="font-size: 2rem; margin-bottom: 10px;">🔄</div>
      <div style="font-weight: 600; color: var(--text-primary);">Loading booking tracking data...</div>
      <div style="font-size: 0.8rem; margin-top: 4px;">Connecting to AutoBuddy dispatch...</div>
    </div>
  `;

  async function refreshTrackingData() {
    try {
      const booking = await fetchBookingByIdApi(bookingId);
      if (!booking || !booking.id) {
        sidebar.innerHTML = `
          <div class="empty-state" style="padding: 30px; text-align: center;">
            <div style="font-size: 2rem; margin-bottom: 8px;">⚠️</div>
            <h3>Booking Not Found</h3>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 8px 0 16px;">
              Could not retrieve booking details for ${bookingId}.
            </p>
            <button type="button" onclick="window.location.href='tracking.html'">← Back to My Bookings</button>
          </div>
        `;
        return;
      }

      const status = (booking.status || "").toLowerCase();
      if (status === "cancelled" || status === "rejected" || status === "declined") {
        if (trackingPollTimer) {
          clearInterval(trackingPollTimer);
          trackingPollTimer = null;
        }
        if (vehicleAnimationTimer) {
          clearInterval(vehicleAnimationTimer);
          vehicleAnimationTimer = null;
        }
        if (activeTrackingLayerGroup) {
          activeTrackingLayerGroup.clearLayers();
        }

        sidebar.innerHTML = `
          <div class="empty-state" style="padding: 36px 20px; text-align: center;">
            <div style="font-size: 2.2rem; margin-bottom: 10px;">🚫</div>
            <h3 style="color: #f87171; font-weight: 700; font-size: 1.15rem;">Tracking Unavailable</h3>
            <p style="font-size: 0.88rem; color: var(--text-secondary); margin: 8px 0 20px; line-height: 1.5;">
              This booking is <strong>${status === "cancelled" ? "Cancelled" : "Declined"}</strong> and is no longer active. Live route and vehicle tracking cannot be viewed for cancelled or declined bookings.
            </p>
            <button type="button" class="primary" style="width: 100%;" onclick="window.location.href='tracking.html'">
              <span>← Back to My Bookings</span>
            </button>
            <button type="button" class="secondary small" style="width: 100%; margin-top: 8px;" onclick="window.location.href='map.html'">
              <span>Browse Nearby Garages</span>
            </button>
          </div>
        `;
        return;
      }

      renderTrackingPanel(booking, sidebar);
      renderTrackingMapVisuals(booking);

      if (status === "completed") {
        if (trackingPollTimer) {
          clearInterval(trackingPollTimer);
          trackingPollTimer = null;
        }
        if (vehicleAnimationTimer) {
          clearInterval(vehicleAnimationTimer);
          vehicleAnimationTimer = null;
        }
      }
    } catch (err) {
      console.error("Live tracking error:", err);
      sidebar.innerHTML = `
        <div class="empty-state" style="padding: 30px; text-align: center;">
          <div style="font-size: 2rem; margin-bottom: 8px;">⚠️</div>
          <h3>Tracking Unavailable</h3>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 8px 0 16px;">
            ${err.message || "Could not load live tracking information."}
          </p>
          <button type="button" onclick="window.location.href='tracking.html'">← Back to My Bookings</button>
        </div>
      `;
    }
  }

  await refreshTrackingData();

  if (trackingPollTimer) clearInterval(trackingPollTimer);
  trackingPollTimer = setInterval(refreshTrackingData, 6000);
}

function renderTrackingPanel(booking, sidebar) {
  const status = (booking.status || "pending").toLowerCase();
  const serviceName = booking.service || "AutoBuddy Service";
  const garageName = booking.garage || "AutoBuddy Workshop Partner";
  const garagePhone = booking.phone || "+91 1800-889-2889";
  const supportPhone = typeof AUTOBUDDY_SUPPORT_PHONE !== "undefined" ? AUTOBUDDY_SUPPORT_PHONE : "+91 1800-889-2889";

  const isCompleted = status === "completed";
  const isCancelled = status === "cancelled" || status === "rejected";
  const isAccepted = status === "accepted";
  const isInProgress = status === "in_progress";

  const step1Class = (isAccepted || isInProgress || isCompleted) ? "done" : "active";
  const step2Class = (isInProgress || isCompleted) ? "done" : (isAccepted ? "active" : "");
  const step3Class = isCompleted ? "done" : (isInProgress ? "active" : "");
  const step4Class = isCompleted ? "done" : "";

  const distNum = booking.distanceKm ? Number(booking.distanceKm) : null;
  const distText = distNum && !isNaN(distNum) ? `${distNum} km` : "3.5 km";
  
  // Dynamic ETA calculation: distance in km * 4 minutes
  const calculatedTravelMin = (distNum && !isNaN(distNum) && distNum > 0)
    ? Number((distNum * 4).toFixed(1))
    : (booking.travelMinutes || 14);

  let etaDisplay = `${calculatedTravelMin} mins`;
  if (isAccepted && booking.acceptedAt) {
    const elapsed = (Date.now() - new Date(booking.acceptedAt).getTime()) / 60000;
    const remaining = Math.max(0.1, Number((calculatedTravelMin - elapsed).toFixed(1)));
    etaDisplay = remaining > 1 ? `~${Math.round(remaining)} mins` : `~${remaining} mins`;
  }

  const priceText = booking.price ? `₹${booking.price}` : "Estimate on inspection";

  const statusBadgeText =
    isCompleted ? "COMPLETED" :
    isCancelled ? "CANCELLED" :
    status === "accepted" ? "SERVICE PARTNER ASSIGNED" :
    status === "in_progress" ? "SERVICE IN PROGRESS" :
    "BOOKING CONFIRMED";

  sidebar.innerHTML = `
    <div class="tracking-panel">
      <div>
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px;">
          <span class="tracking-header-badge">
            <span class="live-dot"></span> Live Tracking
          </span>
          <span class="badge ${isCompleted ? "success-chip" : isCancelled ? "error-chip" : (status === "accepted" ? "warning" : "neutral")}">
            ${statusBadgeText}
          </span>
        </div>
        <h2 style="font-size: 1.22rem; font-weight: 700; color: var(--text-primary); margin-bottom: 2px;">${serviceName}</h2>
        <span style="font-size: 0.78rem; color: var(--text-tertiary); font-family: monospace;">Booking ID: ${booking.id}</span>
      </div>

      <div class="tracking-route-summary">
        <div class="tracking-metric-box">
          <span class="tracking-metric-label">Estimated Arrival</span>
          <span id="trackingEtaMetric" class="tracking-metric-val" style="color: var(--accent-primary);">${isCompleted ? "Completed" : (isInProgress ? "Arrived on site" : etaDisplay)}</span>
        </div>
        <div class="tracking-metric-box">
          <span class="tracking-metric-label">Route Distance</span>
          <span class="tracking-metric-val">${distText}</span>
        </div>
      </div>

      <!-- Modern 4-Step Progress Tracking -->
      <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 18px 16px;">
        <div style="font-size: 0.76rem; text-transform: uppercase; font-weight: 700; color: var(--text-tertiary); margin-bottom: 12px; letter-spacing: 0.04em;">
          Service Status Progression
        </div>
        <div class="tracking-steps-container">
          <div class="tracking-steps-line"></div>

          <div class="tracking-step-item ${step1Class}">
            <div class="tracking-step-icon">${(isAccepted || isInProgress || isCompleted) ? "✓" : "1"}</div>
            <div class="tracking-step-title">1. Booking Confirmed</div>
            <div class="tracking-step-sub">Request logged and verified</div>
          </div>

          <div class="tracking-step-item ${step2Class}">
            <div class="tracking-step-icon">${(isInProgress || isCompleted) ? "✓" : "2"}</div>
            <div class="tracking-step-title">2. Service Partner Assigned</div>
            <div id="trackingStep2Sub" class="tracking-step-sub">${isAccepted ? `${garageName} en route • ${etaDisplay}` : (isInProgress || isCompleted ? `${garageName} arrived` : "Assigning verified partner")}</div>
          </div>

          <div class="tracking-step-item ${step3Class}">
            <div class="tracking-step-icon">${isCompleted ? "✓" : "3"}</div>
            <div class="tracking-step-title">3. Service In Progress</div>
            <div class="tracking-step-sub">${isInProgress ? "Technician on site • Service active" : (isCompleted ? "Service finished" : "Awaiting partner arrival")}</div>
          </div>

          <div class="tracking-step-item ${step4Class}">
            <div class="tracking-step-icon">${isCompleted ? "✓" : "4"}</div>
            <div class="tracking-step-title">4. Completed</div>
            <div class="tracking-step-sub">${isCompleted ? "Service completed successfully" : "Pending completion"}</div>
          </div>
        </div>
      </div>

      <!-- Garage & Contact Card -->
      <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px; display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <strong style="font-size: 0.92rem; color: var(--text-primary);">${garageName}</strong>
          <span style="font-size: 0.82rem; font-weight: 700; color: var(--accent-primary);">${priceText}</span>
        </div>
        <span style="font-size: 0.8rem; color: var(--text-secondary);">📍 ${booking.city || "Pune, Maharashtra"}</span>
        <div style="display: flex; gap: 10px; align-items: center; margin-top: 4px;">
          <a href="tel:${garagePhone}" style="font-size: 0.82rem; font-weight: 600; color: var(--accent-primary);">📞 Call Garage: ${garagePhone}</a>
        </div>
        ${booking.ownerNote ? `
          <div style="margin-top: 6px; padding: 8px 10px; border-radius: var(--radius-sm); background: rgba(255,255,255,0.04); font-size: 0.8rem; color: var(--text-secondary); border-left: 3px solid var(--accent-primary);">
            <strong>Workshop Note:</strong> ${booking.ownerNote}
          </div>
        ` : ""}
      </div>

      <!-- Navigation & Action Buttons -->
      <div style="display: flex; flex-direction: column; gap: 8px; margin-top: auto;">
        ${(status === "pending" || status === "accepted") ? `
          <button type="button" class="secondary small" style="width: 100%; border-color: rgba(239, 68, 68, 0.4); color: #f87171;" onclick="handleCancelBookingFromMap('${booking.id}')">
            <span>Cancel Booking</span>
          </button>
        ` : (status === "in_progress" ? `
          <button type="button" class="secondary small" style="width: 100%; opacity: 0.5; cursor: not-allowed;" onclick="showToast('Service is already in progress and cannot be cancelled.', 'error')">
            <span>Cancellation Unavailable (In Progress)</span>
          </button>
        ` : "")}
        <button type="button" class="primary" style="width: 100%;" onclick="window.location.href='tracking.html'">
          <span>← Back to My Bookings</span>
        </button>
        <button type="button" class="secondary small" style="width: 100%;" onclick="window.location.href='map.html'">
          <span>Browse All Nearby Garages</span>
        </button>
      </div>
    </div>
  `;
}

async function handleCancelBookingFromMap(bookingId) {
  if (!confirm("Are you sure you want to cancel this booking?")) return;
  try {
    if (typeof cancelBookingRequest === "function") {
      await cancelBookingRequest(bookingId);
    } else {
      const session = typeof getAuthSession === "function" ? getAuthSession() : null;
      const headers = { "Content-Type": "application/json" };
      if (session?.mobile) headers["x-user-mobile"] = session.mobile;
      if (session?.id) headers["x-user-id"] = session.id;
      if (session?.role) headers["x-user-role"] = session.role;
      const res = await fetch(`${API}/book/${encodeURIComponent(bookingId)}/cancel`, {
        method: "PUT",
        headers
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to cancel booking");
    }

    if (typeof clearActiveBooking === "function") {
      clearActiveBooking();
    } else if (typeof setActiveBooking === "function") {
      setActiveBooking(null);
    }
    const launcher = document.getElementById("floatingTrackerLauncher");
    if (launcher) launcher.remove();

    showToast("Booking cancelled successfully", "success");
    setTimeout(() => {
      window.location.href = "tracking.html";
    }, 600);
  } catch (err) {
    console.error("Cancel booking error:", err);
    showToast(err.message || "Failed to cancel booking", "error");
  }
}
window.handleCancelBookingFromMap = handleCancelBookingFromMap;

async function renderTrackingMapVisuals(booking) {
  if (!nearbyMapInstance || !activeTrackingLayerGroup) return;

  if (vehicleAnimationTimer) {
    clearInterval(vehicleAnimationTimer);
    vehicleAnimationTimer = null;
  }

  activeTrackingLayerGroup.clearLayers();

  const status = (booking?.status || "").toLowerCase();
  if (status === "cancelled" || status === "rejected" || status === "declined") {
    return;
  }

  const dest = booking.location || { lat: 18.5204, lng: 73.8567 };
  const origin = booking.garageLocation || { lat: Number(dest.lat) + 0.024, lng: Number(dest.lng) + 0.018 };

  const userLatLng = [Number(dest.lat), Number(dest.lng)];
  const garageLatLng = [Number(origin.lat), Number(origin.lng)];
  const osmKey = typeof getOpenStreetMapApiKey === "function" ? getOpenStreetMapApiKey() : "";

  // User Marker Icon
  const userIcon = L.divIcon({
    className: "track-pin-user",
    html: `
      <div class="track-pin-pulse"></div>
      <div class="track-pin-user-inner">📍</div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22]
  });

  // Garage Marker Icon
  const garageIcon = L.divIcon({
    className: "track-pin-garage",
    html: `<div class="track-pin-garage-inner">🏁</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  });

  L.marker(userLatLng, { icon: userIcon })
    .bindPopup(`<strong>📍 Your Location</strong><br>${booking.user?.name || "Customer"}`)
    .addTo(activeTrackingLayerGroup);

  L.marker(garageLatLng, { icon: garageIcon })
    .bindPopup(`<strong>🏁 ${booking.garage || "Workshop Partner"}</strong><br>Phone: ${booking.phone || "+91 1800-889-2889"}`)
    .addTo(activeTrackingLayerGroup);

  // Fetch real turn-by-turn road route via OpenStreetMap
  let roadCoords = [garageLatLng, userLatLng];
  try {
    const routeUrl = `${API}/location/route?startLat=${garageLatLng[0]}&startLng=${garageLatLng[1]}&endLat=${userLatLng[0]}&endLng=${userLatLng[1]}${osmKey ? `&apiKey=${encodeURIComponent(osmKey)}` : ""}`;
    const routeRes = await fetch(routeUrl);
    if (routeRes.ok) {
      const routeData = await routeRes.json();
      if (Array.isArray(routeData.coordinates) && routeData.coordinates.length > 1) {
        roadCoords = routeData.coordinates;
      }
    }
  } catch (err) {
    console.warn("OpenStreetMap road route fetch error, using direct route:", err);
  }

  // Outer route casing / glow
  L.polyline(roadCoords, {
    color: "#0284c7",
    weight: 7,
    opacity: 0.35,
    lineCap: "round",
    lineJoin: "round"
  }).addTo(activeTrackingLayerGroup);

  // Main OpenStreetMap Road Polyline
  L.polyline(roadCoords, {
    color: "#0084ff",
    weight: 5,
    opacity: 0.9,
    dashArray: "8, 8",
    lineCap: "round",
    lineJoin: "round"
  }).addTo(activeTrackingLayerGroup);

  const isAccepted = status === "accepted";
  const isInProgress = status === "in_progress";
  const isCompleted = status === "completed";

  const distNum = booking.distanceKm ? Number(booking.distanceKm) : null;
  const calculatedTravelMin = (distNum && !isNaN(distNum) && distNum > 0)
    ? Number((distNum * 4).toFixed(1))
    : (booking.travelMinutes || 14);

  const totalMs = Math.max(calculatedTravelMin * 60 * 1000, 1000);
  const startedAt = booking.acceptedAt ? new Date(booking.acceptedAt).getTime() : Date.now();

  function computeProgress() {
    const elapsedMs = Math.max(0, Date.now() - startedAt);
    return Math.min(1, Math.max(0, elapsedMs / totalMs));
  }

  const currentProgress = computeProgress();
  const hasArrived = isInProgress || isCompleted || (isAccepted && currentProgress >= 1);

  if (isAccepted || isInProgress || isCompleted) {
    const vanIcon = L.divIcon({
      className: "track-pin-user",
      html: `<div style="width: 36px; height: 36px; border-radius: 50%; background: #f59e0b; display: flex; align-items: center; justify-content: center; font-size: 18px; border: 2px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.35);">🚗</div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    if (hasArrived) {
      // Arrived state: vehicle at user location, animation stopped
      const vanMarker = L.marker(userLatLng, { icon: vanIcon, zIndexOffset: 800 }).addTo(activeTrackingLayerGroup);
      vanMarker.bindPopup(`<strong>AutoBuddy Service Partner</strong><br>${isInProgress ? "Technician on site • Service In Progress" : "Service Completed"}`);
    } else if (isAccepted) {
      // Vehicle travelling along route matching calculated ETA
      const initialPos = getCoordinateAlongRoute(roadCoords, currentProgress);
      const remainingMin = Math.max(0.1, Number((calculatedTravelMin - ((Date.now() - startedAt) / 60000)).toFixed(1)));
      const vanMarker = L.marker(initialPos, { icon: vanIcon, zIndexOffset: 800 }).addTo(activeTrackingLayerGroup);
      vanMarker.bindPopup(`<strong>AutoBuddy Service Partner En Route</strong><br>Telemetry: Live OpenStreetMap<br>Estimated Arrival: ~${remainingMin} mins`);

      vehicleAnimationTimer = setInterval(() => {
        const p = computeProgress();
        const nextPos = getCoordinateAlongRoute(roadCoords, p);
        if (nextPos) {
          vanMarker.setLatLng(nextPos);
        }

        const rem = Math.max(0.1, Number((calculatedTravelMin - ((Date.now() - startedAt) / 60000)).toFixed(1)));
        const remText = rem > 1 ? `~${Math.round(rem)} mins` : `~${rem} mins`;
        const etaMetricEl = document.getElementById("trackingEtaMetric");
        if (etaMetricEl) etaMetricEl.textContent = remText;
        const step2SubEl = document.getElementById("trackingStep2Sub");
        if (step2SubEl) step2SubEl.textContent = `${booking.garage || "Partner"} en route • ${remText}`;

        if (p >= 1) {
          clearInterval(vehicleAnimationTimer);
          vehicleAnimationTimer = null;
          vanMarker.setLatLng(userLatLng);
          vanMarker.bindPopup("<strong>AutoBuddy Service Partner</strong><br>Technician on site • Service In Progress");

          // Transition to Service In Progress in backend and UI
          if (typeof refreshTrackingData === "function") {
            refreshTrackingData();
          }
        }
      }, 1000);
    }
  }

  const bounds = L.latLngBounds(roadCoords);
  nearbyMapInstance.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
}

function promptOsmApiKey() {
  const currentKey = typeof getOpenStreetMapApiKey === "function" ? getOpenStreetMapApiKey() : "";
  const key = prompt("Enter your OpenStreetMap / OpenRouteService API Key (optional):", currentKey);
  if (key !== null) {
    if (typeof setOpenStreetMapApiKey === "function") {
      setOpenStreetMapApiKey(key.trim());
    }
    if (typeof showToast === "function") {
      showToast(key.trim() ? "OpenStreetMap API Key active!" : "Reset to standard OpenStreetMap", "success");
    }
    const badge = document.getElementById("osmBadgeStatus");
    if (badge) {
      badge.textContent = key.trim() ? "✓ Key Active" : "OSM Live";
    }
    const params = new URLSearchParams(window.location.search);
    const trackingId = params.get("tracking") || params.get("booking");
    if (trackingId && typeof fetchBookingByIdApi === "function") {
      fetchBookingByIdApi(trackingId).then((b) => {
        const s = (b?.status || "").toLowerCase();
        if (b && s !== "cancelled" && s !== "rejected" && s !== "declined") {
          renderTrackingMapVisuals(b);
        }
      });
    }
  }
}
window.promptOsmApiKey = promptOsmApiKey;

function handleSaveOsmKey() {
  const input = document.getElementById("osmApiKeyInput");
  if (!input) return;
  const key = input.value.trim();
  if (typeof setOpenStreetMapApiKey === "function") {
    setOpenStreetMapApiKey(key);
  }
  if (typeof showToast === "function") {
    showToast(key ? "OpenStreetMap API Key active!" : "Reset to standard OpenStreetMap", "success");
  }
  const badge = document.getElementById("osmBadgeStatus");
  if (badge) {
    badge.textContent = key ? "✓ Key Active" : "OSM Live";
  }

  const params = new URLSearchParams(window.location.search);
  const trackingId = params.get("tracking") || params.get("booking");
  if (trackingId && typeof fetchBookingByIdApi === "function") {
    fetchBookingByIdApi(trackingId).then((b) => {
      const s = (b?.status || "").toLowerCase();
      if (b && s !== "cancelled" && s !== "rejected" && s !== "declined") {
        renderTrackingMapVisuals(b);
      }
    });
  }
}

async function syncOsmServerConfig() {
  try {
    const res = await fetch(`${API}/location/config`);
    if (res.ok) {
      const data = await res.json();
      if (data.osmApiKey && typeof getOpenStreetMapApiKey === "function" && !getOpenStreetMapApiKey()) {
        setOpenStreetMapApiKey(data.osmApiKey);
      }
    }
  } catch (e) {}
}

window.selectGarageOnMap = selectGarageOnMap;
window.bookGarageDirectly = bookGarageDirectly;
window.useMyCurrentLocation = useMyCurrentLocation;
window.initBookingTrackingMap = initBookingTrackingMap;
window.handleSaveOsmKey = handleSaveOsmKey;

document.addEventListener("DOMContentLoaded", () => {
  if (getCurrentPage() === "map.html") {
    syncOsmServerConfig();
    const params = new URLSearchParams(window.location.search);
    const trackingId = params.get("tracking") || params.get("booking");
    if (trackingId) {
      initBookingTrackingMap(trackingId);
    } else {
      loadMap();
    }
  }
});
