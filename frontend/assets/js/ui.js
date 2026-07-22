/**
 * Reusable status, toast, and button-loading presentation helpers.
 *
 * This code was moved out of app.js so this file has one feature-focused
 * responsibility while preserving the original browser behavior.
 */

function ensureToastRegion() {
  let region = document.getElementById("toastRegion");
  if (!region) {
    region = document.createElement("div");
    region.id = "toastRegion";
    region.className = "toast-region";
    document.body.appendChild(region);
  }
  return region;
}

function showToast(message, type = "success") {
  const region = ensureToastRegion();
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  region.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 3200);
}

function setStatus(id, message, type = "neutral") {
  const el = document.getElementById(id);
  if (!el) {
    return;
  }

  el.className = "status-banner visible";
  if (type !== "neutral") {
    el.classList.add(type);
  }
  el.textContent = message;
}

function setButtonLoading(button, isLoading, idleLabel) {
  if (!button) {
    return;
  }

  if (isLoading) {
    button.dataset.label = button.textContent.trim();
    button.textContent = "Please wait...";
    button.disabled = true;
    button.classList.add("is-loading");
    return;
  }

  button.disabled = false;
  button.classList.remove("is-loading");
  button.textContent = idleLabel || button.dataset.label || button.textContent;
}

function setActiveStatus(message, type = "neutral") {
  const statusIds = ["homeStatus", "garageStatus", "partnerStatus", "mapStatus"];
  const activeId = statusIds.find((id) => document.getElementById(id));
  if (activeId) {
    setStatus(activeId, message, type);
  }
}

