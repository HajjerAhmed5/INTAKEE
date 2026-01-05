/* ===============================
   INTAKEE — TAB SYSTEM (FINAL STABLE)
================================ */

const sections = document.querySelectorAll(".tab-section");
const tabs = document.querySelectorAll(".bottom-nav a");

const PROTECTED_TABS = ["upload", "profile", "settings"];

/* ================= HELPERS ================= */
function isAuthReady() {
  return window.__AUTH_READY__ === true;
}

function isLoggedIn() {
  return window.__AUTH_IN__ === true;
}

/* ================= SHOW TAB ================= */
function showTab(tabId) {
  // 🔒 Block protected tabs if logged out
  if (PROTECTED_TABS.includes(tabId) && !isLoggedIn()) {
    console.warn("Blocked protected tab:", tabId);
    document.getElementById("authDialog")?.showModal();
    return;
  }

  sections.forEach(section => {
    section.classList.remove("active");
    section.style.display = "none";
  });

  tabs.forEach(tab => tab.classList.remove("active"));

  const activeSection = document.getElementById(tabId);
  const activeTab = document.querySelector(`.bottom-nav a[data-tab="${tabId}"]`);

  if (activeSection) {
    activeSection.style.display = "block";
    activeSection.classList.add("active");
  }

  if (activeTab) activeTab.classList.add("active");

  document.body.setAttribute("data-tab", tabId);
  history.replaceState(null, "", `#${tabId}`);
}

/* ================= CLICK HANDLERS ================= */
tabs.forEach(tab => {
  tab.addEventListener("click", (e) => {
    e.preventDefault();

    if (!isAuthReady()) return;

    showTab(tab.dataset.tab);
  });
});

/* ================= INITIAL LOAD ================= */
window.addEventListener("DOMContentLoaded", () => {
  const hash = window.location.hash.replace("#", "");

  // ⏳ Wait until auth is ready
  const waitForAuth = setInterval(() => {
    if (!isAuthReady()) return;

    clearInterval(waitForAuth);
    showTab(document.getElementById(hash) ? hash : "home");
  }, 50);
});
