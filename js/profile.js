/* ===============================
   INTAKEE — PROFILE SYSTEM (CLEAN + SAFE)
================================ */
import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
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

const statPosts = document.querySelector(".profile-stats div:nth-child(1) strong");
const statFollowers = document.querySelector(".profile-stats div:nth-child(2) strong");
const statFollowing = document.querySelector(".profile-stats div:nth-child(3) strong");
const statLikes = document.querySelector(".profile-stats div:nth-child(4) strong");

/* ================= WAIT FOR AUTH ================= */
const waitForAuth = setInterval(() => {
  if (!window.__AUTH_READY__) return;
  clearInterval(waitForAuth);

  onAuthStateChanged(auth, async (user) => {
    if (!profileName || !profileHandle || !profileBio) return;

    // LOGGED OUT
    if (!user) {
      profileName.textContent = "Guest";
      profileHandle.textContent = "@guest";
      profileBio.textContent = "Sign in to personalize your profile.";

      if (statPosts) statPosts.textContent = "0";
      if (statFollowers) statFollowers.textContent = "0";
      if (statFollowing) statFollowing.textContent = "0";
      if (statLikes) statLikes.textContent = "0";
      return;
    }

    // LOGGED IN
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists()) return;

    const data = snap.data();

    profileName.textContent = data.username || "User";
    profileHandle.textContent = "@" + (data.username || "user");
    profileBio.textContent = data.bio || "No bio yet.";

    if (statFollowers) statFollowers.textContent = data.followers?.length || 0;
    if (statFollowing) statFollowing.textContent = data.following?.length || 0;
    if (statLikes) statLikes.textContent = data.likes || 0;

    loadUserUploads(user.uid);
  });
}, 50);

/* ================= POSTS ================= */
async function loadUserUploads(uid) {
  if (!statPosts) return;
  const q = query(collection(db, "posts"), where("uid", "==", uid));
  const snap = await getDocs(q);
  statPosts.textContent = snap.size;
}
