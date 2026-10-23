/**
 * Dashboard and vehicle-specific service-catalog booking actions.
 */

let isBookVanInProgress = false;

const FALLBACK_CATALOG = [
  { id: "srv-001", name: "Exterior Foam Wash", category: "Vehicle Wash & Cleaning", description: "High-pressure exterior wash, wheel arches cleaning, and microfiber dry finish.", price: 300, vehicleType: "both", durationMinutes: 30, popular: true },
  { id: "srv-002", name: "Interior Vacuum & Wipe", category: "Vehicle Wash & Cleaning", description: "Cabin vacuuming, dashboard UV wipe, seat cleaning, and floor mat wash.", price: 400, vehicleType: "car", durationMinutes: 45, popular: false },
  { id: "srv-003", name: "Full Inside-Out Wash", category: "Vehicle Wash & Cleaning", description: "Complete exterior foam detailing plus complete interior vacuum and sanitize.", price: 700, vehicleType: "car", durationMinutes: 60, popular: true },
  { id: "srv-004", name: "Bike Foam Wash & Chain Care", category: "Vehicle Wash & Cleaning", description: "Pressure wash, degreasing, microfiber dry, chain degrease and high-adhesion lubrication.", price: 250, vehicleType: "bike", durationMinutes: 35, popular: true },
  { id: "srv-005", name: "Hydrophobic Wax Polish", category: "Detailing & Paint Care", description: "Multi-stage carnauba wax application for paint gloss and water repellency.", price: 1200, vehicleType: "both", durationMinutes: 60, popular: false },
  { id: "srv-006", name: "Interior Deep Upholstery Cleaning", category: "Detailing & Paint Care", description: "Deep steam extraction for seats, roof lining, and fabric shampooing.", price: 1500, vehicleType: "car", durationMinutes: 90, popular: false },
  { id: "srv-007", name: "Full Showroom Detailing", category: "Detailing & Paint Care", description: "Engine bay dress, machine polish, 6-month sealant, and complete interior overhaul.", price: 2500, vehicleType: "car", durationMinutes: 120, popular: true },
  { id: "srv-008", name: "Engine Oil & Filter Service", category: "Essential Maintenance", description: "Synthetic/semi-synthetic engine oil replacement with new oil filter install.", price: 1200, vehicleType: "both", durationMinutes: 45, popular: true },
  { id: "srv-009", name: "Brake Inspection & Adjustment", category: "Essential Maintenance", description: "Brake pad caliper inspection, rotor wear check, and handbrake tuning.", price: 500, vehicleType: "both", durationMinutes: 40, popular: false },
  { id: "srv-010", name: "Battery Health Analysis", category: "Essential Maintenance", description: "Load testing, terminal cleaning, and charging alternator check.", price: 200, vehicleType: "both", durationMinutes: 20, popular: false },
  { id: "srv-011", name: "AC Refrigerant Top-Up", category: "Essential Maintenance", description: "AC system leak test, compressor lubrication, and refrigerant gas refill.", price: 1500, vehicleType: "car", durationMinutes: 45, popular: false },
  { id: "srv-012", name: "Cooling & Radiator Flush", category: "Essential Maintenance", description: "Full cooling system flush, pressure leak test, and premium anti-freeze refill.", price: 850, vehicleType: "car", durationMinutes: 50, popular: false },
  { id: "srv-013", name: "Suspension & Struts Inspection", category: "Essential Maintenance", description: "Shock absorber check, bushing wear inspection, and steering alignment.", price: 1100, vehicleType: "both", durationMinutes: 55, popular: false },
  { id: "srv-014", name: "Exhaust & Emissions Diagnostic", category: "Essential Maintenance", description: "Catalytic converter scan, muffler inspection, and oxygen sensor test.", price: 750, vehicleType: "both", durationMinutes: 35, popular: false },
  { id: "srv-015", name: "LED Lighting & Circuit Test", category: "Essential Maintenance", description: "High-beam alignment, fuse box diagnostic, and wiring harness check.", price: 450, vehicleType: "both", durationMinutes: 30, popular: false },
  { id: "srv-016", name: "Bike Chain Clean & Lube", category: "Essential Maintenance", description: "Heavy-duty chain degreasing, O-ring inspection, and high-tack synthetic lubrication.", price: 200, vehicleType: "bike", durationMinutes: 25, popular: true },
  { id: "srv-017", name: "Bike Carburetor & Fuel Injector Service", category: "Essential Maintenance", description: "Ultrasonic nozzle cleaning, air-fuel mixture tuning, and idle speed calibration.", price: 450, vehicleType: "bike", durationMinutes: 45, popular: false },
  { id: "srv-018", name: "Bike Fork Oil & Seal Replacement", category: "Essential Maintenance", description: "Front fork disassembly, fresh hydraulic damping oil refill, and new dust seals.", price: 600, vehicleType: "bike", durationMinutes: 60, popular: false },
  { id: "srv-019", name: "Breakdown On-Site Response", category: "Emergency Assistance", description: "Priority mechanical dispatch for sudden vehicle immobilization or starting failure.", price: 1000, vehicleType: "both", durationMinutes: 20, popular: true },
  { id: "srv-020", name: "Emergency Battery Jumpstart", category: "Emergency Assistance", description: "Heavy-duty booster pack jumpstart service on-location within minutes.", price: 500, vehicleType: "both", durationMinutes: 15, popular: true },
  { id: "srv-021", name: "Flat Tire / Puncture Repair", category: "Emergency Assistance", description: "Rapid tubeless puncture sealing, air inflation, or spare wheel swap.", price: 150, vehicleType: "both", durationMinutes: 20, popular: true }
];

