/*
==========================================
INTAKEE — UPLOAD SYSTEM (FINAL / GUARANTEED)
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
const fileInputs = uploadSection?.querySelectorAll("input[type='file']");
const thumbInput = fileInputs?.[0];
const mediaInput = fileInputs?.[1];

let currentUser = null;
let authReady = false;

/* ================= AUTH ================= */
onAuthStateChanged(auth, async user => {
  if (user) {
    // 🔑 FORCE token refresh (this is the magic fix)
    await user.getIdToken(true);
    currentUser = user;
  } else {
    currentUser = null;
  }

  authReady = true;
  console.log("✅ Auth ready for upload:", !!user);
});

/* ================= UPLOAD ================= */
uploadBtn.addEventListener("click", async () => {
  if (!authReady) {
    alert("Auth still loading — wait 1 second and try again");
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

    /* ===== MEDIA ===== */
    const mediaRef = ref(
      storage,
      `uploads/${uid}/${timestamp}_${mediaFile.name}`
    );

    console.log("⬆️ Uploading media...");
    await uploadBytes(mediaRef, mediaFile);
    const mediaURL = await getDownloadURL(mediaRef);

    /* ===== THUMBNAIL ===== */
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

    alert("✅ Upload successful!");

    titleInput.value = "";
    descInput.value = "";
    mediaInput.value = "";
    if (thumbInput) thumbInput.value = "";

    window.location.hash = "#home";

  } catch (err) {
    console.error("❌ UPLOAD FAILED:", err);
    alert(err.message || "Upload failed");
  }

  uploadBtn.textContent = "Upload";
  uploadBtn.disabled = false;
});
