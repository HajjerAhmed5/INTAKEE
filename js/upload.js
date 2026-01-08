/* ===============================
   INTAKEE — UPLOAD (STABLE FINAL)
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
  console.warn("Upload section not found — upload.js loaded safely");
}

/* Safe DOM queries */
const titleInput = uploadSection?.querySelector("input[placeholder='Add a title'], input[placeholder='Title']");
const descInput  = uploadSection?.querySelector("textarea");
const uploadBtn  = uploadSection?.querySelector(".upload-btn");

/* File inputs (UI order matters) */
const fileInputs = uploadSection?.querySelectorAll("input[type='file']") || [];
const thumbnailInput = fileInputs[0] || null;
const mediaInput     = fileInputs[1] || null;

/* ================= UPLOAD HANDLER ================= */
uploadBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;

  if (!user) {
    alert("You must be logged in to upload.");
    return;
  }

  if (!mediaInput || !mediaInput.files || mediaInput.files.length === 0) {
    alert("Please select a media file.");
    return;
  }

  const mediaFile = mediaInput.files[0];
  const thumbnailFile = thumbnailInput?.files?.[0] || null;

  const title = titleInput?.value?.trim() || "";
  const description = descInput?.value?.trim() || "";

  if (!title) {
    alert("Please add a title.");
    return;
  }

  try {
    uploadBtn.disabled = true;
    uploadBtn.textContent = "Uploading...";

    /* Upload media */
    const mediaRef = ref(
      storage,
      `uploads/${user.uid}/${Date.now()}-${mediaFile.name}`
    );

    await uploadBytes(mediaRef, mediaFile);
    const mediaURL = await getDownloadURL(mediaRef);

    /* Upload thumbnail (optional) */
    let thumbnailURL = null;
    if (thumbnailFile) {
      const thumbRef = ref(
        storage,
        `thumbnails/${user.uid}/${Date.now()}-${thumbnailFile.name}`
      );
      await uploadBytes(thumbRef, thumbnailFile);
      thumbnailURL = await getDownloadURL(thumbRef);
    }

    /* Save Firestore doc */
    await addDoc(collection(db, "posts"), {
      userId: user.uid,
      title,
      description,
      mediaURL,
      thumbnailURL,
      type: "video",
      createdAt: serverTimestamp()
    });

    alert("✅ Upload successful!");

    titleInput.value = "";
    descInput.value = "";
    mediaInput.value = "";
    if (thumbnailInput) thumbnailInput.value = "";

  } catch (err) {
    console.error("❌ Upload failed:", err);
    alert("Upload failed. Check console.");
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.textContent = "Upload";
  }
});
