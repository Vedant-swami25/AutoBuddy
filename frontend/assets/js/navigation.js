/**
 * Theme, sidebar, account header, and shared navigation behavior.
 *
 * This code was moved out of app.js so this file has one feature-focused
 * responsibility while preserving the original browser behavior.
 */

function applyTheme(theme) {
  const nextTheme = theme === "light" ? "light" : "dark";
  document.body.dataset.theme = nextTheme;
  localStorage.setItem(THEME_STORAGE_KEY, nextTheme);

  const label = document.getElementById("themeToggleLabel");
  if (label) {
    label.textContent = nextTheme === "dark" ? "Light mode" : "Dark mode";
  }
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
  backdrop.classList.toggle("visible", nextState);
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
  const session = getAuthSession();
  const loggedIn = isAuthenticated();

  authOnlyItems.forEach((item) => {
    item.hidden = !loggedIn;
  });

  guestOnlyItems.forEach((item) => {
    item.hidden = loggedIn;
  });

  const displayName = String(session?.name || "Driver").trim();
  const initial = displayName ? displayName[0].toUpperCase() : "A";

  if (userName && loggedIn) {
    userName.textContent = displayName;
  }

  if (sidebarUserName && loggedIn) {
    sidebarUserName.textContent = displayName;
  }

  if (sidebarUserContact && loggedIn) {
    sidebarUserContact.textContent = session.mobile || "driver@email.com";
  }

  if (sidebarAvatar) {
    sidebarAvatar.textContent = initial;
  }

  toggleTrackingLinkVisibility();
}

