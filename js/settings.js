/* ===============================
   INTAKEE — SETTINGS SYSTEM
   Final Production Version
================================ */

import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
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

/* ===============================
   LOAD USER SETTINGS
================================ */
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data();

  if (toggles.privateAccount) toggles.privateAccount.checked = !!data.privateAccount;
  if (toggles.uploadsPrivate) toggles.uploadsPrivate.checked = !!data.uploadsPrivate;
  if (toggles.savedPrivate) toggles.savedPrivate.checked = !!data.savedPrivate;
  if (toggles.playlistsPrivate) toggles.playlistsPrivate.checked = !!data.playlistsPrivate;
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
      alert("Account deletion will be enabled soon.");
    });
  }
});

/* ===============================
   LEGAL MODAL SYSTEM (FINAL)
================================ */
const legalModal = document.getElementById("legalModal");
const legalTitle = document.getElementById("legalTitle");
const legalBody = document.getElementById("legalBody");
const closeBtn = document.querySelector(".close-btn");

const legalContent = {
  privacy: {
    title: "Privacy Policy",
    body: `
      <p><strong>INTAKEE Privacy Policy</strong></p>
      <p>
        INTAKEE collects only the information necessary to operate the platform,
        including account data, uploaded content, and basic usage analytics.
      </p>
      <p>
        We do not sell personal data. Public content is visible by default unless
        a creator chooses otherwise.
      </p>
      <p>
        By using INTAKEE, you agree to this Privacy Policy.
      </p>
    `
  },

  terms: {
    title: "Terms of Service",
    body: `
      <p><strong>INTAKEE Terms of Service</strong></p>
      <p>
        You are solely responsible for the content you upload.
      </p>
      <p>
        INTAKEE is not liable for user-generated content but reserves the right
        to remove content that violates the law or our guidelines.
      </p>
      <p>
        Continued use of the platform constitutes acceptance of these terms.
      </p>
    `
  },

  guidelines: {
    title: "Community Guidelines",
    body: `
      <p><strong>INTAKEE Community Guidelines</strong></p>
      <ul>
        <li>No illegal activity</li>
        <li>No sexual exploitation</li>
        <li>No severe harassment or threats</li>
      </ul>
      <p>
        Violations may result in content removal or account suspension.
      </p>
    `
  }
};

/* ===============================
   LEGAL CLICK HANDLERS
================================ */
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".settings-row[data-legal]").forEach(row => {
    row.addEventListener("click", () => {
      const type = row.dataset.legal;
      const content = legalContent[type];
      if (!content) return;

      legalTitle.textContent = content.title;
      legalBody.innerHTML = content.body;
      legalModal.classList.remove("hidden");
    });
  });

  closeBtn?.addEventListener("click", () => {
    legalModal.classList.add("hidden");
  });
});
