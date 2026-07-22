/**
 * Tracking UI helpers: timeline, booking card rendering, and floating launcher.
 * Extracted from tracking.js to reduce file size and responsibilities.
 */

function renderTrackingTimeline(booking) {
  const timeline = document.getElementById("trackingTimeline");
  if (!timeline) {
    return;
  }

  timeline.innerHTML = (booking.timeline || []).map((step, index) => `
    <article class="tracking-step ${step.done ? "done" : ""} ${step.active ? "active" : ""}">
      <span class="tracking-step-dot">${step.done ? "✓" : index + 1}</span>
      <div>
        <strong class="tracking-step-title">${step.label}</strong>
        <p class="tracking-step-note">${step.active ? "Current live status for your visit." : step.done ? "Completed successfully." : "Waiting for this stage."}</p>
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
  meta.textContent = `${booking.city || "Nearby"} • ${booking.service || "Garage Visit"} • Booking ID ${booking.id}`;
  badge.textContent = booking.trackingStatus || "Booking confirmed";
  progressValue.textContent = `${booking.progressPercent || 0}%`;
  progressBar.style.width = `${booking.progressPercent || 0}%`;
  eta.textContent = booking.etaMinutes > 0
    ? `Estimated arrival in ${booking.etaMinutes} minute${booking.etaMinutes === 1 ? "" : "s"}.`
    : "Your service partner has arrived.";
  mechanic.textContent = `${booking.mechanic || "AutoBuddy Partner"} • ${booking.rating || 4.7}★ rated support`;
  vehicle.textContent = booking.vehicle || "Service vehicle details unavailable";
  phone.textContent = booking.phone || "Contact details unavailable";

  renderTrackingTimeline(booking);
  renderTrackingMap(booking).catch(() => {
    setStatus("trackingStatus", "Tracking details loaded, but the live map could not be refreshed right now.", "warning");
  });
}

function renderBookingHistory(bookings, selectedBookingId) {
  const list = document.getElementById("bookingHistoryList");
  if (!list) {
    return;
  }

  if (!bookings.length) {
    list.innerHTML = '<div class="empty-state">No visits booked yet. Book a garage or service visit first to see it here.</div>';
    return;
  }

  list.innerHTML = bookings.map((booking) => {
    const canCancel = booking.status !== "cancelled" && booking.progressPercent < 50;
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
            <span class="badge ${booking.status === "cancelled" ? "error-chip" : booking.progressPercent >= 100 ? "success-chip" : "neutral"}">${booking.status === "cancelled" ? "Cancelled" : booking.trackingStatus || "Booked"}</span>
          </span>
          <span class="booking-history-meta">${booking.service || "Garage Visit"} • ${booking.city || "Nearby"} • ${booking.id}</span>
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
