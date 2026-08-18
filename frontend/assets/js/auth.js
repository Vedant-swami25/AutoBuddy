/**
 * AutoBuddy Multi-Role (Admin, User & Garage Owner) Authentication Controller
 * Strict separation of Sign In (Admin / User / Garage Owner) vs Sign Up.
 */

const ADMIN_MOBILE = "9579278177";

let authState = {
  role: "user", // "user" | "garage_owner" | "admin"
  mode: "signin", // "signin" | "signup"
  signinName: "",
  signinMobile: "",
  signupPayload: null,
  demoOtp: null
};

function getCurrentPage() {
  const page = window.location.pathname.split("/").pop();
  return page || "index.html";
}

function getAuthSession() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || "null");
  } catch (error) {
    return null;
  }
}

function isAuthenticated() {
  const session = getAuthSession();
  return Boolean(session?.mobile);
}

function getUserRole() {
  const session = getAuthSession();
  return session?.role || "user";
}

function isGarageOwner() {
  return getUserRole() === "garage_owner";
}

function isAdmin() {
  const session = getAuthSession();
  return session?.role === "admin" || session?.mobile === ADMIN_MOBILE;
}

function getRedirectTarget() {
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get("redirect");

  if (!redirect || redirect.includes("login.html") || redirect === "login") {
    if (isAdmin()) return "admin-dashboard.html";
    if (isGarageOwner()) return "owner-dashboard.html";
    return "index.html";
  }

  return redirect;
}

function guardRoute() {
  const loggedIn = isAuthenticated();
  const role = getUserRole();
  const currentPage = getCurrentPage();

  // Protect Admin Dashboard
  if (currentPage === "admin-dashboard.html") {
    if (!loggedIn || !isAdmin()) {
      showToast("Access restricted: Administrator credentials required.", "warning");
      window.location.replace("login.html?redirect=admin-dashboard.html");
      return;
    }
  }

  // Protect Owner Dashboard from unauthenticated users or normal users
  if (currentPage === "owner-dashboard.html") {
    if (!loggedIn) {
      window.location.replace("login.html?role=owner&redirect=owner-dashboard.html");
      return;
    }
    if (role !== "garage_owner") {
      showToast("Access restricted: Garage Owner account required.", "warning");
      window.location.replace("login.html?role=owner&redirect=owner-dashboard.html");
      return;
    }
  }

  // If user visits partner landing while logged in as garage owner
  if (currentPage === "partner.html" && loggedIn && role === "garage_owner") {
    window.location.replace("owner-dashboard.html");
  }
}

function logout() {
  clearLoginSession();
  showToast("You have been signed out.", "neutral");
  window.location.replace("index.html");
}

function setAuthRole(role) {
  authState.role = role === "garage_owner" || role === "owner" ? "garage_owner" : "user";

  // Update role buttons in UI
  document.querySelectorAll(".auth-role-tab").forEach((tab) => {
    const tabRole = tab.dataset.role;
    tab.classList.toggle("active", tabRole === authState.role || (tabRole === "owner" && authState.role === "garage_owner"));
    tab.setAttribute("aria-selected", String(tab.classList.contains("active")));
  });

  // Update role badge and owner-only fields
  const roleBadge = document.getElementById("authRoleBadge");
  const ownerFields = document.querySelectorAll(".owner-only-field");
  const isOwner = authState.role === "garage_owner";

  if (roleBadge) {
    roleBadge.textContent = isOwner ? "Garage Owner Portal" : "User Portal";
  }

  ownerFields.forEach((el) => {
    el.style.display = isOwner ? "" : "none";
  });

  updateAuthTitles();
  resetCurrentFlow();
}

function setAuthMode(mode) {
  authState.mode = mode === "signup" ? "signup" : "signin";

  // Update mode buttons in UI
  document.querySelectorAll(".auth-mode-tab").forEach((tab) => {
    const tabMode = tab.dataset.mode;
    tab.classList.toggle("active", tabMode === authState.mode);
    tab.setAttribute("aria-selected", String(tabMode === authState.mode));
  });

  // Toggle flow containers
  const flowSignIn = document.getElementById("flowSignIn");
  const flowSignUp = document.getElementById("flowSignUp");

  if (flowSignIn) flowSignIn.style.display = authState.mode === "signin" ? "" : "none";
  if (flowSignUp) flowSignUp.style.display = authState.mode === "signup" ? "" : "none";

  updateAuthTitles();
  resetCurrentFlow();
}

