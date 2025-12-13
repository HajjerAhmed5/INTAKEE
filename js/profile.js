/* ============================
   PROFILE SYSTEM JS
   Loads profile info, bio, avatar, stats, and tabs
============================ */

import { auth } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* DOM Elements */
const profileName = document.getElementById("profile-name");
const profileHandle = document.getElementById("profile-handle");
const profileBio = document.getElementById("profile-bio");
const profilePhoto = document.getElementById("profile-photo");

const profileTopGrid = document.getElementById("profile-top-grid");

/* -----------------------------
   FIX THE 2×2 TOP GRID
   Ensures four cells always exist
----------------------------- */
function buildProfileGrid() {
    if (!profileTopGrid) return;

    profileTopGrid.innerHTML = `
        <div class="grid-cell"></div>
        <div class="grid-cell"></div>
        <div class="grid-cell"></div>
        <div class="grid-cell"></div>
    `;
}
buildProfileGrid();


/* -----------------------------
   PROFILE TABS + FEEDS
----------------------------- */
const tabs = document.querySelectorAll(".pill");

const grids = {
    uploads: document.getElementById("profile-uploads-grid"),
    saved: document.getElementById("profile-saved-grid"),
    likes: document.getElementById("profile-likes-grid"),
    playlists: document.getElementById("profile-playlists-grid"),
    history: document.getElementById("profile-history-grid"),
    notifications: document.getElementById("profile-notifications-grid")
};


/* -----------------------------
   AUTH — LOAD USER PROFILE
----------------------------- */
onAuthStateChanged(auth, (user) => {
    if (!user) {
        profileName.textContent = "Guest";
        profileHandle.textContent = "@guest";
        profileBio.textContent = "Sign in to personalize your profile.";
        profilePhoto.src = "default-avatar.png";
        return;
    }

    profileName.textContent = user.displayName || "No Name";
    profileHandle.textContent = "@" + (user.displayName || "username");
    profileBio.textContent = user.bio || "No bio yet.";
    profilePhoto.src = user.photoURL || "default-avatar.png";
});


/* -----------------------------
   TAB SWITCHING SYSTEM
----------------------------- */
function showTab(tabName) {
    // hide all grids
    Object.values(grids).forEach((grid) => {
        grid.style.display = "none";
    });

    // show selected tab
    if (grids[tabName]) {
        grids[tabName].style.display = "grid";
    }

    // activate pill
    tabs.forEach((btn) => btn.classList.remove("active"));
    const activeBtn = document.querySelector(`[data-profile-tab="${tabName}"]`);
    if (activeBtn) activeBtn.classList.add("active");
}

tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
        const tab = btn.getAttribute("data-profile-tab");
        showTab(tab);
    });
});

// DEFAULT TAB ON LOAD
showTab("uploads");
