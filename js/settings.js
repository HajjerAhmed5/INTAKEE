/* ===============================
   INTAKEE — SETTINGS (FINAL STABLE)
   - Auth-gated
   - Firestore-safe
   - DOM-safe
================================ */

import { auth, db } from "./firebase-init.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

/* ================= DOM ================= */
const settingsUsername = document.querySelector(".settings-username");
const settingsEmail = document.querySelector(".settings-email");

/* ================= LOAD SETTINGS ================= */
async function loadSettings(user) {
  if (!user || !user.uid) {
    console.warn("⚠️ loadSettings called without user");
    return;
  }

  try {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      console.warn("⚠️ Settings document missing");
      return;
    }

    const data = snap.data();

    if (settingsUsername) {
      settingsUsername.textContent = "@" + (data.username || "user");
    }

    if (settingsEmail) {
      settingsEmail.textContent = data.email || user.email;
    }

    console.log("✅ Settings loaded");

  } catch (err) {
    console.error("❌ Settings load failed:", err);
  }
}

/* ================= AUTH GATE ================= */
onAuthStateChanged(auth, (user) => {
  if (!user) {
    console.warn("⏳ Settings skipped — no user");
    return;
  }

  loadSettings(user);
});
