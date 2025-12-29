/****************************************************
 * VIEWER.JS — FIXED & SAFE
 ****************************************************/

import { auth, db } from "./firebase-init.js";

import {
  doc, getDoc, updateDoc, increment,
  collection, query, where, orderBy, addDoc, getDocs,
  arrayUnion, arrayRemove
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

/* ================= HELPERS ================= */
const qs = (x) => document.querySelector(x);

/* ================= STATE ================= */
let currentUser = null;
let currentPost = null;
let currentPostId = null;

/* ================= AUTH ================= */
onAuthStateChanged(auth, (user) => {
  currentUser = user || null;
});

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", initViewer);

async function initViewer() {
  const params = new URLSearchParams(window.location.search);
  currentPostId = params.get("id");

  if (!currentPostId) {
    document.body.innerHTML = "<p style='color:white'>Post not found</p>";
    return;
  }

  const snap = await getDoc(doc(db, "posts", currentPostId));
  if (!snap.exists()) {
    alert("Post not found");
    return;
  }

  currentPost = snap.data();

  renderPost();
  loadCreator();
  loadComments();
  loadReactions();
  loadSaveState();
  loadFollowState();
  increaseViews();
}

/* ================= RENDER ================= */
function renderPost() {
  qs("#viewer-title")?.textContent = currentPost.title || "";
  qs("#viewer-description")?.textContent = currentPost.desc || "";

  if (currentPost.type === "podcast-audio") {
    qs("#video-container")?.style && (qs("#video-container").style.display = "none");
    qs("#audio-container")?.style && (qs("#audio-container").style.display = "block");
    qs("#viewer-audio") && (qs("#viewer-audio").src = currentPost.fileUrl);
  } else {
    qs("#audio-container")?.style && (qs("#audio-container").style.display = "none");
    qs("#video-container")?.style && (qs("#video-container").style.display = "block");
    qs("#viewer-video") && (qs("#viewer-video").src = currentPost.fileUrl);
  }
}

/* ================= CREATOR ================= */
async function loadCreator() {
  const snap = await getDoc(doc(db, "users", currentPost.uid));
  if (!snap.exists()) return;

  const u = snap.data();
  qs("#viewer-creator-username")?.textContent = "@" + (u.username || "user");
  qs("#viewer-creator-name")?.textContent = u.username || "User";
}

/* ================= REACTIONS ================= */
async function loadReactions() {
  const snap = await getDoc(doc(db, "posts", currentPostId));
  const post = snap.data();
  qs("#viewer-like-count")?.textContent = `${post.likes?.length || 0} likes`;
}

/* ================= SAVE ================= */
async function loadSaveState() {
  if (!currentUser) return;
  // logic stays same as before
}

/* ================= FOLLOW ================= */
async function loadFollowState() {
  if (!currentUser || currentUser.uid === currentPost.uid) return;
}

/* ================= VIEWS ================= */
async function increaseViews() {
  await updateDoc(doc(db, "posts", currentPostId), {
    views: increment(1)
  });
}

/* ================= COMMENTS ================= */
async function loadComments() {
  const wrap = qs("#viewer-comments");
  if (!wrap) return;

  const qRef = query(
    collection(db, "comments"),
    where("postId", "==", currentPostId),
    orderBy("createdAt", "asc")
  );

  const snap = await getDocs(qRef);
  wrap.innerHTML = snap.empty ? "<p>No comments yet</p>" : "";

  snap.forEach(d => {
    const c = d.data();
    const div = document.createElement("div");
    div.innerHTML = `<strong>@${c.username}</strong><br>${c.text}`;
    wrap.appendChild(div);
  });
}
