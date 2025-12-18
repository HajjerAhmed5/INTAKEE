/* ===============================
   INTAKEE — TAB SYSTEM (FINAL FIXED)
================================ */

const tabs = document.querySelectorAll(".bottom-nav a");
const sections = document.querySelectorAll(".tab-section");

function showTab(tabId) {
  // HARD hide all sections
  sections.forEach(section => {
    section.style.display = "none";
    section.classList.remove("active");
  });

  // Deactivate all tabs
  tabs.forEach(tab => tab.classList.remove("active"));

  // Show selected section
  const activeSection = document.getElementById(tabId);
  const activeTab = document.querySelector(`.bottom-nav a[data-tab="${tabId}"]`);

  if (activeSection) {
    activeSection.style.display = "block";
    activeSection.classList.add("active");
  }

  if (activeTab) {
    activeTab.classList.add("active");
  }

 
  document.body.setAttribute("data-tab", tabId);

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
   INITIAL LOAD
================================ */
window.addEventListener("DOMContentLoaded", () => {
  const hash = window.location.hash.replace("#", "");
  const initialTab = document.getElementById(hash) ? hash : "home";
  showTab(initialTab);
});
