/* ===============================
   INTAKEE — SETTINGS (FINAL, LOCKED)
================================ */

import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged, signOut } from
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { doc, getDoc } from
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

/* ================= DOM ================= */
const settingsUsername = document.querySelector(".settings-username");
const settingsEmail = document.querySelector(".settings-email");
const logoutBtn = document.getElementById("logoutBtn");

let settingsLoaded = false;

/* ================= LOAD SETTINGS ================= */
async function loadSettings(user) {
  if (settingsLoaded) return;
  settingsLoaded = true;

  try {
    const snap = await getDoc(doc(db, "users", user.uid));

    if (!snap.exists()) {
      setFallback(user);
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
    setFallback(user);
  }
}

/* ================= FALLBACK ================= */
function setFallback(user) {
  if (settingsUsername) settingsUsername.textContent = "@user";
  if (settingsEmail) settingsEmail.textContent = user.email || "";
}

/* ================= LOGOUT ================= */
logoutBtn?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    location.hash = "#home";
    location.reload();
  } catch (err) {
    console.error("❌ Logout failed:", err);
  }
});

/* ================= AUTH GATE ================= */
onAuthStateChanged(auth, user => {
  if (!user) return;
  loadSettings(user);
});
