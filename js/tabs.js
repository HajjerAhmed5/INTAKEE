/* ===============================
   INTAKEE — TAB SYSTEM (SAFE FINAL)
================================ */

const tabs = document.querySelectorAll(".bottom-nav a");
const sections = document.querySelectorAll(".tab-section");

function showTab(tabId) {
  // Hide all sections via class
  sections.forEach(section => {
    section.classList.remove("active");
  });

  // Deactivate all tabs
  tabs.forEach(tab => tab.classList.remove("active"));

  // Activate selected section
  const activeSection = document.getElementById(tabId);
  const activeTab = document.querySelector(`.bottom-nav a[data-tab="${tabId}"]`);

  if (activeSection) {
    activeSection.classList.add("active");
  }

  if (activeTab) {
    activeTab.classList.add("active");
  }

  history.replaceState(null, "", `#${tabId}`);
}

/* ===============================
   CLICK HANDLERS
================================ */
tabs.forEach(tab => {
  tab.addEventListener("click", e => {
    e.preventDefault();
    showTab(tab.dataset.tab);
  });
});

/* ===============================
   LOAD FROM HASH
================================ */
window.addEventListener("DOMContentLoaded", () => {
  const hash = window.location.hash.replace("#", "");
  showTab(document.getElementById(hash) ? hash : "home");
});
