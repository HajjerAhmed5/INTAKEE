/* ===============================
   INTAKEE — PROFILE SYSTEM (FINAL • STABLE)
   No auth listeners • No race conditions
================================ */

import { auth, db } from "./firebase-init.js";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

/* ================= DOM ================= */
const profileName = document.querySelector(".profile-name");
const profileHandle = document.querySelector(".profile-handle");
const profileBio = document.querySelector(".profile-bio");

const statPosts = document.querySelector(".profile-stats div:nth-child(1) strong");
const statFollowers = document.querySelector(".profile-stats div:nth-child(2) strong");
const statFollowing = document.querySelector(".profile-stats div:nth-child(3) strong");
const statLikes = document.querySelector(".profile-stats div:nth-child(4) strong");

/* ================= WAIT FOR AUTH ================= */
const waitForAuth = setInterval(async () => {
  if (!window.__AUTH_READY__) return;
  clearInterval(waitForAuth);

  if (!profileName || !profileHandle || !profileBio) return;

  const user = auth.currentUser;

  /* ===== LOGGED OUT ===== */
  if (!user) {
    profileName.textContent = "Guest";
    profileHandle.textContent = "@guest";
    profileBio.textContent = "Sign in to personalize your profile.";

    statPosts && (statPosts.textContent = "0");
    statFollowers && (statFollowers.textContent = "0");
    statFollowing && (statFollowing.textContent = "0");
    statLikes && (statLikes.textContent = "0");
    return;
  }

  /* ===== LOGGED IN ===== */
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists()) return;

    const data = snap.data();

    profileName.textContent = data.username || "User";
    profileHandle.textContent = "@" + (data.username || "user");
    profileBio.textContent = data.bio || "No bio yet.";

    statFollowers && (statFollowers.textContent = data.followers?.length || 0);
    statFollowing && (statFollowing.textContent = data.following?.length || 0);
    statLikes && (statLikes.textContent = data.likes || 0);

    loadUserUploads(user.uid);
  } catch (err) {
    console.warn("Profile load skipped:", err.message);
  }
}, 50);

/* ================= POSTS ================= */
async function loadUserUploads(uid) {
  if (!statPosts) return;

  try {
    const q = query(collection(db, "posts"), where("uid", "==", uid));
    const snap = await getDocs(q);
    statPosts.textContent = snap.size;
  } catch (err) {
    console.warn("Upload count skipped:", err.message);
  }
}
