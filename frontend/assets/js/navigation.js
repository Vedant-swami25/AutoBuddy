/**
 * Theme, sidebar, account header, profile editing, and shared navigation behavior.
 */

function applyTheme(theme) {
  const nextTheme = theme === "light" ? "light" : "dark";
  document.body.dataset.theme = nextTheme;
  localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
}

function toggleSidebar(open = null) {
  const sidebar = document.querySelector(".page-sidebar");
  const backdrop = document.querySelector(".sidebar-backdrop");
  if (!sidebar || !backdrop) {
    return;
  }

  const isOpen = sidebar.classList.contains("open");
  const nextState = open === null ? !isOpen : open;

  sidebar.classList.toggle("open", nextState);
  sidebar.setAttribute("aria-hidden", String(!nextState));
  backdrop.classList.toggle("open", nextState);
  backdrop.setAttribute("aria-hidden", String(!nextState));
}

function initTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  const preferredDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(savedTheme || (preferredDark ? "dark" : "light"));
}

function toggleTheme() {
  const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
}

/**
 * Ensures the Profile Modal markup is attached to the document.
 */
function ensureProfileModal() {
  if (document.getElementById("profileModalBackdrop")) {
    return;
  }

  const modalHtml = `
    <div id="profileModalBackdrop" class="profile-modal-backdrop" onclick="handleProfileBackdropClick(event)" aria-hidden="true">
      <div class="profile-modal-card" role="dialog" aria-modal="true" aria-labelledby="profileModalTitle">
        <div class="profile-modal-header">
          <div>
            <h2 id="profileModalTitle" class="profile-modal-title">My Account Profile</h2>
            <p class="profile-modal-subtitle">View and update your personal account details.</p>
          </div>
          <button type="button" class="sidebar-close-btn" onclick="closeProfileModal()" aria-label="Close profile">✕</button>
        </div>

        <div class="profile-avatar-banner">
          <div id="profileAvatarLarge" class="profile-avatar-large">U</div>
          <div>
            <strong id="profileBannerName" style="font-size: 1.05rem; color: var(--text-primary);">User Name</strong>
            <div id="profileBannerRole" class="sidebar-profile-badge">Customer</div>
          </div>
        </div>

        <div id="profileStatusBanner" class="status-banner" style="display: none;"></div>

        <form id="profileForm" class="profile-form-grid" onsubmit="saveProfile(event)">
          <div class="profile-field-group">
            <label for="profileInputName">Full Name</label>
            <input id="profileInputName" type="text" placeholder="Enter your full name" required>
          </div>

          <div class="profile-field-group">
            <label for="profileInputMobile">Registered Mobile Number (Read-Only)</label>
            <input id="profileInputMobile" type="text" readonly disabled>
          </div>

          <div class="profile-field-group">
            <label for="profileInputEmail">Email Address</label>
            <input id="profileInputEmail" type="email" placeholder="e.g. name@example.com">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="profile-field-group">
              <label for="profileInputDistrict">City / District</label>
              <input id="profileInputDistrict" type="text" placeholder="e.g. Pune">
            </div>

            <div class="profile-field-group">
              <label for="profileInputState">State</label>
              <input id="profileInputState" type="text" placeholder="e.g. Maharashtra">
            </div>
          </div>

          <div id="profileWorkshopFieldGroup" class="profile-field-group" style="display: none;">
            <label for="profileInputWorkshop">Linked Workshop</label>
            <input id="profileInputWorkshop" type="text" readonly disabled>
          </div>

          <div class="profile-modal-actions">
            <button type="button" class="secondary small" onclick="closeProfileModal()">Cancel</button>
            <button id="profileSaveBtn" type="submit" class="small">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function handleProfileBackdropClick(event) {
  if (event.target.id === "profileModalBackdrop") {
    closeProfileModal();
  }
}

async function openProfileModal() {
  toggleSidebar(false);
  ensureProfileModal();

  const session = getAuthSession();
  if (!session) {
    if (typeof showToast === "function") showToast("Please sign in to view your profile.", "warning");
    window.location.href = "login.html";
    return;
  }

  const role = session.role || "user";
  const isOwner = role === "garage_owner";
  const isAdmin = role === "admin" || session.mobile === "9579278177";

  const nameInput = document.getElementById("profileInputName");
  const mobileInput = document.getElementById("profileInputMobile");
  const emailInput = document.getElementById("profileInputEmail");
  const districtInput = document.getElementById("profileInputDistrict");
  const stateInput = document.getElementById("profileInputState");
  const workshopInput = document.getElementById("profileInputWorkshop");
  const workshopGroup = document.getElementById("profileWorkshopFieldGroup");
  const avatarLarge = document.getElementById("profileAvatarLarge");
  const bannerName = document.getElementById("profileBannerName");
  const bannerRole = document.getElementById("profileBannerRole");
  const statusBanner = document.getElementById("profileStatusBanner");

  if (statusBanner) statusBanner.style.display = "none";

  const displayName = session.name || (isAdmin ? "System Administrator" : (isOwner ? "Garage Owner" : "User"));
  const initial = displayName ? displayName[0].toUpperCase() : (isAdmin ? "🛡️" : (isOwner ? "W" : "U"));

  if (avatarLarge) avatarLarge.textContent = initial;
  if (bannerName) bannerName.textContent = displayName;
  if (bannerRole) {
    bannerRole.textContent = isAdmin ? "Administrator" : (isOwner ? "Garage Owner" : "Customer Driver");
  }

  if (nameInput) nameInput.value = session.name || "";
  if (mobileInput) mobileInput.value = `+91 ${session.mobile || ""}`;
  if (emailInput) emailInput.value = session.email || "";
  if (districtInput) districtInput.value = session.district || "Pune";
  if (stateInput) stateInput.value = session.state || "Maharashtra";

  if (workshopGroup && workshopInput) {
    if (isOwner && (session.garageName || session.garageId)) {
      workshopGroup.style.display = "";
      workshopInput.value = session.garageName || `Garage ID: ${session.garageId}`;
    } else {
      workshopGroup.style.display = "none";
    }
  }

  const backdrop = document.getElementById("profileModalBackdrop");
  if (backdrop) {
    backdrop.classList.add("open");
    backdrop.setAttribute("aria-hidden", "false");
  }

  // Attempt live refresh from API
  try {
    const res = await fetch("/api/auth/me", {
      headers: { "x-user-mobile": session.mobile }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.user) {
        persistLoginSession({ ...session, ...data.user });
        if (nameInput) nameInput.value = data.user.name || "";
        if (emailInput) emailInput.value = data.user.email || "";
        if (districtInput) districtInput.value = data.user.district || "Pune";
        if (stateInput) stateInput.value = data.user.state || "Maharashtra";
      }
    }
  } catch (err) {
    // Ignore network error and continue with stored session
  }
}

function closeProfileModal() {
  const backdrop = document.getElementById("profileModalBackdrop");
  if (backdrop) {
    backdrop.classList.remove("open");
    backdrop.setAttribute("aria-hidden", "true");
  }
}

async function saveProfile(event) {
  if (event) event.preventDefault();

  const session = getAuthSession();
  if (!session) return;

  const nameInput = document.getElementById("profileInputName");
  const emailInput = document.getElementById("profileInputEmail");
  const districtInput = document.getElementById("profileInputDistrict");
  const stateInput = document.getElementById("profileInputState");
  const saveBtn = document.getElementById("profileSaveBtn");
  const statusBanner = document.getElementById("profileStatusBanner");

  const name = String(nameInput?.value || "").trim();
  const email = String(emailInput?.value || "").trim();
  const district = String(districtInput?.value || "").trim();
  const state = String(stateInput?.value || "").trim();

  if (!name) {
    if (statusBanner) {
      statusBanner.textContent = "Full name is required.";
      statusBanner.className = "status-banner error";
      statusBanner.style.display = "block";
    }
    return;
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    if (statusBanner) {
      statusBanner.textContent = "Please enter a valid email address.";
      statusBanner.className = "status-banner error";
      statusBanner.style.display = "block";
    }
    return;
  }

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";
  }

  try {
    const res = await fetch("/api/auth/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-user-mobile": session.mobile
      },
      body: JSON.stringify({ name, email, district, state })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to update profile.");
    }

    // Update local storage session
    persistLoginSession(data.user);

    // Refresh UI across topbar and sidebar
    renderSessionUi();

    if (typeof showToast === "function") {
      showToast("Profile updated successfully!", "success");
    }

    if (statusBanner) {
      statusBanner.textContent = "Profile updated successfully!";
      statusBanner.className = "status-banner success";
      statusBanner.style.display = "block";
    }

    window.setTimeout(() => {
      closeProfileModal();
    }, 500);
  } catch (error) {
    console.error("Save profile error:", error);
    if (statusBanner) {
      statusBanner.textContent = error.message || "Could not save profile.";
      statusBanner.className = "status-banner error";
      statusBanner.style.display = "block";
    }
    if (typeof showToast === "function") {
      showToast(error.message || "Failed to update profile.", "error");
    }
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Changes";
    }
  }
}

function renderSessionUi() {
  const authOnlyItems = document.querySelectorAll(".auth-only");
  const guestOnlyItems = document.querySelectorAll(".guest-only");
  const userName = document.getElementById("userName");
  const sidebarUserName = document.getElementById("sidebarUserName");
  const sidebarUserContact = document.getElementById("sidebarUserContact");
  const sidebarAvatar = document.querySelector(".sidebar-avatar");
  const sidebarLogoutBtn = document.getElementById("sidebarLogoutBtn");
  const session = getAuthSession();
  const loggedIn = isAuthenticated();
  const isOwner = session?.role === "garage_owner";
  const role = session?.role || "user";
  const isAdminUser = role === "admin" || session?.mobile === "9579278177";

  authOnlyItems.forEach((item) => {
    item.hidden = !loggedIn;
    item.style.display = loggedIn ? "" : "none";
  });

  guestOnlyItems.forEach((item) => {
    item.hidden = loggedIn;
    item.style.display = loggedIn ? "none" : "";
  });

  const displayName = String(session?.name || (isAdminUser ? "System Administrator" : (isOwner ? "Garage Owner" : "User"))).trim();
  const initial = displayName ? displayName[0].toUpperCase() : (isAdminUser ? "🛡️" : (isOwner ? "W" : "U"));

  // Brand logo navigates to index.html via its href (no override needed)

  // Ensure user badge in topbar opens sidebar
  const userBadge = document.querySelector(".user-badge");
  if (userBadge) {
    userBadge.onclick = () => toggleSidebar(true);
    userBadge.title = "Open Sidebar & Profile";
    userBadge.style.cursor = "pointer";
  }

  // Update topbar user name
  if (userName) {
    if (loggedIn) {
      if (isAdminUser) {
        userName.textContent = "Administrator";
      } else if (isOwner) {
        userName.textContent = `${displayName} (Owner)`;
      } else {
        userName.textContent = displayName;
      }
    } else {
      userName.textContent = "Sign In";
    }
  }

  // Sidebar profile card
  const sidebarProfileCard = document.querySelector(".sidebar-profile");
  if (sidebarProfileCard) {
    sidebarProfileCard.style.cursor = "pointer";
    sidebarProfileCard.title = "Click to edit profile";
    sidebarProfileCard.onclick = () => openProfileModal();
  }

  if (sidebarUserName) {
    sidebarUserName.textContent = loggedIn ? displayName : "Guest User";
  }

  if (sidebarUserContact) {
    sidebarUserContact.textContent = loggedIn
      ? (isAdminUser ? "Platform Control" : (isOwner ? `Workshop: ${session.garageName || session.mobile}` : (session.mobile || session.email || "")))
      : "Not signed in";
  }

  if (sidebarAvatar) {
    sidebarAvatar.textContent = loggedIn ? (isAdminUser ? "🛡️" : initial) : "👤";
  }

  // Role-specific sidebar links
  const sidebarNav = document.querySelector(".sidebar-nav");
  if (sidebarNav && loggedIn) {
    if (isAdminUser) {
      sidebarNav.innerHTML = `
        <a class="sidebar-link" href="#" onclick="openProfileModal(); return false;">
          <span class="sidebar-link-icon">👤</span>
          My Profile
        </a>
        <a class="sidebar-link active" href="admin-dashboard.html">
          <span class="sidebar-link-icon">🛡️</span>
          Admin Dashboard
        </a>
      `;
    } else if (isOwner) {
      sidebarNav.innerHTML = `
        <a class="sidebar-link" href="#" onclick="openProfileModal(); return false;">
          <span class="sidebar-link-icon">👤</span>
          Workshop Profile
        </a>
        <a class="sidebar-link active" href="owner-dashboard.html">
          <span class="sidebar-link-icon">🛠️</span>
          Workshop Dashboard
        </a>
      `;
    } else {
      sidebarNav.innerHTML = `
        <a class="sidebar-link" href="#" onclick="openProfileModal(); return false;">
          <span class="sidebar-link-icon">👤</span>
          My Profile
        </a>
        <a class="sidebar-link" href="index.html">
          <span class="sidebar-link-icon">🏠</span>
          Overview
        </a>
        <a class="sidebar-link" href="garage.html">
          <span class="sidebar-link-icon">🏢</span>
          Garages
        </a>
        <a class="sidebar-link" href="map.html">
          <span class="sidebar-link-icon">🗺️</span>
          Map
        </a>
        <a class="sidebar-link" href="services.html">
          <span class="sidebar-link-icon">🧰</span>
          Services &amp; Pricing
        </a>
        <a class="sidebar-link" href="tracking.html">
          <span class="sidebar-link-icon">📅</span>
          My Bookings &amp; Status
        </a>
      `;
    }
  }

  if (sidebarLogoutBtn) {
    if (loggedIn) {
      sidebarLogoutBtn.textContent = "Sign Out";
      sidebarLogoutBtn.onclick = () => logout();
      sidebarLogoutBtn.classList.remove("guest-btn");
    } else {
      sidebarLogoutBtn.textContent = "Sign In / Register";
      sidebarLogoutBtn.onclick = () => { window.location.href = "login.html"; };
      sidebarLogoutBtn.classList.add("guest-btn");
    }
    sidebarLogoutBtn.hidden = false;
    sidebarLogoutBtn.style.display = "flex";
  }

  ensureVehicleModeSelector();
}

/**
 * Vehicle Mode Management (Car vs Bike).
 */
function getVehicleMode() {
  return localStorage.getItem("autobuddyVehicleMode") || "car";
}

function setVehicleMode(mode) {
  const normalized = mode === "bike" ? "bike" : "car";
  localStorage.setItem("autobuddyVehicleMode", normalized);

  document.querySelectorAll(".vehicle-mode-btn").forEach((btn) => {
    const isTarget = btn.dataset.vehicle === normalized;
    btn.classList.toggle("active", isTarget);
    btn.setAttribute("aria-pressed", String(isTarget));
  });

  window.dispatchEvent(new CustomEvent("vehicleModeChanged", { detail: { mode: normalized } }));

  if (typeof renderVehicleServicesCatalog === "function") {
    renderVehicleServicesCatalog(normalized);
  }

  if (typeof showToast === "function") {
    showToast(`Switched to ${normalized.toUpperCase()} mode.`, "neutral");
  }
}

function ensureVehicleModeSelector() {
  // Do not render vehicle mode toggle on authentication / login pages
  const isAuthPage = document.body.classList.contains("auth-body") ||
                     Boolean(document.querySelector(".auth-page")) ||
                     window.location.pathname.toLowerCase().includes("login") ||
                     window.location.pathname.toLowerCase().includes("signup");
  
  if (isAuthPage) {
    const existing = document.querySelector(".vehicle-mode-selector");
    if (existing) existing.remove();
    return;
  }

  const topbarRight = document.querySelector(".topbar-right");
  if (!topbarRight || document.querySelector(".vehicle-mode-selector")) {
    return;
  }

  const currentMode = getVehicleMode();
  const selectorHtml = `
    <div class="vehicle-mode-selector" role="group" aria-label="Select Vehicle Type">
      <button type="button" class="vehicle-mode-btn ${currentMode === "car" ? "active" : ""}" data-vehicle="car" onclick="setVehicleMode('car')" title="Car Mode" aria-pressed="${currentMode === "car"}">
        <span class="vehicle-mode-icon">🚗</span>
        <span class="vehicle-mode-label">Car</span>
      </button>
      <button type="button" class="vehicle-mode-btn ${currentMode === "bike" ? "active" : ""}" data-vehicle="bike" onclick="setVehicleMode('bike')" title="Bike Mode" aria-pressed="${currentMode === "bike"}">
        <span class="vehicle-mode-icon">🏍️</span>
        <span class="vehicle-mode-label">Bike</span>
      </button>
    </div>
  `;

  topbarRight.insertAdjacentHTML("afterbegin", selectorHtml);
}

// Global attachments
window.toggleSidebar = toggleSidebar;
window.openProfileModal = openProfileModal;
window.closeProfileModal = closeProfileModal;
window.saveProfile = saveProfile;
window.handleProfileBackdropClick = handleProfileBackdropClick;
window.getVehicleMode = getVehicleMode;
window.setVehicleMode = setVehicleMode;

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  renderSessionUi();
  ensureProfileModal();
  ensureVehicleModeSelector();
});

// Escape key closes sidebar and modal
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    toggleSidebar(false);
    closeProfileModal();
  }
});
