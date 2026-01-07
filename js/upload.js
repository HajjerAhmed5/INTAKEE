/* ===============================
   INTAKEE — UPLOAD (FINAL FIX)
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
if (!uploadSection) return;

const titleInput = uploadSection.querySelector("input[name='title']");
const descriptionInput = uploadSection.querySelector("textarea[name='description']");
const mediaInput = uploadSection.querySelector("input[name='media']");
const thumbnailInput = uploadSection.querySelector("input[name='thumbnail']");
const uploadBtn = uploadSection.querySelector(".upload-btn");

/* ================= UPLOAD ================= */
uploadBtn.addEventListener("click", async () => {
  const user = auth.currentUser;

  if (!user) {
    alert("You must be logged in.");
    return;
  }

  if (!mediaInput || !mediaInput.files || !mediaInput.files[0]) {
    alert("Please select a media file.");
    return;
  }

  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();
  const mediaFile = mediaInput.files[0];
  const thumbFile = thumbnailInput?.files?.[0] || null;

  if (!title) {
    alert("Title is required.");
    return;
  }

  uploadBtn.disabled = true;
  uploadBtn.textContent = "Uploading...";

  try {
    /* ===== MEDIA UPLOAD ===== */
    const mediaRef = ref(
      storage,
      `uploads/${user.uid}/${Date.now()}-${mediaFile.name}`
    );

    const mediaSnap = await uploadBytesResumable(mediaRef, mediaFile);
    const mediaURL = await getDownloadURL(mediaSnap.ref);

    /* ===== THUMBNAIL (OPTIONAL) ===== */
    let thumbnailURL = null;

    if (thumbFile) {
      const thumbRef = ref(
        storage,
        `thumbnails/${user.uid}/${Date.now()}-${thumbFile.name}`
      );

      const thumbSnap = await uploadBytesResumable(thumbRef, thumbFile);
      thumbnailURL = await getDownloadURL(thumbSnap.ref);
    }

    /* ===== SAVE POST ===== */
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
    descriptionInput.value = "";
    mediaInput.value = "";
    if (thumbnailInput) thumbnailInput.value = "";

  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    alert("Upload failed. Check console.");
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.textContent = "Upload";
  }
});
