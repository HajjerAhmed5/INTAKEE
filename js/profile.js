/* ===============================
   INTAKEE — PROFILE (REAL APP v2)
================================ */

import { auth, db, storage } from "./firebase-init.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

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
const profileName = document.querySelector(".profile-name");
const profileHandle = document.querySelector(".profile-handle");
const profileBio = document.querySelector(".profile-bio");
const avatar = document.querySelector(".profile-avatar");
const editBtn = document.querySelector(".edit-profile-btn");
const statEls = document.querySelectorAll(".profile-stats strong");

/* ================= STATE ================= */
let currentUser = null;

/* ================= AUTH ================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    setGuestProfile();
    return;
  }

  currentUser = user;
  await loadProfile(user);
});

/* ================= LOAD PROFILE ================= */
async function loadProfile(user) {
  const refDoc = doc(db, "users", user.uid);
  const snap = await getDoc(refDoc);

  if (!snap.exists()) {
    await setDoc(refDoc, {
      username: user.email.split("@")[0],
      bio: "",
      avatarURL: ""
    });
  }

  const data = (await getDoc(refDoc)).data();

  profileName.textContent = data.username;
  profileHandle.textContent = "@" + data.username;
  profileBio.textContent = data.bio || "This is your bio. Tell people about yourself.";

  if (data.avatarURL) {
    avatar.style.backgroundImage = `url(${data.avatarURL})`;
    avatar.style.backgroundSize = "cover";
    avatar.style.backgroundPosition = "center";
  }

  loadStats(user.uid);
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

/* ================= EDIT PROFILE ================= */
editBtn?.addEventListener("click", async () => {
  const newName = prompt("Edit username", profileName.textContent);
  if (!newName) return;

  const newBio = prompt("Edit bio", profileBio.textContent || "");

  await updateDoc(doc(db, "users", currentUser.uid), {
    username: newName.toLowerCase(),
    bio: newBio
  });

  profileName.textContent = newName;
  profileHandle.textContent = "@" + newName.toLowerCase();
  profileBio.textContent = newBio;
});

/* ================= AVATAR UPLOAD ================= */
avatar?.addEventListener("click", async () => {
  if (!currentUser) return;

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";

  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;

    const avatarRef = ref(storage, `avatars/${currentUser.uid}`);
    await uploadBytes(avatarRef, file);

    const url = await getDownloadURL(avatarRef);

    await updateDoc(doc(db, "users", currentUser.uid), {
      avatarURL: url
    });

    avatar.style.backgroundImage = `url(${url})`;
    avatar.style.backgroundSize = "cover";
    avatar.style.backgroundPosition = "center";
  };

  input.click();
});

/* ================= GUEST ================= */
function setGuestProfile() {
  profileName.textContent = "Guest";
  profileHandle.textContent = "@guest";
  profileBio.textContent = "Sign in to personalize your profile.";
  statEls.forEach(el => (el.textContent = "0"));
}
