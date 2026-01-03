/* ===============================
   INTAKEE — PROFILE (FINAL FINAL)
   - Auth-gated
   - Firestore-safe
   - DOM-safe
   - No race conditions
================================ */

import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { doc, getDoc } from
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

/* ================= DOM ================= */
const profileName = document.querySelector(".profile-name");
const profileHandle = document.querySelector(".profile-handle");
const profileBio = document.querySelector(".profile-bio");

/* ================= LOAD PROFILE ================= */
async function loadProfile(user) {
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists()) return;

    const data = snap.data();

    profileName && (profileName.textContent = data.username || "User");
    profileHandle && (profileHandle.textContent = "@" + (data.username || "user"));
    profileBio && (
      profileBio.textContent = data.bio || "This is your bio. (0/200)"
    );

    console.log("✅ Profile loaded:", data.username);
  } catch (err) {
    console.error("❌ Profile load failed:", err);
  }
}

/* ================= AUTH GATE ================= */
onAuthStateChanged(auth, (user) => {
  if (!user) return;
  loadProfile(user);
});
