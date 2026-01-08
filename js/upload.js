/*
=====================================
INTAKEE — UPLOAD SYSTEM (FIXED)
=====================================
*/

import { auth, db, storage } from "./firebase-init.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js";

import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

/* ================= DOM ================= */
const uploadBtn = document.querySelector(".upload-btn");
const typeSelect = document.querySelector("#upload select");
const titleInput = document.querySelector("#upload input[placeholder='Add a title']");
const descInput = document.querySelector("#upload textarea");
const thumbInput = document.querySelector("#upload input[type='file']:nth-of-type(1)");
const mediaInput = document.querySelector("#upload input[type='file']:nth-of-type(2)");

let currentUser = null;

/* ================= AUTH ================= */
onAuthStateChanged(auth, (user) => {
  currentUser = user;
});

/* ================= UPLOAD ================= */
uploadBtn.addEventListener("click", async () => {
  console.log("⬆️ Upload clicked");

  if (!currentUser) {
    alert("You must be logged in");
    return;
  }

  const mediaFile = mediaInput?.files?.[0];
  const thumbFile = thumbInput?.files?.[0];

  if (!mediaFile) {
    alert("Please select a media file");
    return;
  }

  uploadBtn.textContent = "Uploading...";
  uploadBtn.disabled = true;

  try {
    /* ===== STORAGE ===== */
    const mediaRef = ref(
      storage,
      `uploads/${currentUser.uid}/${Date.now()}_${mediaFile.name}`
    );

    await uploadBytes(mediaRef, mediaFile);
    const mediaURL = await getDownloadURL(mediaRef);

    let thumbURL = null;

    if (thumbFile) {
      const thumbRef = ref(
        storage,
        `thumbnails/${currentUser.uid}/${Date.now()}_${thumbFile.name}`
      );

      await uploadBytes(thumbRef, thumbFile);
      thumbURL = await getDownloadURL(thumbRef);
    }

    /* ===== FIRESTORE ===== */
    await addDoc(collection(db, "posts"), {
      type: typeSelect.value.toLowerCase(),
      title: titleInput.value || "",
      description: descInput.value || "",
      mediaURL,
      thumbnailURL: thumbURL,
      userId: currentUser.uid,
      username: currentUser.email?.split("@")[0] || "user",
      createdAt: serverTimestamp(),
      views: 0
    });

    alert("Upload successful ✅");
    window.location.reload();

  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    alert("Upload failed. Check console.");
  } finally {
    uploadBtn.textContent = "Upload";
    uploadBtn.disabled = false;
  }
});
