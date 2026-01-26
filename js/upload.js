/*
==========================================
INTAKEE — UPLOAD SYSTEM (FAST + SAFE)
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

/* ================= DOM (SAFE SELECTORS) ================= */
const uploadSection = document.getElementById("upload");
if (!uploadSection) {
  console.warn("Upload section not found");
  throw new Error("Upload UI missing");
}

const uploadBtn = uploadSection.querySelector(".upload-btn");
const typeInput = uploadSection.querySelector("select");
const titleInput = uploadSection.querySelector("input[type='text']");
const descInput = uploadSection.querySelector("textarea");
const fileInputs = uploadSection.querySelectorAll("input[type='file']");
const thumbInput = fileInputs[0];
const mediaInput = fileInputs[1];

let currentUser = null;
let authReady = false;

/* ================= AUTH ================= */
onAuthStateChanged(auth, user => {
  authReady = true;
  currentUser = user || null;
});

/* ================= UPLOAD HANDLER ================= */
uploadBtn.addEventListener("click", async () => {
  if (!authReady) {
    alert("Auth still loading — try again");
    return;
  }

  if (!currentUser) {
    alert("Please log in to upload");
    return;
  }

  const mediaFile = mediaInput?.files?.[0];
  if (!mediaFile) {
    alert("Please select a media file");
    return;
  }

  const title = titleInput.value.trim();
  if (!title) {
    alert("Title is required");
    return;
  }

  uploadBtn.disabled = true;
  uploadBtn.textContent = "Uploading…";

  try {
    const uid = currentUser.uid;
    const timestamp = Date.now();

    /* ===== MEDIA UPLOAD ===== */
    const mediaRef = ref(
      storage,
      `uploads/${uid}/${timestamp}_${mediaFile.name}`
    );

    await uploadBytes(mediaRef, mediaFile);
    const mediaURL = await getDownloadURL(mediaRef);

    /* ===== THUMBNAIL (OPTIONAL) ===== */
    let thumbnailURL = null;
    if (thumbInput?.files?.[0]) {
      const thumbFile = thumbInput.files[0];
      const thumbRef = ref(
        storage,
        `thumbnails/${uid}/${timestamp}_${thumbFile.name}`
      );
      await uploadBytes(thumbRef, thumbFile);
      thumbnailURL = await getDownloadURL(thumbRef);
    }

    /* ===== FIRESTORE ===== */
    await addDoc(collection(db, "posts"), {
      type: typeInput.value,
      title,
      description: descInput.value.trim(),
      mediaURL,
      thumbnailURL,
      uid,
      username: currentUser.displayName || "user",
      createdAt: serverTimestamp(),
      views: 0
    });

    alert("Upload successful!");

    // Reset form (no reload)
    titleInput.value = "";
    descInput.value = "";
    mediaInput.value = "";
    if (thumbInput) thumbInput.value = "";

    // Optional: jump to Home
    window.location.hash = "#home";

  } catch (err) {
    console.error("UPLOAD FAILED:", err);
    alert("Upload failed. Please try again.");
  }

  uploadBtn.textContent = "Upload";
  uploadBtn.disabled = false;
});
