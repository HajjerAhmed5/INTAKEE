/*
==========================================
INTAKEE — PROFILE (CORS SAFE / FINAL)
==========================================
*/

import { auth, storage, db } from "./firebase-init.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

/* ================= DOM ================= */
const avatarEl = document.querySelector(".profile-avatar");
const bannerEl = document.querySelector(".profile-banner");
const avatarInput = document.getElementById("avatarInput");
const bannerInput = document.getElementById("bannerInput");

let currentUser = null;

/* ================= AUTH ================= */
onAuthStateChanged(auth, async user => {
  if (!user) return;

  currentUser = user;
  await loadProfile();
});

/* ================= LOAD PROFILE ================= */
async function loadProfile() {
  try {
    const uid = currentUser.uid;
    const userDocRef = doc(db, "users", uid);
    const snap = await getDoc(userDocRef);

    if (!snap.exists()) return;

    const data = snap.data();

    /* ===== AVATAR ===== */
    if (data.avatarPath) {
      const avatarRef = ref(storage, data.avatarPath);
      const avatarURL = await getDownloadURL(avatarRef);
      avatarEl.style.backgroundImage = `url(${avatarURL})`;
    }

    /* ===== BANNER ===== */
    if (data.bannerPath) {
      const bannerRef = ref(storage, data.bannerPath);
      const bannerURL = await getDownloadURL(bannerRef);
      bannerEl.style.backgroundImage = `url(${bannerURL})`;
    }

  } catch (err) {
    console.error("❌ Profile load failed:", err);
  }
}

/* ================= UPLOAD AVATAR ================= */
avatarEl?.addEventListener("click", () => avatarInput.click());

avatarInput?.addEventListener("change", async () => {
  if (!currentUser) return;

  const file = avatarInput.files[0];
  if (!file) return;

  try {
    const uid = currentUser.uid;
    const path = `profile/${uid}/avatar.jpg`;
    const avatarRef = ref(storage, path);

    await uploadBytes(avatarRef, file);
    const url = await getDownloadURL(avatarRef);

    avatarEl.style.backgroundImage = `url(${url})`;

    await setDoc(
      doc(db, "users", uid),
      { avatarPath: path },
      { merge: true }
    );

  } catch (err) {
    console.error("❌ Avatar upload failed:", err);
  }
});

/* ================= UPLOAD BANNER ================= */
bannerEl?.addEventListener("click", () => bannerInput.click());

bannerInput?.addEventListener("change", async () => {
  if (!currentUser) return;

  const file = bannerInput.files[0];
  if (!file) return;

  try {
    const uid = currentUser.uid;
    const path = `profile/${uid}/banner.jpg`;
    const bannerRef = ref(storage, path);

    await uploadBytes(bannerRef, file);
    const url = await getDownloadURL(bannerRef);

    bannerEl.style.backgroundImage = `url(${url})`;

    await setDoc(
      doc(db, "users", uid),
      { bannerPath: path },
      { merge: true }
    );

  } catch (err) {
    console.error("❌ Banner upload failed:", err);
  }
});