async function bookService(event) {
  if (isBookVanInProgress) return;

  const button = event?.currentTarget || event?.target;
  const session = getAuthSession();

  if (!session) {
    showToast("Please sign in to book a service van.", "warning");
    window.location.href = "login.html";
    return;
  }

  const currentVehicle = typeof getVehicleMode === "function" ? getVehicleMode() : "car";

  isBookVanInProgress = true;
  setButtonLoading(button, true, `Locating nearest ${currentVehicle} van...`);
  setStatus("homeStatus", `Locating nearest verified partner workshop for your ${currentVehicle}...`, "neutral");
  showToast(`Locating nearest verified ${currentVehicle} van...`, "neutral");

  try {
    const userCoordinates = await requestCurrentLocationForAction("homeStatus", `${currentVehicle} van dispatch`);

    if (!userCoordinates || !userCoordinates.lat || !userCoordinates.lng) {
      setStatus("homeStatus", "Location is required to find and dispatch the nearest verified mobile van.", "warning");
      showToast("Location required to dispatch nearest van.", "warning");
      return;
    }

    setStatus("homeStatus", "Nearest verified workshop identified. Confirming dispatch...", "neutral");

    const vanPrice = currentVehicle === "bike" ? 500 : 1000;
    const payload = await createBooking({
      user: {
        id: session?.id || null,
        name: session?.name || "User",
        mobile: session?.mobile || ""
      },
      service: "Book Van",
      price: vanPrice,
      vehicleType: currentVehicle,
      vehicleInfo: currentVehicle === "bike" ? "Two-Wheeler Rapid Support Van" : "AutoBuddy Emergency Service Van",
      lat: userCoordinates.lat,
      lng: userCoordinates.lng,
      time: new Date()
    });

    const booking = payload.booking;
    setActiveBooking(booking);

    const garageName = booking.garage || "AutoBuddy Verified Partner";
    const etaText = booking.travelMinutes ? `~${booking.travelMinutes} mins ETA` : "Dispatch confirmed";

    setStatus("homeStatus", `Mobile van dispatched from ${garageName} (${etaText}).`, "success");
    showToast(`Van dispatched from ${garageName}!`, "success");

    window.setTimeout(() => {
      openTrackingForBooking(booking);
    }, 450);
  } catch (error) {
    console.error("Book van error:", error);
    setStatus("homeStatus", error.message || "Failed to book mobile van. Please try again.", "error");
    showToast(error.message || "Failed to book mobile van.", "error");
  } finally {
    isBookVanInProgress = false;
    setButtonLoading(button, false, "Book Van");
  }
}

async function bookPricedService(serviceName, price, button) {
  const session = getAuthSession();
  if (!session) {
    showToast("Please sign in to book this service.", "warning");
    window.location.href = "login.html";
    return;
  }

  const currentVehicle = typeof getVehicleMode === "function" ? getVehicleMode() : "car";

  setButtonLoading(button, true, "Book Now");
  setStatus("servicesStatus", `Booking ${serviceName} for your ${currentVehicle}...`, "neutral");

  const userCoordinates = await requestCurrentLocationForAction("servicesStatus", `${serviceName} tracking`);

  try {
    const payload = await createBooking({
      user: {
        id: session?.id || null,
        name: session?.name || "User",
        mobile: session?.mobile || ""
      },
      service: serviceName,
      price,
      vehicleType: currentVehicle,
      lat: userCoordinates?.lat ?? null,
      lng: userCoordinates?.lng ?? null,
      time: new Date()
    });

    const booking = payload.booking || payload;
    setActiveBooking(booking);
    setStatus("servicesStatus", `${serviceName} booked successfully for ₹${price}.`, "success");
    showToast(`${serviceName} booked for ₹${price}.`, "success");
    window.setTimeout(() => {
      openTrackingForBooking(booking);
    }, 450);
  } catch (error) {
    console.error("Booking error:", error);
    setStatus("servicesStatus", error.message || `Could not book ${serviceName}. Please try again.`, "error");
    showToast(error.message || `Could not book ${serviceName}.`, "error");
  } finally {
    setButtonLoading(button, false, "Book Now");
  }
}

