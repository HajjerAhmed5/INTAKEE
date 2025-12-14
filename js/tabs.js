/*  
==========================================
  INTAKEE — TABS NAVIGATION SYSTEM
==========================================
*/

// All tab IDs in your HTML
const TABS = ["home", "videos", "podcasts", "upload", "clips", "profile", "settings"];

// Elements
const header = document.getElementById("mainHeader");
const searchBar = document.getElementById("globalSearchBar");

// Main showTab function
export function showTab(tabName) {
    console.log("Switching to:", tabName);

    TABS.forEach(t => {
        const section = document.getElementById(t);
        if (section) {
            section.style.display = (t === tabName) ? "block" : "none";
        }
    });

    // Update active bottom nav
    document.querySelectorAll(".bottom-nav a").forEach(btn => {
        btn.classList.remove("active");
        if (btn.dataset.tab === tabName) btn.classList.add("active");
    });

    // Header visibility
    if (tabName === "upload" || tabName === "profile") {
        header.style.display = "none";
    } else {
        header.style.display = "flex";
    }

    // Search bar visibility
    if (["home", "videos", "podcasts", "clips"].includes(tabName)) {
        searchBar.style.display = "flex";
    } else {
        searchBar.style.display = "none";
    }

    // Update URL
    location.hash = tabName;

    window.scrollTo(0, 0);
}

// Add click handlers to bottom nav buttons
document.querySelectorAll(".bottom-nav a").forEach(btn => {
    btn.addEventListener("click", () => {
        const tab = btn.dataset.tab;
        showTab(tab);
    });
});

// Load correct tab on refresh
window.addEventListener("load", () => {
    let initial = location.hash.replace("#", "");
    if (!TABS.includes(initial)) initial = "home";
    showTab(initial);
});

// Handle back/forward browser buttons
window.addEventListener("hashchange", () => {
    const tab = location.hash.replace("#", "");
    if (TABS.includes(tab)) showTab(tab);
});
/* ================================
   LOGIN BUTTON VISIBILITY CONTROL
   ================================ */

function updateLoginVisibility(activeTab) {
    const body = document.body;

    // Remove "show login" state by default
    body.classList.remove("show-login-home");

    // User is NOT logged in
    const userNotLoggedIn = !localStorage.getItem("loggedInUser");

    // If HOME tab + user NOT logged in → show login button
    if (activeTab === "home" && userNotLoggedIn) {
        body.classList.add("show-login-home");
    }
}

// Run when switching tabs
document.querySelectorAll("[data-tab]").forEach(tab => {
    tab.addEventListener("click", () => {
        const tabName = tab.getAttribute("data-tab");
        updateLoginVisibility(tabName);
    });
});

// Run on page load (default tab = home)
updateLoginVisibility("home");
// HOME TAB LOGIN/USERNAME LOGIC
import { auth } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const loginBtn = document.getElementById("openAuth");
const headerUsername = document.getElementById("headerUsername");

// Hide username + login everywhere except Home
function updateHeaderForTab(activeTab) {
    const onHome = activeTab === "home";

    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Logged in
            loginBtn.style.display = onHome ? "none" : "none"; 
            headerUsername.textContent = "@" + (user.displayName || "user");
            headerUsername.style.display = onHome ? "inline-block" : "none";
        } else {
            // Logged out
            loginBtn.style.display = onHome ? "inline-block" : "none";
            headerUsername.style.display = "none";
        }
    });
}

// When switching tabs
document.querySelectorAll(".bottom-nav a").forEach(tab => {
    tab.addEventListener("click", () => {
        const tabName = tab.getAttribute("data-tab");
        updateHeaderForTab(tabName);
    });
});

// Run once on page load:
updateHeaderForTab("home");
