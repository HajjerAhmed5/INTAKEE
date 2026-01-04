/* ===============================
   INTAKEE — TAB SYSTEM (FINAL)
================================ */

const tabs = document.querySelectorAll(".bottom-nav a");
const sections = document.querySelectorAll(".tab-section");
const authDialog = document.getElementById("authDialog");
const headerUsername = document.getElementById("headerUsername");

const PROTECTED_TABS = ["upload", "profile", "settings"];

/* ================= AUTH CHECK ================= */
function isLoggedIn() {
  return (
    headerUsername &&
    headerUsername.textContent &&
    headerUsername.textContent.startsWith("@")
  );
}

/* ================= SHOW TAB ================= */
function showTab(tabId) {
  // 🔐 Block protected tabs ONLY if logged out
  if (PROTECTED_TABS.includes(tabId) && !isLoggedIn()) {
    authDialog?.showModal();
    return;
  }

  // Hide all sections
  sections.forEach(section => {
    section.classList.remove("active");
    section.style.display = "none";
  });

  // Deactivate nav
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
  const hash = window.location.hash.replace("#", "");
  const initialTab =
    document.getElementById(hash) ? hash : "home";
  showTab(initialTab);
});
