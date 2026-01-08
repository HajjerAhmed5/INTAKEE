// /js/upload.js
import { auth, db, storage } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
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

let currentUser = null;

onAuthStateChanged(auth, user => {
  currentUser = user;
});

// ===== DOM =====
const uploadSection = document.getElementById("upload");
const uploadBtn = uploadSection.querySelector(".upload-btn");

uploadBtn.addEventListener("click", async () => {
  if (!currentUser) {
    alert("You must be logged in to upload.");
    return;
  }

  // Get inputs by position (matches your HTML EXACTLY)
  const select = uploadSection.querySelector("select");
  const inputs = uploadSection.querySelectorAll("input, textarea");

  const titleInput = inputs[0];
  const descriptionInput = inputs[1];
  const thumbnailInput = inputs[2]; // optional
  const mediaInput = inputs[3];     // REQUIRED

  const type = select.value;
  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();
  const mediaFile = mediaInput.files[0];
  const thumbnailFile = thumbnailInput.files[0];

  // ===== VALIDATION =====
  if (!mediaFile) {
    alert("Please select a media file.");
    return;
  }

  uploadBtn.textContent = "Uploading...";
  uploadBtn.disabled = true;

  try {
    const uid = currentUser.uid;

    // ===== UPLOAD MEDIA =====
    const mediaRef = ref(
      storage,
      `uploads/${uid}/${Date.now()}_${mediaFile.name}`
    );

    await uploadBytes(mediaRef, mediaFile);
    const mediaURL = await getDownloadURL(mediaRef);

    // ===== UPLOAD THUMBNAIL (OPTIONAL) =====
    let thumbnailURL = "";
    if (thumbnailFile) {
      const thumbRef = ref(
        storage,
        `thumbnails/${uid}/${Date.now()}_${thumbnailFile.name}`
      );
      await uploadBytes(thumbRef, thumbnailFile);
      thumbnailURL = await getDownloadURL(thumbRef);
    }

    // ===== SAVE TO FIRESTORE =====
    await addDoc(collection(db, "posts"), {
      uid,
      type,
      title,
      description,
      mediaURL,
      thumbnailURL,
      createdAt: serverTimestamp()
    });

    alert("Upload successful!");

    // Reset form
    titleInput.value = "";
    descriptionInput.value = "";
    mediaInput.value = "";
    thumbnailInput.value = "";

  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    alert("Upload failed. Check console.");
  } finally {
    uploadBtn.textContent = "Upload";
    uploadBtn.disabled = false;
  }
});
