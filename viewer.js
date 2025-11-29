// =======================================================
// INTAKEE — VIEWER.JS
// Handles: load post, display media, creator info,
// likes, views, comments, follow button.
// =======================================================

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  increment,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

import {
  getStorage
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

// Firebase
const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

// Helpers
const qs = (s) => document.querySelector(s);

// URL param
const params = new URLSearchParams(window.location.search);
const postId = params.get("id");

// DOM elements
const videoBox = qs("#video-container");
const audioBox = qs("#audio-container");
const videoEl = qs("#viewer-video");
const audioEl = qs("#viewer-audio");

const titleEl = qs("#viewer-title");
const descEl = qs("#viewer-description");
const likesEl = qs("#viewer-likes");
const commentsCountEl = qs("#viewer-comments-count");
const viewsEl = qs("#viewer-views");

const creatorPhotoEl = qs("#viewer-creator-photo");
const creatorNameEl = qs("#viewer-creator-name");
const creatorUsernameEl = qs("#viewer-creator-username");
const followBtn = qs("#viewer-follow-btn");

const commentInput = qs("#viewer-comment-input");
const commentBtn = qs("#viewer-comment-btn");
const commentsBox = qs("#viewer-comments");

// =======================================================
// LOAD POST DATA
// =======================================================

async function loadPost() {
  if (!postId) {
    titleEl.textContent = "Post not found.";
    return;
  }

  try {
    const snap = await getDoc(doc(db, "posts", postId));
    if (!snap.exists()) {
      titleEl.textContent = "Post not found.";
      return;
    }

    const data = snap.data();

    // Title + description
    titleEl.textContent = data.title || "";
    descEl.textContent = data.desc || "";

    // Increment views
    await updateDoc(doc(db, "posts", postId), {
      viewCount: increment(1)
    });

    viewsEl.textContent = `${(data.viewCount || 0) + 1} Views`;

    loadMedia(data);
    loadCreator(data.uid);
    loadComments();
    updateLikesCount(data);

  } catch (err) {
    titleEl.textContent = "Error loading post.";
    console.error(err);
  }
}

// =======================================================
// LOAD MEDIA (video / audio / podcast)
// =======================================================

function loadMedia(post) {
  videoBox.style.display = "none";
  audioBox.style.display = "none";

  if (post.type === "video" || post.type === "podcast-video") {
    videoBox.style.display = "block";
    videoEl.src = post.mediaUrl;
    videoEl.autoplay = false;

  } else if (post.type === "podcast-audio") {
    audioBox.style.display = "block";
    audioEl.src = post.mediaUrl;
    audioEl.autoplay = true;

  } else if (post.type === "clip") {
    videoBox.style.display = "block";
    videoEl.src = post.mediaUrl;
    videoEl.autoplay = true;
    videoEl.loop = true;
  }
}

// =======================================================
// LOAD CREATOR INFO
// =======================================================

async function loadCreator(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    const data = snap.data();

    if (!data) return;

    creatorNameEl.textContent = data.name || "Creator";
    creatorUsernameEl.textContent = "@" + (data.username || "unknown");

    creatorPhotoEl.src = data.photoURL || "";
  } catch (err) {
    console.error("Error loading creator:", err);
  }
}

// =======================================================
// LIKES
// =======================================================

async function updateLikesCount(data) {
  likesEl.textContent = `${data.likeCount || 0} Likes`;
}

qs("#like-btn")?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Login required.");

  try {
    await updateDoc(doc(db, "posts", postId), {
      likeCount: increment(1)
    });

    const snap = await getDoc(doc(db, "posts", postId));
    const data = snap.data();

    updateLikesCount(data);

  } catch (err) {
    alert("Error: " + err.message);
  }
});

// Dislike is placeholder
qs("#dislike-btn")?.addEventListener("click", () => {
  alert("You disliked this post.");
});

// =======================================================
// COMMENTS (CREATE + LOAD)
// =======================================================

async function loadComments() {
  try {
    const qRef = query(
      collection(db, "comments"),
      where("postId", "==", postId)
    );

    const snap = await getDocs(qRef);
    const comments = snap.docs.map(d => d.data());

    commentsCountEl.textContent = `${comments.length} Comments`;

    commentsBox.innerHTML = "";

    if (comments.length === 0) {
      commentsBox.innerHTML = `<p class="muted">No comments yet.</p>`;
      return;
    }

    comments.forEach(c => {
      const el = document.createElement("div");
      el.className = "comment-item";

      el.innerHTML = `
        <strong>@${c.username}</strong>: ${c.text}
      `;

      commentsBox.appendChild(el);
    });

  } catch (err) {
    console.error("Comments error:", err);
  }
}

// Post a comment
commentBtn.addEventListener("click", async () => {
  const text = commentInput.value.trim();
  if (!text) return;

  const user = auth.currentUser;
  if (!user) return alert("Login required.");

  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    const userdata = snap.data();

    await addDoc(collection(db, "comments"), {
      postId,
      uid: user.uid,
      username: userdata.username,
      text,
      createdAt: serverTimestamp()
    });

    commentInput.value = "";
    loadComments();

  } catch (err) {
    alert("Comment error: " + err.message);
  }
});

// =======================================================
// FOLLOW CREATOR
// =======================================================

followBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Login required.");

  try {
    // (Simple placeholder)
    alert("Following creator is coming soon.");
  } catch (err) {
    alert("Error: " + err.message);
  }
});

// =======================================================
// START VIEWER
// =======================================================

loadPost();
console.log("📺 viewer.js loaded");
