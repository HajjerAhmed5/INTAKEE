/* ===============================
   INTAKEE — TAB SYSTEM (FIXED)
   - Auth-aware
   - No false blocking
================================ */

const tabs = document.querySelectorAll(".bottom-nav a");
const sections = document.querySelectorAll(".tab-section");
const authDialog = document.getElementById("authDialog");

/* ================= AUTH CHECK ================= */
function isLoggedIn() {
  const username = document.getElementById("headerUsername");
  return !!username && username.textContent.trim().length > 0;
}

const PROTECTED_TABS = ["upload", "profile", "settings"];

/* ================= SHOW TAB ================= */
function showTab(tabId) {
  // 🔐 block protected tabs if not logged in
  if (PROTECTED_TABS.includes(tabId) && !isLoggedIn()) {
    authDialog?.showModal();
    return;
  }

  // Hide all sections
  sections.forEach(section => {
    section.style.display = "none";
    section.classList.remove("active");
  });

  // Deactivate nav tabs
  tabs.forEach(tab => tab.classList.remove("active"));

  // Activate selected section
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
  tab.addEventListener("click", e => {
    e.preventDefault();
    showTab(tab.dataset.tab);
  });
});

/* ================= INITIAL LOAD ================= */
window.addEventListener("DOMContentLoaded", () => {
  const hash = window.location.hash.replace("#", "");
  const initialTab = document.getElementById(hash) ? hash : "home";
  showTab(initialTab);
});