function updateAuthTitles() {
  const titleEl = document.getElementById("authCardTitle");
  const subtitleEl = document.getElementById("authCardSubtitle");
  const isOwner = authState.role === "garage_owner";
  const roleName = isOwner ? "Garage Owner" : "User";

  if (authState.mode === "signin") {
    if (titleEl) titleEl.textContent = `Sign In as ${roleName}`;
    if (subtitleEl) subtitleEl.textContent = `Enter your registered name and mobile number to sign in.`;
  } else {
    if (titleEl) titleEl.textContent = `Create ${roleName} Account`;
    if (subtitleEl) subtitleEl.textContent = isOwner
      ? `Register your workshop to receive direct user bookings.`
      : `Sign up for on-demand roadside assistance and garage care.`;
  }
}

function resetCurrentFlow() {
  authState.demoOtp = null;
  const demoBanner = document.getElementById("demoOtpBanner");
  if (demoBanner) demoBanner.style.display = "none";

  const statusEl = document.getElementById("loginStatus");
  if (statusEl) {
    statusEl.textContent = "";
    statusEl.className = "status-banner";
    statusEl.style.display = "none";
  }

  const noAccNotice = document.getElementById("signinNoAccountNotice");
  if (noAccNotice) noAccNotice.style.display = "none";

  // Reset SignIn steps
  const signinStepMobile = document.getElementById("signinStepMobile");
  const signinStepOtp = document.getElementById("signinStepOtp");
  if (signinStepMobile) signinStepMobile.style.display = "";
  if (signinStepOtp) signinStepOtp.style.display = "none";

  // Reset SignUp steps
  const signupStepDetails = document.getElementById("signupStepDetails");
  const signupStepOtp = document.getElementById("signupStepOtp");
  if (signupStepDetails) signupStepDetails.style.display = "";
  if (signupStepOtp) signupStepOtp.style.display = "none";
}

function showDemoOtpBanner(code) {
  authState.demoOtp = code;
  const banner = document.getElementById("demoOtpBanner");
  const codeSpan = document.getElementById("demoCodeValue");
  if (banner && codeSpan) {
    codeSpan.textContent = code;
    banner.style.display = "flex";
  }
}

function autofillDemoOtp() {
  if (!authState.demoOtp) return;
  const targetInput = authState.mode === "signin"
    ? document.getElementById("signinOtp")
    : document.getElementById("signupOtp");

  if (targetInput) {
    targetInput.value = authState.demoOtp;
    targetInput.focus();
  }
}

// ======================== SIGN IN LOGIC (Admin / User / Owner) ========================

async function handleSigninSendOtp(event) {
  if (event) event.preventDefault();

  const mobileInput = document.getElementById("signinMobile");
  const mobile = String(mobileInput?.value || "").replace(/\D/g, "").slice(-10);

  if (!/^\d{10}$/.test(mobile)) {
    setStatus("loginStatus", "Please enter a valid 10-digit mobile number.", "error");
    showToast("A valid 10-digit mobile number is required.", "error");
    if (mobileInput) mobileInput.focus();
    return;
  }

  const isAdminMobile = mobile === ADMIN_MOBILE;

  const nameInput = document.getElementById("signinName");
  const name = String(nameInput?.value || "").trim();

  // Admin does NOT require name. Normal User/Owner requires name.
  if (!isAdminMobile && !name) {
    setStatus("loginStatus", "Please enter your full name.", "error");
    showToast("Name is required.", "error");
    if (nameInput) nameInput.focus();
    return;
  }

  const btn = document.getElementById("signinSendOtpBtn");
  const noAccNotice = document.getElementById("signinNoAccountNotice");
  if (noAccNotice) noAccNotice.style.display = "none";

  setButtonLoading(btn, true, isAdminMobile ? "Authorizing Admin..." : "Checking Account...");
  setStatus("loginStatus", "Checking account credentials...", "neutral");

  try {
    const payload = isAdminMobile
      ? { mobile, role: "admin" }
      : { name, mobile, role: authState.role };

    const res = await signinOtpApi(payload);
    authState.signinName = isAdminMobile ? "System Administrator" : name;
    authState.signinMobile = mobile;

    // Transition to OTP step
    const stepMobile = document.getElementById("signinStepMobile");
    const stepOtp = document.getElementById("signinStepOtp");
    const displayMobile = document.getElementById("signinDisplayMobile");

    if (stepMobile) stepMobile.style.display = "none";
    if (stepOtp) stepOtp.style.display = "";
    if (displayMobile) {
      displayMobile.textContent = isAdminMobile
        ? `+91 ${mobile} (System Administrator)`
        : `+91 ${mobile} (${name})`;
    }

    if (res.demoOtp) {
      showDemoOtpBanner(res.demoOtp);
    }

    const roleMsg = isAdminMobile ? "Admin verification code sent." : `Verification code sent to +91 ${mobile}.`;
    setStatus("loginStatus", roleMsg, "success");
    showToast(roleMsg, "success");

    const otpInput = document.getElementById("signinOtp");
    if (otpInput) {
      otpInput.value = "";
      otpInput.focus();
    }
  } catch (error) {
    console.warn("Signin OTP error:", error);
    const roleLabel = authState.role === "garage_owner" ? "Garage Owner" : "User";
    setStatus("loginStatus", "Account not found. Please create an account first.", "warning");
    showToast("Account not found. Please create an account first.", "warning");

    if (noAccNotice) {
      noAccNotice.style.display = "block";
      const goToSignupBtn = document.getElementById("signinGoToSignupBtn");
      if (goToSignupBtn) {
        goToSignupBtn.textContent = `Create New ${roleLabel} Account →`;
        goToSignupBtn.onclick = () => {
          setAuthMode("signup");
          const signupNameInput = document.getElementById("signupName");
          const signupMobileInput = document.getElementById("signupMobile");
          if (signupNameInput) signupNameInput.value = name;
          if (signupMobileInput) signupMobileInput.value = mobile;
        };
      }
    }
  } finally {
    setButtonLoading(btn, false, "Continue with OTP →");
  }
}

