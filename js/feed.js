/*
==========================================
INTAKEE — FEED SYSTEM (FINAL + SAFE)
- No fetch / XHR
- Uses <video src="">
- Firebase-compatible
==========================================
*/

import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

/* ================= DOM ================= */
const homeFeed = document.querySelector("#home .feed-grid");

/* ================= STATE ================= */
let currentUser = null;
let lastVisible = null;
let loading = false;
const PAGE_SIZE = 6;

/* ================= AUTH ================= */
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  resetFeed();
});

/* ================= RESET ================= */
function resetFeed() {
  if (!homeFeed) return;
  homeFeed.innerHTML = "";
  lastVisible = null;
  loading = false;
  fetchPosts();
}

/* ================= FETCH POSTS ================= */
async function fetchPosts() {
  if (loading || !homeFeed) return;
  loading = true;

  let q = query(
    collection(db, "posts"),
    orderBy("createdAt", "desc"),
    limit(PAGE_SIZE)
  );

  if (lastVisible) {
    q = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc"),
      startAfter(lastVisible),
      limit(PAGE_SIZE)
    );
  }

  const snap = await getDocs(q);

  if (!snap.empty) {
    lastVisible = snap.docs[snap.docs.length - 1];
  }

  snap.forEach(docSnap => {
    renderPost({ id: docSnap.id, ...docSnap.data() });
  });

  loading = false;
}

/* ================= RENDER POST ================= */
function renderPost(post) {
  if (post.ageRestricted && !currentUser) return;

  const card = document.createElement("div");
  card.className = "feed-card";

  /* ===== MEDIA ELEMENT (NO CORS) ===== */
  let mediaEl;

  if (post.type === "video" || post.type === "clip") {
    mediaEl = document.createElement("video");
    mediaEl.src = post.mediaURL;
    mediaEl.muted = true;
    mediaEl.playsInline = true;
    mediaEl.preload = "metadata";
    mediaEl.controls = false;
  } else {
    mediaEl = document.createElement("img");
    mediaEl.src = post.thumbnailURL || "/default-thumb.png";
  }

  mediaEl.className = "feed-media";

  /* ===== INFO ===== */
  const info = document.createElement("div");
  info.className = "feed-info";
  info.innerHTML = `
    <h4>${post.title || "Untitled"}</h4>
    <p>@${post.username || "user"} • ${post.views || 0} views</p>
  `;

  card.appendChild(mediaEl);
  card.appendChild(info);

  /* ===== OPEN VIEWER ===== */
  card.addEventListener("click", () => {
    window.location.href = `/viewer.html?id=${post.id}`;
  });

  homeFeed.appendChild(card);
}

/* ================= INFINITE SCROLL ================= */
window.addEventListener("scroll", () => {
  if (
    window.innerHeight + window.scrollY >=
    document.body.offsetHeight - 200
  ) {
    fetchPosts();
  }
});

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", fetchPosts);
