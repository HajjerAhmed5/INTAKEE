/*  
==========================================
  INTAKEE — UPLOAD SYSTEM
  Handles:
  - Uploading Videos, Clips, Podcast Audio, Podcast Video
  - Thumbnail handling
  - Saving post metadata to Firestore
  - Auto-refresh feed after upload
==========================================
*/

// ------------------------------------
// IMPORT FIREBASE MODULES
// ------------------------------------
import {
  getAuth,
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-storage.js";

// Auth / Firestore / Storage instances
const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

// ------------------------------------
// DOM ELEMENTS
// ------------------------------------
const uploadTypeSelect = document.getElementById("uploadTypeSelect");
const uploadTitleInput = document.getElementById("uploadTitleInput");
const uploadDescInput = document.getElementById("uploadDescInput");
const uploadThumbInput = document.getElementById("uploadThumbInput");
const uploadFileInput = document.getElementById("uploadFileInput");
const ageRestrictionToggle = document.getElementById("ageRestrictionToggle");

const btnUpload = document.getElementById("btnUpload");
const btnGoLive = document.getElementById("btnGoLive");


// ------------------------------------
// GENERATE POST ID
// ------------------------------------
function generateID() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}


// ------------------------------------
// BASIC INPUT VALIDATION
// ------------------------------------
function validateUpload(type) {

  if (!uploadTitleInput.value.trim()) {
    alert("Please enter a title.");
    return false;
  }

  if (uploadFileInput.files.length === 0) {
    alert("Please upload a video/audio file.");
    return false;
  }

  // Podcast Audio MUST have thumbnail
  if (type === "podcast-audio" && uploadThumbInput.files.length === 0) {
    alert("Audio podcasts require a thumbnail image.");
    return false;
  }

  return true;
}


// ------------------------------------
// MAIN UPLOAD HANDLER
// ------------------------------------
btnUpload?.addEventListener("click", async () => {
  const user = auth.currentUser;

  if (!user) {
    alert("Please log in to upload content.");
    return;
  }

  const uid = user.uid;
  const type = uploadTypeSelect.value;
  const postID = generateID();

  if (!validateUpload(type)) return;

  try {
    const file = uploadFileInput.files[0];
    const thumbFile = uploadThumbInput.files[0] || null;

    // 1. UPLOAD MAIN MEDIA
    const mediaRef = ref(storage, `uploads/${uid}/${postID}/media`);
    await uploadBytes(mediaRef, file);
    const mediaURL = await getDownloadURL(mediaRef);

    // 2. HANDLE THUMBNAIL
    let thumbnailURL = "";

    if (type === "podcast-audio") {
      // Thumbnail is required
      const thumbRef = ref(storage, `uploads/${uid}/${postID}/thumbnail`);
      await uploadBytes(thumbRef, thumbFile);
      thumbnailURL = await getDownloadURL(thumbRef);

    } else if (type === "clip") {
      // Clip uses media file as thumbnail (vertical format)
      thumbnailURL = mediaURL;

    } else if (type === "video" || type === "podcast-video") {
      // Auto-thumbnail fallback using media file
      thumbnailURL = mediaURL;
    }

    // 3. SAVE POST METADATA TO FIRESTORE
    const userDataRef = doc(db, "users", uid);
    const postRef = doc(db, "posts", postID);

    const postData = {
      postID,
      uid,
      type,
      title: uploadTitleInput.value.trim(),
      description: uploadDescInput.value.trim(),
      mediaURL,
      thumbnailURL,
      timestamp: Date.now(),
      isAgeRestricted: ageRestrictionToggle.checked,
      likes: 0,
      dislikes: 0,
    };

    await setDoc(postRef, postData);

    // 4. ADD POST TO USER ACCOUNT (profile uploads)
    await updateDoc(userDataRef, {
      posts: arrayUnion(postID)
    });

    // 5. Reset form
    uploadTitleInput.value = "";
    uploadDescInput.value = "";
    uploadThumbInput.value = "";
    uploadFileInput.value = "";
    ageRestrictionToggle.checked = false;

    alert("Upload complete!");

    // Switch to home feed
    location.hash = "home";
    
    // Refresh feed if feed.js loaded
    try {
      if (window.refreshFeed) window.refreshFeed();
    } catch (err) {
      console.warn("Feed refresh skipped:", err);
    }

  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    alert("Upload failed: " + err.message);
  }
});


// ------------------------------------
// GO LIVE BUTTON (placeholder)
// ------------------------------------
btnGoLive?.addEventListener("click", () => {
  alert("Go Live is coming in a future update.");
});