/**
 * Dynamically renders the services stack on services.html according to current vehicle mode (car vs bike).
 */
async function renderVehicleServicesCatalog(vehicleMode = "car") {
  const container = document.querySelector(".services-stack");
  if (!container) return;

  const mode = vehicleMode === "bike" ? "bike" : "car";

  let services = [];
  try {
    const res = await fetch(`/api/services?vehicle=${mode}`);
    if (res.ok) {
      services = await res.json();
    }
  } catch (e) {
    // Fallback
  }

  if (!services || services.length === 0) {
    services = FALLBACK_CATALOG.filter((s) => s.vehicleType === mode || s.vehicleType === "both");
  }

  // Update page title/subtitle indicator
  const pageTitle = document.querySelector(".page-title");
  const sectionSubtitle = document.querySelector(".section-subtitle");
  if (pageTitle) {
    pageTitle.textContent = `${mode === "bike" ? "Two-Wheeler & Bike" : "Four-Wheeler & Car"} Service Pricing`;
  }
  if (sectionSubtitle) {
    sectionSubtitle.textContent = `Showing verified ${mode} maintenance, detailing, and emergency support packages.`;
  }

  // Group services by category
  const categories = {};
  services.forEach((s) => {
    const cat = s.category || "General Services";
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(s);
  });

  const groupKeys = Object.keys(categories);
  let groupHtml = "";

  groupKeys.forEach((catName, idx) => {
    const catServices = categories[catName];
    const isEmergency = catName.toLowerCase().includes("emergency");
    const groupIcon = String(idx + 1).padStart(2, "0");

    const cardsHtml = catServices
      .map((s) => {
        const btnClass = isEmergency ? 'class="warning"' : "";
        const btnText = isEmergency ? "Dispatch Now" : "Book Now";
        const vehicleBadge = s.vehicleType === "both" ? "⚡ Car & Bike" : (s.vehicleType === "bike" ? "🏍️ Bike Only" : "🚗 Car Only");

        return `
          <article class="service-card" data-vehicle="${s.vehicleType}">
            <div>
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
                <strong class="card-title">${s.name}</strong>
                <span class="badge ${s.vehicleType === "both" ? "neutral" : "success-chip"}" style="font-size: 0.70rem; padding: 2px 6px;">${vehicleBadge}</span>
              </div>
              <p>${s.description}</p>
            </div>
            <div class="service-card-footer">
              <span class="service-price">₹${s.price.toLocaleString("en-IN")}</span>
              <button ${btnClass} type="button" onclick="bookPricedService('${s.name.replace(/'/g, "\\'")}', ${s.price}, this)">${btnText}</button>
            </div>
          </article>
        `;
      })
      .join("");

    groupHtml += `
      <section class="services-group ${isEmergency ? "services-group-emergency" : ""}">
        <div class="services-group-head">
          <span class="services-group-icon">${groupIcon}</span>
          <div>
            <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary);">${catName}</h2>
            <p style="font-size: 0.86rem; color: var(--text-secondary);">${catServices.length} verified packages available.</p>
          </div>
        </div>
        <div class="services-grid">
          ${cardsHtml}
        </div>
      </section>
    `;
  });

  container.innerHTML = groupHtml;
}

function emergency(event) {
  const button = event?.currentTarget;
  setButtonLoading(button, true, "Emergency Help");
  setStatus("homeStatus", "Emergency mode activated. Prioritizing nearby help now.", "warning");
  showToast("Emergency mode activated.", "warning");
  getLocation({ currentTarget: button });
}

function goToMap(event) {
  const button = event?.currentTarget;
  setButtonLoading(button, true, "View on Map");
  showToast("Opening the live map...", "success");
  getLocation({ currentTarget: button });
}

// Initial binding
document.addEventListener("DOMContentLoaded", () => {
  const currentMode = typeof getVehicleMode === "function" ? getVehicleMode() : "car";
  if (document.querySelector(".services-stack")) {
    renderVehicleServicesCatalog(currentMode);
  }
});

// React to vehicle mode changes
window.addEventListener("vehicleModeChanged", (e) => {
  const mode = e.detail?.mode || "car";
  if (document.querySelector(".services-stack")) {
    renderVehicleServicesCatalog(mode);
  }
});


