/* ===============================
   INTAKEE — SETTINGS SYSTEM
   Saves & loads user preferences
================================ */

import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

const auth = getAuth();
const db = getFirestore();

/* ===============================
   DOM ELEMENTS
================================ */
const toggles = {
  privateAccount: document.getElementById("togglePrivateAccount"),
  uploadsPrivate: document.getElementById("togglePrivateUploads"),
  savedPrivate: document.getElementById("togglePrivateSaved"),
  playlistsPrivate: document.getElementById("togglePrivatePlaylists"),
};

/* ===============================
   LOAD SETTINGS
================================ */
auth.onAuthStateChanged(async (user) => {
  if (!user) return;

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data();

  if (toggles.privateAccount) toggles.privateAccount.checked = data.privateAccount || false;
  if (toggles.uploadsPrivate) toggles.uploadsPrivate.checked = data.uploadsPrivate || false;
  if (toggles.savedPrivate) toggles.savedPrivate.checked = data.savedPrivate || false;
  if (toggles.playlistsPrivate) toggles.playlistsPrivate.checked = data.playlistsPrivate || false;
});

/* ===============================
   SAVE SETTINGS
================================ */
Object.entries(toggles).forEach(([key, el]) => {
  if (!el) return;

  el.addEventListener("change", async () => {
    const user = auth.currentUser;
    if (!user) return;

    await updateDoc(doc(db, "users", user.uid), {
      [key]: el.checked
    });
  });
});

/* ===============================
   LOGOUT
================================ */
document.querySelectorAll(".settings-row").forEach(row => {
  if (row.textContent.trim() === "Logout") {
    row.addEventListener("click", async () => {
      await signOut(auth);
      location.reload();
    });
  }
});

/* ===============================
   DELETE ACCOUNT (UI ONLY)
================================ */
document.querySelectorAll(".settings-row").forEach(row => {
  if (row.textContent.trim() === "Delete Account") {
    row.addEventListener("click", () => {
      alert("Account deletion will be enabled later.");
    });
  }
});
