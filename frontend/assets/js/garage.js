/**
 * Garage listing, partner requests, and garage booking actions.
 */

let loadedGaragesList = [];

function renderGarageCard(garage) {
  const card = document.createElement("article");
  card.className = "list-card";
  card.dataset.tilt3d = "";

  const isVerified = Boolean(garage.verified);
  const verificationClass = isVerified ? "badge success-chip" : "badge warning";
  const verificationText = isVerified ? "Verified Partner" : "Unverified";
  const locationText = garage.address || garage.city || "Pune, Maharashtra";
  const ownerName = garage.mechanic || garage.ownerName || "AutoBuddy Certified Workshop";
  const servicesList = garage.services || garage.specialties || ["General Service", "Diagnostics"];
  const ratingText = `${garage.rating || 4.8} ★`;
  const etaText = garage.etaMinutes ? `~${garage.etaMinutes} min response` : "Open today";
  const accentHue = Math.abs((garage.name || "").charCodeAt(0) * 17) % 360;

  card.innerHTML = `
    <div class="garage-card-visual" style="--garage-accent: hsl(${accentHue}, 45%, 42%);">
      <span class="${verificationClass}">${verificationText}</span>
      <span class="garage-rating">${ratingText}</span>
    </div>
    <div class="garage-card-main">
      <h3 class="garage-title">${garage.name}</h3>
      <p class="garage-address">📍 ${locationText}</p>
      
      <div style="font-size: 0.82rem; color: var(--text-secondary); margin: 6px 0; display: flex; flex-wrap: wrap; gap: 8px;">
        <span>👤 <strong>${ownerName}</strong></span>
      </div>

      <div class="list-meta" style="margin-top: 8px;">
        <span class="meta-chip">🕒 ${garage.hours || "8:00 AM - 9:00 PM"}</span>
        ${servicesList.slice(0, 2).map((s) => `<span class="meta-chip">${s}</span>`).join("")}
      </div>
    </div>
    <div class="garage-card-action">
      <span class="garage-eta-tag">⚡ ${etaText}</span>
      <button type="button" class="primary small book-garage-btn" onclick="handleGarageCardBook('${garage.id}', this)">Book Visit</button>
    </div>
  `;

  return card;
}

function handleGarageCardBook(garageId, button) {
  const garage = loadedGaragesList.find((g) => g.id === garageId) || GARAGE_FALLBACKS.find((g) => g.id === garageId);
  if (!garage) return;
  bookGarage(garage, button);
}

function filterGaragesList(query) {
  const list = document.getElementById("garageList");
  if (!list) return;

  const q = String(query || "").toLowerCase().trim();
  const filtered = q
    ? loadedGaragesList.filter((g) =>
        (g.name && g.name.toLowerCase().includes(q)) ||
        (g.address && g.address.toLowerCase().includes(q)) ||
        (g.city && g.city.toLowerCase().includes(q)) ||
        (g.mechanic && g.mechanic.toLowerCase().includes(q)) ||
        (g.ownerName && g.ownerName.toLowerCase().includes(q)) ||
        (g.services && g.services.some((s) => s.toLowerCase().includes(q)))
      )
    : loadedGaragesList;

  list.innerHTML = "";
  if (!filtered.length) {
    list.innerHTML = '<div class="empty-state">No workshops match your search.</div>';
    return;
  }

  filtered.forEach((garage) => {
    list.appendChild(renderGarageCard(garage));
  });
}

