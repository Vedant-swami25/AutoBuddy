/**
 * Garage listing, partner requests, and garage booking actions.
 */

function renderGarageCard(garage) {
  const card = document.createElement("article");
  card.className = "list-card";
  card.dataset.tilt3d = "";

  const verificationClass = garage.verified ? "badge" : "badge warning";
  const verificationText = garage.verified ? "Verified" : "Pending";
  const locationText = garage.address || `${garage.lat}, ${garage.lng}`;
  const serviceText = (garage.services || garage.specialties || []).slice(0, 2).join(" · ") || "General repairs";
  const ratingText = `${garage.rating || 4.7} ★`;
  const etaText = garage.etaMinutes ? `~${garage.etaMinutes} min` : "Open today";
  const accentHue = Math.abs((garage.name || "").charCodeAt(0) * 17) % 360;

  card.innerHTML = `
    <div class="garage-card-visual" style="--garage-accent: hsl(${accentHue}, 45%, 42%);">
      <span class="${verificationClass}">${verificationText}</span>
      <span class="garage-rating">${ratingText}</span>
    </div>
    <div class="garage-card-main">
      <h3 class="garage-title">${garage.name}</h3>
      <p class="garage-address">${locationText}</p>
      <div class="list-meta">
        <span class="meta-chip">${garage.hours || "Open today"}</span>
        <span class="meta-chip">${serviceText}</span>
      </div>
    </div>
    <div class="garage-card-action">
      <span class="garage-eta-tag">${etaText}</span>
      <button type="button">Book</button>
    </div>
  `;

  const button = card.querySelector("button");
  button.addEventListener("click", () => {
    bookGarage(garage, button);
  });

  return card;
}

async function loadHomeGaragePreview() {
  const preview = document.getElementById("homeGaragePreview");
  if (!preview) return;

  try {
    const garages = await fetchGarages();
    const items = garages.slice(0, 3);
    preview.innerHTML = "";
    if (!items.length) {
      GARAGE_FALLBACKS.slice(0, 3).forEach((g) => preview.appendChild(renderGarageCard(g)));
      return;
    }
    items.forEach((g) => preview.appendChild(renderGarageCard(g)));
  } catch {
    preview.innerHTML = "";
    GARAGE_FALLBACKS.slice(0, 3).forEach((g) => preview.appendChild(renderGarageCard(g)));
  }
}

window.loadHomeGaragePreview = loadHomeGaragePreview;

async function loadGarages() {
  const list = document.getElementById("garageList");
  if (!list) {
    return;
  }

  setStatus("garageStatus", "Loading verified partner garages...", "neutral");

  try {
    const garages = await fetchGarages();
    list.innerHTML = "";

    if (!garages.length) {
      list.innerHTML = '<div class="empty-state">No workshops currently available in this sector. Partner applications will appear here once approved.</div>';
      setStatus("garageStatus", "No workshops currently listed.", "warning");
      return;
    }

    garages.forEach((garage) => {
      list.appendChild(renderGarageCard(garage));
    });

    setStatus("garageStatus", `${garages.length} verified workshops available nearby.`, "success");
  } catch (error) {
    list.innerHTML = "";
    GARAGE_FALLBACKS.forEach((garage) => {
      list.appendChild(renderGarageCard(garage));
    });
    setStatus("garageStatus", `${GARAGE_FALLBACKS.length} verified workshops loaded.`, "success");
  }
}

async function bookGarage(garage, button) {
  const session = getAuthSession();
  setButtonLoading(button, true, "Book Visit");

  const userCoordinates = await requestCurrentLocationForAction("garageStatus", `${garage.name} visit tracking`);

  try {
    const payload = await createBooking({
      user: {
        name: session?.name || "Driver",
        mobile: session?.mobile || ""
      },
      garageId: garage.id,
      garage: garage.name,
      city: garage.city || "",
      lat: userCoordinates?.lat ?? null,
      lng: userCoordinates?.lng ?? null,
      garageLat: garage.lat,
      garageLng: garage.lng,
      service: "Garage Visit",
      time: new Date()
    });

    setActiveBooking(payload.booking);
    setStatus("garageStatus", `Booking confirmed with ${garage.name}.`, "success");
    showToast(`Booking request sent to ${garage.name}.`, "success");
    window.setTimeout(() => {
      openTrackingForBooking(payload.booking);
    }, 450);
  } catch (error) {
    if (shouldUseLocalBookingFallback(error)) {
      const localBooking = storeBookingLocally({
        id: `BK-${Date.now()}`,
        user: {
          name: session?.name || "Driver",
          mobile: session?.mobile || ""
        },
        service: "Garage Visit",
        garageId: garage.id,
        garage: garage.name,
        city: garage.city || "",
        rating: garage.rating || 4.7,
        travelMinutes: garage.etaMinutes || 28,
        mechanic: garage.mechanic || "AutoBuddy Partner",
        vehicle: garage.vehicle || "Service Van",
        phone: garage.phone || "+91 98765 00000",
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
      return;
    }

    setStatus("garageStatus", `Booking request for ${garage.name} failed. Please try again.`, "error");
    showToast(`Could not book ${garage.name}.`, "error");
  } finally {
    setButtonLoading(button, false, "Book Visit");
  }
}

function bookSelectedGarageFromMap(event) {
  const button = event?.currentTarget || document.getElementById("mapBookButton");
  const garageId = button?.dataset.garageId || sessionStorage.getItem("autobuddyActiveGarageId");
  const garage = getGarageById(garageId);

  if (!garage) {
    setStatus("mapStatus", "Select a garage marker first, then try booking again.", "warning");
    showToast("Select a garage on the map first.", "warning");
    return;
  }

  bookGarage(garage, button);
}

async function addGarage(event) {
  const button = event?.currentTarget;
  const name = document.getElementById("name")?.value.trim();
  const location = document.getElementById("location")?.value.trim();

  if (!name || !location) {
    setStatus("partnerStatus", "Please fill in both the garage name and location.", "error");
    showToast("Please complete all required fields.", "error");
    return;
  }

  setButtonLoading(button, true, "Submit Request");
  setStatus("partnerStatus", "Submitting your garage application...", "neutral");

  try {
    await submitGarageRequest({
      name,
      lat: 0,
      lng: 0,
      verified: false
    });

    setStatus("partnerStatus", `Application submitted for ${name}. Our partner team will verify details shortly.`, "success");
    showToast("Garage partner request submitted.", "success");
    document.getElementById("name").value = "";
    document.getElementById("location").value = "";
  } catch (error) {
    setStatus("partnerStatus", "We could not submit the request right now. Please try again.", "error");
    showToast("Partner request failed.", "error");
  } finally {
    setButtonLoading(button, false, "Submit Request");
  }
}
