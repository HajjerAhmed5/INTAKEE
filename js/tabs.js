/* ===============================
   INTAKEE — TAB SYSTEM (FINAL FIX)
   =============================== */

import { auth } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

const sections = document.querySelectorAll(".tab-section");
const tabs = document.querySelectorAll(".bottom-nav a");

const PROTECTED_TABS = ["upload", "profile", "settings"];

let USER_LOGGED_IN = false;
let AUTH_READY = false;

/* ================= AUTH STATE ================= */
onAuthStateChanged(auth, (user) => {
  USER_LOGGED_IN = !!user;
  AUTH_READY = true;
});

/* ================= SHOW TAB ================= */
function showTab(tabId) {
  // 🔒 Block protected tabs silently if logged out
  if (PROTECTED_TABS.includes(tabId) && !USER_LOGGED_IN) {
    console.warn("Blocked protected tab:", tabId);
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

    // Do NOTHING until auth is ready
    if (!AUTH_READY) return;

    showTab(tab.dataset.tab);
  });
});

/* ================= INITIAL LOAD ================= */
window.addEventListener("DOMContentLoaded", () => {
  const hash = window.location.hash.replace("#", "");
  showTab(document.getElementById(hash) ? hash : "home");
});
