/**
 * AutoBuddy Admin Dashboard Controller
 * Full management control over Garages, Bookings, and User accounts.
 */

const ADMIN_PHONE = "9579278177";
let adminPollingInterval = null;
let currentAdminOwners = [];
let currentAdminGarages = [];
let currentGarageFilter = "all";
let currentAdminUsers = [];
let currentUserFilter = "all";
let currentAdminTab = "users";

function getAdminHeaders() {
  const session = typeof getAuthSession === "function" ? getAuthSession() : null;
  const mobile = (session && session.role === "admin") ? (session.mobile || ADMIN_PHONE) : ADMIN_PHONE;
  return {
    "Content-Type": "application/json",
    "x-admin-mobile": mobile,
    "x-user-mobile": mobile,
    "x-user-role": "admin"
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
    const statVerified = document.getElementById("adminStatVerified");
    const statUnverified = document.getElementById("adminStatUnverified");
    const statBookings = document.getElementById("adminStatBookings");
    const statUsers = document.getElementById("adminStatUsers");
    const statOwners = document.getElementById("adminStatOwners");

    if (statGarages) statGarages.textContent = stats.garagesCount || 0;
    if (statVerified) statVerified.textContent = stats.verifiedGaragesCount || 0;
    if (statUnverified) statUnverified.textContent = stats.unverifiedGaragesCount || 0;
    if (statBookings) statBookings.textContent = stats.bookingsCount || 0;
    if (statUsers) statUsers.textContent = stats.usersCount || 0;
    if (statOwners) statOwners.textContent = stats.ownersCount || 0;
  } catch (error) {
    console.error("Load stats error:", error);
  }
}

/**
 * Load Garage Owners only (role: 'garage_owner') with workshop details & actions
 */
async function loadAdminGarageOwners() {
  const container = document.getElementById("adminOwnersContainer");
  if (!container) return;

  container.innerHTML = `<div style="padding: 30px; text-align: center; color: var(--text-secondary);">Loading registered garage owners from database...</div>`;

  try {
    const res = await fetch(`${API}/admin/owners`, {
      headers: getAdminHeaders()
    });
    if (!res.ok) throw new Error("Failed to load garage owners");

    const owners = await res.json();
    currentAdminOwners = Array.isArray(owners) ? owners : [];

    if (currentAdminOwners.length === 0) {
      container.innerHTML = `<div style="padding: 30px; text-align: center; color: var(--text-secondary);">No garage owners registered in the system.</div>`;
      return;
    }

    container.innerHTML = `
      <div class="admin-table-wrapper">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Owner Name &amp; ID</th>
              <th>Contact Details</th>
              <th>Workshop Name &amp; ID</th>
              <th>Location</th>
              <th>Verification Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${currentAdminOwners.map((o) => {
              const isVerified = Boolean(o.verified);
              const badgeClass = isVerified ? "admin-badge-verified" : "admin-badge-pending";
              const badgeText = isVerified ? "✓ Verified Partner" : "⏳ Pending Verification";
              const targetOwnerId = o.id || o.garageId;
              const targetGarageId = o.garageId || o.id;

              return `
                <tr>
                  <td>
                    <strong>${o.name}</strong>
                    <br><small style="color: var(--text-tertiary);">${o.id}</small>
                  </td>
                  <td>
                    <a href="tel:${o.mobile}" style="color: var(--accent-primary); font-weight: 600;">+91 ${o.mobile}</a>
                    ${o.email ? `<br><small style="color: var(--text-tertiary);">${o.email}</small>` : ""}
                  </td>
                  <td>
                    <strong style="color: var(--text-primary); font-size: 0.88rem;">🏢 ${o.garageName || "Workshop"}</strong>
                    <br><small style="color: var(--text-tertiary); font-family: monospace;">${o.garageId || "N/A"}</small>
                  </td>
                  <td>${o.district || "Pune"}, ${o.state || "Maharashtra"}</td>
                  <td>
                    <span class="${badgeClass}">${badgeText}</span>
                  </td>
                  <td>
                    <div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
                      ${isVerified ? `
                        <button type="button" class="admin-action-btn-danger" onclick="deleteGarageAsAdmin('${targetGarageId}')">
                          🗑️ Delete Garage
                        </button>
                        <button type="button" class="admin-action-btn-primary" onclick="adminLoginAsOwner('${targetOwnerId}')">
                          🚀 Sign in as Owner
                        </button>
                      ` : `
                        <button type="button" class="admin-action-btn-success" onclick="verifyGarageAsAdmin('${targetGarageId}')">
                          ✓ Accept / Verify
                        </button>
                        <button type="button" class="admin-action-btn-danger" onclick="unverifyOrRejectGarageAsAdmin('${targetGarageId}', '${o.id}')">
                          ✕ Reject / Delete
                        </button>
                      `}
                    </div>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  } catch (error) {
    console.error("Load garage owners error:", error);
    container.innerHTML = `<div style="padding: 30px; text-align: center; color: #f87171;">Failed to load garage owners: ${error.message}</div>`;
  }
}

