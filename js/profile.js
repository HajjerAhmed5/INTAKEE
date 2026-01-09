/* ===============================
   INTAKEE — PROFILE (FINAL, LOCKED)
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
const banner = document.querySelector(".profile-banner");
const editBtn = document.querySelector(".edit-profile-btn");
const statEls = document.querySelectorAll(".profile-stats strong");

/* ================= STATE ================= */
let currentUser = null;
let editMode = false;

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
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  // Create profile if missing
  if (!snap.exists()) {
    await setDoc(userRef, {
      username: user.email.split("@")[0],
      bio: "",
      avatarURL: "",
      bannerURL: "",
      private: false,
      blockedUsers: []
    });
  }

  const data = (await getDoc(userRef)).data();

  profileName.textContent = data.username;
  profileHandle.textContent = "@" + data.username;
  profileBio.textContent =
    data.bio || "This is your bio. Tell people about yourself.";

  if (data.avatarURL) {
    avatar.style.backgroundImage = `url(${data.avatarURL})`;
    avatar.style.backgroundSize = "cover";
    avatar.style.backgroundPosition = "center";
  }

  if (data.bannerURL) {
    banner.style.backgroundImage = `url(${data.bannerURL})`;
    banner.style.backgroundSize = "cover";
    banner.style.backgroundPosition = "center";
  }

  loadStats(user.uid);
}

/* ================= STATS ================= */
async function loadStats(uid) {
  const postsSnap = await getDocs(
    query(collection(db, "posts"), where("uid", "==", uid))
  );

  statEls[0].textContent = postsSnap.size; // Posts
  statEls[1].textContent = 0; // Followers (later)
  statEls[2].textContent = 0; // Following (later)
  statEls[3].textContent = 0; // Likes (later)
}

/* ================= EDIT MODE ================= */
editBtn?.addEventListener("click", async () => {
  if (!currentUser) return;

  editMode = !editMode;
  editBtn.textContent = editMode ? "Save Profile" : "Edit Profile";

  profileBio.contentEditable = editMode;
  profileBio.style.outline = editMode ? "1px solid #333" : "none";

  if (!editMode) {
    await updateDoc(doc(db, "users", currentUser.uid), {
      bio: profileBio.textContent.trim()
    });
  }
});

/* ================= AVATAR UPLOAD ================= */
avatar?.addEventListener("click", () => uploadImage("avatar"));

/* ================= BANNER UPLOAD ================= */
banner?.addEventListener("click", () => uploadImage("banner"));

async function uploadImage(type) {
  if (!currentUser) return;

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";

  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;

    const path =
      type === "avatar"
        ? `avatars/${currentUser.uid}`
        : `banners/${currentUser.uid}`;

    const imgRef = ref(storage, path);
    await uploadBytes(imgRef, file);
    const url = await getDownloadURL(imgRef);

    await updateDoc(doc(db, "users", currentUser.uid), {
      [`${type}URL`]: url
    });

    const target = type === "avatar" ? avatar : banner;
    target.style.backgroundImage = `url(${url})`;
    target.style.backgroundSize = "cover";
    target.style.backgroundPosition = "center";
  };

  input.click();
}

/* ================= GUEST ================= */
function setGuestProfile() {
  profileName.textContent = "Guest";
  profileHandle.textContent = "@guest";
  profileBio.textContent = "Sign in to personalize your profile.";
  statEls.forEach(el => (el.textContent = "0"));
}
