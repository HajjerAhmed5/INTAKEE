/* ===============================
   INTAKEE — PROFILE SYSTEM
   REAL APP VERSION
================================ */

import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

const auth = getAuth();
const db = getFirestore();

/* ===============================
   DOM ELEMENTS
================================ */
const profileName = document.getElementById("profile-name");
const profileHandle = document.getElementById("profile-handle");
const profileBio = document.getElementById("profile-bio");
const profilePhoto = document.getElementById("profile-photo");

const statPosts = document.getElementById("stat-posts");
const statFollowers = document.getElementById("stat-followers");
const statFollowing = document.getElementById("stat-following");
const statLikes = document.getElementById("stat-likes");

/* ===============================
   PROFILE TABS
================================ */
const tabs = document.querySelectorAll(".pill");

const grids = {
  uploads: document.getElementById("profile-uploads-grid"),
  saved: document.getElementById("profile-saved-grid"),
  likes: document.getElementById("profile-likes-grid"),
  playlists: document.getElementById("profile-playlists-grid"),
  history: document.getElementById("profile-history-grid"),
  notifications: document.getElementById("profile-notifications-grid")
};

/* ===============================
   AUTH → LOAD PROFILE
================================ */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    profileName.textContent = "Guest";
    profileHandle.textContent = "@guest";
    profileBio.textContent = "Sign in to personalize your profile.";
    profilePhoto.src = "default-avatar.png";

    statPosts.textContent = "0";
    statFollowers.textContent = "0";
    statFollowing.textContent = "0";
    statLikes.textContent = "0";
    return;
  }

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) return;

  const data = snap.data();

  profileName.textContent = data.username || "User";
  profileHandle.textContent = "@" + (data.username || "user");
  profileBio.textContent = data.bio || "No bio yet.";
  profilePhoto.src = data.photoURL || "default-avatar.png";

  statPosts.textContent = data.posts || 0;
  statFollowers.textContent = data.followers || 0;
  statFollowing.textContent = data.following || 0;
  statLikes.textContent = data.likes || 0;
});

/* ===============================
   PROFILE TAB SWITCHING
================================ */
function showTab(tabName) {
  Object.values(grids).forEach(grid => {
    if (grid) grid.style.display = "none";
  });

  if (grids[tabName]) {
    grids[tabName].style.display = "grid";
  }

  tabs.forEach(btn => btn.classList.remove("active"));
  const activeBtn = document.querySelector(`[data-profile-tab="${tabName}"]`);
  if (activeBtn) activeBtn.classList.add("active");
}

tabs.forEach(btn => {
  btn.addEventListener("click", () => {
    showTab(btn.dataset.profileTab);
  });
});

// Default tab
showTab("uploads");
