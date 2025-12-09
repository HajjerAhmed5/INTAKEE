/* 
========================================
INTAKEE — PROFILE SYSTEM
Handles:
- Load user info (bio, username, profile image)
- Save bio
- Save profile image
- Load user uploads
- Private/Public toggles (saved in Firestore)
========================================
*/

// ------------------------------
// IMPORT FIREBASE MODULES
// ------------------------------
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-storage.js";

const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

// ------------------------------
// DOM ELEMENTS
------------------------------
const bioInput = document.getElementById("profileBioInput");
const saveBioBtn = document.getElementById("saveBioBtn");
const profileImgInput = document.getElementById("uploadProfileImg");
const profileImgDisplay = document.getElementById("profileImg");
const profileUsernameDisplay = document.getElementById("profileUsername");

const privateToggle = document.getElementById("profilePrivateToggle");

const uploadsContainer = document.getElementById("profileUploads");


// ------------------------------
// LOAD PROFILE DATA
// ------------------------------
async function loadProfile(user) {
  if (!user) return;

  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    // create default user doc
    await setDoc(userRef, {
      username: user.email.split("@")[0],
      bio: "",
      profileImg: "",
      private: false
    });
  }

  const data = snap.data();

  // Set username
  profileUsernameDisplay.textContent = "@" + data.username;

  // Set bio
  bioInput.value = data.bio || "";

  // Set profile image
  if (data.profileImg) {
    profileImgDisplay.src = data.profileImg;
  }

  // Set privacy toggle
  privateToggle.checked = data.private || false;

  // Load uploads
  loadUserUploads(user.uid);
}


// ------------------------------
// SAVE BIO
// ------------------------------
async function saveBio(user) {
  if (!user) return;

  await setDoc(doc(db, "users", user.uid), {
    bio: bioInput.value.trim(),
  }, { merge: true });

  alert("Bio saved!");
}

saveBioBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("You must be logged in");

  saveBio(user);
});


// ------------------------------
// UPLOAD PROFILE IMAGE
// ------------------------------
profileImgInput?.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  const user = auth.currentUser;

  if (!user || !file) return;

  const path = `profileImages/${user.uid}.jpg`;
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  // Save URL to Firestore
  await setDoc(doc(db, "users", user.uid), {
    profileImg: url
  }, { merge: true });

  profileImgDisplay.src = url;

  alert("Profile image updated!");
});


// ------------------------------
// PRIVACY TOGGLE
// ------------------------------
privateToggle?.addEventListener("change", async () => {
  const user = auth.currentUser;
  if (!user) return;

  await setDoc(doc(db, "users", user.uid), {
    private: privateToggle.checked
  }, { merge: true });

  alert("Privacy updated");
});


// ------------------------------
// LOAD USER UPLOADS
// ------------------------------
async function loadUserUploads(uid) {
  uploadsContainer.innerHTML = `<p>Loading uploads...</p>`;

  const postsRef = doc(db, "uploads", uid);
  const snap = await getDoc(postsRef);

  if (!snap.exists()) {
    uploadsContainer.innerHTML = `<p>No uploads yet.</p>`;
    return;
  }

  const posts = snap.data().posts || [];

  if (posts.length === 0) {
    uploadsContainer.innerHTML = `<p>No uploads yet.</p>`;
    return;
  }

  uploadsContainer.innerHTML = "";

  posts.forEach(post => {
    const div = document.createElement("div");
    div.className = "profile-upload-card";

    div.innerHTML = `
      <img class="p-upload-thumb" src="${post.thumbnailURL}">
      <div class="p-upload-title">${post.title}</div>
      <div class="p-upload-type">${post.type}</div>
    `;

    uploadsContainer.appendChild(div);
  });
}


// ------------------------------
// AUTH LISTENER — RUN WHEN LOGGED IN
// ------------------------------
onAuthStateChanged(auth, (user) => {
  if (user) {
    loadProfile(user);
  } else {
    console.log("Not logged in → Profile locked");
  }
});