async function verifyGarageAsAdmin(garageId, optionalName) {
  const owner = currentAdminOwners.find((o) => o.garageId === garageId || o.id === garageId);
  const garageName = optionalName || owner?.garageName || garageId;
  try {
    const res = await fetch(`${API}/admin/garages/${encodeURIComponent(garageId)}/verify`, {
      method: "PUT",
      headers: getAdminHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Verification failed");

    showToast(`Garage "${garageName}" is now Verified!`, "success");
    loadAdminStats();
    loadAdminGarages();
    loadAdminGarageOwners();
  } catch (error) {
    console.error("Verify garage error:", error);
    showToast("Verification failed: " + error.message, "error");
  }
}

async function deleteGarageAsAdmin(garageId, optionalName) {
  const owner = currentAdminOwners.find((o) => o.garageId === garageId || o.id === garageId);
  const garageName = optionalName || owner?.garageName || garageId;
  if (!confirm(`Are you sure you want to permanently delete garage "${garageName}" from the system and database?`)) {
    return;
  }

  try {
    const res = await fetch(`${API}/admin/garages/${encodeURIComponent(garageId)}`, {
      method: "DELETE",
      headers: getAdminHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Deletion failed");

    showToast(`Garage "${garageName}" permanently removed from MongoDB.`, "success");
    loadAdminStats();
    loadAdminGarages();
    loadAdminGarageOwners();
  } catch (error) {
    console.error("Delete garage error:", error);
    showToast("Delete failed: " + error.message, "error");
  }
}

async function unverifyOrRejectGarageAsAdmin(garageId, ownerId) {
  const owner = currentAdminOwners.find((o) => o.garageId === garageId || o.id === garageId || o.id === ownerId);
  const garageName = owner?.garageName || garageId;
  const targetOwnerId = ownerId || owner?.id;
  if (!confirm(`Are you sure you want to reject and permanently remove "${garageName}" registration from the system?`)) {
    return;
  }

  try {
    let res = await fetch(`${API}/admin/garages/${encodeURIComponent(garageId)}/reject`, {
      method: "PUT",
      headers: getAdminHeaders()
    });

    if (!res.ok) {
      res = await fetch(`${API}/admin/garages/${encodeURIComponent(garageId)}`, {
        method: "DELETE",
        headers: getAdminHeaders()
      });
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Rejection failed");

    if (targetOwnerId && targetOwnerId !== garageId) {
      try {
        await fetch(`${API}/admin/users/${encodeURIComponent(targetOwnerId)}`, {
          method: "DELETE",
          headers: getAdminHeaders()
        });
      } catch (_) {}
    }

    showToast(`Garage registration "${garageName}" rejected and removed from MongoDB.`, "success");
    loadAdminStats();
    loadAdminGarages();
    loadAdminGarageOwners();
  } catch (error) {
    console.error("Reject garage error:", error);
    showToast("Action failed: " + error.message, "error");
  }
}

function adminLoginAsOwner(ownerRef) {
  try {
    let owner = null;
    if (typeof ownerRef === "object" && ownerRef !== null) {
      owner = ownerRef;
    } else if (typeof ownerRef === "string") {
      owner = currentAdminOwners.find((o) => o.id === ownerRef || o.garageId === ownerRef);
      if (!owner) {
        try {
          const sanitized = ownerRef.replace(/%27/g, "'");
          owner = JSON.parse(decodeURIComponent(sanitized));
        } catch (_) {}
      }
    }

    if (!owner || !owner.mobile) {
      showToast("Cannot switch: Invalid owner credentials", "error");
      return;
    }

    // Capture the current administrator session to allow seamless return
    const currentSession = typeof getAuthSession === "function" ? getAuthSession() : null;
    if (currentSession && currentSession.role === "admin") {
      sessionStorage.setItem("autobuddy_admin_return_session", JSON.stringify(currentSession));
    }

    const session = {
      id: owner.id,
      name: owner.name,
      mobile: owner.mobile,
      role: "garage_owner",
      garageId: owner.garageId,
      garageName: owner.garageName,
      district: owner.district,
      state: owner.state,
      fromAdminImpersonation: true
    };

    persistLoginSession(session);
    showToast(`Opening ${owner.name}'s workshop dashboard...`, "success");
    setTimeout(() => {
      window.location.href = "owner-dashboard.html";
    }, 400);
  } catch (err) {
    console.error("Admin owner signin error:", err);
    showToast("Failed to switch session: " + err.message, "error");
  }
}

/**
 * Load registered garages & workshops (MongoDB Atlas + System verified partners)
 */
async function loadAdminGarages() {
  const container = document.getElementById("adminGaragesContainer");
  if (!container) return;

  container.innerHTML = `<div style="padding: 30px; text-align: center; color: var(--text-secondary);">Loading registered garages and workshops...</div>`;

  try {
    const res = await fetch(`${API}/admin/garages`, {
      headers: getAdminHeaders()
    });
    if (!res.ok) throw new Error("Failed to load garages");

    const garages = await res.json();
    currentAdminGarages = Array.isArray(garages) ? garages : [];
    renderAdminGaragesTable();
  } catch (error) {
    console.error("Load garages error:", error);
    container.innerHTML = `<div style="padding: 30px; text-align: center; color: #f87171;">Failed to load garages: ${error.message}</div>`;
  }
}

function filterAdminGarages(status) {
  currentGarageFilter = status;
  document.querySelectorAll("#garageFilterPills .admin-pill-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.status === status);
  });
  renderAdminGaragesTable();
}

function renderAdminGaragesTable() {
  const container = document.getElementById("adminGaragesContainer");
  if (!container) return;

  let filtered = currentAdminGarages;
  if (currentGarageFilter === "verified") {
    filtered = currentAdminGarages.filter((g) => Boolean(g.verified));
  } else if (currentGarageFilter === "pending") {
    filtered = currentAdminGarages.filter((g) => !g.verified);
  }

  if (filtered.length === 0) {
    container.innerHTML = `<div style="padding: 30px; text-align: center; color: var(--text-secondary);">No garages found matching the "${currentGarageFilter}" filter.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Garage / Workshop</th>
            <th>Contact &amp; Phone</th>
            <th>Location</th>
            <th>Services Offered</th>
            <th>Rating</th>
            <th>Status</th>
            <th>Source</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map((g) => {
            const isVerified = Boolean(g.verified);
            const badgeClass = isVerified ? "admin-badge-verified" : "admin-badge-pending";
            const badgeText = isVerified ? "✓ Verified" : "⏳ Pending";
            const isDb = g.source === "database";
            const sourceBadge = isDb ? '<span class="admin-badge-db">MongoDB</span>' : '<span class="admin-badge-sys">System</span>';
            const escapedName = (g.name || "").replace(/'/g, "\\'");
            const servicesList = Array.isArray(g.services) ? g.services.slice(0, 3).join(", ") + (g.services.length > 3 ? ` +${g.services.length - 3}` : "") : (g.services || "General Service");

            return `
              <tr>
                <td>
                  <strong style="color: var(--text-primary); font-size: 0.92rem;">${g.name}</strong>
                  <br><small style="color: var(--text-tertiary); font-family: monospace;">${g.id}</small>
                </td>
                <td>
                  ${g.phone ? `<a href="tel:${g.phone}" style="color: var(--accent-primary); font-weight: 600;">${g.phone}</a>` : '<span style="color: var(--text-tertiary);">N/A</span>'}
                  ${g.ownerName ? `<br><small style="color: var(--text-secondary);">Owner: ${g.ownerName}</small>` : ""}
                </td>
                <td>
                  <span>${g.city || g.district || "Pune"}</span>
                  ${g.address ? `<br><small style="color: var(--text-tertiary);">${g.address.length > 35 ? g.address.slice(0, 35) + "…" : g.address}</small>` : ""}
                </td>
                <td>
                  <span style="font-size: 0.82rem; color: var(--text-secondary);">${servicesList}</span>
                </td>
                <td>
                  <span style="font-weight: 600; color: #fbbf24;">⭐ ${g.rating || 4.5}</span>
                  ${g.reviews ? `<br><small style="color: var(--text-tertiary);">(${g.reviews} reviews)</small>` : ""}
                </td>
                <td>
                  <span class="${badgeClass}">${badgeText}</span>
                </td>
                <td>
                  ${sourceBadge}
                </td>
                <td>
                  <div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
                    ${!isVerified ? `
                      <button type="button" class="admin-action-btn-success" onclick="verifyGarageAsAdmin('${g.id}', '${escapedName}')">
                        ✓ Verify
                      </button>
                    ` : ""}
                    ${isDb ? `
                      <button type="button" class="admin-action-btn-danger" onclick="deleteGarageAsAdmin('${g.id}', '${escapedName}')">
                        🗑️ Delete
                      </button>
                    ` : `
                      <span style="font-size: 0.74rem; color: var(--text-tertiary);">Protected</span>
                    `}
                  </div>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
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
              let badgeClass = "warning";
              let statusLabel = "Pending";

              if (status === "pending") {
                badgeClass = "warning";
                statusLabel = "Pending";
              } else if (status === "accepted") {
                badgeClass = "success-chip";
                statusLabel = "Service Partner Assigned";
              } else if (status === "in_progress") {
                badgeClass = "neutral";
                statusLabel = "Service In Progress";
              } else if (status === "completed") {
                badgeClass = "success-chip";
                statusLabel = "Completed";
              } else if (status === "cancelled" || status === "rejected") {
                badgeClass = "error-chip";
                statusLabel = "Cancelled";
              }

              const numPrice = Number(b.price);
              let priceFormatted = "Estimate on inspection";
              if (!isNaN(numPrice) && numPrice > 0) {
                priceFormatted = `₹${numPrice}`;
              } else if (b.service === "Book Van" || (b.vehicleInfo && b.vehicleInfo.includes("Van"))) {
                priceFormatted = b.vehicleType === "bike" ? "₹500" : "₹1,000";
              }

              const canCancel = status !== "cancelled" && status !== "rejected" && status !== "completed";

              return `
                <tr>
                  <td><strong>${b.id}</strong></td>
                  <td>${b.user?.name || "Customer"}<br><small style="color: var(--text-tertiary);">${b.user?.mobile || ""}</small></td>
                  <td>${b.garage || "Workshop"}</td>
                  <td>${b.service || "Service"}</td>
                  <td><strong>${priceFormatted}</strong></td>
                  <td><span class="badge ${badgeClass}">${statusLabel}</span></td>
                  <td>${new Date(b.createdAt || Date.now()).toLocaleDateString("en-IN", { dateStyle: "medium" })}</td>
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

  container.innerHTML = `<div style="padding: 30px; text-align: center; color: var(--text-secondary);">Loading registered users...</div>`;

  try {
    const res = await fetch(`${API}/admin/users`, {
      headers: getAdminHeaders()
    });
    if (!res.ok) throw new Error("Failed to load users");
    const users = await res.json();

    currentAdminUsers = Array.isArray(users) ? users : [];
    renderAdminUsersTable();
  } catch (error) {
    console.error("Load users error:", error);
    container.innerHTML = `<div style="padding: 30px; text-align: center; color: #f87171;">Failed to load accounts: ${error.message}</div>`;
  }
}

function filterAdminUsers(role) {
  currentUserFilter = role;
  document.querySelectorAll("#userFilterPills .admin-pill-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.role === role);
  });
  renderAdminUsersTable();
}

function renderAdminUsersTable() {
  const container = document.getElementById("adminUsersContainer");
  if (!container) return;

  let filtered = currentAdminUsers;
  if (currentUserFilter === "user") {
    filtered = currentAdminUsers.filter((u) => u.role === "user");
  } else if (currentUserFilter === "garage_owner") {
    filtered = currentAdminUsers.filter((u) => u.role === "garage_owner");
  }

  if (!filtered.length) {
    container.innerHTML = `<div style="padding: 30px; text-align: center; color: var(--text-secondary);">No accounts found for the "${currentUserFilter}" role filter.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>User / Name</th>
            <th>Role</th>
            <th>Mobile / Phone</th>
            <th>Email</th>
            <th>Location</th>
            <th>Registered On</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map((u) => {
            const roleBadge = u.role === "garage_owner" 
              ? '<span class="badge warning" style="font-size: 0.72rem;">🔧 Garage Owner</span>' 
              : '<span class="badge success-chip" style="font-size: 0.72rem;">👤 Customer</span>';
            const escapedName = (u.name || "").replace(/'/g, "\\'");

            return `
              <tr>
                <td>
                  <strong>${u.name}</strong>
                  <br><small style="color: var(--text-tertiary); font-family: monospace;">${u.id}</small>
                </td>
                <td>${roleBadge}</td>
                <td>
                  <a href="tel:${u.mobile}" style="color: var(--accent-primary); font-weight: 600;">+91 ${u.mobile}</a>
                </td>
                <td>${u.email || '<span style="color: var(--text-tertiary);">N/A</span>'}</td>
                <td>${u.district || "Pune"}, ${u.state || "Maharashtra"}</td>
                <td>${new Date(u.createdAt || Date.now()).toLocaleDateString("en-IN", { dateStyle: "medium" })}</td>
                <td>
                  <button type="button" class="admin-action-btn-danger" onclick="deleteUserAsAdmin('${u.id}', '${escapedName}')">
                    🗑️ Remove
                  </button>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
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

function formatTimeAgo(timestamp) {
  if (!timestamp) return "Just now";
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes > 1 ? "s" : ""} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

async function loadAdminRecentLogins() {
  const container = document.getElementById("adminLoginsContainer");
  if (!container) return;

  container.innerHTML = `<div style="padding: 30px; text-align: center; color: var(--text-secondary);">Loading recent login events...</div>`;

  try {
    const res = await fetch(`${API}/admin/recent-logins`, {
      headers: getAdminHeaders()
    });
    if (!res.ok) throw new Error("Failed to load recent logins");
    const logins = await res.json();

    if (!Array.isArray(logins) || !logins.length) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 40px 20px; text-align: center; color: var(--text-secondary);">
          <div style="font-size: 2.2rem; margin-bottom: 8px;">🔐</div>
          <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">No Recent Logins</h3>
          <p style="font-size: 0.84rem; color: var(--text-tertiary);">Successful customer, garage owner, and administrator logins will be recorded here from MongoDB.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th style="width: 45px;">#</th>
              <th>User / Name</th>
              <th>Mobile / Contact</th>
              <th>Role</th>
              <th>Timestamp</th>
              <th>IP / Session</th>
            </tr>
          </thead>
          <tbody>
            ${logins.map((item, index) => {
              const roleClass = item.role === "admin" ? "admin-badge-sys" : (item.role === "garage_owner" ? "badge warning" : "badge success-chip");
              const formattedDate = item.timestamp ? new Date(item.timestamp).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "N/A";
              const timeAgo = formatTimeAgo(item.timestamp);

              return `
                <tr>
                  <td style="color: var(--text-tertiary); font-weight: 600;">${index + 1}</td>
                  <td>
                    <strong>${item.name || "Authenticated User"}</strong>
                    ${item.userId ? `<br><small style="color: var(--text-tertiary);">${item.userId}</small>` : ""}
                  </td>
                  <td>
                    <span style="font-weight: 600; color: var(--text-primary);">+91 ${item.mobile}</span>
                    ${item.email ? `<br><small style="color: var(--text-tertiary);">${item.email}</small>` : ""}
                  </td>
                  <td>
                    <span class="${roleClass}" style="display: inline-block;">
                      ${item.roleLabel || (item.role === "admin" ? "Administrator" : (item.role === "garage_owner" ? "Garage Owner" : "User"))}
                    </span>
                  </td>
                  <td>
                    <span style="font-weight: 500; color: var(--text-primary);">${formattedDate}</span>
                    <br><small style="color: var(--accent-primary); font-weight: 600;">${timeAgo}</small>
                  </td>
                  <td>
                    <small style="color: var(--text-tertiary); font-family: monospace;">${item.ip || "127.0.0.1"}</small>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  } catch (error) {
    console.error("Load recent logins error:", error);
    container.innerHTML = `<div style="padding: 30px; text-align: center; color: #f87171;">Failed to load recent logins: ${error.message}</div>`;
  }
}

function initAdminDashboard() {
  document.querySelectorAll(".admin-tab-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".admin-tab-btn").forEach((b) => b.classList.remove("active"));
      e.currentTarget.classList.add("active");

      const targetTab = e.currentTarget.dataset.tab;
      currentAdminTab = targetTab;

      document.querySelectorAll(".admin-tab-section").forEach((sec) => {
        sec.style.display = sec.id === `sec-${targetTab}` ? "" : "none";
      });

      if (targetTab === "users") {
        loadAdminUsers();
      } else if (targetTab === "garages") {
        loadAdminGarages();
      } else if (targetTab === "owners") {
        loadAdminGarageOwners();
      } else if (targetTab === "bookings") {
        loadAdminBookings();
      } else if (targetTab === "logins") {
        loadAdminRecentLogins();
      }
    });
  });

  loadAdminStats();
  loadAdminUsers();
  loadAdminGarages();
  loadAdminGarageOwners();
  loadAdminBookings();
  loadAdminRecentLogins();

  if (adminPollingInterval) clearInterval(adminPollingInterval);
  adminPollingInterval = setInterval(() => {
    // Skip polling when the browser tab is not visible
    if (document.hidden) return;
    loadAdminStats();
    if (currentAdminTab === "bookings") {
      loadAdminBookings();
    } else if (currentAdminTab === "garages") {
      loadAdminGarages();
    } else if (currentAdminTab === "owners") {
      loadAdminGarageOwners();
    }
  }, 30000);
}

window.adminLoginAsOwner = adminLoginAsOwner;
window.cancelBookingAsAdmin = cancelBookingAsAdmin;
window.deleteGarageAsAdmin = deleteGarageAsAdmin;
window.deleteUserAsAdmin = deleteUserAsAdmin;
window.filterAdminGarages = filterAdminGarages;
window.filterAdminUsers = filterAdminUsers;
window.loadAdminBookings = loadAdminBookings;
window.loadAdminGarageOwners = loadAdminGarageOwners;
window.loadAdminGarages = loadAdminGarages;
window.loadAdminRecentLogins = loadAdminRecentLogins;
window.loadAdminStats = loadAdminStats;
window.loadAdminUsers = loadAdminUsers;
window.renderAdminGaragesTable = renderAdminGaragesTable;
window.renderAdminUsersTable = renderAdminUsersTable;
window.unverifyOrRejectGarageAsAdmin = unverifyOrRejectGarageAsAdmin;
window.verifyGarageAsAdmin = verifyGarageAsAdmin;

document.addEventListener("DOMContentLoaded", () => {
  if (getCurrentPage() === "admin-dashboard.html") {
    initAdminDashboard();
  }
});
