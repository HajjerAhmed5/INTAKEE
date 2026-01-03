/* ===============================
   INTAKEE — PROFILE (FINAL STABLE)
   - Auth-gated
   - Firestore-safe
   - DOM-safe
================================ */

import { auth, db } from "./firebase-init.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

/* ================= DOM ================= */
const profileName = document.querySelector(".profile-name");
const profileHandle = document.querySelector(".profile-handle");
const profileBio = document.querySelector(".profile-bio");

/* ================= LOAD PROFILE ================= */
async function loadProfile(user) {
  if (!user || !user.uid) {
    console.warn("⚠️ loadProfile called without user");
    return;
  }

  try {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      console.warn("⚠️ User document does not exist");
      return;
    }

    const data = snap.data();

    // DOM guards (important)
    if (profileName) {
      profileName.textContent = data.username || "User";
    }

    if (profileHandle) {
      profileHandle.textContent = "@" + (data.username || "user");
    }

    if (profileBio) {
      profileBio.textContent =
        data.bio || "This is your bio. (0/200)";
    }

    console.log("✅ Profile loaded:", data.username);

  } catch (err) {
    console.error("❌ Profile load failed:", err);
  }
}

/* ================= AUTH GATE ================= */
onAuthStateChanged(auth, (user) => {
  if (!user) {
    console.warn("⏳ Profile skipped — no user");
    return;
  }

  loadProfile(user);
});
