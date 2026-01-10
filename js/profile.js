/* ===============================
   INTAKEE — PROFILE (FINAL + MEDIA)
   - Auth.js is the only auth source
   - Offline-safe
   - Bio + avatar + banner upload
   - No console crashes
================================ */

import { db, storage } from "./firebase-init.js";

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

/* ================= SAFE FILE INPUTS (AUTO-INJECT) ================= */
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

  // Immediate render (never wait on Firestore)
  renderProfile({
    username,
    bio: "Welcome to your INTAKEE profile."
  });

  enableUploads();

  // Background Firestore load
  await loadProfileFromFirestore(user, username);
});

/* ================= FIRESTORE LOAD ================= */
async function loadProfileFromFirestore(user, usernameFromAuth) {
  const refDoc = doc(db, "users", user.uid);

  try {
    let snap = await getDoc(refDoc);

    if (!snap.exists()) {
      await setDoc(refDoc, {
        username: usernameFromAuth,
        email: user.email,
        bio: "",
        avatarURL: "",
        bannerURL: "",
        createdAt: Date.now()
      });
      snap = await getDoc(refDoc);
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
  } catch {
    console.warn("⚠️ Firestore unavailable — using cached UI");
    loadStatsFallback();
  }
}

/* ================= RENDER ================= */
function renderProfile({ username, bio }) {
  if (!profileName) return;

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

  const path = `users/${currentUser.uid}/${type}.jpg`;
  const storageRef = ref(storage, path);

  try {
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    await updateDoc(doc(db, "users", currentUser.uid), {
      [`${type}URL`]: url
    });

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
    await updateDoc(doc(db, "users", currentUser.uid), {
      bio: newBio.trim()
    });
  } catch {
    console.warn("⚠️ Bio saved locally only");
  }
}

/* ================= GUEST ================= */
function setGuestProfile() {
  if (!profileName) return;

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
