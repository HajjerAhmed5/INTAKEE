/* ===============================
   INTAKEE — SETTINGS SYSTEM (FINAL)
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
   USER PRIVACY TOGGLES
================================ */
const toggles = {
  privateAccount: document.getElementById("togglePrivateAccount"),
  uploadsPrivate: document.getElementById("togglePrivateUploads"),
  savedPrivate: document.getElementById("togglePrivateSaved"),
  playlistsPrivate: document.getElementById("togglePrivatePlaylists"),
};

auth.onAuthStateChanged(async (user) => {
  if (!user) return;

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data();

  Object.entries(toggles).forEach(([key, el]) => {
    if (el) el.checked = !!data[key];
  });
});

Object.entries(toggles).forEach(([key, el]) => {
  if (!el) return;

  el.addEventListener("change", async () => {
    if (!auth.currentUser) return;
    await updateDoc(doc(db, "users", auth.currentUser.uid), {
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
   LEGAL MODAL SYSTEM (FINAL)
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
      <p>We collect only information required to operate the platform.</p>
      <p>We do not sell personal data.</p>
      <p>Uploaded content is public unless stated otherwise.</p>
    `
  },
  terms: {
    title: "Terms of Service",
    body: `
      <p><strong>INTAKEE Terms of Service</strong></p>
      <p>You are solely responsible for your content.</p>
      <p>INTAKEE is not liable for user-generated content.</p>
      <p>Use of the platform means acceptance of these terms.</p>
    `
  },
  guidelines: {
    title: "Community Guidelines",
    body: `
      <p><strong>Community Guidelines</strong></p>
      <ul>
        <li>No illegal content</li>
        <li>No sexual exploitation</li>
        <li>No extreme harassment</li>
      </ul>
      <p>Violations may result in removal or suspension.</p>
    `
  }
};

/* Only bind when Settings tab exists */
document.addEventListener("DOMContentLoaded", () => {
  const settingsTab = document.getElementById("settings");
  if (!settingsTab) return;

  settingsTab.querySelectorAll("[data-legal]").forEach(row => {
    row.addEventListener("click", () => {
      const type = row.dataset.legal;
      if (!legalContent[type]) return;

      legalTitle.textContent = legalContent[type].title;
      legalBody.innerHTML = legalContent[type].body;
      legalModal.classList.remove("hidden");
    });
  });

  closeBtn?.addEventListener("click", () => {
    legalModal.classList.add("hidden");
  });
});
