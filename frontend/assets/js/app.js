/**
 * Application bootstrap and page-level initialization only.
 *
 * This code was moved out of app.js so this file has one feature-focused
 * responsibility while preserving the original browser behavior.
 */

document.addEventListener("DOMContentLoaded", () => {
  initTheme();

  if (!guardRoute()) {
    return;
  }

  renderSessionUi();
  initLoginForm();
  loadGarages();
  loadMap();
  loadTracking();
  startBookingBackgroundTracker();

  const params = new URLSearchParams(window.location.search);
  const notice = params.get("notice");
  if (notice) {
    showToast(notice, "warning");
  }

  if (typeof window.renderFloatingTrackerLauncher === "function") {
    window.renderFloatingTrackerLauncher();
  }
});
