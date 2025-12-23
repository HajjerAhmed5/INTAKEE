/*
==========================================
INTAKEE — SETTINGS SYSTEM (FINAL STABLE)
- Uses firebase-init.js ONLY
- No duplicate Firebase apps
==========================================
*/

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
   PRIVACY TOGGLES
================================ */
const toggles = {
  privateAccount: document.getElementById("togglePrivateAccount"),
  uploadsPrivate: document.getElementById("togglePrivateUploads"),
  savedPrivate: document.getElementById("togglePrivateSaved"),
  playlistsPrivate: document.getElementById("togglePrivatePlaylists"),
};

/* ===============================
   LOAD USER SETTINGS
================================ */
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists()) return;

    const data = snap.data();

    Object.entries(toggles).forEach(([key, el]) => {
      if (el) el.checked = Boolean(data[key]);
    });
  } catch (err) {
    console.error("Settings load error:", err);
  }
});

/* ===============================
   SAVE TOGGLES
================================ */
Object.entries(toggles).forEach(([key, el]) => {
  if (!el) return;

  el.addEventListener("change", async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await updateDoc(doc(db, "users", user.uid), {
        [key]: el.checked
      });
    } catch (err) {
      console.error("Settings save error:", err);
    }
  });
});

/* ===============================
   LOGOUT
================================ */
document.addEventListener("click", async (e) => {
  const row = e.target.closest(".settings-row");
  if (!row) return;

  if (row.textContent.trim() === "Log Out") {
    await signOut(auth);
    location.reload();
  }
});

/* ===============================
   LEGAL MODALS
================================ */
const legalModal = document.getElementById("legalModal");
const legalTitle = document.getElementById("legalTitle");
const legalBody = document.getElementById("legalBody");
const closeBtn = legalModal?.querySelector(".close-btn");

const legalContent = {
  privacy: {
    title: "Privacy Policy",
    body: `
      <p><strong>INTAKEE Privacy Policy</strong></p>
      <p>INTAKEE collects only the information required to operate the platform.</p>
      <p>We do not sell personal data.</p>
      <p>Uploaded content is public unless you choose privacy options.</p>
    `
  },
  terms: {
    title: "Terms of Service",
    body: `
      <p><strong>INTAKEE Terms of Service</strong></p>
      <p>You are responsible for all content you upload.</p>
      <p>INTAKEE is not liable for user-generated content.</p>
      <p>Illegal content may be removed.</p>
    `
  },
  guidelines: {
    title: "Community Guidelines",
    body: `
      <ul>
        <li>No illegal content</li>
        <li>No sexual exploitation</li>
        <li>No threats or violence</li>
      </ul>
    `
  }
};

/* OPEN LEGAL */
document.addEventListener("click", (e) => {
  const row = e.target.closest(".settings-row[data-legal]");
  if (!row) return;

  const content = legalContent[row.dataset.legal];
  if (!content) return;

  legalTitle.textContent = content.title;
  legalBody.innerHTML = content.body;
  legalModal.classList.remove("hidden");
});

/* CLOSE LEGAL */
closeBtn?.addEventListener("click", () => {
  legalModal.classList.add("hidden");
});

legalModal?.addEventListener("click", (e) => {
  if (e.target === legalModal) {
    legalModal.classList.add("hidden");
  }
});
