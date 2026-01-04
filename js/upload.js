/* =====================================
   INTAKEE — UPLOAD SYSTEM (CRASH-PROOF)
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

/* ===== STATE ===== */
let currentUser = null;

/* ===== AUTH ===== */
onAuthStateChanged(auth, user => {
  currentUser = user;
});

/* ===== SAFE INIT ===== */
(function rememberUpload() {
  const uploadSection = document.getElementById("upload");
  if (!uploadSection) {
    console.warn("upload.js skipped — upload section not found");
    return;
  }

  const uploadBtn = uploadSection.querySelector(".upload-btn");
  const uploadType = uploadSection.querySelector("select");
  const uploadTitle = uploadSection.querySelector("input[placeholder='Add a title']");
  const uploadDesc = uploadSection.querySelector("textarea");
  const fileInputs = uploadSection.querySelectorAll("input[type='file']");

  const uploadThumb = fileInputs[0] || null;
  const uploadFile = fileInputs[1] || null;

  if (!uploadBtn || !uploadFile) {
    console.warn("upload.js halted — missing upload elements");
    return;
  }

  uploadBtn.addEventListener("click", async () => {
    if (!currentUser) {
      alert("You must be logged in to upload.");
      return;
    }

    if (!uploadTitle.value.trim()) {
      alert("Title required.");
      return;
    }

    if (!uploadFile.files.length) {
      alert("Media file required.");
      return;
    }

    uploadBtn.disabled = true;
    uploadBtn.textContent = "Uploading...";

    try {
      const file = uploadFile.files[0];
      const fileRef = ref(
        storage,
        `posts/${currentUser.uid}/${Date.now()}_${file.name}`
      );

      await uploadBytes(fileRef, file);
      const fileURL = await getDownloadURL(fileRef);

      let thumbnailURL = null;
      if (uploadThumb && uploadThumb.files.length) {
        const thumb = uploadThumb.files[0];
        const thumbRef = ref(
          storage,
          `thumbs/${currentUser.uid}/${Date.now()}_${thumb.name}`
        );
        await uploadBytes(thumbRef, thumb);
        thumbnailURL = await getDownloadURL(thumbRef);
      }

      await addDoc(collection(db, "posts"), {
        uid: currentUser.uid,
        type: uploadType.value,
        title: uploadTitle.value.trim(),
        description: uploadDesc.value.trim(),
        fileURL,
        thumbnail: thumbnailURL,
        createdAt: serverTimestamp()
      });

      alert("Upload successful!");

      uploadTitle.value = "";
      uploadDesc.value = "";
      uploadFile.value = "";
      if (uploadThumb) uploadThumb.value = "";

    } catch (err) {
      console.error("UPLOAD ERROR:", err);
      alert("Upload failed.");
    }

    uploadBtn.disabled = false;
    uploadBtn.textContent = "Upload";
  });
})();
