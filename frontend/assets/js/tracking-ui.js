/**
 * Tracking UI helpers: timeline, booking card rendering, standby mode, and floating launcher.
 */

function renderTrackingTimeline(booking) {
  const timeline = document.getElementById("trackingTimeline");
  if (!timeline) {
    return;
  }

  const steps = booking?.timeline || [
    { label: "Request Received", done: false, active: true },
    { label: "Technician Dispatched", done: false, active: false },
    { label: "En Route & Live Navigation", done: false, active: false },
    { label: "On-Site Arrival & Service", done: false, active: false }
  ];

  timeline.innerHTML = steps.map((step, index) => `
    <article class="tracking-step ${step.done ? "done" : ""} ${step.active ? "active" : ""}">
      <span class="tracking-step-dot">${step.done ? "✓" : index + 1}</span>
      <div>
        <strong class="tracking-step-title">${step.label}</strong>
        <p class="tracking-step-note">${step.active ? "Current status for your dispatch." : step.done ? "Completed successfully." : "Scheduled next step."}</p>
      </div>
    </article>
  `).join("");
}

function renderTrackingBooking(booking) {
  if (!booking) {
    return;
  }

  const garageName = document.getElementById("trackingGarageName");
  const meta = document.getElementById("trackingMeta");
  const badge = document.getElementById("trackingBadge");
  const progressValue = document.getElementById("trackingProgressValue");
  const progressBar = document.getElementById("trackingProgressBar");
  const eta = document.getElementById("trackingEta");
  const mechanic = document.getElementById("trackingMechanic");
  const vehicle = document.getElementById("trackingVehicle");
  const phone = document.getElementById("trackingPhone");

  if (!garageName || !meta || !badge || !progressValue || !progressBar || !eta || !mechanic || !vehicle || !phone) {
    return;
  }

  garageName.textContent = booking.garage || "AutoBuddy Service";
  meta.textContent = `${booking.city || "Pune"} • ${booking.service || "Garage Visit"} • Booking ID ${booking.id}`;

  const status = booking.status || "pending";
  if (status === "accepted") {
    badge.textContent = "Accepted by Workshop";
    badge.className = "badge success-chip";
  } else if (status === "in_progress") {
    badge.textContent = "In Progress • Active Service";
    badge.className = "badge neutral";
  } else if (status === "completed") {
    badge.textContent = "Service Completed";
    badge.className = "badge success-chip";
  } else if (status === "rejected") {
    badge.textContent = "Declined by Workshop";
    badge.className = "badge error-chip";
  } else {
    badge.textContent = "Awaiting Workshop Confirmation";
    badge.className = "badge warning";
  }

  progressValue.textContent = `${booking.progressPercent || 0}%`;
  progressBar.style.width = `${booking.progressPercent || 0}%`;
  eta.textContent = booking.etaMinutes > 0
    ? `Estimated arrival in ${booking.etaMinutes} minute${booking.etaMinutes === 1 ? "" : "s"}.`
    : "Your service partner has arrived on site.";
  mechanic.textContent = `${booking.mechanic || "AutoBuddy Partner"} • ${booking.rating || 4.8}★ rated technician`;
  vehicle.textContent = booking.vehicle || "AutoBuddy Service Van";
  phone.textContent = booking.phone || "+91 98220 11000";

  renderTrackingTimeline(booking);
  renderTrackingMap(booking).catch(() => {
    setStatus("trackingStatus", "Tracking details loaded, but the live map could not be refreshed right now.", "warning");
  });
}

