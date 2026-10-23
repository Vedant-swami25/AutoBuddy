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

    // Ensure active booking is synced for floating tracker launcher
    if (currentUserBookings.length) {
      const active = currentUserBookings.find((b) => {
        const s = (b.status || "").toLowerCase();
        return s === "pending" || s === "accepted" || s === "in_progress";
      });
      if (active && (!getActiveBooking() || getActiveBooking()?.status === "completed")) {
        setActiveBooking(active);
      }
    }

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
  if (currentBookingsFilter === "pending_cancelled") {
    filtered = currentUserBookings.filter((b) => {
      const s = (b.status || "pending").toLowerCase();
      return s === "pending" || s === "cancelled" || s === "rejected";
    });
  } else if (currentBookingsFilter === "completed") {
    filtered = currentUserBookings.filter((b) => (b.status || "").toLowerCase() === "completed");
  } else {
    filtered = currentUserBookings;
  }

  if (!filtered.length) {
    let emptyMsg = "You have not made any service appointments or workshop bookings yet.";
    if (currentBookingsFilter === "pending_cancelled") {
      emptyMsg = "No pending or cancelled bookings found.";
    } else if (currentBookingsFilter === "completed") {
      emptyMsg = "No completed bookings found.";
    }

    container.innerHTML = `
      <div class="empty-state" style="padding: 48px 20px; text-align: center;">
        <div style="font-size: 2.2rem; margin-bottom: 12px;">📅</div>
        <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 6px; color: var(--text-primary);">No bookings found.</h3>
        <p style="font-size: 0.86rem; color: var(--text-secondary); max-width: 400px; margin: 0 auto 20px;">
          ${emptyMsg}
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
      status === "pending" ? "Booking Confirmed" :
      status === "accepted" ? "Service Partner Assigned" :
      status === "in_progress" ? "Service In Progress" :
      status === "completed" ? "Completed" :
      (status === "rejected" || status === "declined") ? "Declined by Workshop" : "Cancelled";

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
    const garagePhone = booking.phone || "+91 1800-889-2889";
    const supportPhone = booking.supportPhone || (typeof AUTOBUDDY_SUPPORT_PHONE !== "undefined" ? AUTOBUDDY_SUPPORT_PHONE : "+91 1800-889-2889");

    const canCancel = status === "pending" || status === "accepted";
    const isInProgress = status === "in_progress";
    let cancelAction = "";
    if (canCancel) {
      cancelAction = `<button type="button" class="secondary small cancel-booking-btn" style="border-color: rgba(239, 68, 68, 0.5); color: #f87171;" onclick="handleCancelUserBooking('${booking.id}')">Cancel Booking</button>`;
    } else if (isInProgress) {
      cancelAction = `<button type="button" class="secondary small disabled" style="opacity: 0.5; cursor: not-allowed;" title="Service is already in progress and cannot be cancelled." onclick="showToast('Service is already in progress and cannot be cancelled.', 'error')">Cancel Disabled</button>`;
    }

    const contactAction = (status === "accepted" || status === "in_progress")
      ? `<span class="map-garage-phone" style="font-size: 0.84rem; font-weight: 600; color: var(--accent-primary);">📞 Helpline: ${supportPhone}</span>`
      : "";

    const isCancelledOrInactive = status === "cancelled" || status === "rejected" || status === "declined";
    let trackAction = "";
    if (!isCancelledOrInactive) {
      if (status === "completed") {
        trackAction = `<button type="button" class="primary small track-booking-btn" onclick="openTrackingForBooking('${booking.id}')">🗺️ View Route & Details</button>`;
      } else if (status === "accepted" || status === "in_progress" || status === "pending") {
        trackAction = `<button type="button" class="primary small track-booking-btn" onclick="openTrackingForBooking('${booking.id}')">📍 Track Booking</button>`;
      }
    }

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

        ${(contactAction || cancelAction || trackAction) ? `
          <div class="user-booking-actions" style="display: flex; gap: 10px; align-items: center; justify-content: flex-end; flex-wrap: wrap; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border-subtle);">
            ${contactAction}
            ${cancelAction}
            ${trackAction}
          </div>
        ` : ""}
      </article>
    `;
  }).join("");
}

async function handleCancelUserBooking(bookingId) {
  const found = currentUserBookings.find((b) => b.id === bookingId);
  if (found && found.status === "in_progress") {
    showToast("Service is already in progress and cannot be cancelled.", "error");
    return;
  }

  if (!confirm("Are you sure you want to cancel this booking?")) {
    return;
  }

  try {
    await cancelBookingRequest(bookingId);
    showToast("Booking cancelled successfully", "success");

    if (found) {
      found.status = "cancelled";
    }

    // Clean active booking state and remove floating tracker launcher
    if (typeof getActiveBooking === "function") {
      const active = getActiveBooking();
      if (active && (active.id === bookingId || active._id === bookingId)) {
        if (typeof clearActiveBooking === "function") {
          clearActiveBooking();
        } else if (typeof setActiveBooking === "function") {
          setActiveBooking(null);
        }
      }
    }
    const launcher = document.getElementById("floatingTrackerLauncher");
    if (launcher) launcher.remove();

    renderUserBookingsFeed();
  } catch (error) {
    console.error("Cancel booking error:", error);
    showToast("Failed to cancel: " + error.message, "error");
  }
}

let userBookingsPollInterval = null;

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

  if (userBookingsPollInterval) clearInterval(userBookingsPollInterval);
  userBookingsPollInterval = setInterval(loadTrackingBookings, 8000);
}

window.loadTrackingBookings = loadTrackingBookings;
window.handleCancelUserBooking = handleCancelUserBooking;

document.addEventListener("DOMContentLoaded", () => {
  if (getCurrentPage() === "tracking.html") {
    initBookingsPage();
  }
});
