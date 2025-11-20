import { switchTab } from "./js/tabs.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";
// ==========================================
// INTAKEE — Firebase Core Setup (firebase.js)
// This file initializes Firebase and exports
// Auth, Firestore, and Storage instances.
// ==========================================

'use strict';
// ----------------------------------------------------
// ✅ Your Firebase Config (already correct & valid)
// ----------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyDp_tLBxUPvlvG7JqCBj3ItuL7sKjpL56g",
  authDomain: "intakee-5785e.firebaseapp.com",
  projectId: "intakee-5785e",
  storageBucket: "intakee-5785e.appspot.com",
  messagingSenderId: "140666230072",
  appId: "1:140666230072:web:49dd5e7db91c8a38b56c5d",
  measurementId: "G-3C2YDV6TG6"
};

// ----------------------------------------------------
// 🔥 Initialize Firebase App
// ----------------------------------------------------
const app = initializeApp(firebaseConfig);

// ----------------------------------------------------
// Export Services (Clean)
// ----------------------------------------------------
export const storage = getStorage(app);

// ----------------------------------------------------
// Make available globally (optional but helpful)
// ----------------------------------------------------
window.firebaseRefs = { app, auth, db, storage };

console.log("✅ Firebase initialized from firebase.js");
// =======================================================
// INTAKEE — AUTH SYSTEM (auth.js)
// Handles sign-up, login, logout, forgot password,
// and provides auth state updates to the whole app.
// =======================================================

'use strict';

import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const dlgAuth = document.querySelector("#authDialog");
const openAuthBtn = document.querySelector("#openAuth");

// Inputs
const signupEmail = document.querySelector("#signupEmail");
const signupPassword = document.querySelector("#signupPassword");
const signupUsername = document.querySelector("#signupUsername");
const signupAgeConfirm = document.querySelector("#signupAgeConfirm");

const loginEmail = document.querySelector("#loginEmail");
const loginPassword = document.querySelector("#loginPassword");

// Buttons
const signupBtn = document.querySelector("#signupBtn");
const loginBtn  = document.querySelector("#loginBtn");
const forgotBtn = document.querySelector("#forgotBtn");
const logoutBtn = document.querySelector("#settings-logout");

// ===============================
// OPEN AUTH MODAL
// ===============================
if (openAuthBtn) {
  openAuthBtn.addEventListener("click", () => dlgAuth.showModal());
}

// ===============================
// CLOSE MODAL (✕ BUTTON)
// ===============================
dlgAuth.addEventListener("click", e => {
  if (e.target.tagName === "BUTTON" && e.target.textContent === "✕") {
    dlgAuth.close();
  }
});

// ===============================
// SIGN UP
// ===============================
signupBtn.addEventListener("click", async () => {
  const email = signupEmail.value.trim();
  const pass  = signupPassword.value.trim();
  const username = signupUsername.value.trim().toLowerCase();
  const ageOK = signupAgeConfirm.checked;

  if (!email || !pass || !username || !ageOK)
    return alert("Fill all fields and confirm you're 13+.");

  try {
    // Check if username exists
    const qRef = query(collection(db, "users"), where("username", "==", username));
    const snap = await getDocs(qRef);

    if (!snap.empty) return alert("Username already taken.");

    // Create account
    const cred = await createUserWithEmailAndPassword(auth, email, pass);

    await updateProfile(cred.user, { displayName: username });

    // Create Firestore user document
    await setDoc(doc(db, "users", cred.user.uid), {
      email,
      username,
      name: username,
      bio: "",
      photoURL: "",
      bannerURL: "",
      private: false,
      showUploads: true,
      showSaved: true,
      followers: [],
      following: [],
      createdAt: serverTimestamp()
    });

    alert("Account created!");
    dlgAuth.close();

  } catch (err) {
    alert("Sign-up error: " + err.message);
  }
});

