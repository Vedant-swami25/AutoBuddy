/**
 * AutoBuddy Admin Dashboard Controller
 * Full management control over Garages, Bookings, and User accounts.
 */

const ADMIN_PHONE = "9579278177";

function getAdminHeaders() {
  const session = getAuthSession();
  const mobile = session?.mobile || ADMIN_PHONE;
  return {
    "Content-Type": "application/json",
    "x-admin-mobile": mobile
  };
}

async function loadAdminStats() {
  try {
    const res = await fetch(`${API}/admin/stats`, {
      headers: getAdminHeaders()
    });
    if (!res.ok) throw new Error("Failed to load statistics");
    const stats = await res.json();

    const statGarages = document.getElementById("adminStatGarages");
    const statBookings = document.getElementById("adminStatBookings");
    const statUsers = document.getElementById("adminStatUsers");
    const statOwners = document.getElementById("adminStatOwners");

    if (statGarages) statGarages.textContent = stats.garagesCount || 0;
    if (statBookings) statBookings.textContent = stats.bookingsCount || 0;
    if (statUsers) statUsers.textContent = stats.usersCount || 0;
    if (statOwners) statOwners.textContent = stats.ownersCount || 0;
  } catch (error) {
    console.error("Load stats error:", error);
  }
}

async function loadAdminGarages() {
  const container = document.getElementById("adminGaragesContainer");
  if (!container) return;

  container.innerHTML = `<div style="padding: 30px; text-align: center; color: var(--text-secondary);">Loading registered garages...</div>`;

  try {
    const res = await fetch(`${API}/admin/garages`, {
      headers: getAdminHeaders()
    });
    if (!res.ok) throw new Error("Failed to load garages");
    const garages = await res.json();

    if (!garages.length) {
      container.innerHTML = `<div style="padding: 30px; text-align: center; color: var(--text-secondary);">No garages found.</div>`;
      return;
    }

    container.innerHTML = `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Garage Name</th>
              <th>Owner / Contact</th>
              <th>Phone</th>
              <th>Location</th>
              <th>Source</th>
              <th>Rating</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${garages.map((g) => `
              <tr>
                <td><strong>${g.name}</strong><br><small style="color: var(--text-tertiary);">${g.id}</small></td>
                <td>${g.ownerName || g.mechanic || "N/A"}</td>
                <td><a href="tel:${g.phone || ""}" style="color: var(--accent-primary); font-weight: 600;">${g.phone || "N/A"}</a></td>
                <td>${g.city || g.address || "Pune"}</td>
                <td>
                  <span class="${g.source === "database" ? "admin-badge-db" : "admin-badge-sys"}">
                    ${g.source === "database" ? "MongoDB" : "System Preset"}
                  </span>
                </td>
                <td>⭐ ${g.rating || 4.8}</td>
                <td>
                  ${g.canDelete ? `
                    <button type="button" class="admin-action-btn-danger" onclick="deleteGarageAsAdmin('${g.id}', '${g.name.replace(/'/g, "\\'")}')">
                      🗑️ Delete
                    </button>
                  ` : `<span style="color: var(--text-tertiary); font-size: 0.76rem;">System Locked</span>`}
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  } catch (error) {
    console.error("Load garages error:", error);
    container.innerHTML = `<div style="padding: 30px; text-align: center; color: #f87171;">Failed to load garages: ${error.message}</div>`;
  }
}

