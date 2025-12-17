/* ===============================
   INTAKEE — SETTINGS SYSTEM
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
   PRIVACY TOGGLES
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
    if (el) el.checked = data[key] || false;
  });
});

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
   LEGAL MODAL SYSTEM
================================ */
const legalModal = document.getElementById("legalModal");
const legalTitle = document.getElementById("legalTitle");
const legalBody = document.getElementById("legalBody");

const legalContent = {
  privacy: {
    title: "Privacy Policy",
    body: `
      <p><strong>INTAKEE Privacy Policy</strong></p>
      <p>We collect only the data required to operate the platform.</p>
      <p>We do not sell personal data.</p>
      <p>Uploaded content is public unless stated otherwise.</p>
    `
  },
  terms: {
    title: "Terms of Service",
    body: `
      <p><strong>INTAKEE Terms of Service</strong></p>
      <p>You are solely responsible for the content you upload.</p>
      <p>INTAKEE is not liable for user-generated content.</p>
      <p>Use of the platform constitutes acceptance of these terms.</p>
    `
  },
  guidelines: {
    title: "Community Guidelines",
    body: `
      <p><strong>INTAKEE Community Guidelines</strong></p>
      <ul>
        <li>No illegal content</li>
        <li>No sexual exploitation</li>
        <li>No threats or extreme harassment</li>
      </ul>
      <p>Violations may result in removal or suspension.</p>
    `
  }
};

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".settings-row[data-legal]").forEach(row => {
    row.addEventListener("click", () => {
      const type = row.dataset.legal;
      if (!legalContent[type]) return;

      legalTitle.textContent = legalContent[type].title;
      legalBody.innerHTML = legalContent[type].body;
      legalModal.classList.remove("hidden");
    });
  });

  document.querySelector(".close-btn")?.addEventListener("click", () => {
    legalModal.classList.add("hidden");
  });
});
