/* ===============================
   INTAKEE — PROFILE SYSTEM (FIXED & SAFE)
================================ */
import { auth } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

let authReady = false;
let currentUser = null;

onAuthStateChanged(auth, (user) => {
  authReady = true;
  currentUser = user;
});

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
   DOM ELEMENTS (SAFE)
================================ */
const profileName = document.querySelector(".profile-name");
const profileHandle = document.querySelector(".profile-handle");
const profileBio = document.querySelector(".profile-bio");
const profilePhoto = document.querySelector(".profile-avatar");

const statPosts = document.querySelector(".profile-stats div:nth-child(1) strong");
const statFollowers = document.querySelector(".profile-stats div:nth-child(2) strong");
const statFollowing = document.querySelector(".profile-stats div:nth-child(3) strong");
const statLikes = document.querySelector(".profile-stats div:nth-child(4) strong");

/* ===============================
   AUTH → LOAD PROFILE
================================ */
onAuthStateChanged(auth, async (user) => {
  if (!profileName || !profileHandle || !profileBio) return;

  if (!user) {
    profileName.textContent = "Guest";
    profileHandle.textContent = "@guest";
    profileBio.textContent = "Sign in to personalize your profile.";

    if (statPosts) statPosts.textContent = "0";
    if (statFollowers) statFollowers.textContent = "0";
    if (statFollowing) statFollowing.textContent = "0";
    if (statLikes) statLikes.textContent = "0";

    return;
  }

  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  const data = snap.exists() ? snap.data() : {};

  profileName.textContent = data.username || "User";
  profileHandle.textContent = "@" + (data.username || "user");
  profileBio.textContent = data.bio || "No bio yet.";

  if (statFollowers) statFollowers.textContent = data.followers?.length || 0;
  if (statFollowing) statFollowing.textContent = data.following?.length || 0;
  if (statLikes) statLikes.textContent = data.likes || 0;

  await loadUserUploads(user.uid);
});

/* ===============================
   LOAD USER UPLOADS (SAFE)
================================ */
async function loadUserUploads(uid) {
  if (!statPosts) return;

  const q = query(collection(db, "posts"), where("uid", "==", uid));
  const snap = await getDocs(q);
  statPosts.textContent = snap.size;
}
