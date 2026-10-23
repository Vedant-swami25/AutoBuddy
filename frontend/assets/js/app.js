/**
 * AutoBuddy Application Bootstrap & Global UI Enhancement
 */

document.addEventListener("DOMContentLoaded", () => {
  if (typeof initTheme === "function") {
    initTheme();
  }

  if (typeof guardRoute === "function" && !guardRoute()) {
    return;
  }

  if (typeof renderSessionUi === "function") {
    renderSessionUi();
  }

  const params = new URLSearchParams(window.location.search);
  const notice = params.get("notice");
  if (notice && typeof showToast === "function") {
    showToast(notice, "warning");
  }

  if (typeof window.initRevealAnimations === "function") {
    window.initRevealAnimations();
  }
});
