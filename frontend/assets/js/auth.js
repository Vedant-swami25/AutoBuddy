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

const PUBLIC_PAGES = ["login.html", "partner.html"];

function getCurrentPage() {
  let page = window.location.pathname.split("/").pop();
  if (!page || page === "home" || page === "") page = "index.html";
  if (!page.endsWith(".html")) page = `${page}.html`;
  return page;
}

function isAuthenticated() {
  const session = typeof getAuthSession === "function" ? getAuthSession() : null;
  return Boolean(session?.mobile);
}

function getUserRole() {
  const session = typeof getAuthSession === "function" ? getAuthSession() : null;
  return session?.role || "user";
}

function isGarageOwner() {
  return getUserRole() === "garage_owner";
}

function isAdmin() {
  const session = typeof getAuthSession === "function" ? getAuthSession() : null;
  return session?.role === "admin" || session?.mobile === ADMIN_MOBILE;
}

function getRedirectTarget() {
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get("redirect");

  if (redirect && !redirect.includes("login.html") && redirect !== "login") {
    return redirect;
  }

  if (isAdmin()) return "admin-dashboard.html";
  if (isGarageOwner()) return "owner-dashboard.html";
  return "index.html";
}

function guardRoute() {
  const loggedIn = isAuthenticated();
  const role = getUserRole();
  const currentPage = getCurrentPage();

  // 1. Unauthenticated users must NOT access protected pages (Login-First architecture)
  if (!loggedIn) {
    if (!PUBLIC_PAGES.includes(currentPage)) {
      let redirectQuery = "";
      if (currentPage === "owner-dashboard.html") {
        redirectQuery = "?role=owner&redirect=owner-dashboard.html";
      } else if (currentPage === "admin-dashboard.html") {
        redirectQuery = "?redirect=admin-dashboard.html";
      } else if (currentPage !== "index.html") {
        redirectQuery = `?redirect=${encodeURIComponent(currentPage)}`;
      }
      window.location.replace(`login.html${redirectQuery}`);
      return false;
    }
    return true;
  }

  // 2. Authenticated users visiting login page -> Redirect to their role destination
  if (currentPage === "login.html") {
    const target = getRedirectTarget();
    window.location.replace(target);
    return false;
  }

  // 3. Protect Admin Dashboard from non-admins
  if (currentPage === "admin-dashboard.html") {
    if (!isAdmin()) {
      if (typeof showToast === "function") {
        showToast("Access restricted: Administrator credentials required.", "warning");
      }
      const redirectHome = isGarageOwner() ? "owner-dashboard.html" : "index.html";
      window.location.replace(redirectHome);
      return false;
    }
  }

  // 4. Protect Owner Dashboard from customer accounts
  if (currentPage === "owner-dashboard.html") {
    if (role !== "garage_owner" && role !== "admin") {
      if (typeof showToast === "function") {
        showToast("Access restricted: Garage Owner account required.", "warning");
      }
      window.location.replace("index.html");
      return false;
    }
  }

  // 5. If normal customer visits partner landing -> redirect to Customer Home
  if (role === "user" && currentPage === "partner.html") {
    window.location.replace("index.html");
    return false;
  }

  // 6. Garage owners visiting partner landing or customer home -> route to owner dashboard
  if (role === "garage_owner") {
    if (currentPage === "partner.html" || (currentPage === "index.html" && !window.location.search)) {
      window.location.replace("owner-dashboard.html");
      return false;
    }
  }

  // 7. Administrator visiting customer home or partner landing -> route to admin dashboard
  if (isAdmin()) {
    if (currentPage === "index.html" || currentPage === "partner.html") {
      window.location.replace("admin-dashboard.html");
      return false;
    }
  }

  return true;
}

function completeLogin(session, statusMessage = "Authentication successful. Opening your dashboard now...") {
  persistLoginSession(session);
  if (typeof setStatus === "function") {
    setStatus("loginStatus", statusMessage, "success");
  }
  if (typeof showToast === "function") {
    showToast(`Welcome, ${session.name}.`, "success");
  }
  const target = getRedirectTarget();
  window.setTimeout(() => {
    window.location.replace(target);
  }, 350);
}

function logout() {
  clearLoginSession();
  if (typeof showToast === "function") {
    showToast("You have been signed out.", "neutral");
  }
  window.location.replace("login.html");
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
    const msg = error.message || "Account not found. Please create an account first.";
    setStatus("loginStatus", msg, "warning");
    showToast(msg, "warning");

    if (noAccNotice) {
      noAccNotice.style.display = "block";
      const goToSignupBtn = document.getElementById("signinGoToSignupBtn");
      if (goToSignupBtn) {
        goToSignupBtn.onclick = () => {
          setAuthMode("signup");
          const signupName = document.getElementById("signupName");
          const signupMobile = document.getElementById("signupMobile");
          if (signupName && name) signupName.value = name;
          if (signupMobile && mobile) signupMobile.value = mobile;
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
window.completeLogin = completeLogin;
window.setAuthRole = setAuthRole;
window.setAuthMode = setAuthMode;
window.isAdmin = isAdmin;
window.isGarageOwner = isGarageOwner;
window.isAuthenticated = isAuthenticated;
window.getUserRole = getUserRole;
window.guardRoute = guardRoute;
window.initAuthPage = initAuthPage;

// Run immediate route guard check on script load
guardRoute();

document.addEventListener("DOMContentLoaded", () => {
  guardRoute();
  if (getCurrentPage() === "login.html") {
    initAuthPage();
  }
});

// Enforce route guarding on browser back/forward cache navigation
window.addEventListener("pageshow", (event) => {
  if (event.persisted || (window.performance && window.performance.navigation && window.performance.navigation.type === 2)) {
    guardRoute();
  }
});
