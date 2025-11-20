// ============================================
// INTAKEE — TAB SWITCHING SYSTEM
// Handles switching between all 7 tabs
// ============================================

'use strict';

// Tab containers
const tabs = {
  home: document.querySelector("#tab-home"),
  videos: document.querySelector("#tab-videos"),
  podcast: document.querySelector("#tab-podcast"),
  upload: document.querySelector("#tab-upload"),
  clips: document.querySelector("#tab-clips"),
  profile: document.querySelector("#tab-profile"),
  settings: document.querySelector("#tab-settings")
};

// Bottom nav links
const navLinks = document.querySelectorAll(".bottom-nav a");

// Global search bar
const searchBar = document.querySelector(".search-bar");

// SWITCH FUNCTION
export function switchTab(tabName) {
  // Show selected tab, hide others
  Object.keys(tabs).forEach(name => {
    tabs[name].style.display = name === tabName ? "block" : "none";
  });

  // Activate selected bottom nav icon
  navLinks.forEach(link => {
    link.classList.toggle("active", link.dataset.tab === tabName);
  });

  // Hide search bar only on Upload + Settings
  if (tabName === "upload" || tabName === "settings") {
    searchBar.style.display = "none";
  } else {
    searchBar.style.display = "flex";
  }
}

// ATTACH CLICK LISTENERS
navLinks.forEach(link => {
  link.addEventListener("click", () => {
    switchTab(link.dataset.tab);
  });
});

// Default tab
switchTab("home");

// Make globally available
window.switchTab = switchTab;
