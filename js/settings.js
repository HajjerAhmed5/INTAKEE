/* ===============================
   INTAKEE — SETTINGS SYSTEM (CLEAN)
================================ */
import { auth, db } from "./firebase-init.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

/* ===============================
   HELPER: FIND TOGGLE BY LABEL
================================ */
function getToggle(labelText) {
  const items = document.querySelectorAll("#settings .settings-item.toggle");
  for (const item of items) {
    if (item.textContent.includes(labelText)) {
      return item.querySelector("input[type='checkbox']");
    }
  }
  return null;
}

/* ===============================
   TOGGLES (MATCH HTML)
================================ */
const toggles = {
  privateAccount: getToggle("Private Account"),
  engagementNotifications: getToggle("Likes"),
  newUploads: getToggle("New Uploads")
};

/* ===============================
   LOAD SETTINGS AFTER AUTH
================================ */
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return;

  const data = snap.data();

  Object.entries(toggles).forEach(([key, toggle]) => {
    if (toggle && key in data) {
      toggle.checked = Boolean(data[key]);
    }
  });
});

/* ===============================
   SAVE ON CHANGE
================================ */
Object.entries(toggles).forEach(([key, toggle]) => {
  if (!toggle) return;

  toggle.addEventListener("change", async () => {
    const user = auth.currentUser;
    if (!user) return;

    await updateDoc(doc(db, "users", user.uid), {
      [key]: toggle.checked
    });
  });
});

/* ===============================
   LOG OUT
================================ */
document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".settings-item");
  if (!btn) return;

  if (btn.textContent.trim() === "Log Out") {
    await signOut(auth);
    location.reload();
  }
});
