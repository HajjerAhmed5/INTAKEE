/* ===============================
   INTAKEE — UPLOAD (FIXED & SAFE)
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

// ✅ SAFE EXIT — NO ILLEGAL RETURN
if (!uploadSection) {
  console.warn("Upload section not found. Skipping upload.js");
} else {

  const typeSelect = uploadSection.querySelector("select");
  const titleInput = uploadSection.querySelector("input[placeholder='Add a title']");
  const descInput = uploadSection.querySelector("textarea");
  const thumbInput = uploadSection.querySelector("input[name='thumbnail']");
  const fileInput = uploadSection.querySelector("input[name='media']");
  const uploadBtn = uploadSection.querySelector(".upload-btn");

  let currentUser = null;

  onAuthStateChanged(auth, user => {
    currentUser = user;
  });

  uploadBtn.addEventListener("click", async () => {
    if (!currentUser) {
      alert("You must be logged in to upload.");
      return;
    }

    const title = titleInput.value.trim();
    const description = descInput.value.trim();
    const file = fileInput.files[0];
    const thumbnail = thumbInput?.files[0] || null;
    const type = typeSelect.value;

    if (!title || !file) {
      alert("Title and media file are required.");
      return;
    }

    try {
      uploadBtn.disabled = true;
      uploadBtn.textContent = "Uploading...";

      // 📤 Upload media
      const mediaRef = ref(
        storage,
        `uploads/${currentUser.uid}/${Date.now()}-${file.name}`
      );

      await uploadBytes(mediaRef, file);
      const mediaURL = await getDownloadURL(mediaRef);

      // 🖼 Upload thumbnail (optional)
      let thumbnailURL = null;
      if (thumbnail) {
        const thumbRef = ref(
          storage,
          `thumbnails/${currentUser.uid}/${Date.now()}-${thumbnail.name}`
        );
        await uploadBytes(thumbRef, thumbnail);
        thumbnailURL = await getDownloadURL(thumbRef);
      }

      // 📝 Save post
      await addDoc(collection(db, "posts"), {
        userId: currentUser.uid,
        username: currentUser.displayName || "unknown",
        title,
        description,
        type,
        mediaURL,
        thumbnailURL,
        createdAt: serverTimestamp()
      });

      alert("Upload successful!");

      titleInput.value = "";
      descInput.value = "";
      fileInput.value = "";
      if (thumbInput) thumbInput.value = "";

    } catch (err) {
      console.error("UPLOAD ERROR:", err);
      alert("Upload failed. Check console.");
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.textContent = "Upload";
    }
  });
}
