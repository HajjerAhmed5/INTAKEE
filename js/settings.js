/* ===============================
   INTAKEE — SETTINGS SYSTEM (FINAL)
================================ */

import { auth, db } from "./firebase-init.js";
import { signOut, onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

/* ===============================
   TOGGLES (MATCH HTML)
================================ */

// Privacy
const privateAccountToggle = document.querySelector(
  '#settings input[data-setting="privateAccount"]'
);
const uploadsPrivacyToggle = document.querySelector(
  '#settings input[data-setting="uploadsPrivate"]'
);
const savedPrivacyToggle = document.querySelector(
  '#settings input[data-setting="savedPrivate"]'
);

// Notifications
const engagementNotifToggle = document.querySelector(
  '#settings input[data-setting="engagementNotifications"]'
);
const followersNotifToggle = document.querySelector(
  '#settings input[data-setting="newFollowers"]'
);
const uploadsNotifToggle = document.querySelector(
  '#settings input[data-setting="creatorUploads"]'
);
const systemNotifToggle = document.querySelector(
  '#settings input[data-setting="systemUpdates"]'
);

// Playback
const autoplayToggle = document.querySelector(
  '#settings input[data-setting="autoplay"]'
);
const loopClipsToggle = document.querySelector(
  '#settings input[data-setting="loopClips"]'
);
const pipToggle = document.querySelector(
  '#settings input[data-setting="pip"]'
);
const backgroundPlayToggle = document.querySelector(
  '#settings input[data-setting="backgroundPlay"]'
);

const allToggles = [
  privateAccountToggle,
  uploadsPrivacyToggle,
  savedPrivacyToggle,
  engagementNotifToggle,
  followersNotifToggle,
  uploadsNotifToggle,
  systemNotifToggle,
  autoplayToggle,
  loopClipsToggle,
  pipToggle,
  backgroundPlayToggle
];

/* ===============================
   LOAD USER SETTINGS
================================ */

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data();

  allToggles.forEach(toggle => {
    if (!toggle) return;
    const key = toggle.dataset.setting;
    toggle.checked = Boolean(data[key]);
  });
});

/* ===============================
   SAVE ON CHANGE
================================ */

allToggles.forEach(toggle => {
  if (!toggle) return;

  toggle.addEventListener("change", async () => {
    const user = auth.currentUser;
    if (!user) return;

    const key = toggle.dataset.setting;

    await updateDoc(doc(db, "users", user.uid), {
      [key]: toggle.checked
    });
  });
});

/* ===============================
   LOG OUT
================================ */

document.addEventListener("click", async (e) => {
  const logoutBtn = e.target.closest(".settings-item.danger");
  if (!logoutBtn || logoutBtn.textContent !== "Log Out") return;

  await signOut(auth);
  location.reload();
});
