/* ===============================
   INTAKEE — SETTINGS SYSTEM (STABLE)
================================ */
import { auth } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

let authReady = false;
let currentUser = null;

onAuthStateChanged(auth, (user) => {
  authReady = true;
  currentUser = user;
});

import { auth, db } from "./firebase-init.js";
import {
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

/* ===============================
   HELPER: MAP SETTINGS BY LABEL
================================ */

function getToggle(labelText) {
  const items = document.querySelectorAll("#settings .settings-item.toggle");
  for (const item of items) {
    if (item.textContent.includes(labelText)) {
      return item.querySelector("input[type='checkbox']");
    }
  }
  return null;
}

/* ===============================
   TOGGLES (MATCH CURRENT HTML)
================================ */

const toggles = {
  privateAccount: getToggle("Private Account"),
  uploadsPrivate: getToggle("Uploads Privacy"),
  savedPrivate: getToggle("Saved Content"),
  engagementNotifications: getToggle("Engagement"),
  newFollowers: getToggle("New Followers"),
  creatorUploads: getToggle("Creator Uploads"),
  systemUpdates: getToggle("System"),
  autoplay: getToggle("Auto-play"),
  loopClips: getToggle("Auto-loop"),
  pip: getToggle("Picture-in-Picture"),
  backgroundPlay: getToggle("Background Play")
};

/* ===============================
   LOAD USER SETTINGS
================================ */

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data();

  Object.entries(toggles).forEach(([key, toggle]) => {
    if (toggle && key in data) {
      toggle.checked = Boolean(data[key]);
    }
  });
});

/* ===============================
   SAVE ON CHANGE
================================ */

Object.entries(toggles).forEach(([key, toggle]) => {
  if (!toggle) return;

  toggle.addEventListener("change", async () => {
    const user = auth.currentUser;
    if (!user) return;

    await updateDoc(doc(db, "users", user.uid), {
      [key]: toggle.checked
    });
  });
});

/* ===============================
   LOG OUT
================================ */

document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".settings-item");
  if (!btn) return;

  if (btn.textContent.trim() === "Log Out") {
    await signOut(auth);
    location.reload();
  }
});
