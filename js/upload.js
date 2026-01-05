/* ===============================
   INTAKEE — UPLOAD (PHASE 1)
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
if (!uploadSection) return;

const titleInput = uploadSection.querySelector("input[placeholder='Add a title']");
const fileInput = uploadSection.querySelector("input[type='file']");
const uploadBtn = uploadSection.querySelector(".upload-btn");

/* ================= UPLOAD HANDLER ================= */
uploadBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;

  if (!user) {
    alert("You must be logged in to upload.");
    return;
  }

  const file = fileInput.files[0];
  const title = titleInput.value.trim();

  if (!file || !title) {
    alert("Please add a title and select a file.");
    return;
  }

  try {
    uploadBtn.disabled = true;
    uploadBtn.textContent = "Uploading...";

    // 1️⃣ Upload file to Firebase Storage
    const storageRef = ref(
      storage,
      `uploads/${user.uid}/${Date.now()}-${file.name}`
    );

    await uploadBytes(storageRef, file);

    // 2️⃣ Get file URL
    const fileURL = await getDownloadURL(storageRef);

    // 3️⃣ Save post to Firestore
    const postRef = await addDoc(collection(db, "posts"), {
      userId: user.uid,
      title: title,
      mediaURL: fileURL,
      type: "video",
      createdAt: serverTimestamp()
    });

    console.log("✅ Upload successful:", postRef.id);

    alert("Upload successful!");

    // Reset UI
    titleInput.value = "";
    fileInput.value = "";

  } catch (err) {
    console.error("❌ Upload failed:", err);
    alert("Upload failed. Check console.");
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.textContent = "Upload";
  }
});
