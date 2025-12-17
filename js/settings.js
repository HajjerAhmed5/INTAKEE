/* ===============================
   INTAKEE — SETTINGS SYSTEM (FINAL)
   ✔ Privacy toggles
   ✔ Logout
   ✔ Legal modals (FIXED)
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

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return;

  const data = snap.data();

  Object.entries(toggles).forEach(([key, el]) => {
    if (el) el.checked = Boolean(data[key]);
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
   LOGOUT (SAFE)
================================ */
document.addEventListener("click", async (e) => {
  const target = e.target.closest(".settings-row");
  if (!target) return;

  if (target.textContent.trim() === "Logout") {
    await signOut(auth);
    location.reload();
  }
});

/* ===============================
   LEGAL MODAL SYSTEM (FIXED)
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
      <p>By using INTAKEE, you agree to this policy.</p>
    `
  },
  terms: {
    title: "Terms of Service",
    body: `
      <p><strong>INTAKEE Terms of Service</strong></p>
      <p>You are solely responsible for the content you upload.</p>
      <p>INTAKEE is not liable for user-generated content.</p>
      <p>We reserve the right to remove content that violates the law.</p>
      <p>Using INTAKEE means you accept these terms.</p>
    `
  },
  guidelines: {
    title: "Community Guidelines",
    body: `
      <p><strong>INTAKEE Community Guidelines</strong></p>
      <ul>
        <li>No illegal content</li>
        <li>No sexual exploitation</li>
        <li>No severe harassment or threats</li>
      </ul>
      <p>Violations may result in removal or account suspension.</p>
    `
  }
};

/* LEGAL ROW CLICK HANDLING — ISOLATED */
document.addEventListener("click", (e) => {
  const row = e.target.closest(".settings-row[data-legal]");
  if (!row) return;

  const type = row.dataset.legal;
  const content = legalContent[type];
  if (!content) return;

  legalTitle.textContent = content.title;
  legalBody.innerHTML = content.body;
  legalModal.classList.remove("hidden");
});

/* CLOSE MODAL */
closeBtn?.addEventListener("click", () => {
  legalModal.classList.add("hidden");
});

/* CLICK OUTSIDE TO CLOSE */
legalModal?.addEventListener("click", (e) => {
  if (e.target === legalModal) {
    legalModal.classList.add("hidden");
  }
});
