/**
 * Theme, sidebar, account header, and shared navigation behavior.
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

  authOnlyItems.forEach((item) => {
    item.hidden = !loggedIn;
    if (loggedIn && item.style.display === "none") {
      item.style.display = "";
    }
  });

  guestOnlyItems.forEach((item) => {
    item.hidden = loggedIn;
    if (!loggedIn && item.style.display === "none") {
      item.style.display = "";
    }
  });

  const displayName = String(session?.name || (isOwner ? "Garage Owner" : "User")).trim();
  const initial = displayName ? displayName[0].toUpperCase() : (isOwner ? "W" : "U");

  if (userName) {
    if (loggedIn) {
      userName.textContent = isOwner ? `${displayName} (Owner)` : displayName;
    } else {
      userName.textContent = "Sign In";
    }
  }

  if (sidebarUserName) {
    sidebarUserName.textContent = loggedIn ? displayName : "Guest User";
  }

  if (sidebarUserContact) {
    sidebarUserContact.textContent = loggedIn
      ? (isOwner ? `Workshop: ${session.garageName || session.mobile}` : (session.mobile || session.email || ""))
      : "Not signed in";
  }

  if (sidebarAvatar) {
    sidebarAvatar.textContent = loggedIn ? initial : "👤";
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
}

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  renderSessionUi();
});
