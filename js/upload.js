/* ===============================
   INTAKEE — UPLOAD (FINAL, SAFE)
   Uses uploadBytesResumable
   No CORS issues
================================ */

import { auth, db, storage } from "./firebase-init.js";

import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

import {
  ref,
  uploadBytesResumable,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js";

/* ================= DOM ================= */
const uploadSection = document.getElementById("upload");
if (!uploadSection) {
  console.warn("Upload section not found");
  return;
}

const uploadBtn = uploadSection.querySelector(".upload-btn");
const titleInput = uploadSection.querySelector("input[placeholder='Add a title']");
const descriptionInput = uploadSection.querySelector("textarea");
const fileInputs = uploadSection.querySelectorAll("input[type='file']");

// UI order matters
const thumbnailInput = fileInputs[0];
const mediaInput = fileInputs[1];

/* ================= CLICK HANDLER ================= */
uploadBtn.addEventListener("click", async () => {
  const user = auth.currentUser;

  if (!user) {
    alert("You must be logged in to upload.");
    return;
  }

  const mediaFile = mediaInput?.files?.[0];
  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();

  if (!mediaFile || !title) {
    alert("Please select a media file and add a title.");
    return;
  }

  uploadBtn.disabled = true;
  uploadBtn.textContent = "Uploading…";

  try {
    /* ===== STORAGE PATH ===== */
    const filePath = `uploads/${user.uid}/${Date.now()}_${mediaFile.name}`;
    const storageRef = ref(storage, filePath);

    /* ===== UPLOAD (SAFE METHOD) ===== */
    const uploadTask = uploadBytesResumable(storageRef, mediaFile);

    uploadTask.on(
      "state_changed",
      null,
      (error) => {
        console.error("Upload error:", error);
        alert("Upload failed.");
        uploadBtn.disabled = false;
        uploadBtn.textContent = "Upload";
      },
      async () => {
        /* ===== GET URL ===== */
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

        /* ===== SAVE POST ===== */
        await addDoc(collection(db, "posts"), {
          userId: user.uid,
          title,
          description,
          mediaURL: downloadURL,
          storagePath: filePath,
          type: "video",
          createdAt: serverTimestamp()
        });

        alert("✅ Upload successful!");

        // Reset form
        titleInput.value = "";
        descriptionInput.value = "";
        mediaInput.value = "";
        if (thumbnailInput) thumbnailInput.value = "";

        uploadBtn.disabled = false;
        uploadBtn.textContent = "Upload";
      }
    );

  } catch (err) {
    console.error("Unexpected upload error:", err);
    alert("Upload failed. Check console.");
    uploadBtn.disabled = false;
    uploadBtn.textContent = "Upload";
  }
});