// ===============================
// LOGIN
// ===============================
loginBtn.addEventListener("click", async () => {
  const email = loginEmail.value.trim();
  const pass  = loginPassword.value.trim();

  if (!email || !pass)
    return alert("Enter email and password.");

  try {
    await signInWithEmailAndPassword(auth, email, pass);
    dlgAuth.close();

  } catch (err) {
    alert("Login failed: " + err.message);
  }
});

// ===============================
// FORGOT PASSWORD
// ===============================
forgotBtn.addEventListener("click", async () => {
  const email = prompt("Enter your account email:");
  if (!email) return;

  try {
    await sendPasswordResetEmail(auth, email);
    alert("Password reset email sent.");

  } catch (err) {
    alert("Error: " + err.message);
  }
});

// ===============================
// LOGOUT
// ===============================
logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
    alert("Logged out.");

  } catch (err) {
    alert("Logout error: " + err.message);
  }
});

// ===============================
// AUTH STATE LISTENER
// ===============================
onAuthStateChanged(auth, (user) => {
  // Show or hide login button
  if (openAuthBtn) {
    openAuthBtn.style.display = user ? "none" : "block";
  }

  // Notify the rest of the app
  document.dispatchEvent(new CustomEvent("intakee:auth", {
    detail: { user }
  }));
});

console.log("✅ auth.js loaded");
// =======================================================
// INTAKEE — APP LOGIC (app.js)
// Tabs, Feeds, Uploads, Profile, Settings, Mini Player
// =======================================================

'use strict';

// ------------------------------
// Firebase from global config
// ------------------------------
const { auth, db, storage } = window.firebaseRefs;

// ------------------------------
// Query helpers
// ------------------------------
const qs  = (s, sc=document) => sc.querySelector(s);
const qsa = (s, sc=document) => [...sc.querySelectorAll(s)];
const $on = (el, ev, fn) => el && el.addEventListener(ev, fn);

// =======================================================
// TAB SWITCHING + SEARCH BAR CONTROL
// =======================================================
const tabs = {
  home: qs("#tab-home"),
  videos: qs("#tab-videos"),
  podcast: qs("#tab-podcast"),
  upload: qs("#tab-upload"),
  clips: qs("#tab-clips"),
  profile: qs("#tab-profile"),
  settings: qs("#tab-settings")
};

const navLinks = qsa(".bottom-nav a");
const searchBar = qs(".search-bar");

function switchTab(tabName) {
  Object.keys(tabs).forEach(name => {
    tabs[name].style.display = name === tabName ? "block" : "none";
  });

  navLinks.forEach(link =>
    link.classList.toggle("active", link.dataset.tab === tabName)
  );

  // show/hide search bar
  if (tabName === "upload" || tabName === "settings") {
    searchBar.style.display = "none";
  } else {
    searchBar.style.display = "flex";
  }
}

navLinks.forEach(link =>
  link.addEventListener("click", () => switchTab(link.dataset.tab))
);

switchTab("home");

// =======================================================
// FEEDS
// =======================================================
const homeFeed = qs("#home-feed");
const videosFeed = qs("#videos-feed");
const podcastFeed = qs("#podcast-feed");
const clipsFeed = qs("#clips-feed");

let allPosts = [];

async function fetchPosts() {
  const { collection, getDocs, orderBy, query, limit } =
    await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

  const qRef = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(200));
  const snap = await getDocs(qRef);

  allPosts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function renderFeed(container, posts) {
  container.innerHTML = "";

  if (!posts.length) {
    container.innerHTML = `<p class="muted">No posts yet.</p>`;
    return;
  }

  posts.forEach(post => {
    const el = document.createElement("div");
    el.className = "card video-card";

    el.innerHTML = `
      <div class="thumb-16x9">
        <img src="${post.thumbnailUrl || 'placeholder.png'}">
      </div>
      <div class="meta">
        <p class="title">${post.title}</p>
        <p class="muted small">${post.type.toUpperCase()}</p>
      </div>
    `;

    el.addEventListener("click", () =>
      window.location.href = `viewer.html?id=${post.id}`
    );

    container.appendChild(el);
  });
}

