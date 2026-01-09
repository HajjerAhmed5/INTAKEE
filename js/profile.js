/* ===============================
   INTAKEE — PROFILE (FINAL, LOCKED)
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

let profileLoaded = false;

/* ================= LOAD PROFILE ================= */
async function loadProfile(user) {
  if (profileLoaded) return;
  profileLoaded = true;

  try {
    const snap = await getDoc(doc(db, "users", user.uid));

    if (!snap.exists()) {
      setGuestProfile();
      return;
    }

    const data = snap.data();

    if (profileName) {
      profileName.textContent = data.username || "User";
    }

    if (profileHandle) {
      profileHandle.textContent = "@" + (data.username || "user");
    }

    if (profileBio) {
      profileBio.textContent =
        data.bio || "This is your bio. Tell people about yourself.";
    }

    console.log("✅ Profile loaded:", data.username || user.uid);

  } catch (err) {
    console.error("❌ Profile load failed:", err);
    setGuestProfile();
  }
}

/* ================= GUEST FALLBACK ================= */
function setGuestProfile() {
  if (profileName) profileName.textContent = "User";
  if (profileHandle) profileHandle.textContent = "@user";
  if (profileBio) {
    profileBio.textContent = "This is your bio. Tell people about yourself.";
  }
}

/* ================= AUTH GATE ================= */
onAuthStateChanged(auth, user => {
  if (!user) return;
  loadProfile(user);
});
