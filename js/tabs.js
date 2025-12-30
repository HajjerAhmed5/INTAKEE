/* ===============================
   INTAKEE — TAB SYSTEM (FINAL)
================================ */
function isLoggedIn() {
  return document.getElementById("headerUsername")?.textContent?.length > 0;
}
const tabs = document.querySelectorAll(".bottom-nav a");
const sections = document.querySelectorAll(".tab-section");

function showTab(tabId) {
  // Hide ALL sections (hard reset)
  sections.forEach(section => {
    section.style.display = "none";
    section.classList.remove("active");
  });

  // Deactivate all nav tabs
  tabs.forEach(tab => tab.classList.remove("active"));

  // Find section + nav
  const activeSection = document.getElementById(tabId);
  const activeTab = document.querySelector(
    `.bottom-nav a[data-tab="${tabId}"]`
  );

  // Show section (THIS FIXES SETTINGS)
  if (activeSection) {
    activeSection.style.display = "block";
    activeSection.classList.add("active");
  }

  // Highlight nav
  if (activeTab) {
    activeTab.classList.add("active");
  }

  // Set body state (search bar logic depends on this)
  document.body.setAttribute("data-tab", tabId);

  // Update URL hash safely
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