async function loadFeeds() {
  await fetchPosts();

  renderFeed(homeFeed, allPosts);
  renderFeed(videosFeed, allPosts.filter(p => p.type === "video"));
  renderFeed(clipsFeed, allPosts.filter(p => p.type === "clip"));
  renderFeed(podcastFeed, allPosts.filter(p => p.type.includes("podcast")));
}

document.addEventListener("intakee:feedRefresh", loadFeeds);
loadFeeds();

// =======================================================
// UPLOAD
// =======================================================
const upType = qs("#uploadTypeSelect");
const upTitle = qs("#uploadTitleInput");
const upDesc = qs("#uploadDescInput");
const upThumb = qs("#uploadThumbInput");
const upFile = qs("#uploadFileInput");
const btnUpload = qs("#btnUpload");

async function uploadPost() {
  const user = auth.currentUser;
  if (!user) return alert("Sign in to upload.");

  const title = upTitle.value.trim();
  const desc  = upDesc.value.trim();
  const file  = upFile.files[0];
  const thumb = upThumb.files[0];
  const type  = upType.value;

  if (!title || !file) return alert("Add a title and a file.");

  btnUpload.disabled = true;
  btnUpload.textContent = "Uploading...";

  try {
    const { ref, uploadBytesResumable, getDownloadURL, uploadBytes } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js");

    const { addDoc, collection, serverTimestamp } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

    // upload media
    const path = `uploads/${user.uid}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, file);

    task.on("state_changed", snap => {
      const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
      btnUpload.textContent = `Uploading ${pct}%`;
    });

    await task;
    const mediaUrl = await getDownloadURL(storageRef);

    // upload thumbnail
    let thumbUrl = "";
    if (thumb) {
      const tRef = ref(storage, `thumbs/${user.uid}/${Date.now()}_${thumb.name}`);
      await uploadBytes(tRef, thumb);
      thumbUrl = await getDownloadURL(tRef);
    }

    // save to Firestore
    await addDoc(collection(db, "posts"), {
      uid: user.uid,
      title,
      desc,
      type,
      mediaUrl,
      thumbnailUrl: thumbUrl,
      createdAt: serverTimestamp()
    });

    alert("Upload complete!");
    upTitle.value = "";
    upDesc.value = "";
    upThumb.value = "";
    upFile.value = "";

    document.dispatchEvent(new CustomEvent("intakee:feedRefresh"));

  } catch (err) {
    alert("Upload failed: " + err.message);
  }

  btnUpload.disabled = false;
  btnUpload.textContent = "Upload";
}

btnUpload.addEventListener("click", uploadPost);

// =======================================================
// PROFILE
// =======================================================
const profileName = qs("#profile-name");
const profileHandle = qs("#profile-handle");
const profilePhoto = qs("#profile-photo");
const profileBanner = qs("#profileBanner");
const bioView = qs("#bio-view");

const btnEditProfile = qs("#btn-edit-profile");
const editWrap = qs("#bio-edit-wrap");
const nameInput = qs("#profileNameInput");
const bioInput  = qs("#profileBioInput");
const photoInput = qs("#profilePhotoInput");
const bannerInput = qs("#profileBannerInput");
const btnSaveProfile = qs("#btnSaveProfile");
const btnCancelEdit = qs("#bio-cancel");

const profileGrid = qs("#profile-grid");
const profileEmpty = qs("#profile-empty");

async function loadUserProfile(user) {
  const { doc, getDoc } =
    await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

  const snap = await getDoc(doc(db, "users", user.uid));
  const data = snap.data() || {};

  profileName.textContent = data.name || user.displayName || "Your Name";
  profileHandle.textContent = "@" + (data.username || user.email.split("@")[0]);
  bioView.textContent = data.bio || "Add a short bio to introduce yourself.";

  if (data.photoURL) profilePhoto.src = data.photoURL;
  if (data.bannerURL) profileBanner.style.backgroundImage = `url(${data.bannerURL})`;

  // load posts
  loadUserPosts(user.uid);
}

async function loadUserPosts(uid) {
  const { collection, getDocs, where, orderBy, query } =
    await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

  const qRef = query(
    collection(db, "posts"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(qRef);
  const posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  profileGrid.innerHTML = "";
  if (!posts.length) {
    profileEmpty.style.display = "block";
  } else {
    profileEmpty.style.display = "none";
  }

  posts.forEach(post => {
    const el = document.createElement("div");
    el.className = "tile";

    el.innerHTML = `
      <img class="thumb" src="${post.thumbnailUrl || 'placeholder.png'}">
      <div class="meta">${post.title}</div>
    `;

    el.addEventListener("click", () =>
      window.location.href = `viewer.html?id=${post.id}`
    );

    profileGrid.appendChild(el);
  });
}

// Edit Profile
btnEditProfile.addEventListener("click", () => {
  if (!auth.currentUser) return alert("Sign in first.");
  editWrap.style.display = "block";
  nameInput.value = profileName.textContent;
  bioInput.value = bioView.textContent;
});

// Cancel
btnCancelEdit.addEventListener("click", () => {
  editWrap.style.display = "none";
});

// Save
btnSaveProfile.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;

  const { doc, updateDoc } =
    await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

  const { ref, uploadBytes, getDownloadURL } =
    await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js");

  const updates = {
    name: nameInput.value.trim(),
    bio: bioInput.value.trim()
  };

  // photo
  if (photoInput.files[0]) {
    const pRef = ref(storage, `avatars/${user.uid}_${Date.now()}.jpg`);
    await uploadBytes(pRef, photoInput.files[0]);
    updates.photoURL = await getDownloadURL(pRef);
    profilePhoto.src = updates.photoURL;
  }

  // banner
  if (bannerInput.files[0]) {
    const bRef = ref(storage, `banners/${user.uid}_${Date.now()}.jpg`);
    await uploadBytes(bRef, bannerInput.files[0]);
    updates.bannerURL = await getDownloadURL(bRef);
    profileBanner.style.backgroundImage = `url(${updates.bannerURL})`;
  }

  await updateDoc(doc(db, "users", user.uid), updates);

  profileName.textContent = updates.name;
  bioView.textContent = updates.bio;

  editWrap.style.display = "none";
  alert("Profile updated!");
});

// =======================================================
// SETTINGS
// =======================================================
function fillLegal() {
  qs("#legal-privacy").innerHTML = `
    <p><strong>Privacy Policy</strong><br><br>
    INTAKEE collects only the data needed for account creation and safety.
    All creators are legally responsible for their content.
    INTAKEE is not liable for user uploads or comments.
    Contact: intakee2025@gmail.com</p>
  `;

  qs("#legal-terms").innerHTML = `
    <p><strong>Terms of Service</strong><br><br>
    You must be 13+ to use INTAKEE.
    You agree not to upload nudity, pornographic material, harmful content,
    or anything illegal. You fully own and take responsibility for your uploads.
    </p>
  `;

  qs("#legal-guidelines").innerHTML = `
    <p><strong>Community Guidelines</strong><br><br>
    No nudity, harassment, hate speech, threats, or illegal activity.
    Violations may lead to removal.</p>
  `;
}

fillLegal();

// Toggles
function setupToggle(id, field) {
  const el = qs(id);
  el.addEventListener("change", async () => {
    const { doc, updateDoc } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

    const user = auth.currentUser;
    if (!user) return;

    await updateDoc(doc(db, "users", user.uid), { [field]: el.checked });
  });
}

setupToggle("#toggle-private", "private");
setupToggle("#toggle-show-uploads", "showUploads");
setupToggle("#toggle-show-saved", "showSaved");

// =======================================================
// MINI PLAYER
// =======================================================
const miniPlayer = qs("#mini-player");
const miniAudio  = qs("#mp-audio");
const miniPlay   = qs("#mp-play");
const miniClose  = qs("#mp-close");

miniPlay.addEventListener("click", () => {
  if (!miniAudio.src) return;

  if (miniAudio.paused) {
    miniAudio.play();
    miniPlay.innerHTML = `<i class="fa fa-pause"></i>`;
  } else {
    miniAudio.pause();
    miniPlay.innerHTML = `<i class="fa fa-play"></i>`;
  }
});

miniClose.addEventListener("click", () => {
  miniAudio.pause();
  miniAudio.src = "";
  miniPlayer.style.display = "none";
});

// =======================================================
// AUTH EVENT: LOAD PROFILE + FEEDS
// =======================================================
document.addEventListener("intakee:auth", e => {
  const user = e.detail.user;

  if (user) {
    loadUserProfile(user);
    loadFeeds();
  } else {
    profileGrid.innerHTML = "";
    profileEmpty.style.display = "block";
  }
});

// =======================================================
// BOOT
// =======================================================
console.log("🚀 app.js loaded");
// =======================================================
// INTAKEE — viewer.js
// Loads a single post and displays media, likes, views
// =======================================================

'use strict';

const { auth, db, storage } = window.firebaseRefs;

// Helpers
const qs = s => document.querySelector(s);
const qsa = s => document.querySelectorAll(s);

// URL param
const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get("id");

// DOM elements
const mediaBox = qs("#viewer-media");
const titleBox = qs("#viewer-title");
const descBox  = qs("#viewer-desc");

const likeBtn  = qs("#like-btn");
const dislikeBtn = qs("#dislike-btn");
const likesCount = qs("#likes-count");
const viewsCount = qs("#views-count");

// =======================================================
// LOAD POST
// =======================================================
async function loadPost() {
  if (!postId) {
    titleBox.textContent = "Post not found";
    return;
  }

  const { doc, getDoc, updateDoc, increment } =
    await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

  try {
    const snap = await getDoc(doc(db, "posts", postId));
    if (!snap.exists()) {
      titleBox.textContent = "Post not found.";
      return;
    }

    const data = snap.data();

    // update views
    await updateDoc(doc(db, "posts", postId), {
      viewCount: increment(1)
    });

    // build UI
    titleBox.textContent = data.title || "";
    descBox.textContent = data.desc || "";
    viewsCount.textContent = (data.viewCount || 0) + 1;

    loadMedia(data);

    // load likes
    likesCount.textContent = data.likeCount || 0;

  } catch (err) {
    console.error(err);
    titleBox.textContent = "Error loading post.";
  }
}

// =======================================================
// LOAD MEDIA (video / audio / clip)
// =======================================================
function loadMedia(post) {
  mediaBox.innerHTML = "";

  if (post.type === "video" || post.type === "podcast-video") {
    // video player
    const v = document.createElement("video");
    v.src = post.mediaUrl;
    v.controls = true;
    v.autoplay = false;
    v.style.width = "100%";
    v.style.borderRadius = "12px";

    mediaBox.appendChild(v);

  } else if (post.type === "podcast-audio") {
    // audio → open mini player
    openMiniPlayer(post.mediaUrl, post.title);
    mediaBox.innerHTML = `
      <div class="audio-preview">
        <p>Playing in mini player...</p>
      </div>
    `;

  } else if (post.type === "clip") {
    // vertical clip
    const v = document.createElement("video");
    v.src = post.mediaUrl;
    v.controls = true;
    v.autoplay = true;
    v.loop = true;
    v.style.width = "100%";

    mediaBox.appendChild(v);
  }
}

// =======================================================
// MINI PLAYER (Podcast)
// =======================================================
function openMiniPlayer(url, title) {
  const mini = qs("#mini-player");
  const audio = qs("#mp-audio");
  const playBtn = qs("#mp-play");

  audio.src = url;
  audio.play();

  mini.style.display = "flex";
  playBtn.innerHTML = `<i class="fa fa-pause"></i>`;
}

// =======================================================
// LIKE / DISLIKE (One per user)
// =======================================================
likeBtn.addEventListener("click", async () => {
  if (!auth.currentUser) return alert("Login required.");

  const { doc, updateDoc, increment } =
    await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

  try {
    await updateDoc(doc(db, "posts", postId), {
      likeCount: increment(1)
    });

    likesCount.textContent = Number(likesCount.textContent) + 1;
  } catch (err) {
    alert("Error: " + err.message);
  }
});

// DISLIKE (just a placeholder — doesn’t affect like count)
dislikeBtn.addEventListener("click", () => {
  alert("You disliked this post.");
});

// =======================================================
// BOOT
// =======================================================
loadPost();
console.log("📺 viewer.js loaded");
// ===============================================
// INTAKEE — PROFILE SYSTEM
// Handles profile loading, editing, saving,
// profile stats, profile posts grid, delete post.
// ===============================================

import { auth, db, storage } from "./firebase.js";
import {
  doc, getDoc, updateDoc, setDoc,
  collection, query, where, orderBy, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

import {
  ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

import { updateProfile } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

// -------------------------
// Elements
// -------------------------
const profileName     = document.querySelector("#profile-name");
const profileHandle   = document.querySelector("#profile-handle");
const profilePhoto    = document.querySelector("#profile-photo");
const profileBanner   = document.querySelector("#profileBanner");
const bioView         = document.querySelector("#bio-view");

const btnEditProfile  = document.querySelector("#btn-edit-profile");
const bioWrap         = document.querySelector("#bio-edit-wrap");

const inputName       = document.querySelector("#profileNameInput");
const inputBio        = document.querySelector("#profileBioInput");
const inputPhoto      = document.querySelector("#profilePhotoInput");
const inputBanner     = document.querySelector("#profileBannerInput");

const btnSaveProfile  = document.querySelector("#btnSaveProfile");
const btnCancelEdit   = document.querySelector("#bio-cancel");

const profileGrid     = document.querySelector("#profile-grid");
const profileEmpty    = document.querySelector("#profile-empty");

const statPosts       = document.querySelector("#stat-posts");
const statFollowers   = document.querySelector("#stat-followers");
const statFollowing   = document.querySelector("#stat-following");
const statLikes       = document.querySelector("#stat-likes");

// ======================================================
// LOAD PROFILE WHEN LOGGED IN
// ======================================================
export async function loadProfile(user) {
  if (!user) return;

  const snap = await getDoc(doc(db, "users", user.uid));
  const data = snap.exists() ? snap.data() : {};

  // Set profile text
  profileName.textContent = data.name || user.displayName || "Your Name";
  profileHandle.textContent = "@" + (data.username || user.email.split("@")[0]);
  bioView.textContent = data.bio || "Add a short bio to introduce yourself.";

  // Set images
  if (user.photoURL) profilePhoto.src = user.photoURL;
  if (data.bannerURL) profileBanner.style.backgroundImage = `url(${data.bannerURL})`;

  // Load user's posts
  await loadUserPosts(user.uid);
}

// ======================================================
// LOAD USER POSTS INTO THEIR PROFILE GRID
// ======================================================
async function loadUserPosts(uid) {
  const qRef = query(
    collection(db, "posts"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(qRef);
  const posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  profileGrid.innerHTML = "";
  statPosts.textContent = posts.length;

  if (!posts.length) {
    profileEmpty.style.display = "block";
    return;
  }

  profileEmpty.style.display = "none";

  posts.forEach(post => {
    const thumb = post.thumbnailUrl || "placeholder.png";

    const isWide = post.type === "video" || post.type === "podcast-video";

    const card = document.createElement("div");
    card.className = "profile-post-card";

    card.innerHTML = `
      <div class="thumb" style="aspect-ratio:${isWide ? "16/9" : "1/1"};">
        <img src="${thumb}">
        <div class="overlay">
          <span>${post.type.toUpperCase()}</span>
          <button class="danger delete-post" data-id="${post.id}">
            <i class="fa fa-trash"></i>
          </button>
        </div>
      </div>
      <h4>${post.title}</h4>
    `;

    // viewer page
    card.querySelector(".thumb").onclick = () => {
      window.location.href = `viewer.html?id=${post.id}`;
    };

    profileGrid.appendChild(card);
  });
}

// ======================================================
// EDIT PROFILE
// ======================================================
btnEditProfile?.addEventListener("click", () => {
  const user = auth.currentUser;
  if (!user) return alert("Sign in first.");

  bioWrap.style.display = "block";
  inputName.value = profileName.textContent;
  inputBio.value = bioView.textContent !== "Add a short bio to introduce yourself."
    ? bioView.textContent
    : "";
});

// Cancel
btnCancelEdit?.addEventListener("click", () => {
  bioWrap.style.display = "none";
});

// Save profile
btnSaveProfile?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Sign in first.");

  const name = inputName.value.trim();
  const bio  = inputBio.value.trim();

  try {
    let newPhotoURL = user.photoURL;
    let newBannerURL = null;

    // Upload new profile image
    if (inputPhoto.files[0]) {
      const pRef = ref(storage, `avatars/${user.uid}_${Date.now()}.jpg`);
      await uploadBytes(pRef, inputPhoto.files[0]);
      newPhotoURL = await getDownloadURL(pRef);
      await updateProfile(user, { photoURL: newPhotoURL });
      profilePhoto.src = newPhotoURL;
    }

    // Upload new banner image
    if (inputBanner.files[0]) {
      const bRef = ref(storage, `banners/${user.uid}_${Date.now()}.jpg`);
      await uploadBytes(bRef, inputBanner.files[0]);
      newBannerURL = await getDownloadURL(bRef);
      profileBanner.style.backgroundImage = `url(${newBannerURL})`;
    }

    // Save name + bio + bannerURL
    await updateDoc(doc(db, "users", user.uid), {
      name,
      bio,
      ...(newBannerURL ? { bannerURL: newBannerURL } : {})
    });

    profileName.textContent = name;
    bioView.textContent = bio || "Add a short bio to introduce yourself.";

    bioWrap.style.display = "none";
    alert("Profile updated!");

  } catch (err) {
    alert("Profile update error: " + err.message);
  }
});

// ======================================================
// DELETE POST
// ======================================================
profileGrid.addEventListener("click", async (e) => {
  const btn = e.target.closest(".delete-post");
  if (!btn) return;

  if (!confirm("Delete this post permanently?")) return;

  try {
    const id = btn.dataset.id;
    await updateDoc(doc(db, "posts", id), { deleted: true });

    btn.closest(".profile-post-card").remove();
    alert("Post deleted.");

  } catch (err) {
    alert("Failed to delete post: " + err.message);
  }
});

// ======================================================
// EVENT LISTENER FOR AUTH
// ======================================================
document.addEventListener("intakee:auth", (e) => {
  const user = e.detail.user;
  if (user) loadProfile(user);
});
// ===============================================
// INTAKEE — SETTINGS PAGE LOGIC
// Privacy toggles, passwords, username recovery,
// delete account, legal accordions.
// ===============================================

import { auth, db } from "./firebase.js";
import {
  doc, getDoc, updateDoc, deleteDoc,
  collection, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

import {
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

// =================================================
// 1) PRIVACY TOGGLES
// =================================================

function setupToggle(selector, fieldName) {
  const el = document.querySelector(selector);
  if (!el) return;

  el.addEventListener("change", async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("Sign in first.");
      el.checked = !el.checked;
      return;
    }

    try {
      await updateDoc(doc(db, "users", user.uid), {
        [fieldName]: el.checked
      });
    } catch (err) {
      alert("Failed to save setting: " + err.message);
    }
  });
}

setupToggle("#toggle-private",       "private");
setupToggle("#toggle-show-uploads", "showUploads");
setupToggle("#toggle-show-saved",   "showSaved");

// Load user settings when logged in
document.addEventListener("intakee:auth", async (e) => {
  const user = e.detail.user;
  if (!user) return;

  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists()) return;

    const data = snap.data();

    document.querySelector("#toggle-private").checked =
      data.private ?? false;

    document.querySelector("#toggle-show-uploads").checked =
      data.showUploads ?? true;

    document.querySelector("#toggle-show-saved").checked =
      data.showSaved ?? true;

  } catch (err) {
    console.error("Settings load failed:", err);
  }
});

// =================================================
// 2) LOG OUT
// =================================================
document
  .querySelector("#settings-logout")
  ?.addEventListener("click", async () => {
    try {
      await auth.signOut();
      alert("You have been logged out.");
    } catch (err) {
      alert("Logout error: " + err.message);
    }
  });

// =================================================
// 3) FORGOT PASSWORD
// =================================================
document
  .querySelector("#settings-forgot-password")
  ?.addEventListener("click", async () => {
    const email = prompt("Enter your email for password reset:");
    if (!email) return;

    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent.");
    } catch (err) {
      alert("Error: " + err.message);
    }
  });

// =================================================
// 4) FORGOT USERNAME
// =================================================
document
  .querySelector("#settings-forgot-username")
  ?.addEventListener("click", async () => {
    const email = prompt("Enter your account email:");
    if (!email) return;

    try {
      const qRef = query(
        collection(db, "users"),
        where("email", "==", email)
      );

      const snap = await getDocs(qRef);

      if (snap.empty) {
        return alert("No user found with that email.");
      }

      const data = snap.docs[0].data();
      alert(`Your username is: @${data.username}`);

    } catch (err) {
      alert("Username lookup failed: " + err.message);
    }
  });

// =================================================
// 5) DELETE ACCOUNT
// =================================================
document
  .querySelector("#settings-delete-account")
  ?.addEventListener("click", async () => {
    const confirmed = confirm(
      "Are you sure you want to permanently delete your account?"
    );
    if (!confirmed) return;

    try {
      const user = auth.currentUser;
      if (!user) return alert("Sign in first.");

      // Delete Firestore data
      await deleteDoc(doc(db, "users", user.uid));

      // Delete auth user
      await user.delete();

      alert("Account deleted successfully.");
    } catch (err) {
      alert("Account delete failed: " + err.message);
    }
  });

// =================================================
// 6) BLOCKED USERS (PLACEHOLDER)
// =================================================
document
  .querySelector("#openBlockedUsers")
  ?.addEventListener("click", () => {
    alert("Blocked Users feature coming soon.");
  });

// =================================================
// 7) REPORT CONTENT (PLACEHOLDER)
// =================================================
document
  .querySelector("#openReportModal")
  ?.addEventListener("click", () => {
    alert("Report Content feature coming soon.");
  });

// =================================================
// 8) ACCORDION (Legal Section)
// =================================================
document.querySelectorAll(".accordion-header").forEach(btn => {
  btn.addEventListener("click", () => {
    const parent = btn.parentElement;
    parent.classList.toggle("open");
  });
});
//----------------------------------------------------
//  INTAKEE — MAIN BOOT FILE (script.js)
//  Loads all modules and starts the app
//----------------------------------------------------

console.log("🚀 INTAKEE booting...");

//----------------------------------------------
// 1) IMPORT MODULES
//----------------------------------------------
import "./firebase-init.js";     // Firebase setup (auth, db, storage → window.firebaseRefs)
import "./tabs.js";              // Tab switching
import "./auth.js";              // Sign up / login / logout
import "./feed.js";              // Home, Videos, Podcast, Clips feed loading
import "./upload.js";            // Upload logic
import "./profile.js";           // Profile page logic
import "./settings.js";          // Settings page logic
import "./player.js";            // Mini audio player

//----------------------------------------------
// 2) GLOBAL EVENTS
//----------------------------------------------

// Refresh feeds when a post is uploaded or deleted
document.addEventListener("intakee:feedRefresh", () => {
    if (window.loadFeeds) window.loadFeeds();
});

// Re-load profile after authentication changes
document.addEventListener("intakee:auth", (e) => {
    const user = e.detail.user;
    if (window.loadProfilePane) window.loadProfilePane(user);
});

//----------------------------------------------
// 3) INITIAL APP START
//----------------------------------------------
async function boot() {
    console.log("⚡ Starting INTAKEE...");

    // Load feed on first visit
    if (window.loadFeeds) {
        try {
            await window.loadFeeds();
            console.log("✓ Feeds loaded");
        } catch (err) {
            console.error("Feed loading failed:", err);
        }
    }
}

boot();
