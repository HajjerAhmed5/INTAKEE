/*
==========================================
INTAKEE — UPLOAD SYSTEM (FINAL / STABLE)
==========================================
*/

import { auth, storage, db } from "./firebase-init.js";
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
const uploadSection = document.getElementById("upload");
const uploadBtn = uploadSection?.querySelector(".upload-btn");
const typeInput = uploadSection?.querySelector("select");
const titleInput = uploadSection?.querySelector("input[type='text']");
const descInput = uploadSection?.querySelector("textarea");
const mediaInput = uploadSection?.querySelector("#mediaInput");
const thumbInput = uploadSection?.querySelector("#thumbnailInput");

let currentUser = null;
let authReady = false;

/* ================= AUTH ================= */
onAuthStateChanged(auth, user => {
  currentUser = user || null;
  authReady = true;
  console.log("✅ Auth ready for upload:", !!user);
});

/* ================= UPLOAD ================= */
if (uploadBtn) {
  uploadBtn.addEventListener("click", async () => {
    if (!authReady) {
      alert("Auth still loading. Try again.");
      return;
    }

    if (!currentUser) {
      alert("Please log in to upload.");
      return;
    }

    const mediaFile = mediaInput?.files?.[0];
    if (!mediaFile) {
      alert("Please choose a media file.");
      return;
    }

    const title = titleInput.value.trim();
    if (!title) {
      alert("Title is required.");
      return;
    }

    uploadBtn.disabled = true;
    uploadBtn.textContent = "Uploading…";

    try {
      const uid = currentUser.uid;
      const type = typeInput.value;
      const timestamp = Date.now();

      /* ===== MEDIA UPLOAD ===== */
      const mediaPath = `uploads/${type}/${uid}/${timestamp}_${mediaFile.name}`;
      const mediaRef = ref(storage, mediaPath);

      await uploadBytes(mediaRef, mediaFile);
      const mediaURL = await getDownloadURL(mediaRef);

      /* ===== THUMBNAIL (OPTIONAL) ===== */
      let thumbnailURL = "";
      if (thumbInput?.files?.[0]) {
        const thumbFile = thumbInput.files[0];
        const thumbPath = `thumbnails/${uid}/${timestamp}_${thumbFile.name}`;
        const thumbRef = ref(storage, thumbPath);

        await uploadBytes(thumbRef, thumbFile);
        thumbnailURL = await getDownloadURL(thumbRef);
      }

      /* ===== FIRESTORE ===== */
      await addDoc(collection(db, "posts"), {
        type,
        title,
        description: descInput.value.trim(),
        mediaURL,
        thumbnailURL,
        uid,
        username: currentUser.displayName || "user",
        createdAt: serverTimestamp(),
        views: 0
      });

      alert("✅ Upload successful!");

      titleInput.value = "";
      descInput.value = "";
      mediaInput.value = "";
      if (thumbInput) thumbInput.value = "";

      window.location.hash = "#home";

    } catch (err) {
      console.error("❌ Upload failed:", err);
      alert("Upload failed. Check console.");
    }

    uploadBtn.textContent = "Upload";
    uploadBtn.disabled = false;
  });
} else {
  console.error("❌ Upload button not found");
}
