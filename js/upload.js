/* ===============================
   INTAKEE — UPLOAD (FINAL FIX)
================================ */

import { auth, db, storage } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js";

/* ================= INIT ================= */
const uploadSection = document.getElementById("upload");

if (!uploadSection) {
  console.warn("Upload section not found. upload.js skipped.");
} else {

  const inputs = uploadSection.querySelectorAll("input[type='file']");
  const titleInput = uploadSection.querySelector("input[placeholder='Add a title']");
  const descInput = uploadSection.querySelector("textarea");
  const typeSelect = uploadSection.querySelector("select");
  const uploadBtn = uploadSection.querySelector(".upload-btn");

  // ✅ STRICT mapping based on UI order
  const thumbnailInput = inputs[0];
  const mediaInput = inputs[1];

  let currentUser = null;

  onAuthStateChanged(auth, user => {
    currentUser = user;
  });

  uploadBtn.addEventListener("click", async () => {
    if (!currentUser) {
      alert("You must be logged in to upload.");
      return;
    }

    if (!mediaInput || !mediaInput.files.length) {
      alert("Please select a media file.");
      return;
    }

    const title = titleInput.value.trim();
    const description = descInput.value.trim();
    const type = typeSelect.value;
    const mediaFile = mediaInput.files[0];
    const thumbFile = thumbnailInput?.files[0] || null;

    if (!title) {
      alert("Title is required.");
      return;
    }

    try {
      uploadBtn.disabled = true;
      uploadBtn.textContent = "Uploading...";

      /* ===== Upload media ===== */
      const mediaRef = ref(
        storage,
        `uploads/${currentUser.uid}/${Date.now()}-${mediaFile.name}`
      );

      await uploadBytes(mediaRef, mediaFile);
      const mediaURL = await getDownloadURL(mediaRef);

      /* ===== Upload thumbnail (optional) ===== */
      let thumbnailURL = null;

      if (thumbFile) {
        const thumbRef = ref(
          storage,
          `thumbnails/${currentUser.uid}/${Date.now()}-${thumbFile.name}`
        );
        await uploadBytes(thumbRef, thumbFile);
        thumbnailURL = await getDownloadURL(thumbRef);
      }

      /* ===== Save Firestore doc ===== */
      await addDoc(collection(db, "posts"), {
        userId: currentUser.uid,
        title,
        description,
        type,
        mediaURL,
        thumbnailURL,
        createdAt: serverTimestamp()
      });

      alert("✅ Upload successful!");

      titleInput.value = "";
      descInput.value = "";
      mediaInput.value = "";
      if (thumbnailInput) thumbnailInput.value = "";

    } catch (err) {
      console.error("UPLOAD FAILED:", err);
      alert("Upload failed. Check console.");
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.textContent = "Upload";
    }
  });
}
