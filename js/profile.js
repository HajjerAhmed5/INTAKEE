/* ===============================
   INTAKEE — PROFILE (AUTH SAFE)
================================ */

import { auth, db } from "./firebase-init.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

/* ================= DOM ================= */
const profileName = document.querySelector(".profile-name");
const profileHandle = document.querySelector(".profile-handle");
const profileBio = document.querySelector(".profile-bio");

/* ================= LOAD PROFILE ================= */
async function loadProfile(user) {
  try {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      console.warn("No profile document found");
      return;
    }

    const data = snap.data();

    profileName.textContent = data.username || "User";
    profileHandle.textContent = "@" + data.username;
    profileBio.textContent = data.bio || "This is your bio. (0/200)";
  } catch (err) {
    console.error("Profile load failed:", err);
  }
}

/* ================= AUTH GATE ================= */
onAuthStateChanged(auth, user => {
  if (!user) {
    console.warn("⏳ Profile skipped — no user");
    return;
  }

  loadProfile(user);
});
