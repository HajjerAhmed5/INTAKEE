/* ===============================
   INTAKEE — TAB SYSTEM (LOCKED UNTIL AUTH)
================================ */

import { auth } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

const sections = document.querySelectorAll(".tab-section");
const authDialog = document.getElementById("authDialog");

const PROTECTED_TABS = ["upload", "profile", "settings"];

let USER_LOGGED_IN = false;
let AUTH_READY = false;

/* ================= AUTH BOOT ================= */
onAuthStateChanged(auth, user => {
  USER_LOGGED_IN = !!user;
  AUTH_READY = true;
  enableTabs(); // 🔓 unlock tabs ONLY after auth is ready
});

/* ================= SHOW TAB ================= */
function showTab(tabId) {
  if (PROTECTED_TABS.includes(tabId) && !USER_LOGGED_IN) {
    authDialog?.showModal();
    return;
  }

  sections.forEach(section => {
    section.style.display = "none";
    section.classList.remove("active");
  });

  const activeSection = document.getElementById(tabId);
  if (activeSection) {
    activeSection.style.display = "block";
    activeSection.classList.add("active");
  }

  document.body.setAttribute("data-tab", tabId);
  history.replaceState(null, "", `#${tabId}`);
}

/* ================= ENABLE TABS (ONLY ONCE) ================= */
function enableTabs() {
  const tabs = document.querySelectorAll(".bottom-nav a");

  tabs.forEach(tab => {
    tab.addEventListener("click", e => {
      e.preventDefault();
      showTab(tab.dataset.tab);
    });
  });

  const hash = window.location.hash.replace("#", "");
  showTab(document.getElementById(hash) ? hash : "home");
}
