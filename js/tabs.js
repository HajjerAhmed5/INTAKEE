/* ===============================
   INTAKEE — TAB SYSTEM (FINAL)
================================ */

const tabs = document.querySelectorAll(".bottom-nav a");
const sections = document.querySelectorAll(".tab-section");

function showTab(tabId) {
  // Hide all sections
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

  // Update URL hash
  history.replaceState(null, "", `#${tabId}`);
}

/* ===============================
   CLICK HANDLERS
================================ */
tabs.forEach(tab => {
  tab.addEventListener("click", e => {
    e.preventDefault();
    const tabId = tab.dataset.tab;
    showTab(tabId);
  });
});

/* ===============================
   LOAD FROM HASH (REFRESH SAFE)
================================ */
window.addEventListener("load", () => {
  const hash = window.location.hash.replace("#", "");
  const validTab = document.getElementById(hash) ? hash : "home";
  showTab(validTab);
});
