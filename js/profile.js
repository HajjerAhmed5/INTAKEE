/* ===============================
   INTAKEE — PROFILE (FINAL WORKING)
   - Auth.js is the ONLY auth listener
   - Firestore is source of truth
   - No Guest flicker
   - Username always correct
================================ */

import { db } from "./firebase-init.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

/* ================= DOM ================= */
const profileName   = document.querySelector(".profile-name");
const profileHandle = document.querySelector(".profile-handle");
const profileBio    = document.querySelector(".profile-bio");
const statEls       = document.querySelectorAll(".profile-stats strong");
const editBtn       = document.querySelector(".edit-profile-btn");

/* ================= STATE ================= */
let currentUser = null;

/* ================= AUTH READY (ONLY ENTRY POINT) ================= */
window.addEventListener("auth-ready", async (e) => {
  const { user, username } = e.detail || {};

  if (!user) {
    setGuestProfile();
    return;
  }

  currentUser = user;
  await loadProfile(user, username);
});

/* ================= LOAD PROFILE ================= */
async function loadProfile(user, usernameFromAuth) {
  const ref = doc(db, "users", user.uid);
  let snap = await getDoc(ref);

  // Create Firestore doc if missing
  if (!snap.exists()) {
    await setDoc(ref, {
      username: usernameFromAuth,
      email: user.email,
      bio: "",
      createdAt: Date.now()
    });
    snap = await getDoc(ref);
  }

  const data = snap.data();

  const username = data.username || usernameFromAuth;

  profileName.textContent   = username;
  profileHandle.textContent = "@" + username;
  profileBio.textContent =
    data.bio || "This is your bio. Tell people about yourself.";

  await loadStats(user.uid);
}

/* ================= STATS ================= */
async function loadStats(uid) {
  const postsSnap = await getDocs(
    query(collection(db, "posts"), where("uid", "==", uid))
  );

  statEls[0].textContent = postsSnap.size; // Posts
  statEls[1].textContent = "0";            // Followers
  statEls[2].textContent = "0";            // Following
  statEls[3].textContent = "0";            // Likes
}

/* ================= EDIT BIO ================= */
editBtn?.addEventListener("click", async () => {
  if (!currentUser) return;

  const newBio = prompt("Edit bio", profileBio.textContent);
  if (newBio === null) return;

  await updateDoc(doc(db, "users", currentUser.uid), {
    bio: newBio.trim()
  });

  profileBio.textContent = newBio.trim();
});

/* ================= GUEST ================= */
function setGuestProfile() {
  profileName.textContent   = "Guest";
  profileHandle.textContent = "@guest";
  profileBio.textContent   = "Sign in to personalize your profile.";
  statEls.forEach(el => (el.textContent = "0"));
}
