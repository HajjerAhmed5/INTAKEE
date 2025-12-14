/* ============================
   PROFILE SYSTEM JS — CLEAN VERSION
   Matches NEW Profile Layout (Banner + Avatar + Edit Button)
============================ */

import { auth } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* DOM Elements */
const profileName = document.getElementById("profile-name");
const profileHandle = document.getElementById("profile-handle");
const profileBio = document.getElementById("profile-bio");
const profilePhoto = document.getElementById("profile-photo");

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
    // Hide all grids
    Object.values(grids).forEach((grid) => {
        grid.style.display = "none";
    });

    // Show the selected one
    if (grids[tabName]) {
        grids[tabName].style.display = "grid";
    }

    // Activate correct pill
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

// DEFAULT TAB
showTab("uploads");
