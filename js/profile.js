/* ===============================
   INTAKEE — PROFILE (FINAL LOCKED)
   - Firestore is single source of truth
   - Never shows Guest when signed in
   - Never shows email
   - Edit Profile works
   - Refresh & reset safe
================================ */

import { auth, db } from "./firebase-init.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

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

/* ================= AUTH STATE ================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    currentUser = null;
    setGuestProfile();
    return;
  }

  currentUser = user;
  await loadProfile(user);
});

/* ================= LOAD PROFILE ================= */
async function loadProfile(user) {
  const ref = doc(db, "users", user.uid);
  let snap = await getDoc(ref);

  // Create user doc if missing (safe fallback)
  if (!snap.exists()) {
    await setDoc(ref, {
      username: user.displayName || user.email.split("@")[0],
      email: user.email,
      bio: "",
      createdAt: Date.now()
    });
    snap = await getDoc(ref);
  }

  const data = snap.data();

  // HARD LOCK: never allow invalid username
  if (!data.username) {
    await updateDoc(ref, {
      username: user.displayName || user.email.split("@")[0]
    });
    data.username = user.displayName || user.email.split("@")[0];
  }

  // Render profile
  profileName.textContent   = data.username;
  profileHandle.textContent = "@" + data.username;
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
  statEls[1].textContent = "0";            // Followers (future)
  statEls[2].textContent = "0";            // Following (future)
  statEls[3].textContent = "0";            // Likes (future)
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
