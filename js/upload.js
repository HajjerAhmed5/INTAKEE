 /* =====================================
   INTAKEE — REAL UPLOAD SYSTEM (FINAL)
   - Auth protected
   - Firebase Storage upload
   - Firestore post creation
===================================== */

import { auth, db, storage } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  increment
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-storage.js";

/* ================= DOM ================= */
const uploadBtn = document.getElementById("btnUpload");
const uploadType = document.getElementById("uploadTypeSelect");
const uploadTitle = document.getElementById("uploadTitleInput");
const uploadDesc = document.getElementById("uploadDescInput");
const uploadFile = document.getElementById("uploadFileInput");
const uploadThumb = document.getElementById("uploadThumbInput");
const ageToggle = document.getElementById("ageRestrictionToggle");

let currentUser = null;

/* ================= AUTH ================= */
onAuthStateChanged(auth, (user) => {
  currentUser = user;
});

/* ================= UPLOAD ================= */
uploadBtn.addEventListener("click", async () => {
  if (!currentUser) {
    alert("You must be logged in to upload.");
    return;
  }

  if (!uploadTitle.value || !uploadFile.files.length) {
    alert("Title and main file are required.");
    return;
  }

  uploadBtn.disabled = true;
  uploadBtn.textContent = "Uploading...";

  try {
    /* ---------- FILE UPLOAD ---------- */
    const file = uploadFile.files[0];
    const fileRef = ref(
      storage,
      `posts/${currentUser.uid}/${Date.now()}_${file.name}`
    );

    await uploadBytes(fileRef, file);
    const fileURL = await getDownloadURL(fileRef);

    /* ---------- THUMBNAIL UPLOAD (OPTIONAL) ---------- */
    let thumbnailURL = null;

    if (uploadThumb.files.length) {
      const thumb = uploadThumb.files[0];
      const thumbRef = ref(
        storage,
        `thumbnails/${currentUser.uid}/${Date.now()}_${thumb.name}`
      );

      await uploadBytes(thumbRef, thumb);
      thumbnailURL = await getDownloadURL(thumbRef);
    }

    /* ---------- SAVE POST ---------- */
    const post = {
      uid: currentUser.uid,
      username: currentUser.displayName || "user",
      type: uploadType.value,
      title: uploadTitle.value.trim(),
      description: uploadDesc.value.trim(),
      fileURL,
      thumbnail: thumbnailURL,
      ageRestricted: ageToggle.checked,
      createdAt: serverTimestamp(),
      likes: 0,
      likedBy: [],
      savedBy: [],
      comments: 0
    };

    await addDoc(collection(db, "posts"), post);

    await updateDoc(doc(db, "users", currentUser.uid), {
      posts: increment(1)
    });

    alert("Upload successful!");

    /* ---------- RESET FORM ---------- */
    uploadTitle.value = "";
    uploadDesc.value = "";
    uploadFile.value = "";
    uploadThumb.value = "";
    ageToggle.checked = false;

  } catch (err) {
    console.error(err);
    alert("Upload failed. Try again.");
  }

  uploadBtn.disabled = false;
  uploadBtn.textContent = "Upload";
});
if (window.refreshFeed) window.refreshFeed();
