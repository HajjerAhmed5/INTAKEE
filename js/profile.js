/* ===============================
   INTAKEE — PROFILE SYSTEM (FINAL)
================================ */

import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

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

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return;

  const data = userSnap.data();

  /* BASIC INFO */
  profileName.textContent = data.username || "User";
  profileHandle.textContent = "@" + (data.username || "user");
  profileBio.textContent = data.bio || "No bio yet.";
  profilePhoto.src = data.photoURL || "default-avatar.png";

  /* STATS */
  statPosts.textContent = data.posts || 0;
  statFollowers.textContent = data.followers?.length || 0;
  statFollowing.textContent = data.following?.length || 0;
  statLikes.textContent = data.likes || 0;

  /* LOAD CONTENT */
  loadUserUploads(user.uid);
  loadSavedPosts(data);
});

/* ===============================
   LOAD USER UPLOADS
================================ */
async function loadUserUploads(uid) {
  grids.uploads.innerHTML = "";

  const q = query(
    collection(db, "posts"),
    where("uid", "==", uid)
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    grids.uploads.innerHTML = "<p class='muted'>No uploads yet.</p>";
    return;
  }

  snap.forEach(docSnap => {
    const post = docSnap.data();
    const div = document.createElement("div");
    div.className = "post-card";
    div.innerHTML = `<h4>${post.title || "Untitled"}</h4>`;
    grids.uploads.appendChild(div);
  });
}

/* ===============================
   LOAD SAVED POSTS
================================ */
async function loadSavedPosts(userData) {
  grids.saved.innerHTML = "";

  if (!userData.saved?.length) {
    grids.saved.innerHTML = "<p class='muted'>No saved posts.</p>";
    return;
  }

  for (const postId of userData.saved) {
    const postRef = doc(db, "posts", postId);
    const postSnap = await getDoc(postRef);
    if (!postSnap.exists()) continue;

    const post = postSnap.data();
    const div = document.createElement("div");
    div.className = "post-card";
    div.innerHTML = `<h4>${post.title || "Untitled"}</h4>`;
    grids.saved.appendChild(div);
  }
}

/* ===============================
   TAB SWITCHING
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

/* DEFAULT TAB */
showTab("uploads");

