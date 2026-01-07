/* ===============================
   INTAKEE — UPLOAD (STABLE FIX)
================================ */

import { auth, db, storage } from "./firebase-init.js";

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

/* ================= DOM ================= */
const uploadSection = document.getElementById("upload");
if (!uploadSection) {
  console.warn("Upload section not found");
} else {
  const titleInput = uploadSection.querySelector("input[placeholder='Add a title'], input[placeholder='Title']");
  const descriptionInput = uploadSection.querySelector("textarea");

  const fileInputs = uploadSection.querySelectorAll("input[type='file']");
  const thumbnailInput = fileInputs[0]; // FIRST choose file
  const mediaInput = fileInputs[1];     // SECOND choose file

  const uploadBtn = uploadSection.querySelector(".upload-btn, button");

  uploadBtn.addEventListener("click", async () => {
    const user = auth.currentUser;

    if (!user) {
      alert("You must be logged in to upload.");
      return;
    }

    const title = titleInput?.value.trim();
    const description = descriptionInput?.value.trim() || "";
    const mediaFile = mediaInput?.files[0];
    const thumbnailFile = thumbnailInput?.files[0] || null;

    if (!title) {
      alert("Please add a title.");
      return;
    }

    if (!mediaFile) {
      alert("Please select a media file.");
      return;
    }

    try {
      uploadBtn.disabled = true;
      uploadBtn.textContent = "Uploading...";

      /* ========= UPLOAD MEDIA ========= */
      const mediaRef = ref(
        storage,
        `uploads/${user.uid}/media-${Date.now()}-${mediaFile.name}`
      );

      await uploadBytes(mediaRef, mediaFile);
      const mediaURL = await getDownloadURL(mediaRef);

      /* ========= UPLOAD THUMBNAIL (OPTIONAL) ========= */
      let thumbnailURL = null;

      if (thumbnailFile) {
        const thumbRef = ref(
          storage,
          `uploads/${user.uid}/thumb-${Date.now()}-${thumbnailFile.name}`
        );

        await uploadBytes(thumbRef, thumbnailFile);
        thumbnailURL = await getDownloadURL(thumbRef);
      }

      /* ========= SAVE POST ========= */
      await addDoc(collection(db, "posts"), {
        userId: user.uid,
        title,
        description,
        mediaURL,
        thumbnailURL,
        type: "video",
        createdAt: serverTimestamp()
      });

      alert("Upload successful!");

      titleInput.value = "";
      if (descriptionInput) descriptionInput.value = "";
      mediaInput.value = "";
      thumbnailInput.value = "";

    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed. Check console for details.");
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.textContent = "Upload";
    }
  });
}
