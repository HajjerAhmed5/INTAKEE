/*
==========================================
INTAKEE — UPLOAD SYSTEM (FINAL / SAFE)
==========================================
*/

import { auth, storage, db } from "./firebase-init.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

import {
  ref,
  uploadBytesResumable,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js";

import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

/* DOM */
const uploadBtn = document.querySelector(".upload-btn");
const typeInput = document.querySelector("#upload select");
const titleInput = document.querySelector("#upload input[type='text']");
const descInput = document.querySelector("#upload textarea");
const thumbInput = document.querySelector("#upload input[type='file']:nth-of-type(1)");
const mediaInput = document.querySelector("#upload input[type='file']:nth-of-type(2)");

let currentUser = null;

/* AUTH */
onAuthStateChanged(auth, user => {
  currentUser = user;
});

/* UPLOAD */
uploadBtn.addEventListener("click", async () => {
  if (!currentUser) {
    alert("Please log in");
    return;
  }

  const mediaFile = mediaInput.files[0];
  if (!mediaFile) {
    alert("Select a media file");
    return;
  }

  uploadBtn.textContent = "Uploading...";
  uploadBtn.disabled = true;

  try {
    const uid = currentUser.uid;
    const time = Date.now();

    // Upload media ONLY — no preview, no fetch
    const mediaRef = ref(
      storage,
      `uploads/${uid}/${time}_${mediaFile.name}`
    );

    await uploadBytesResumable(mediaRef, mediaFile);

    const mediaURL = await getDownloadURL(mediaRef);

    let thumbURL = null;
    if (thumbInput.files[0]) {
      const thumbRef = ref(
        storage,
        `thumbnails/${uid}/${time}_${thumbInput.files[0].name}`
      );
      await uploadBytesResumable(thumbRef, thumbInput.files[0]);
      thumbURL = await getDownloadURL(thumbRef);
    }

    // Save Firestore doc ONLY
    await addDoc(collection(db, "posts"), {
      type: typeInput.value,
      title: titleInput.value.trim(),
      description: descInput.value.trim(),
      mediaURL,
      thumbnailURL: thumbURL,
      uid,
      username: currentUser.displayName || "user",
      createdAt: serverTimestamp(),
      views: 0
    });

    alert("Upload successful!");
    location.hash = "#home";

  } catch (err) {
    console.error("UPLOAD FAILED:", err);
    alert("Upload failed — check console");
  }

  uploadBtn.textContent = "Upload";
  uploadBtn.disabled = false;
});
