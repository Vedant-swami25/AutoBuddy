/**
 * AutoBuddy Garage Owner Dashboard Controller
 * Real-time booking management, dispatch acceptance, and status workflows.
 */

let currentOwnerBookings = [];
let currentOwnerFilter = "all";
let ownerPollInterval = null;

async function initOwnerDashboard() {
  const session = getAuthSession();
  if (!session || session.role !== "garage_owner") {
    return;
  }

  // Populate header info
  const garageNameEl = document.getElementById("ownerGarageName");
  const ownerNameEl = document.getElementById("ownerName");
  const garageAddressEl = document.getElementById("ownerGarageAddress");
  const garageAvatarEl = document.getElementById("ownerGarageAvatar");

  const garageName = session.garageName || session.name + "'s Workshop";
  if (garageNameEl) garageNameEl.textContent = garageName;
  if (ownerNameEl) ownerNameEl.textContent = `Owner: ${session.name} • ${session.mobile}`;
  if (garageAddressEl) garageAddressEl.textContent = session.district || session.address || "Pune, Maharashtra";
  if (garageAvatarEl) garageAvatarEl.textContent = (garageName[0] || "W").toUpperCase();

  // Admin Impersonation Return: Show "Back to Admin Dashboard" option ONLY when entered through Admin -> Sign In as Owner
  const adminReturnSessionRaw = sessionStorage.getItem("autobuddy_admin_return_session");
  const actionsContainer = document.querySelector(".owner-topbar-actions");
  if (adminReturnSessionRaw && session.fromAdminImpersonation && actionsContainer) {
    let returnBtn = document.getElementById("backToAdminBtn");
    if (!returnBtn) {
      returnBtn = document.createElement("button");
      returnBtn.id = "backToAdminBtn";
      returnBtn.type = "button";
      returnBtn.className = "primary small";
      returnBtn.style.cssText = "background: linear-gradient(135deg, #4f46e5, #4338ca); color: #ffffff; border: 1px solid rgba(255,255,255,0.25); font-weight: 700; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4); cursor: pointer;";
      returnBtn.innerHTML = `<span>🛡️ Back to Admin Dashboard</span>`;
      returnBtn.onclick = returnToAdminDashboard;
      actionsContainer.insertBefore(returnBtn, actionsContainer.firstChild);
    }
  }

  // Load Bookings
  await loadOwnerBookings();

  // Setup Filter Tabs
  document.querySelectorAll(".owner-tab-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".owner-tab-btn").forEach((b) => b.classList.remove("active"));
      e.currentTarget.classList.add("active");
      currentOwnerFilter = e.currentTarget.dataset.filter || "all";
      renderOwnerBookingsList();
    });
  });

  // Setup Polling every 10 seconds
  if (ownerPollInterval) clearInterval(ownerPollInterval);
  ownerPollInterval = setInterval(loadOwnerBookings, 10000);
}

async function loadOwnerBookings() {
  const session = getAuthSession();
  if (!session || session.role !== "garage_owner") return;

  const statusBanner = document.getElementById("ownerStatusBanner");

  try {
    // Calling /api/book with garage_owner session returns strictly this garage's bookings from backend
    const bookings = await fetchBookings();

    currentOwnerBookings = Array.isArray(bookings) ? bookings : [];
    updateOwnerMetrics();
    renderOwnerBookingsList();

    if (statusBanner) {
      statusBanner.style.display = "none";
    }
  } catch (error) {
    console.error("Could not fetch workshop bookings:", error);
    if (statusBanner) {
      statusBanner.textContent = error.message || "Failed to load workshop dispatches.";
      statusBanner.className = "status-banner error";
      statusBanner.style.display = "block";
    }
  }
}

