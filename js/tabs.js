/* ===============================
   INTAKEE — TAB SYSTEM (FIXED)
   - Tabs always switch
   - Protected tabs still gated
   - Auth-safe
================================ */

const sections = document.querySelectorAll(".tab-section");
const tabs = document.querySelectorAll(".bottom-nav a");

const PROTECTED_TABS = ["upload", "profile", "settings"];

/* ================= HELPERS ================= */
function isLoggedIn() {
  return document.body.classList.contains("logged-in");
}

/* ================= SHOW TAB ================= */
function showTab(tabId) {
  // 🔒 Block protected tabs if logged out
  if (PROTECTED_TABS.includes(tabId) && !isLoggedIn()) {
    const dialog = document.getElementById("authDialog");
    if (dialog && !dialog.open) dialog.showModal();
    return;
  }

  // Hide all sections
  sections.forEach(section => {
    section.classList.remove("active");
    section.style.display = "none";
  });

  // Deactivate all tabs
  tabs.forEach(tab => tab.classList.remove("active"));

  // Activate selected section
  const activeSection = document.getElementById(tabId);
  const activeTab = document.querySelector(
    `.bottom-nav a[data-tab="${tabId}"]`
  );

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
  const hash = window.location.hash.replace("#", "") || "home";
  showTab(document.getElementById(hash) ? hash : "home");
});
