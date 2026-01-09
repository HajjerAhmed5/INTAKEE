/* ===============================
   INTAKEE — PROFILE (REAL APP)
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
const statEls = document.querySelectorAll(".profile-stats strong");

const tabButtons = document.querySelectorAll(".profile-tabs button");

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
  setupTabs();
});

/* ================= LOAD PROFILE ================= */
async function loadProfile(user) {
  try {
    const snap = await getDoc(doc(db, "users", user.uid));

    if (!snap.exists()) {
      setGuestProfile();
      return;
    }

    const data = snap.data();

    profileName.textContent = data.username || "User";
    profileHandle.textContent = "@" + (data.username || "user");
    profileBio.textContent =
      data.bio || "This is your bio. Tell people about yourself.";

    await loadStats(user.uid);

    console.log("✅ Profile loaded:", data.username);

  } catch (err) {
    console.error("❌ Profile error:", err);
    setGuestProfile();
  }
}

/* ================= STATS ================= */
async function loadStats(uid) {
  // Posts
  const postsSnap = await getDocs(
    query(collection(db, "posts"), where("uid", "==", uid))
  );

  statEls[0].textContent = postsSnap.size; // Posts
  statEls[1].textContent = 0; // Followers (later)
  statEls[2].textContent = 0; // Following (later)
  statEls[3].textContent = 0; // Likes (later)
}

/* ================= TABS ================= */
function setupTabs() {
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      tabButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      console.log("📂 Profile tab:", btn.textContent);
      // Feed hookup comes next step
    });
  });
}

/* ================= GUEST ================= */
function setGuestProfile() {
  profileName.textContent = "Guest";
  profileHandle.textContent = "@guest";
  profileBio.textContent = "Sign in to personalize your profile.";

  statEls.forEach(el => (el.textContent = "0"));
}
