/* ===============================
   INTAKEE — PROFILE (FINAL STABLE)
   - Auth.js is the only auth source
   - Firestore is optional (never blocks UI)
   - Offline-safe
   - No console crashes
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

/* ================= AUTH READY ================= */
window.addEventListener("auth-ready", async (e) => {
  const { user, username } = e.detail || {};

  if (!user || !username) {
    setGuestProfile();
    return;
  }

  currentUser = user;

  // Render immediately (never wait on Firestore)
  renderProfile({
    username,
    bio: "Welcome to your INTAKEE profile."
  });

  // Load Firestore data in background
  await loadProfileFromFirestore(user, username);
});

/* ================= FIRESTORE PROFILE LOAD ================= */
async function loadProfileFromFirestore(user, usernameFromAuth) {
  const ref = doc(db, "users", user.uid);

  try {
    let snap = await getDoc(ref);

    // Create user doc if missing
    if (!snap.exists()) {
      await setDoc(ref, {
        username: usernameFromAuth,
        email: user.email,
        bio: "",
        createdAt: Date.now()
      });
      snap = await getDoc(ref);
    }

    const data = snap.data() || {};
    const username = data.username || usernameFromAuth;

    renderProfile({
      username,
      bio: data.bio || "This is your bio. Tell people about yourself."
    });

    loadStatsSafe(user.uid);
  } catch (err) {
    console.warn("⚠️ Profile Firestore unavailable");
    loadStatsFallback();
  }
}

/* ================= RENDER ================= */
function renderProfile({ username, bio }) {
  if (!profileName || !profileHandle || !profileBio) return;

  profileName.textContent   = username;
  profileHandle.textContent = "@" + username;
  profileBio.textContent    = bio;

  if (editBtn) {
    editBtn.textContent = "Edit Profile";
    editBtn.onclick = handleEditBio;
  }
}

/* ================= STATS ================= */
async function loadStatsSafe(uid) {
  try {
    const postsSnap = await getDocs(
      query(collection(db, "posts"), where("uid", "==", uid))
    );

    statEls[0].textContent = postsSnap.size; // Posts
    statEls[1].textContent = "0";            // Followers
    statEls[2].textContent = "0";            // Following
    statEls[3].textContent = "0";            // Likes
  } catch {
    loadStatsFallback();
  }
}

function loadStatsFallback() {
  statEls.forEach(el => (el.textContent = "0"));
}

/* ================= EDIT BIO ================= */
async function handleEditBio() {
  if (!currentUser) return;

  const newBio = prompt("Edit bio", profileBio.textContent);
  if (newBio === null) return;

  profileBio.textContent = newBio.trim();

  try {
    await updateDoc(doc(db, "users", currentUser.uid), {
      bio: newBio.trim()
    });
  } catch {
    console.warn("⚠️ Bio update failed (offline)");
  }
}

/* ================= GUEST ================= */
function setGuestProfile() {
  if (!profileName || !profileHandle || !profileBio) return;

  profileName.textContent   = "Guest";
  profileHandle.textContent = "@guest";
  profileBio.textContent    = "Sign in to personalize your profile.";

  statEls.forEach(el => (el.textContent = "0"));

  if (editBtn) {
    editBtn.textContent = "Sign In";
    editBtn.onclick = () => {
      document.getElementById("authDialog")?.showModal();
    };
  }
}