async function loadGarages() {
  const list = document.getElementById("garageList");
  if (!list) {
    return;
  }

  setStatus("garageStatus", "Loading partner garages...", "neutral");

  try {
    const garages = await fetchGarages();
    loadedGaragesList = garages;
    list.innerHTML = "";

    if (!garages.length) {
      list.innerHTML = '<div class="empty-state">No workshops currently available in this sector.</div>';
      setStatus("garageStatus", "No workshops currently listed.", "warning");
      return;
    }

    garages.forEach((garage) => {
      list.appendChild(renderGarageCard(garage));
    });

    // Hook up search bar if present
    const searchInput = document.getElementById("garageSearchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => filterGaragesList(e.target.value));
    }

    const verifiedCount = garages.filter((g) => Boolean(g.verified)).length;
    const unverifiedCount = garages.length - verifiedCount;
    let statusText = `${verifiedCount} Verified Garages`;
    if (unverifiedCount > 0) {
      statusText += ` • ${unverifiedCount} Unverified Garage${unverifiedCount > 1 ? "s" : ""}`;
    }
    setStatus("garageStatus", statusText, "success");
  } catch (error) {
    console.error("Load garages error:", error);
    loadedGaragesList = GARAGE_FALLBACKS;
    list.innerHTML = "";
    GARAGE_FALLBACKS.forEach((garage) => {
      list.appendChild(renderGarageCard(garage));
    });
    const verifiedCount = GARAGE_FALLBACKS.filter((g) => Boolean(g.verified)).length;
    const unverifiedCount = GARAGE_FALLBACKS.length - verifiedCount;
    let statusText = `${verifiedCount} Verified Garages`;
    if (unverifiedCount > 0) {
      statusText += ` • ${unverifiedCount} Unverified Garage${unverifiedCount > 1 ? "s" : ""}`;
    }
    setStatus("garageStatus", statusText, "success");
  }
}

async function bookGarage(garage, button) {
  const session = getAuthSession();
  if (!session) {
    showToast("Please sign in to book a garage visit.", "warning");
    window.location.href = "login.html";
    return;
  }

  if (button) setButtonLoading(button, true, "Book Visit");

  const userCoordinates = await requestCurrentLocationForAction("garageStatus", `${garage.name} visit tracking`);

  try {
    const payload = await createBooking({
      user: {
        id: session?.id || null,
        name: session?.name || "User",
        mobile: session?.mobile || ""
      },
      garageId: garage.id,
      garage: garage.name,
      city: garage.city || "Pune",
      lat: userCoordinates?.lat ?? null,
      lng: userCoordinates?.lng ?? null,
      garageLat: garage.lat,
      garageLng: garage.lng,
      service: "Garage Visit & Inspection",
      price: 300,
      time: new Date()
    });

    setActiveBooking(payload.booking);
    setStatus("garageStatus", `Booking confirmed with ${garage.name}.`, "success");
    showToast(`Booking request sent to ${garage.name}.`, "success");
    window.setTimeout(() => {
      window.location.href = `map.html?tracking=${encodeURIComponent(payload.booking.id)}`;
    }, 450);
  } catch (error) {
    if (shouldUseLocalBookingFallback(error)) {
      const localBooking = storeBookingLocally({
        id: `BK-${Date.now()}`,
        user: {
          name: session?.name || "User",
          mobile: session?.mobile || ""
        },
        service: "Garage Visit & Inspection",
        price: 300,
        garageId: garage.id,
        garage: garage.name,
        city: garage.city || "Pune",
        rating: garage.rating || 4.8,
        travelMinutes: garage.etaMinutes || 20,
        mechanic: garage.mechanic || garage.ownerName || "AutoBuddy Partner",
        vehicle: garage.vehicle || "Service Van",
        phone: garage.supportPhone || (typeof AUTOBUDDY_SUPPORT_PHONE !== "undefined" ? AUTOBUDDY_SUPPORT_PHONE : "+91 1800-889-2889"),
        createdAt: new Date().toISOString(),
        garageLocation: {
          lat: garage.lat || null,
          lng: garage.lng || null
        },
        location: {
          lat: userCoordinates?.lat ?? null,
          lng: userCoordinates?.lng ?? null
        }
      });

      const enrichedBooking = enrichStoredBooking(localBooking);
      setActiveBooking(enrichedBooking);
      setStatus("garageStatus", `Booking confirmed for ${garage.name}.`, "success");
      showToast(`Visit booked for ${garage.name}.`, "success");
      window.setTimeout(() => {
        openTrackingForBooking(enrichedBooking);
      }, 450);
    } else {
      setStatus("garageStatus", "Failed to complete booking: " + error.message, "error");
      showToast("Booking failed: " + error.message, "error");
    }
  } finally {
    if (button) setButtonLoading(button, false, "Book Visit");
  }
}

window.bookGarage = bookGarage;
window.handleGarageCardBook = handleGarageCardBook;
window.filterGaragesList = filterGaragesList;
window.loadGarages = loadGarages;

document.addEventListener("DOMContentLoaded", () => {
  if (getCurrentPage() === "garage.html") {
    loadGarages();
  }
});
