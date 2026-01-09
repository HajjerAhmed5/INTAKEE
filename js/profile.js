/* ===============================
   INTAKEE — PROFILE (FINAL STABLE)
   - Auth-gated
   - Firestore-safe
   - Stats enabled
================================ */

import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

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

/* OPTIONAL STATS (safe if missing) */
const postsCountEl = document.querySelector(".stat-posts");
const likesCountEl = document.querySelector(".stat-likes");
const savedCountEl = document.querySelector(".stat-saved");

let profileLoaded = false;

/* ================= LOAD PROFILE ================= */
async function loadProfile(user) {
  if (profileLoaded) return;
  profileLoaded = true;

  try {
    /* USER DOC */
    const userSnap = await getDoc(doc(db, "users", user.uid));
    const userData = userSnap.exists() ? userSnap.data() : {};

    profileName && (profileName.textContent = userData.username || "User");
    profileHandle &&
      (profileHandle.textContent = "@" + (userData.username || "user"));
    profileBio &&
      (profileBio.textContent =
        userData.bio || "This is your bio. Tell people about yourself.");

    /* POSTS COUNT */
    const postsQuery = query(
      collection(db, "posts"),
      where("uid", "==", user.uid)
    );
    const postsSnap = await getDocs(postsQuery);

    postsCountEl && (postsCountEl.textContent = postsSnap.size);

    /* PLACEHOLDERS (SAFE FOR LAUNCH) */
    likesCountEl && (likesCountEl.textContent = "0");
    savedCountEl && (savedCountEl.textContent = "0");

    console.log("✅ Profile loaded:", userData.username || user.uid);

  } catch (err) {
    console.error("❌ Profile load failed:", err);
    setGuestProfile();
  }
}

/* ================= GUEST FALLBACK ================= */
function setGuestProfile() {
  profileName && (profileName.textContent = "User");
  profileHandle && (profileHandle.textContent = "@user");
  profileBio &&
    (profileBio.textContent = "This is your bio. Tell people about yourself.");

  postsCountEl && (postsCountEl.textContent = "0");
  likesCountEl && (likesCountEl.textContent = "0");
  savedCountEl && (savedCountEl.textContent = "0");
}

/* ================= AUTH GATE ================= */
onAuthStateChanged(auth, user => {
  if (!user) return;
  loadProfile(user);
});
