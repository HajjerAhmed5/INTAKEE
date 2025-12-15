/* =====================================
   INTAKEE — REAL UPLOAD SYSTEM
   Handles:
   - Auth check
   - File upload (placeholder for Firebase Storage)
   - Save post metadata to Firestore
===================================== */

import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  increment
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

/* DOM */
const uploadBtn = document.getElementById("btnUpload");
const uploadType = document.getElementById("uploadTypeSelect");
const uploadTitle = document.getElementById("uploadTitleInput");
const uploadDesc = document.getElementById("uploadDescInput");
const uploadFile = document.getElementById("uploadFileInput");
const uploadThumb = document.getElementById("uploadThumbInput");
const ageToggle = document.getElementById("ageRestrictionToggle");

let currentUser = null;

/* AUTH CHECK */
onAuthStateChanged(auth, (user) => {
  currentUser = user;
});

/* UPLOAD HANDLER */
uploadBtn.addEventListener("click", async () => {
  if (!currentUser) {
    alert("You must be logged in to upload.");
    return;
  }

  if (!uploadTitle.value || !uploadFile.files.length) {
    alert("Title and file are required.");
    return;
  }

  try {
    // 🔹 TEMP: no Firebase Storage yet (next step)
    const fakeFileURL = "pending-upload";

    const post = {
      uid: currentUser.uid,
      type: uploadType.value,
      title: uploadTitle.value.trim(),
      description: uploadDesc.value.trim(),
      fileURL: fakeFileURL,
      thumbnail: uploadThumb.files[0]?.name || null,
      ageRestricted: ageToggle.checked,
      createdAt: serverTimestamp(),
      likes: 0,
      comments: 0
    };

    // Save post
    await addDoc(collection(db, "posts"), post);

    // Increment user post count
    await updateDoc(doc(db, "users", currentUser.uid), {
      posts: increment(1)
    });

    alert("Upload successful (metadata saved).");

    // Reset form
    uploadTitle.value = "";
    uploadDesc.value = "";
    uploadFile.value = "";
    uploadThumb.value = "";
    ageToggle.checked = false;

  } catch (err) {
    console.error(err);
    alert("Upload failed.");
  }
});

