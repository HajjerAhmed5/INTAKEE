/* ===============================
   INTAKEE — TAB SYSTEM (AUTH SAFE)
================================ */

import { auth } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

const tabs = document.querySelectorAll(".bottom-nav a");
const sections = document.querySelectorAll(".tab-section");
const authDialog = document.getElementById("authDialog");

const PROTECTED_TABS = ["upload", "profile", "settings"];

let AUTH_READY = false;
let USER_LOGGED_IN = false;

/* ================= AUTH READY ================= */
onAuthStateChanged(auth, user => {
  AUTH_READY = true;
  USER_LOGGED_IN = !!user;
});

/* ================= SHOW TAB ================= */
function showTab(tabId) {
  // ⛔ Do nothing until Firebase finishes loading
  if (!AUTH_READY) return;

  // 🔐 Block protected tabs ONLY if logged out
  if (PROTECTED_TABS.includes(tabId) && !USER_LOGGED_IN) {
    authDialog?.showModal();
    return;
  }

  // Hide all sections
  sections.forEach(section => {
    section.style.display = "none";
    section.classList.remove("active");
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
  const initialTab = document.getElementById(hash) ? hash : "home";

  // wait until auth is ready
  const waitForAuth = setInterval(() => {
    if (AUTH_READY) {
      clearInterval(waitForAuth);
      showTab(initialTab);
    }
  }, 50);
});
