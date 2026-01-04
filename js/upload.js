/* =====================================
   INTAKEE — UPLOAD SYSTEM (SAFE + STABLE)
   - Matches current HTML
   - Auth protected
   - No null crashes
===================================== */

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

/* ================= SAFE DOM GUARD ================= */
const uploadSection = document.getElementById("upload");
if (!uploadSection) {
  console.log("upload.js: upload section not found — halted safely");
  return;
}

/* ================= DOM ================= */
const uploadBtn = uploadSection.querySelector(".upload-btn");
const uploadType = uploadSection.querySelector("select");
const uploadTitle = uploadSection.querySelector("input[placeholder='Add a title']");
const uploadDesc = uploadSection.querySelector("textarea");
const uploadFiles = uploadSection.querySelectorAll("input[type='file']");

if (!uploadBtn) {
  console.log("upload.js: upload button not found — halted safely");
  return;
}

/* First file input = thumbnail (optional)
   Second file input = media file (required) */
const uploadThumb = uploadFiles[0] || null;
const uploadFile = uploadFiles[1] || null;

/* ================= AUTH ================= */
let currentUser = null;

onAuthStateChanged(auth, (user) => {
  currentUser = user;
});

/* ================= UPLOAD HANDLER ================= */
uploadBtn.addEventListener("click", async () => {
  if (!currentUser) {
    alert("You must be logged in to upload.");
    return;
  }

  if (!uploadTitle.value.trim()) {
    alert("Title is required.");
    return;
  }

  if (!uploadFile || !uploadFile.files.length) {
    alert("Media file is required.");
    return;
  }

  uploadBtn.disabled = true;
  uploadBtn.textContent = "Uploading...";

  try {
    /* ---------- MEDIA UPLOAD ---------- */
    const file = uploadFile.files[0];
    const fileRef = ref(
      storage,
      `posts/${currentUser.uid}/${Date.now()}_${file.name}`
    );

    await uploadBytes(fileRef, file);
    const fileURL = await getDownloadURL(fileRef);

    /* ---------- THUMBNAIL (OPTIONAL) ---------- */
    let thumbnailURL = null;

    if (uploadThumb && uploadThumb.files.length) {
      const thumb = uploadThumb.files[0];
      const thumbRef = ref(
        storage,
        `thumbnails/${currentUser.uid}/${Date.now()}_${thumb.name}`
      );

      await uploadBytes(thumbRef, thumb);
      thumbnailURL = await getDownloadURL(thumbRef);
    }

    /* ---------- SAVE POST ---------- */
    await addDoc(collection(db, "posts"), {
      uid: currentUser.uid,
      type: uploadType.value,
      title: uploadTitle.value.trim(),
      description: uploadDesc.value.trim(),
      fileURL,
      thumbnail: thumbnailURL,
      createdAt: serverTimestamp(),
      likes: 0,
      comments: 0
    });

    alert("Upload successful!");

    /* ---------- RESET ---------- */
    uploadTitle.value = "";
    uploadDesc.value = "";
    uploadFile.value = "";
    if (uploadThumb) uploadThumb.value = "";

  } catch (err) {
    console.error("Upload error:", err);
    alert("Upload failed. Try again.");
  }

  uploadBtn.disabled = false;
  uploadBtn.textContent = "Upload";
});