async function handleSigninVerifyOtp(event) {
  if (event) event.preventDefault();

  const otpInput = document.getElementById("signinOtp");
  const otp = String(otpInput?.value || "").trim();

  if (!otp || otp.length < 4) {
    setStatus("loginStatus", "Please enter the verification code.", "error");
    showToast("Please enter the verification code.", "error");
    return;
  }

  const isAdminMobile = authState.signinMobile === ADMIN_MOBILE;

  const btn = document.getElementById("signinVerifyBtn");
  setButtonLoading(btn, true, "Signing In...");
  setStatus("loginStatus", "Verifying credentials...", "neutral");

  try {
    const payload = isAdminMobile
      ? { mobile: ADMIN_MOBILE, otp, role: "admin" }
      : {
          name: authState.signinName,
          mobile: authState.signinMobile,
          otp,
          role: authState.role
        };

    const res = await verifySigninApi(payload);

    if (res.user) {
      completeLogin(res.user, isAdminMobile ? "Admin login successful!" : "Login successful!");
      return;
    }

    throw new Error(res.message || "Account not found. Please create an account first.");
  } catch (error) {
    console.error("Sign in verify error:", error);
    setStatus("loginStatus", error.message || "Invalid verification code or account mismatch.", "error");
    showToast(error.message || "Invalid verification code.", "error");
  } finally {
    setButtonLoading(btn, false, "Verify & Sign In →");
  }
}

// ======================== SIGN UP LOGIC ========================

async function handleSignupGetOtp(event) {
  if (event) event.preventDefault();

  const name = document.getElementById("signupName")?.value.trim();
  const mobileInput = document.getElementById("signupMobile");
  const mobile = String(mobileInput?.value || "").replace(/\D/g, "").slice(-10);
  const district = document.getElementById("signupDistrict")?.value.trim() || "Pune";
  const state = document.getElementById("signupState")?.value.trim() || "Maharashtra";
  const email = document.getElementById("signupEmail")?.value.trim() || "";

  const isOwner = authState.role === "garage_owner";
  const garageName = isOwner ? document.getElementById("signupGarageName")?.value.trim() : "";
  const address = isOwner ? (document.getElementById("signupAddress")?.value.trim() || district) : district;

  if (mobile === ADMIN_MOBILE) {
    setStatus("loginStatus", "Admin number 9579278177 cannot be registered as a normal user. Please use Sign In.", "error");
    showToast("Admin number is reserved. Please Sign In.", "error");
    return;
  }

  if (!name) {
    setStatus("loginStatus", "Please enter your full name.", "error");
    showToast("Name is required.", "error");
    return;
  }

  if (!/^\d{10}$/.test(mobile)) {
    setStatus("loginStatus", "Please enter a valid 10-digit mobile number.", "error");
    showToast("A valid 10-digit mobile number is required.", "error");
    return;
  }

  if (isOwner && !garageName) {
    setStatus("loginStatus", "Please enter your workshop / garage name.", "error");
    showToast("Workshop name is required for Garage Owners.", "error");
    return;
  }

  authState.signupPayload = {
    name,
    mobile,
    district,
    state,
    email,
    address,
    garageName,
    role: authState.role
  };

  const btn = document.getElementById("signupGetOtpBtn");
  setButtonLoading(btn, true, "Sending Code...");
  setStatus("loginStatus", "Checking availability...", "neutral");

  try {
    const res = await signupOtpApi({ name, mobile, role: authState.role, garageName });

    // Transition to SignUp OTP step
    const stepDetails = document.getElementById("signupStepDetails");
    const stepOtp = document.getElementById("signupStepOtp");
    const displayMobile = document.getElementById("signupDisplayMobile");

    if (stepDetails) stepDetails.style.display = "none";
    if (stepOtp) stepOtp.style.display = "";
    if (displayMobile) displayMobile.textContent = `+91 ${mobile} (${name})`;

    if (res.demoOtp) {
      showDemoOtpBanner(res.demoOtp);
    }

    setStatus("loginStatus", `Verification code sent to +91 ${mobile}.`, "success");
    showToast("Verification code sent.", "success");

    const otpInput = document.getElementById("signupOtp");
    if (otpInput) {
      otpInput.value = "";
      otpInput.focus();
    }
  } catch (error) {
    console.warn("Signup OTP error:", error);
    setStatus("loginStatus", error.message || "An account already exists for this mobile. Please Sign In.", "warning");
    showToast(error.message || "Account already exists. Please Sign In.", "warning");
  } finally {
    setButtonLoading(btn, false, "Get Verification Code →");
  }
}