function renderStandbyTrackingState() {
  const garageName = document.getElementById("trackingGarageName");
  const meta = document.getElementById("trackingMeta");
  const badge = document.getElementById("trackingBadge");
  const progressValue = document.getElementById("trackingProgressValue");
  const progressBar = document.getElementById("trackingProgressBar");
  const eta = document.getElementById("trackingEta");
  const mechanic = document.getElementById("trackingMechanic");
  const vehicle = document.getElementById("trackingVehicle");
  const phone = document.getElementById("trackingPhone");

  if (garageName) garageName.textContent = "AutoBuddy Mobility Dispatch (Standby)";
  if (meta) meta.textContent = "Pune Regional Network • Live GPS Standby • No Active Dispatch";
  if (badge) {
    badge.textContent = "Standby Preview";
    badge.className = "badge neutral";
  }
  if (progressValue) progressValue.textContent = "0%";
  if (progressBar) progressBar.style.width = "0%";
  if (eta) eta.textContent = "Ready for dispatch • Average response time: ~15 mins";
  if (mechanic) mechanic.textContent = "Certified Technician (Assigned upon request)";
  if (vehicle) vehicle.textContent = "Equipped Mobile Service Van • 24/7 Coverage";
  if (phone) phone.textContent = "+91 98220 11000 (Dispatch Helpline)";

  setStatus("trackingStatus", "No active dispatch in progress. Explore the live route tracker below or book a workshop to start live tracking.", "neutral");

  renderTrackingTimeline({
    timeline: [
      { label: "Standby / Ready for Request", done: false, active: true },
      { label: "Technician Dispatched", done: false, active: false },
      { label: "En Route & Live Navigation", done: false, active: false },
      { label: "On-Site Arrival & Service", done: false, active: false }
    ]
  });

  // Render standby demo route on map
  const demoBooking = {
    vehicle: "AutoBuddy Service Van (Standby)",
    trackingStatus: "Ready for dispatch",
    progressPercent: 35,
    route: {
      origin: { lat: 18.5308, lng: 73.8475 }, // Shivajinagar Hub
      destination: { lat: 18.5074, lng: 73.8077 }, // Kothrud / User area
      vanPosition: { lat: 18.522, lng: 73.832 }
    }
  };

  renderTrackingMap(demoBooking).catch(() => {});
}

function renderBookingHistory(bookings, selectedBookingId) {
  const list = document.getElementById("bookingHistoryList");
  if (!list) {
    return;
  }

  if (!bookings || !bookings.length) {
    list.innerHTML = '<div class="empty-state">No visits booked yet. Book a garage or mobile service to track live dispatch here.</div>';
    return;
  }

  list.innerHTML = bookings.map((booking) => {
    const status = (booking.status || "pending").toLowerCase();
    const statusBadgeClass =
      status === "pending" ? "warning" :
      status === "accepted" ? "success-chip" :
      status === "in_progress" ? "neutral" :
      status === "completed" ? "success-chip" : "error-chip";

    const statusLabel =
      status === "pending" ? "Pending" :
      status === "accepted" ? "Accepted" :
      status === "in_progress" ? "In Progress" :
      status === "completed" ? "Completed" :
      status === "rejected" ? "Rejected" : "Cancelled";

    const canCancel = status === "pending" || (status === "accepted" && (booking.progressPercent || 0) < 30);
    const cancelButton = canCancel ? `<button type="button" class="secondary small" onclick="cancelBooking('${booking.id}', event)">Cancel</button>` : "";

    return `
      <div class="booking-history-card ${booking.id === selectedBookingId ? "active" : ""}">
        <button
          type="button"
          class="booking-history-card-content"
          onclick="openBookingFromHistory('${booking.id}')"
        >
          <span class="booking-history-top">
            <strong>${booking.garage || booking.service || "AutoBuddy Visit"}</strong>
            <span class="badge ${statusBadgeClass}">${statusLabel}</span>
          </span>
          <span class="booking-history-meta">${booking.service || "Garage Visit"} • ${booking.city || "Pune"} • ID: ${booking.id}</span>
          <span class="booking-history-meta">ETA ${booking.etaMinutes || 0} min • ${new Date(booking.createdAt || Date.now()).toLocaleString()}</span>
        </button>
        ${cancelButton}
      </div>
    `;
  }).join("");
}

function renderFloatingTrackerLauncher() {
  const activeBooking = getActiveBooking();
  if (!isPendingBooking(activeBooking) || document.body.dataset.publicPage === "true") {
    const existingLauncher = document.getElementById("floatingTrackerLauncher");
    if (existingLauncher) {
      existingLauncher.remove();
    }
    return;
  }

  let launcher = document.getElementById("floatingTrackerLauncher");
  if (!launcher) {
    launcher = document.createElement("button");
    launcher.type = "button";
    launcher.id = "floatingTrackerLauncher";
    launcher.className = "floating-tracker";
    launcher.addEventListener("click", () => {
      const targetBooking = getActiveBooking();
      if (!targetBooking || !isPendingBooking(targetBooking)) {
        return;
      }
      openTrackingForBooking(targetBooking);
    });
    document.body.appendChild(launcher);
  }

  launcher.innerHTML = `
    <span class="floating-tracker-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 14.5a1 1 0 0 1-2 0V11h-3a1 1 0 0 1 0-2h4a1 1 0 0 1 1 1Zm0-8.25a1.25 1.25 0 1 1-1.25 1.25A1.25 1.25 0 0 1 13 8.25Z" />
      </svg>
    </span>
    <span class="floating-tracker-copy">
      <strong>Live Tracking</strong>
      <small>${activeBooking.trackingStatus || "Booking confirmed"} • ${activeBooking.garage || activeBooking.service || "AutoBuddy"}</small>
    </span>
  `;
}
