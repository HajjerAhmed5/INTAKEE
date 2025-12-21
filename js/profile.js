/* ===============================
   INTAKEE — PROFILE SYSTEM (FINAL, REAL)
================================ */

import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

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
   PROFILE GRIDS
================================ */
const grids = {
  uploads: document.getElementById("profile-uploads-grid"),
  saved: document.getElementById("profile-saved-grid")
};

const tabs = document.querySelectorAll("[data-profile-tab]");

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

    showTab("uploads");
    return;
  }

  /* USER DOC */
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  const userData = userSnap.exists() ? userSnap.data() : {};

  /* BASIC INFO */
  profileName.textContent = userData.username || "User";
  profileHandle.textContent = "@" + (userData.username || "user");
  profileBio.textContent = userData.bio || "No bio yet.";
  profilePhoto.src = userData.photoURL || "default-avatar.png";

  /* STATS */
  statFollowers.textContent = userData.followers?.length || 0;
  statFollowing.textContent = userData.following?.length || 0;
  statLikes.textContent = userData.likedPosts?.length || 0;

  /* LOAD CONTENT */
  await loadUserUploads(user.uid);
  await loadSavedPosts(userData);

  showTab("uploads");
});

/* ===============================
   LOAD USER UPLOADS
================================ */
async function loadUserUploads(uid) {
  grids.uploads.innerHTML = "";

  const q = query(collection(db, "posts"), where("uid", "==", uid));
  const snap = await getDocs(q);

  statPosts.textContent = snap.size;

  if (snap.empty) {
    grids.uploads.innerHTML = `<p class="muted">No uploads yet.</p>`;
    return;
  }

  snap.forEach((docSnap) => {
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

  if (!userData.saved || userData.saved.length === 0) {
    grids.saved.innerHTML = `<p class="muted">No saved posts.</p>`;
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
  Object.values(grids).forEach((grid) => {
    if (grid) grid.style.display = "none";
  });

  if (grids[tabName]) {
    grids[tabName].style.display = "grid";
  }

  tabs.forEach((btn) => btn.classList.remove("active"));
  const activeBtn = document.querySelector(`[data-profile-tab="${tabName}"]`);
  if (activeBtn) activeBtn.classList.add("active");
}

tabs.forEach((btn) => {
  btn.addEventListener("click", () => {
    showTab(btn.dataset.profileTab);
  });
});
