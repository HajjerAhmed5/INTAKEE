/*
==========================================
INTAKEE — UPLOAD SYSTEM (CORS-SAFE)
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

/* ================= DOM ================= */
const uploadBtn = document.querySelector(".upload-btn");
const inputs = document.querySelectorAll("#upload input, #upload textarea, #upload select");

/* ================= AUTH ================= */
let currentUser = null;

onAuthStateChanged(auth, user => {
  currentUser = user;
});

/* ================= UPLOAD ================= */
uploadBtn.addEventListener("click", async () => {
  if (!currentUser) {
    alert("Please log in.");
    return;
  }

  const type = inputs[0].value;
  const title = inputs[1].value.trim();
  const description = inputs[2].value.trim();
  const thumbnailFile = inputs[3].files[0];
  const mediaFile = inputs[4].files[0];

  if (!mediaFile) {
    alert("Please select a media file.");
    return;
  }

  uploadBtn.textContent = "Uploading...";
  uploadBtn.disabled = true;

  try {
    const uid = currentUser.uid;
    const time = Date.now();

    /* STORAGE PATHS */
    const mediaRef = ref(
      storage,
      `uploads/${uid}/${time}_${mediaFile.name}`
    );

    const mediaTask = uploadBytesResumable(mediaRef, mediaFile);

    await mediaTask;

    const mediaURL = await getDownloadURL(mediaRef);

    let thumbURL = null;

    if (thumbnailFile) {
      const thumbRef = ref(
        storage,
        `thumbnails/${uid}/${time}_${thumbnailFile.name}`
      );

      const thumbTask = uploadBytesResumable(thumbRef, thumbnailFile);
      await thumbTask;
      thumbURL = await getDownloadURL(thumbRef);
    }

    /* SAVE POST */
    await addDoc(collection(db, "posts"), {
      type,
      title,
      description,
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
    console.error("UPLOAD ERROR:", err);
    alert("Upload failed. Check console.");
  }

  uploadBtn.textContent = "Upload";
  uploadBtn.disabled = false;
});