function updateOwnerMetrics() {
  const pending = currentOwnerBookings.filter((b) => b.status === "pending").length;
  const inProgress = currentOwnerBookings.filter((b) => b.status === "accepted" || b.status === "in_progress").length;
  const completed = currentOwnerBookings.filter((b) => b.status === "completed").length;
  const total = currentOwnerBookings.length;

  const countPending = document.getElementById("metricPending");
  const countInProgress = document.getElementById("metricInProgress");
  const countCompleted = document.getElementById("metricCompleted");
  const countTotal = document.getElementById("metricTotal");

  if (countPending) countPending.textContent = pending;
  if (countInProgress) countInProgress.textContent = inProgress;
  if (countCompleted) countCompleted.textContent = completed;
  if (countTotal) countTotal.textContent = total;
}

function renderOwnerBookingsList() {
  const container = document.getElementById("ownerBookingsList");
  if (!container) return;

  let filtered = currentOwnerBookings;
  if (currentOwnerFilter === "pending") {
    filtered = currentOwnerBookings.filter((b) => b.status === "pending");
  } else if (currentOwnerFilter === "active") {
    filtered = currentOwnerBookings.filter((b) => b.status === "accepted" || b.status === "in_progress");
  } else if (currentOwnerFilter === "completed") {
    filtered = currentOwnerBookings.filter((b) => b.status === "completed");
  } else if (currentOwnerFilter === "declined") {
    filtered = currentOwnerBookings.filter((b) => b.status === "rejected" || b.status === "cancelled");
  }

  if (!filtered.length) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 40px 20px; text-align: center; color: var(--text-secondary);">
        <p style="font-size: 1.1rem; font-weight: 600; margin-bottom: 6px;">No bookings found in this category.</p>
        <p style="font-size: 0.84rem; color: var(--text-tertiary);">Incoming service requests from users will appear here in real time.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map((b) => {
    const status = b.status || "pending";
    const statusBadgeClass =
      status === "pending" ? "warning" :
      status === "accepted" ? "success-chip" :
      status === "in_progress" ? "neutral" :
      status === "completed" ? "success-chip" : "error-chip";

    const statusLabel =
      status === "pending" ? "Pending Action" :
      status === "accepted" ? "Service Partner Assigned" :
      status === "in_progress" ? "Service In Progress" :
      status === "completed" ? "Completed" :
      status === "rejected" ? "Declined" : "Cancelled";

    let actionsHtml = "";
    if (status === "pending") {
      actionsHtml = `
        <button type="button" class="btn-accept" onclick="handleOwnerAction('${b.id}', 'accepted')">✓ Accept Booking</button>
        <button type="button" class="btn-reject" onclick="handleOwnerAction('${b.id}', 'rejected')">✕ Decline</button>
      `;
    } else if (status === "accepted") {
      actionsHtml = `
        <button type="button" class="secondary small" onclick="handleOwnerAction('${b.id}', 'in_progress')">Mark In-Progress</button>
        <button type="button" class="btn-accept" onclick="handleOwnerAction('${b.id}', 'completed')">✓ Complete Job</button>
      `;
    } else if (status === "in_progress") {
      actionsHtml = `
        <button type="button" class="btn-accept" onclick="handleOwnerAction('${b.id}', 'completed')">✓ Mark as Completed</button>
      `;
    }

    const customerMobile = b.user?.mobile || b.mobile || "";
    const customerName = b.user?.name || b.customerName || "Customer User";
    const servicePrice = b.price ? `₹${b.price}` : "Estimate on Inspection";
    const bookingDate = new Date(b.createdAt || Date.now()).toLocaleString();

    return `
      <article class="owner-booking-card status-${status}">
        <div class="owner-booking-top">
          <div>
            <h3 class="owner-booking-service">${b.service || "Roadside Assistance"}</h3>
            <span style="font-size: 0.8rem; color: var(--text-tertiary);">Booking ID: ${b.id} • ${bookingDate}</span>
          </div>
          <div style="text-align: right;">
            <div class="owner-booking-price">${servicePrice}</div>
            <span class="badge ${statusBadgeClass}" style="margin-top: 4px;">${statusLabel}</span>
          </div>
        </div>

        <div class="owner-booking-details-grid">
          <div class="owner-detail-item">
            <strong>Customer</strong>
            <span>${customerName}</span>
          </div>
          <div class="owner-detail-item">
            <strong>Contact</strong>
            <a href="tel:${customerMobile}">📞 ${customerMobile || "N/A"}</a>
          </div>
          <div class="owner-detail-item">
            <strong>Location / Sector</strong>
            <span>📍 ${b.city || "Pune Sector"}</span>
          </div>
          <div class="owner-detail-item">
            <strong>Vehicle / Details</strong>
            <span>🚗 ${b.vehicleInfo || b.vehicle || "Standard Car / Bike"}</span>
          </div>
        </div>

        ${actionsHtml ? `<div class="owner-booking-actions">${actionsHtml}</div>` : ""}
      </article>
    `;
  }).join("");
}

