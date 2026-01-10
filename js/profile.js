/* ===============================
   INTAKEE — PROFILE (FINAL, FIXED)
   - Bio persists
   - Avatar & banner upload work
   - Offline-safe
================================ */

import { db, storage } from "./firebase-init.js";

import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js";

/* ================= DOM ================= */
const profileName   = document.querySelector(".profile-name");
const profileHandle = document.querySelector(".profile-handle");
const profileBio    = document.querySelector(".profile-bio");
const statEls       = document.querySelectorAll(".profile-stats strong");
const editBtn       = document.querySelector(".edit-profile-btn");
const avatarEl      = document.querySelector(".profile-avatar");
const bannerEl      = document.querySelector(".profile-banner");

/* ================= STATE ================= */
let currentUser = null;

/* ================= FILE INPUTS ================= */
const avatarInput = document.createElement("input");
avatarInput.type = "file";
avatarInput.accept = "image/*";
avatarInput.hidden = true;

const bannerInput = document.createElement("input");
bannerInput.type = "file";
bannerInput.accept = "image/*";
bannerInput.hidden = true;

document.body.appendChild(avatarInput);
document.body.appendChild(bannerInput);

/* ================= AUTH READY ================= */
window.addEventListener("auth-ready", async (e) => {
  const { user, username } = e.detail || {};

  if (!user || !username) {
    setGuestProfile();
    return;
  }

  currentUser = user;

  renderProfile({
    username,
    bio: "Welcome to your INTAKEE profile."
  });

  enableUploads();

  await loadProfileFromFirestore(user, username);
});

/* ================= LOAD PROFILE ================= */
async function loadProfileFromFirestore(user, usernameFromAuth) {
  const userRef = doc(db, "users", user.uid);

  try {
    let snap = await getDoc(userRef);

    if (!snap.exists()) {
      await setDoc(userRef, {
        username: usernameFromAuth,
        email: user.email,
        bio: "",
        avatarURL: "",
        bannerURL: "",
        createdAt: Date.now()
      });
      snap = await getDoc(userRef);
    }

    const data = snap.data() || {};

    renderProfile({
      username: data.username || usernameFromAuth,
      bio: data.bio || "This is your bio. Tell people about yourself."
    });

    if (data.avatarURL && avatarEl) {
      avatarEl.style.backgroundImage = `url(${data.avatarURL})`;
    }

    if (data.bannerURL && bannerEl) {
      bannerEl.style.backgroundImage = `url(${data.bannerURL})`;
    }

    loadStatsSafe(user.uid);
  } catch (err) {
    console.warn("⚠️ Firestore unavailable", err);
    loadStatsFallback();
  }
}

/* ================= RENDER ================= */
function renderProfile({ username, bio }) {
  profileName.textContent   = username;
  profileHandle.textContent = "@" + username;
  profileBio.textContent    = bio;

  if (editBtn) {
    editBtn.textContent = "Edit Profile";
    editBtn.onclick = handleEditBio;
  }
}

/* ================= UPLOAD HANDLERS ================= */
function enableUploads() {
  if (avatarEl) avatarEl.onclick = () => avatarInput.click();
  if (bannerEl) bannerEl.onclick = () => bannerInput.click();
}

avatarInput.addEventListener("change", e => {
  uploadImage(e.target.files[0], "avatar");
});

bannerInput.addEventListener("change", e => {
  uploadImage(e.target.files[0], "banner");
});

async function uploadImage(file, type) {
  if (!file || !currentUser) return;

  // 🔑 CORRECT PATH (matches bucket & rules)
  const path = `profile/${currentUser.uid}/${type}.jpg`;
  const storageRef = ref(storage, path);

  try {
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    await setDoc(
      doc(db, "users", currentUser.uid),
      { [`${type}URL`]: url },
      { merge: true }
    );

    if (type === "avatar" && avatarEl) {
      avatarEl.style.backgroundImage = `url(${url})`;
    }

    if (type === "banner" && bannerEl) {
      bannerEl.style.backgroundImage = `url(${url})`;
    }
  } catch (err) {
    alert("Image upload failed");
    console.error(err);
  }
}

/* ================= STATS ================= */
async function loadStatsSafe(uid) {
  try {
    const postsSnap = await getDocs(
      query(collection(db, "posts"), where("uid", "==", uid))
    );

    statEls[0].textContent = postsSnap.size;
    statEls[1].textContent = "0";
    statEls[2].textContent = "0";
    statEls[3].textContent = "0";
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
    await setDoc(
      doc(db, "users", currentUser.uid),
      { bio: newBio.trim() },
      { merge: true }
    );
  } catch (err) {
    console.warn("⚠️ Bio save failed", err);
  }
}

/* ================= GUEST ================= */
function setGuestProfile() {
  profileName.textContent   = "Guest";
  profileHandle.textContent = "@guest";
  profileBio.textContent    = "Sign in to personalize your profile.";

  statEls.forEach(el => (el.textContent = "0"));

  if (editBtn) {
    editBtn.textContent = "Sign In";
    editBtn.onclick = () =>
      document.getElementById("authDialog")?.showModal();
  }
}