async function deleteGarageAsAdmin(garageId, garageName) {
  if (!confirm(`Are you sure you want to permanently delete "${garageName}" (${garageId}) from MongoDB?`)) {
    return;
  }

  try {
    const res = await fetch(`${API}/admin/garages/${encodeURIComponent(garageId)}`, {
      method: "DELETE",
      headers: getAdminHeaders()
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Deletion failed");

    showToast(`Garage "${garageName}" removed successfully.`, "success");
    loadAdminStats();
    loadAdminGarages();
  } catch (error) {
    console.error("Delete garage error:", error);
    showToast("Delete failed: " + error.message, "error");
  }
}

async function loadAdminBookings() {
  const container = document.getElementById("adminBookingsContainer");
  if (!container) return;

  container.innerHTML = `<div style="padding: 30px; text-align: center; color: var(--text-secondary);">Loading all bookings...</div>`;

  try {
    const res = await fetch(`${API}/admin/bookings`, {
      headers: getAdminHeaders()
    });
    if (!res.ok) throw new Error("Failed to load bookings");
    const bookings = await res.json();

    if (!bookings.length) {
      container.innerHTML = `<div style="padding: 30px; text-align: center; color: var(--text-secondary);">No customer bookings found.</div>`;
      return;
    }

    container.innerHTML = `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Booking ID</th>
              <th>Customer</th>
              <th>Garage / Workshop</th>
              <th>Service</th>
              <th>Price</th>
              <th>Status</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${bookings.map((b) => {
              const status = (b.status || "pending").toLowerCase();
              const badgeClass =
                status === "pending" ? "warning" :
                status === "accepted" ? "neutral" :
                status === "in_progress" ? "neutral" :
                status === "completed" ? "success-chip" : "error-chip";

              const canCancel = status !== "cancelled" && status !== "rejected" && status !== "completed";

              return `
                <tr>
                  <td><strong>${b.id}</strong></td>
                  <td>${b.user?.name || "Customer"}<br><small style="color: var(--text-tertiary);">${b.user?.mobile || ""}</small></td>
                  <td>${b.garage || "Workshop"}</td>
                  <td>${b.service || "Service"}</td>
                  <td><strong>₹${b.price || 0}</strong></td>
                  <td><span class="badge ${badgeClass}">${status}</span></td>
                  <td>${new Date(b.createdAt || Date.now()).toLocaleDateString()}</td>
                  <td>
                    ${canCancel ? `
                      <button type="button" class="admin-action-btn-danger" onclick="cancelBookingAsAdmin('${b.id}')">
                        ✕ Cancel
                      </button>
                    ` : `<span style="color: var(--text-tertiary); font-size: 0.76rem;">Finalized</span>`}
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  } catch (error) {
    console.error("Load bookings error:", error);
    container.innerHTML = `<div style="padding: 30px; text-align: center; color: #f87171;">Failed to load bookings: ${error.message}</div>`;
  }
}

async function cancelBookingAsAdmin(bookingId) {
  if (!confirm(`Cancel booking ${bookingId} as Administrator?`)) {
    return;
  }

  try {
    const res = await fetch(`${API}/admin/bookings/${encodeURIComponent(bookingId)}/cancel`, {
      method: "POST",
      headers: getAdminHeaders()
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Cancellation failed");

    showToast(`Booking ${bookingId} cancelled.`, "success");
    loadAdminStats();
    loadAdminBookings();
  } catch (error) {
    console.error("Cancel booking error:", error);
    showToast("Cancel failed: " + error.message, "error");
  }
}

async function loadAdminUsers() {
  const container = document.getElementById("adminUsersContainer");
  if (!container) return;

  container.innerHTML = `<div style="padding: 30px; text-align: center; color: var(--text-secondary);">Loading users and garage owners...</div>`;

  try {
    const res = await fetch(`${API}/admin/users`, {
      headers: getAdminHeaders()
    });
    if (!res.ok) throw new Error("Failed to load users");
    const users = await res.json();

    if (!users.length) {
      container.innerHTML = `<div style="padding: 30px; text-align: center; color: var(--text-secondary);">No registered accounts found.</div>`;
      return;
    }

    container.innerHTML = `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Account Name</th>
              <th>Mobile</th>
              <th>Role</th>
              <th>Location</th>
              <th>Registered On</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${users.map((u) => `
              <tr>
                <td><strong>${u.name}</strong><br><small style="color: var(--text-tertiary);">${u.id}</small></td>
                <td><a href="tel:${u.mobile}" style="color: var(--accent-primary); font-weight: 600;">+91 ${u.mobile}</a></td>
                <td>
                  <span class="${u.role === "garage_owner" ? "badge neutral" : "badge success-chip"}">
                    ${u.role === "garage_owner" ? "Garage Owner" : "User"}
                  </span>
                </td>
                <td>${u.district || "Pune"}, ${u.state || "Maharashtra"}</td>
                <td>${new Date(u.createdAt || Date.now()).toLocaleDateString()}</td>
                <td>
                  <button type="button" class="admin-action-btn-danger" onclick="deleteUserAsAdmin('${u.id}', '${u.name.replace(/'/g, "\\'")}')">
                    🗑️ Remove
                  </button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  } catch (error) {
    console.error("Load users error:", error);
    container.innerHTML = `<div style="padding: 30px; text-align: center; color: #f87171;">Failed to load accounts: ${error.message}</div>`;
  }
}

async function deleteUserAsAdmin(userId, userName) {
  if (!confirm(`Are you sure you want to permanently delete account "${userName}" (${userId})?`)) {
    return;
  }

  try {
    const res = await fetch(`${API}/admin/users/${encodeURIComponent(userId)}`, {
      method: "DELETE",
      headers: getAdminHeaders()
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Delete failed");

    showToast(`Account "${userName}" removed.`, "success");
    loadAdminStats();
    loadAdminUsers();
    loadAdminGarages();
  } catch (error) {
    console.error("Delete user error:", error);
    showToast("Delete user failed: " + error.message, "error");
  }
}

function initAdminDashboard() {
  document.querySelectorAll(".admin-tab-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".admin-tab-btn").forEach((b) => b.classList.remove("active"));
      e.currentTarget.classList.add("active");

      const targetTab = e.currentTarget.dataset.tab;
      document.querySelectorAll(".admin-tab-section").forEach((sec) => {
        sec.style.display = sec.id === `sec-${targetTab}` ? "" : "none";
      });
    });
  });

  loadAdminStats();
  loadAdminGarages();
  loadAdminBookings();
  loadAdminUsers();
}

window.deleteGarageAsAdmin = deleteGarageAsAdmin;
window.cancelBookingAsAdmin = cancelBookingAsAdmin;
window.deleteUserAsAdmin = deleteUserAsAdmin;
window.loadAdminStats = loadAdminStats;
window.loadAdminGarages = loadAdminGarages;
window.loadAdminBookings = loadAdminBookings;
window.loadAdminUsers = loadAdminUsers;

document.addEventListener("DOMContentLoaded", () => {
  if (getCurrentPage() === "admin-dashboard.html") {
    initAdminDashboard();
  }
});