async function handleOwnerAction(bookingId, newStatus) {
  try {
    showToast(`Updating booking to ${newStatus}...`, "neutral");
    await updateBookingStatusApi(bookingId, { status: newStatus });
    showToast(`Booking ${newStatus === "accepted" ? "accepted successfully!" : newStatus === "rejected" ? "declined" : "updated"}`, "success");

    // Update local memory & UI immediately
    const found = currentOwnerBookings.find((b) => b.id === bookingId);
    if (found) {
      found.status = newStatus;
      found.updatedAt = new Date().toISOString();
    }
    updateOwnerMetrics();
    renderOwnerBookingsList();
  } catch (error) {
    console.error("Update status error:", error);

    // Fallback: update local storage
    const stored = getStoredBookings();
    const target = stored.find((b) => b.id === bookingId);
    if (target) {
      target.status = newStatus;
      saveStoredBookings(stored);
      showToast(`Booking ${newStatus}`, "success");
      loadOwnerBookings();
    } else {
      showToast("Failed to update status: " + error.message, "error");
    }
  }
}

function toggleWorkshopAvailability() {
  const toggleBtn = document.getElementById("workshopStatusToggle");
  if (!toggleBtn) return;

  const isBusy = toggleBtn.classList.contains("busy");
  if (isBusy) {
    toggleBtn.classList.remove("busy");
    toggleBtn.innerHTML = '<span class="owner-status-dot"></span> <span>Open for Dispatches</span>';
    showToast("Workshop status set to OPEN", "success");
  } else {
    toggleBtn.classList.add("busy");
    toggleBtn.innerHTML = '<span class="owner-status-dot"></span> <span>Dispatches Paused</span>';
    showToast("Workshop dispatches temporarily PAUSED", "warning");
  }
}

function returnToAdminDashboard() {
  const adminReturnSessionRaw = sessionStorage.getItem("autobuddy_admin_return_session");
  if (!adminReturnSessionRaw) {
    window.location.href = "admin-dashboard.html";
    return;
  }

  try {
    const adminSession = JSON.parse(adminReturnSessionRaw);
    sessionStorage.removeItem("autobuddy_admin_return_session");

    if (typeof persistLoginSession === "function") {
      persistLoginSession(adminSession);
    }

    if (typeof showToast === "function") {
      showToast("Restoring Administrator session...", "success");
    }

    setTimeout(() => {
      window.location.href = "admin-dashboard.html";
    }, 250);
  } catch (err) {
    console.error("Return to admin error:", err);
    window.location.href = "admin-dashboard.html";
  }
}

window.returnToAdminDashboard = returnToAdminDashboard;
window.handleOwnerAction = handleOwnerAction;
window.toggleWorkshopAvailability = toggleWorkshopAvailability;

document.addEventListener("DOMContentLoaded", () => {
  if (getCurrentPage() === "owner-dashboard.html") {
    initOwnerDashboard();
  }
});
