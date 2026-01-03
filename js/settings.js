/* ===============================
   INTAKEE — SETTINGS (FINAL FINAL)
   - Auth-gated
   - Firestore-safe
   - DOM-safe
================================ */

import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { doc, getDoc } from
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

/* ================= DOM ================= */
const settingsUsername = document.querySelector(".settings-username");
const settingsEmail = document.querySelector(".settings-email");

/* ================= LOAD SETTINGS ================= */
async function loadSettings(user) {
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists()) return;

    const data = snap.data();

    settingsUsername &&
      (settingsUsername.textContent = "@" + (data.username || "user"));

    settingsEmail &&
      (settingsEmail.textContent = data.email || user.email);

    console.log("✅ Settings loaded");
  } catch (err) {
    console.error("❌ Settings load failed:", err);
  }
}

/* ================= AUTH GATE ================= */
onAuthStateChanged(auth, (user) => {
  if (!user) return;
  loadSettings(user);
});
