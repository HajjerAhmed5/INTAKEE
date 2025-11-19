// ===============================
// INTAKEE — viewer.js
// Loads and displays a post in fullscreen viewer
// ===============================

'use strict';

// -------------------------------
// Firebase Access from viewer.html
// -------------------------------
import {
  getFirestore, doc, getDoc, updateDoc, increment,
  collection, addDoc, query, orderBy, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

import {
  getAuth, onAuthStateChanged, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

import {
  getStorage, ref, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

// Get Firebase refs (passed from viewer.html)
const { app, auth, db, storage } = window.firebaseRefs || {};

if (!app || !auth || !db || !storage) {
  console.error("❌ Firebase not initialized in viewer.html");
}

// ===============================
// Utility Helpers
// ===============================
const qs  = (sel) => document.querySelector(sel);
const qsa = (sel) => [...document.querySelectorAll(sel)];

// ===============================
// Elements
// ===============================
const videoContainer   = qs("#video-container");
const audioContainer   = qs("#audio-container");
const videoEl          = qs("#viewer-video");
const audioEl          = qs("#viewer-audio");

const titleEl          = qs("#viewer-title");
const creatorPhotoEl   = qs("#viewer-creator-photo");
const creatorNameEl    = qs("#viewer-creator-name");
const creatorUserEl    = qs("#viewer-creator-username");

const followBtn        = qs("#viewer-follow-btn");

const likesEl          = qs("#viewer-likes");
const commentsCountEl  = qs("#viewer-comments-count");
const viewsEl          = qs("#viewer-views");

const descEl           = qs("#viewer-description");

const commentInput     = qs("#viewer-comment-input");
const commentBtn       = qs("#viewer-comment-btn");
const commentsBox      = qs("#viewer-comments");

// ===============================
// Get Post ID from URL
// ===============================
const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get("id");

if (!postId) {
  alert("Invalid post ID.");
  throw new Error("Missing post ID in URL");
}

// ===============================
// Load Viewer Content
// ===============================
async function loadPost() {
  try {
    const postRef = doc(db, "posts", postId);
    const snap = await getDoc(postRef);

    if (!snap.exists()) {
      alert("Post not found.");
      return;
    }

    const post = snap.data();

    // Title + Description
    titleEl.textContent = post.title || "Untitled";
    descEl.textContent  = post.desc || "";

    // Likes
    likesEl.textContent = `${post.likeCount || 0} Likes`;

    // Views
    const newViews = (post.viewCount || 0) + 1;
    await updateDoc(postRef, { viewCount: increment(1) });
    viewsEl.textContent = `${newViews} Views`;

    // Load Creator Info
    loadCreator(post.uid);

    // Load Comments
    loadComments();

    // Display media
    if (post.type === "video" || post.type === "clip" || post.type === "podcast-video") {
      videoContainer.style.display = "block";
      audioContainer.style.display = "none";
      videoEl.src = post.mediaUrl;
    } else {
      // audio podcast
      videoContainer.style.display = "none";
      audioContainer.style.display = "block";
      audioEl.src = post.mediaUrl;
    }

  } catch (err) {
    console.error(err);
    alert("Failed to load post.");
  }
}

// ===============================
// Load Creator Info
// ===============================
async function loadCreator(uid) {
  try {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) return;

    const data = snap.data();

    creatorNameEl.textContent = data.name || "Unknown";
    creatorUserEl.textContent = "@" + (data.username || "user");

    if (data.photoURL) {
      creatorPhotoEl.src = data.photoURL;
    }
  } catch (err) {
    console.error("Failed to load creator info:", err);
  }
}

// ===============================
// Comments
// ===============================
async function loadComments() {
  const commentsRef = collection(db, "posts", postId, "comments");
  const q = query(commentsRef, orderBy("createdAt", "asc"));
  const snap = await getDocs(q);

  commentsBox.innerHTML = "";
  commentsCountEl.textContent = `${snap.docs.length} Comments`;

  snap.docs.forEach(docSnap => {
    const c = docSnap.data();
    const item = document.createElement("div");
    item.className = "comment-item";
    item.innerHTML = `<span class="muted">${c.uid.slice(0,6)}:</span> ${c.text}`;
    commentsBox.appendChild(item);
  });
}

commentBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Sign in to comment.");

  const text = commentInput.value.trim();
  if (!text) return;

  try {
    const commentsRef = collection(db, "posts", postId, "comments");
    await addDoc(commentsRef, {
      uid: user.uid,
      text,
      createdAt: new Date()
    });

    commentInput.value = "";
    loadComments();

  } catch (err) {
    console.error("Comment failed:", err);
    alert("Failed to comment.");
  }
});

// ===============================
// Follow Feature
// ===============================
followBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Sign in to follow creators.");

  try {
    const authorRef = doc(db, "users", creatorUserEl.textContent.replace("@",""));
  } catch (err) {
    console.error(err);
  }

  alert("Follow system will be expanded soon.");
});

// ===============================
// AUTH LISTENER
// ===============================
onAuthStateChanged(auth, user => {
  if (!user) {
    followBtn.textContent = "Follow";
    return;
  }
});

// ===============================
// INIT
// ===============================
loadPost();
