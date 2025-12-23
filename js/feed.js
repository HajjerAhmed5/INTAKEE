/*
==========================================
INTAKEE — FEED SYSTEM (FINAL STABLE)
- Uses firebase-init.js ONLY
- No duplicate Firebase apps
==========================================
*/

import { auth, db } from "./firebase-init.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

/* ================= DOM ================= */
const homeFeed = document.getElementById("home-feed");

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
  if (loading || !db) return;
  loading = true;

  try {
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

    snap.forEach((docSnap) => {
      renderPost({ id: docSnap.id, ...docSnap.data() });
    });
  } catch (err) {
    console.error("Feed error:", err);
  }

  loading = false;
}

/* ================= RENDER POST ================= */
function renderPost(post) {
  if (!homeFeed) return;
  if (post.ageRestricted && !currentUser) return;

  const card = document.createElement("div");
  card.className = "post-card";

  const liked = currentUser && post.likedBy?.includes(currentUser.uid);
  const saved = currentUser && post.savedBy?.includes(currentUser.uid);

  const date =
    post.createdAt?.toDate?.().toLocaleString() || "";

  card.innerHTML = `
    <div class="post-header">
      <strong>@${post.username || "user"}</strong>
      <span class="muted small">${date}</span>
    </div>

    ${renderMedia(post)}

    <h3>${post.title || "Untitled"}</h3>
    <p>${post.description || ""}</p>

    <div class="post-actions">
      <button class="like-btn ${liked ? "active" : ""}">
        ❤️ ${post.likes || 0}
      </button>
      <button class="save-btn ${saved ? "active" : ""}">🔖</button>
    </div>
  `;

  /* LIKE */
  card.querySelector(".like-btn").onclick = async () => {
    if (!currentUser) return alert("Login required");

    const ref = doc(db, "posts", post.id);
    const isLiked = post.likedBy?.includes(currentUser.uid);

    await updateDoc(ref, {
      likes: increment(isLiked ? -1 : 1),
      likedBy: isLiked
        ? arrayRemove(currentUser.uid)
        : arrayUnion(currentUser.uid)
    });

    post.likes += isLiked ? -1 : 1;
    card.querySelector(".like-btn").textContent = `❤️ ${post.likes}`;
    card.querySelector(".like-btn").classList.toggle("active");
  };

  /* SAVE */
  card.querySelector(".save-btn").onclick = async () => {
    if (!currentUser) return alert("Login required");

    const ref = doc(db, "posts", post.id);
    const isSaved = post.savedBy?.includes(currentUser.uid);

    await updateDoc(ref, {
      savedBy: isSaved
        ? arrayRemove(currentUser.uid)
        : arrayUnion(currentUser.uid)
    });

    card.querySelector(".save-btn").classList.toggle("active");
  };

  homeFeed.appendChild(card);
}

/* ================= MEDIA ================= */
function renderMedia(post) {
  if (post.type === "podcast-audio") {
    return `
      <img src="${post.thumbnail || ""}" class="post-audio-thumb">
      <audio controls src="${post.fileURL}"></audio>
    `;
  }

  return `
    <video controls poster="${post.thumbnail || ""}">
      <source src="${post.fileURL}">
    </video>
  `;
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

/* ================= EXPOSE ================= */
window.refreshFeed = resetFeed;
