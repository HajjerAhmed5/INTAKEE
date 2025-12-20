import { auth, db, storage } from "./firebase-init.js";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Upload button + file input
const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("uploadFile");
const titleInput = document.getElementById("uploadTitle");

if (uploadBtn) {
  uploadBtn.addEventListener("click", async () => {
    const file = fileInput?.files[0];
    const title = titleInput?.value || "Untitled";

    if (!file) {
      alert("Please select a file");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to upload");
      return;
    }

    try {
      // Storage path
      const storageRef = ref(
        storage,
        `uploads/${user.uid}/${Date.now()}_${file.name}`
      );

      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        null,
        (error) => {
          console.error(error);
          alert("Upload failed");
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          await addDoc(collection(db, "posts"), {
            uid: user.uid,
            title,
            fileURL: downloadURL,
            type: file.type,
            createdAt: serverTimestamp()
          });

          alert("Upload successful 🎉");
          fileInput.value = "";
          titleInput.value = "";
        }
      );
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    }
  });
}

