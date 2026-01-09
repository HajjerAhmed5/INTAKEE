/* ===============================
   INTAKEE — PROFILE (SOURCE OF TRUTH)
================================ */

import { auth, db } from "./firebase-init.js";

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
const profileName = document.querySelector(".profile-name");
const profileHandle = document.querySelector(".profile-handle");
const profileBio = document.querySelector(".profile-bio");
const statEls = document.querySelectorAll(".profile-stats strong");
const editBtn = document.querySelector(".edit-profile-btn");

/* ================= STATE ================= */
let currentUser = null;

/* ================= AUTH READY LISTENER ================= */
window.addEventListener("auth-ready", async (e) => {
  const user = e.detail.user;

  if (!user) {
    setGuestProfile();
    return;
  }

  currentUser = user;
  await loadProfile(user);
});

/* ================= LOAD PROFILE ================= */
async function loadProfile(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      username: user.displayName || user.email.split("@")[0],
      bio: ""
    });
  }

  const data = (await getDoc(ref)).data();

  profileName.textContent = data.username;
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

  statEls[0].textContent = postsSnap.size;
  statEls[1].textContent = 0;
  statEls[2].textContent = 0;
  statEls[3].textContent = 0;
}

/* ================= EDIT BIO ================= */
editBtn?.addEventListener("click", async () => {
  if (!currentUser) return;

  const newBio = prompt("Edit bio", profileBio.textContent);
  if (newBio === null) return;

  await updateDoc(doc(db, "users", currentUser.uid), {
    bio: newBio
  });

  profileBio.textContent = newBio;
});

/* ================= GUEST ================= */
function setGuestProfile() {
  profileName.textContent = "Guest";
  profileHandle.textContent = "@guest";
  profileBio.textContent = "Sign in to personalize your profile.";
  statEls.forEach(el => (el.textContent = "0"));
}