async function handleSignupComplete(event) {
  if (event) event.preventDefault();

  const otpInput = document.getElementById("signupOtp");
  const otp = String(otpInput?.value || "").trim();

  if (!otp || otp.length < 4) {
    setStatus("loginStatus", "Please enter the verification code.", "error");
    showToast("Please enter the verification code.", "error");
    return;
  }

  const btn = document.getElementById("signupCompleteBtn");
  setButtonLoading(btn, true, "Creating Account...");
  setStatus("loginStatus", "Registering account...", "neutral");

  try {
    const payload = {
      ...authState.signupPayload,
      otp
    };

    const res = await signupApi(payload);

    if (res.user) {
      completeLogin(res.user, "Account created successfully! Welcome to AutoBuddy.");
      return;
    }

    throw new Error(res.message || "Registration failed");
  } catch (error) {
    console.error("Signup complete error:", error);
    setStatus("loginStatus", error.message || "Could not complete registration.", "error");
    showToast(error.message || "Registration failed.", "error");
  } finally {
    setButtonLoading(btn, false, "Verify OTP & Create Account →");
  }
}

function initAuthPage() {
  const params = new URLSearchParams(window.location.search);
  const roleParam = params.get("role");
  const modeParam = params.get("mode");

  const initialRole = (roleParam === "owner" || roleParam === "garage_owner") ? "garage_owner" : "user";
  const initialMode = modeParam === "signup" ? "signup" : "signin";

  setAuthRole(initialRole);
  setAuthMode(initialMode);

  // Bind Role Tabs
  document.querySelectorAll(".auth-role-tab").forEach((tab) => {
    tab.addEventListener("click", () => setAuthRole(tab.dataset.role));
  });

  // Bind Mode Tabs
  document.querySelectorAll(".auth-mode-tab").forEach((tab) => {
    tab.addEventListener("click", () => setAuthMode(tab.dataset.mode));
  });

  // Bind Sign In Handlers
  const signinSendBtn = document.getElementById("signinSendOtpBtn");
  const signinVerifyBtn = document.getElementById("signinVerifyBtn");
  const signinChangeMobileBtn = document.getElementById("signinChangeMobileBtn");

  if (signinSendBtn) signinSendBtn.addEventListener("click", handleSigninSendOtp);
  if (signinVerifyBtn) signinVerifyBtn.addEventListener("click", handleSigninVerifyOtp);
  if (signinChangeMobileBtn) signinChangeMobileBtn.addEventListener("click", () => {
    resetCurrentFlow();
    const input = document.getElementById("signinMobile");
    if (input) input.focus();
  });

  // Bind Sign Up Handlers
  const signupGetOtpBtn = document.getElementById("signupGetOtpBtn");
  const signupCompleteBtn = document.getElementById("signupCompleteBtn");
  const signupChangeDetailsBtn = document.getElementById("signupChangeDetailsBtn");

  if (signupGetOtpBtn) signupGetOtpBtn.addEventListener("click", handleSignupGetOtp);
  if (signupCompleteBtn) signupCompleteBtn.addEventListener("click", handleSignupComplete);
  if (signupChangeDetailsBtn) signupChangeDetailsBtn.addEventListener("click", () => {
    const stepDetails = document.getElementById("signupStepDetails");
    const stepOtp = document.getElementById("signupStepOtp");
    if (stepDetails) stepDetails.style.display = "";
    if (stepOtp) stepOtp.style.display = "none";
  });

  // Bind Demo OTP autofill
  const demoBanner = document.getElementById("demoOtpBanner");
  if (demoBanner) demoBanner.addEventListener("click", autofillDemoOtp);
}

window.logout = logout;
window.setAuthRole = setAuthRole;
window.setAuthMode = setAuthMode;
window.isAdmin = isAdmin;

document.addEventListener("DOMContentLoaded", () => {
  guardRoute();
  if (getCurrentPage() === "login.html") {
    initAuthPage();
  }
});
