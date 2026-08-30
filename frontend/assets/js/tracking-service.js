/**
 * AutoBuddy My Bookings Controller
 * Strictly loads and displays the authenticated user's real booking history from MongoDB.
 */

let currentUserBookings = [];
let currentBookingsFilter = "all";

async function fetchBookingsForCurrentUser() {
  const session = getAuthSession();
  if (!session || (!session.id && !session.mobile)) {
    return [];
  }

  try {
    const remoteBookings = await fetchUserBookings(session);
    if (Array.isArray(remoteBookings)) {
      return remoteBookings;
    }
    return [];
  } catch (error) {
    console.error("Error fetching user bookings from backend:", error);
    return [];
  }
}

async function loadTrackingBookings() {
  const container = document.getElementById("bookingHistoryList");
  if (!container) return;

  const session = getAuthSession();
  if (!session || (!session.id && !session.mobile)) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 48px 20px; text-align: center;">
        <div style="font-size: 2.2rem; margin-bottom: 12px;">🔒</div>
        <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 6px; color: var(--text-primary);">Sign In to View Your Bookings</h3>
        <p style="font-size: 0.86rem; color: var(--text-secondary); max-width: 420px; margin: 0 auto 20px;">
          Your service appointments and roadside requests are saved under your account.
        </p>
        <button type="button" onclick="window.location.href='login.html?redirect=tracking.html'">Sign In with Mobile OTP →</button>
      </div>
    `;
    return;
  }

  try {
    const bookings = await fetchBookingsForCurrentUser();
    currentUserBookings = bookings || [];
    renderUserBookingsFeed();
  } catch (error) {
    console.error("Error loading user bookings:", error);
    currentUserBookings = [];
    renderUserBookingsFeed();
  }
}

function renderUserBookingsFeed() {
  const container = document.getElementById("bookingHistoryList");
  if (!container) return;

  let filtered = currentUserBookings;
  if (currentBookingsFilter === "pending") {
    filtered = currentUserBookings.filter((b) => (b.status || "pending").toLowerCase() === "pending");
  } else if (currentBookingsFilter === "active") {
    filtered = currentUserBookings.filter((b) => {
      const s = (b.status || "").toLowerCase();
      return s === "accepted" || s === "in_progress";
    });
  } else if (currentBookingsFilter === "completed") {
    filtered = currentUserBookings.filter((b) => (b.status || "").toLowerCase() === "completed");
  } else if (currentBookingsFilter === "declined") {
    filtered = currentUserBookings.filter((b) => {
      const s = (b.status || "").toLowerCase();
      return s === "rejected" || s === "cancelled";
    });
  }

  if (!filtered.length) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 48px 20px; text-align: center;">
        <div style="font-size: 2.2rem; margin-bottom: 12px;">📅</div>
        <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 6px; color: var(--text-primary);">No bookings yet.</h3>
        <p style="font-size: 0.86rem; color: var(--text-secondary); max-width: 400px; margin: 0 auto 20px;">
          ${currentBookingsFilter === "all"
            ? "You have not made any service appointments or workshop bookings yet."
            : "No bookings found matching this filter."}
        </p>
        <button type="button" class="secondary" onclick="window.location.href='garage.html'">Browse Garages Directory →</button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map((booking) => {
    const status = (booking.status || "pending").toLowerCase();
    const statusBadgeClass =
      status === "pending" ? "warning" :
      status === "accepted" ? "success-chip" :
      status === "in_progress" ? "neutral" :
      status === "completed" ? "success-chip" : "error-chip";

    const statusLabel =
      status === "pending" ? "Pending Confirmation" :
      status === "accepted" ? "Accepted by Garage" :
      status === "in_progress" ? "In Progress" :
      status === "completed" ? "Service Completed" :
      status === "rejected" ? "Declined by Workshop" : "Cancelled";

    const priceText = booking.price ? `₹${booking.price}` : "Estimate on inspection";
    const dateFormatted = new Date(booking.createdAt || Date.now()).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    const garageName = booking.garage || "AutoBuddy Service Partner";
    const serviceName = booking.service || "General Workshop Service";
    const location = booking.city || "Pune, Maharashtra";
    const supportPhone = booking.supportPhone || (typeof AUTOBUDDY_SUPPORT_PHONE !== "undefined" ? AUTOBUDDY_SUPPORT_PHONE : "+91 1800-889-2889");

    const canCancel = status === "pending";
    const cancelAction = canCancel
      ? `<button type="button" class="secondary small" onclick="handleCancelUserBooking('${booking.id}')">Cancel Booking</button>`
      : "";

    const contactAction = (status === "accepted" || status === "in_progress")
      ? `<span class="map-garage-phone" style="font-size: 0.84rem; font-weight: 600; color: var(--accent-primary);">📞 AutoBuddy Helpline: ${supportPhone}</span>`
      : "";

    return `
      <article class="user-booking-card status-${status}">
        <div class="user-booking-header">
          <div>
            <h3 class="user-booking-title">${serviceName}</h3>
            <span class="user-booking-id">Booking ID: ${booking.id}</span>
          </div>
          <div class="user-booking-header-right">
            <div class="user-booking-price">${priceText}</div>
            <span class="badge ${statusBadgeClass}">${statusLabel}</span>
          </div>
        </div>

        <div class="user-booking-details-grid">
          <div class="user-booking-item">
            <strong>Workshop / Garage</strong>
            <span>${garageName}</span>
          </div>
          <div class="user-booking-item">
            <strong>Date &amp; Time</strong>
            <span>${dateFormatted}</span>
          </div>
          <div class="user-booking-item">
            <strong>Location</strong>
            <span>📍 ${location}</span>
          </div>
          <div class="user-booking-item">
            <strong>Workshop Contact</strong>
            <a href="tel:${garagePhone}">📞 ${garagePhone}</a>
          </div>
        </div>

        ${booking.ownerNote ? `
          <div class="user-booking-note">
            <span>💬</span>
            <div><strong>Workshop Note:</strong> ${booking.ownerNote}</div>
          </div>
        ` : ""}

        ${(cancelAction || contactAction) ? `
          <div class="user-booking-actions">
            ${contactAction}
            ${cancelAction}
          </div>
        ` : ""}
      </article>
    `;
  }).join("");
}

async function handleCancelUserBooking(bookingId) {
  if (!confirm("Are you sure you want to cancel this booking?")) {
    return;
  }

  try {
    await cancelBookingRequest(bookingId);
    showToast("Booking cancelled successfully", "success");

    const found = currentUserBookings.find((b) => b.id === bookingId);
    if (found) {
      found.status = "cancelled";
    }
    renderUserBookingsFeed();
  } catch (error) {
    console.error("Cancel booking error:", error);
    showToast("Failed to cancel: " + error.message, "error");
  }
}

// Setup filter tabs
function initBookingsPage() {
  document.querySelectorAll(".bookings-tab-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".bookings-tab-btn").forEach((b) => b.classList.remove("active"));
      e.currentTarget.classList.add("active");
      currentBookingsFilter = e.currentTarget.dataset.filter || "all";
      renderUserBookingsFeed();
    });
  });

  loadTrackingBookings();
}

window.loadTrackingBookings = loadTrackingBookings;
window.handleCancelUserBooking = handleCancelUserBooking;

document.addEventListener("DOMContentLoaded", () => {
  if (getCurrentPage() === "tracking.html") {
    initBookingsPage();
  }
});
