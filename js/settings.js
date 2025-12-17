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
/* ===============================
   LEGAL MODALS
=============================== */

const legalModal = document.getElementById("legalModal");
const legalTitle = document.getElementById("legalTitle");
const legalBody = document.getElementById("legalBody");

const legalContent = {
  privacy: {
    title: "Privacy Policy",
    body: `
      <p><strong>INTAKEE Privacy Policy</strong></p>
      <p>
        INTAKEE respects your privacy. We collect only the information
        necessary to operate the platform, including account information,
        uploaded content, and usage data.
      </p>
      <p>
        We do not sell your personal data. Content you upload is public
        by default unless otherwise stated.
      </p>
      <p>
        By using INTAKEE, you consent to this Privacy Policy.
      </p>
    `
  },

  terms: {
    title: "Terms of Service",
    body: `
      <p><strong>INTAKEE Terms of Service</strong></p>
      <p>
        By using INTAKEE, you agree that you are solely responsible for
        any content you upload or share.
      </p>
      <p>
        INTAKEE is not liable for user-generated content. We reserve the
        right to remove content that violates our guidelines or the law.
      </p>
      <p>
        Use of the platform constitutes acceptance of these terms.
      </p>
    `
  },

  guidelines: {
    title: "Community Guidelines",
    body: `
      <p><strong>INTAKEE Community Guidelines</strong></p>
      <p>
        We support freedom of expression, but the following content is not allowed:
      </p>
      <ul>
        <li>Illegal content</li>
        <li>Sexual exploitation</li>
        <li>Severe harassment or threats</li>
      </ul>
      <p>
        Violations may result in content removal or account suspension.
      </p>
    `
  }
};

window.openLegal = function (type) {
  if (!legalContent[type]) return;

  legalTitle.textContent = legalContent[type].title;
  legalBody.innerHTML = legalContent[type].body;

  legalModal.classList.remove("hidden");
};

window.closeLegal = function () {
  legalModal.classList.add("hidden");
};
