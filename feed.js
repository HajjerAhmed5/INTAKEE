/* ==========================================
   INTAKEE — REAL FEED SYSTEM (LIKES + SAVES)
========================================== */

import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

/* DOM */
const homeFeed = document.getElementById("home-feed");
const videosFeed = document.getElementById("videos-feed");
const clipsFeed = document.getElementById("clips-feed");
const podcastsFeed = document.getElementById("podcasts-feed");

/* LOAD POSTS */
async function loadPosts() {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/* AGE CHECK */
function canView(post, user) {
  if (!post.ageRestricted) return true;
  return !!user;
}

/* LIKE HANDLER */
async function toggleLike(postId, liked, btn, countEl) {
  const user = auth.currentUser;
  if (!user) {
    alert("Log in to like posts.");
    return;
  }

  const postRef = doc(db, "posts", postId);
  const userRef = doc(db, "users", user.uid);

  if (liked) {
    await updateDoc(postRef, { likes: increment(-1) });
    await updateDoc(userRef, { likedPosts: arrayRemove(postId) });
    btn.classList.remove("liked");
    countEl.textContent = Number(countEl.textContent) - 1;
  } else {
    await updateDoc(postRef, { likes: increment(1) });
    await updateDoc(userRef, { likedPosts: arrayUnion(postId) });
    btn.classList.add("liked");
    countEl.textContent = Number(countEl.textContent) + 1;
  }
}

/* SAVE HANDLER */
async function toggleSave(postId, saved, btn) {
  const user = auth.currentUser;
  if (!user) {
    alert("Log in to save posts.");
    return;
  }

  const userRef = doc(db, "users", user.uid);

  if (saved) {
    await updateDoc(userRef, { saved: arrayRemove(postId) });
    btn.classList.remove("saved");
  } else {
    await updateDoc(userRef, { saved: arrayUnion(postId) });
    btn.classList.add("saved");
  }
}

/* CARD */
function createPostCard(post, userData) {
  const card = document.createElement("div");
  card.className = "post-card";

  let media = "";

  if (post.type === "video" || post.type === "clip" || post.type === "podcast-video") {
    media = `
      <video controls poster="${post.thumbnail || ""}">
        <source src="${post.fileURL}">
      </video>
    `;
  }

  if (post.type === "podcast-audio") {
    media = `
      <img src="${post.thumbnail || ""}" class="post-audio-thumb">
      <audio controls>
        <source src="${post.fileURL}">
      </audio>
    `;
  }

  const likedPosts = userData?.likedPosts || [];
  const savedPosts = userData?.saved || [];

  const liked = likedPosts.includes(post.id);
  const saved = savedPosts.includes(post.id);

  const date = post.createdAt?.toDate
    ? post.createdAt.toDate().toLocaleString()
    : "";

  card.innerHTML = `
    <h3>${post.title || "Untitled"}</h3>
    <p class="muted">@${post.username || "user"}</p>
    <p class="muted small">${date}</p>

    ${media}

    <p>${post.description || ""}</p>

    <div class="post-actions">
      <button class="like-btn ${liked ? "liked" : ""}">❤️</button>
      <span class="like-count">${post.likes || 0}</span>
      <button class="save-btn ${saved ? "saved" : ""}">🔖</button>
    </div>
  `;

  const likeBtn = card.querySelector(".like-btn");
  const saveBtn = card.querySelector(".save-btn");
  const likeCount = card.querySelector(".like-count");

  likeBtn.addEventListener("click", () =>
    toggleLike(post.id, likeBtn.classList.contains("liked"), likeBtn, likeCount)
  );

  saveBtn.addEventListener("click", () =>
    toggleSave(post.id, saveBtn.classList.contains("saved"), saveBtn)
  );

  return card;
}

/* RENDER */
function render(posts, user, userData) {
  homeFeed.innerHTML = "";
  videosFeed.innerHTML = "";
  clipsFeed.innerHTML = "";
  podcastsFeed.innerHTML = "";

  posts.forEach((post) => {
    if (!canView(post, user)) return;

    if (homeFeed) homeFeed.appendChild(createPostCard(post, userData));
    if (videosFeed && (post.type === "video" || post.type === "podcast-video")) {
      videosFeed.appendChild(createPostCard(post, userData));
    }
    if (clipsFeed && post.type === "clip") {
      clipsFeed.appendChild(createPostCard(post, userData));
    }
    if (podcastsFeed && post.type?.startsWith("podcast")) {
      podcastsFeed.appendChild(createPostCard(post, userData));
    }
  });
}

/* INIT */
onAuthStateChanged(auth, async (user) => {
  const posts = await loadPosts();

  let userData = null;
  if (user) {
    const snap = await getDoc(doc(db, "users", user.uid));
    userData = snap.exists() ? snap.data() : null;
  }

  render(posts, user, userData);
});
