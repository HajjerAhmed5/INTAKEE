/*
==========================================
INTAKEE — FEED SYSTEM (FINAL STABLE)
==========================================
*/

import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
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
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

/* ================= DOM ================= */
const homeFeed = document.getElementById("home-feed");

/* ================= STATE ================= */
let currentUser = null;
let lastVisible = null;
let loading = false;
const PAGE_SIZE = 6;

/* ================= RESET ================= */
function resetFeed() {
  homeFeed.innerHTML = "";
  lastVisible = null;
  loading = false;
  fetchPosts();
}

/* ================= AUTH ================= */
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  resetFeed(); // 🔥 re-render feed on login/logout
});

/* ================= FETCH POSTS ================= */
async function fetchPosts() {
  if (loading) return;
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

  snap.forEach((docSnap) => {
    const post = { id: docSnap.id, ...docSnap.data() };
    renderPost(post);
  });

  loading = false;
}

/* ================= RENDER POST ================= */
function renderPost(post) {
  if (post.ageRestricted && !currentUser) return;

  const card = document.createElement("div");
  card.className = "post-card";

  const liked = currentUser && post.likedBy?.includes(currentUser.uid);
  const saved = currentUser && post.savedBy?.includes(currentUser.uid);

  const date = post.createdAt?.toDate
    ? post.createdAt.toDate().toLocaleString()
    : "";

  card.innerHTML = `
    <div class="post-header">
      <div>
        <strong>@${post.username || "user"}</strong>
        <div class="muted small">${date}</div>
      </div>
      ${
        currentUser && post.uid !== currentUser.uid
          ? `<button class="follow-btn">Follow</button>`
          : ""
      }
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
    post.likedBy = isLiked
      ? post.likedBy.filter(id => id !== currentUser.uid)
      : [...(post.likedBy || []), currentUser.uid];

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

    post.savedBy = isSaved
      ? post.savedBy.filter(id => id !== currentUser.uid)
      : [...(post.savedBy || []), currentUser.uid];

    card.querySelector(".save-btn").classList.toggle("active");
  };

  /* FOLLOW */
  const followBtn = card.querySelector(".follow-btn");
  if (followBtn) {
    followBtn.onclick = async () => {
      await updateDoc(doc(db, "users", currentUser.uid), {
        following: arrayUnion(post.uid)
      });

      await updateDoc(doc(db, "users", post.uid), {
        followers: arrayUnion(currentUser.uid)
      });

      followBtn.textContent = "Following";
      followBtn.disabled = true;
    };
  }

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

/* ================= EXPOSE FOR UPLOAD ================= */
// Allows upload.js to refresh feed instantly
window.refreshFeed = resetFeed;
