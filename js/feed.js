/*
==========================================
INTAKEE — FEED SYSTEM (REAL APP)
Includes:
- Likes
- Saves
- Follows
- Infinite Scroll
==========================================
*/

import {
  getFirestore,
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
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

const db = getFirestore();
const auth = getAuth();

/* ================= DOM ================= */
const feeds = {
  home: document.getElementById("home-feed"),
  videos: document.getElementById("videos-feed"),
  clips: document.getElementById("clips-feed"),
  podcasts: document.getElementById("podcasts-feed")
};

/* ================= STATE ================= */
let currentUser = null;
let lastVisiblePost = null;
let loading = false;
const PAGE_SIZE = 6;

/* ================= AUTH ================= */
onAuthStateChanged(auth, (user) => {
  currentUser = user;
});

/* ================= FETCH POSTS ================= */
async function fetchPosts() {
  if (loading) return;
  loading = true;

  let q = query(
    collection(db, "posts"),
    orderBy("timestamp", "desc"),
    limit(PAGE_SIZE)
  );

  if (lastVisiblePost) {
    q = query(
      collection(db, "posts"),
      orderBy("timestamp", "desc"),
      startAfter(lastVisiblePost),
      limit(PAGE_SIZE)
    );
  }

  const snap = await getDocs(q);

  if (!snap.empty) {
    lastVisiblePost = snap.docs[snap.docs.length - 1];
  }

  snap.forEach((docSnap) => {
    const post = { id: docSnap.id, ...docSnap.data() };
    renderPost(post);
  });

  loading = false;
}

/* ================= RENDER POST ================= */
function renderPost(post) {
  const card = document.createElement("div");
  card.className = "post-card";

  const liked =
    currentUser &&
    post.likedBy &&
    post.likedBy.includes(currentUser.uid);

  const saved =
    currentUser &&
    post.savedBy &&
    post.savedBy.includes(currentUser.uid);

  card.innerHTML = `
    <div class="post-header">
      <strong>@${post.username || "user"}</strong>
      <span class="muted">${new Date(post.timestamp).toLocaleString()}</span>
    </div>

    ${renderMedia(post)}

    <h3>${post.title || ""}</h3>
    <p>${post.description || ""}</p>

    <div class="post-actions">
      <button class="like-btn ${liked ? "active" : ""}">❤️ ${post.likes || 0}</button>
      <button class="save-btn ${saved ? "active" : ""}">🔖</button>
      <button class="follow-btn">➕ Follow</button>
    </div>
  `;

  card.querySelector(".like-btn").onclick = () =>
    toggleLike(post, card);

  card.querySelector(".save-btn").onclick = () =>
    toggleSave(post, card);

  card.querySelector(".follow-btn").onclick = () =>
    followCreator(post.creatorId);

  feeds.home.appendChild(card);

  if (post.type === "video") feeds.videos.appendChild(card.cloneNode(true));
  if (post.type === "clip") feeds.clips.appendChild(card.cloneNode(true));
  if (post.type.includes("podcast")) feeds.podcasts.appendChild(card.cloneNode(true));
}

/* ================= MEDIA ================= */
function renderMedia(post) {
  if (post.type === "podcast-audio") {
    return `
      <img src="${post.thumbnail}" class="post-thumb">
      <audio controls src="${post.fileURL}"></audio>
    `;
  }

  return `
    <video controls poster="${post.thumbnail || ""}">
      <source src="${post.fileURL}">
    </video>
  `;
}

/* ================= LIKES ================= */
async function toggleLike(post, card) {
  if (!currentUser) return alert("Login required");

  const ref = doc(db, "posts", post.id);
  const liked = post.likedBy?.includes(currentUser.uid);

  await updateDoc(ref, {
    likes: increment(liked ? -1 : 1),
    likedBy: liked
      ? arrayRemove(currentUser.uid)
      : arrayUnion(currentUser.uid)
  });

  location.reload();
}

/* ================= SAVES ================= */
async function toggleSave(post) {
  if (!currentUser) return alert("Login required");

  const ref = doc(db, "posts", post.id);
  const saved = post.savedBy?.includes(currentUser.uid);

  await updateDoc(ref, {
    savedBy: saved
      ? arrayRemove(currentUser.uid)
      : arrayUnion(currentUser.uid)
  });

  location.reload();
}

/* ================= FOLLOWS ================= */
async function followCreator(creatorId) {
  if (!currentUser) return alert("Login required");
  if (creatorId === currentUser.uid) return;

  const userRef = doc(db, "users", currentUser.uid);
  await updateDoc(userRef, {
    following: arrayUnion(creatorId)
  });

  alert("Followed!");
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

