/* ===============================
   INTAKEE — SETTINGS (AUTH SAFE)
================================ */

import { auth, db } from "./firebase-init.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

/* ================= DOM ================= */
const logoutBtn = document.querySelector(".settings-item.danger:last-child");

/* ================= LOAD SETTINGS ================= */
async function loadSettings(user) {
  try {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      console.warn("No settings document found");
      return;
    }

    // Settings data available if you want it later
    // const data = snap.data();
  } catch (err) {
    console.error("Settings load failed:", err);
  }
}

/* ================= LOG OUT ================= */
logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  location.reload();
});

/* ================= AUTH GATE ================= */
onAuthStateChanged(auth, user => {
  if (!user) {
    console.warn("⏳ Settings skipped — no user");
    return;
  }

  loadSettings(user);
});
