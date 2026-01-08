/*
==========================================
INTAKEE — UPLOAD SYSTEM (FINAL WORKING)
==========================================
*/

import { auth, storage, db } from "./firebase-init.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

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
const uploadBtn = document.querySelector(".upload-btn");

/* ================= AUTH ================= */
let currentUser = null;

// Disable upload until auth resolves
uploadBtn.disabled = true;

onAuthStateChanged(auth, user => {
  currentUser = user;
  uploadBtn.disabled = !user;
});

/* ================= UPLOAD ================= */
uploadBtn.addEventListener("click", async () => {
  if (!currentUser) {
    alert("Please log in.");
    return;
  }

  // SAFE DOM TARGETING
  const type = document.querySelector("#upload select").value;
  const title = document
    .querySelector("#upload input[placeholder='Add a title']")
    .value
    .trim();
  const description = document
    .querySelector("#upload textarea")
    .value
    .trim();

  const fileInputs = document.querySelectorAll("#upload input[type='file']");
  const thumbnailFile = fileInputs[0]?.files[0] || null;
  const mediaFile = fileInputs[1]?.files[0] || null;

  if (!mediaFile) {
    alert("Please select a media file.");
    return;
  }

  uploadBtn.textContent = "Uploading...";
  uploadBtn.disabled = true;

  try {
    const uid = currentUser.uid;
    const time = Date.now();

    /* ========= MEDIA UPLOAD ========= */
    const mediaRef = ref(
      storage,
      `uploads/${uid}/${time}_${mediaFile.name}`
    );

    await uploadBytes(mediaRef, mediaFile);
    const mediaURL = await getDownloadURL(mediaRef);

    /* ========= THUMBNAIL UPLOAD (OPTIONAL) ========= */
    let thumbnailURL = null;

    if (thumbnailFile) {
      const thumbRef = ref(
        storage,
        `thumbnails/${uid}/${time}_${thumbnailFile.name}`
      );

      await uploadBytes(thumbRef, thumbnailFile);
      thumbnailURL = await getDownloadURL(thumbRef);
    }

    /* ========= SAVE POST ========= */
    await addDoc(collection(db, "posts"), {
      type,
      title: title || "Untitled",
      description,
      mediaURL,
      thumbnailURL,
      uid,
      username: currentUser.displayName || "user",
      createdAt: serverTimestamp(),
      views: 0
    });

    alert("Upload successful!");
    location.hash = "#home";

  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    alert("Upload failed. Check console.");
  }

  uploadBtn.textContent = "Upload";
  uploadBtn.disabled = false;
});
