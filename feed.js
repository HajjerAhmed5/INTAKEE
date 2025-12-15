/* ==========================================
   INTAKEE — REAL FEED SYSTEM
========================================== */

import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import {
  collection,
  query,
  orderBy,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

/* DOM */
const homeFeed = document.getElementById("home-feed");
const videosFeed = document.getElementById("videos-feed");
const clipsFeed = document.getElementById("clips-feed");
const podcastsFeed = document.getElementById("podcasts-feed");

/* LOAD POSTS */
async function loadPosts() {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  const posts = [];
  snap.forEach((doc) => posts.push({ id: doc.id, ...doc.data() }));
  return posts;
}

/* AGE CHECK */
function canView(post, user) {
  if (!post.ageRestricted) return true;
  return !!user;
}

/* CARD */
function createPostCard(post) {
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

  const date = post.createdAt?.toDate
    ? post.createdAt.toDate().toLocaleString()
    : "";

  card.innerHTML = `
    <h3>${post.title || "Untitled"}</h3>
    <p class="muted">@${post.username || "user"}</p>
    <p class="muted small">${date}</p>
    ${media}
    <p>${post.description || ""}</p>
  `;

  return card;
}

/* RENDER */
function render(posts, user) {
  homeFeed.innerHTML = "";
  videosFeed.innerHTML = "";
  clipsFeed.innerHTML = "";
  podcastsFeed.innerHTML = "";

  posts.forEach((post) => {
    if (!canView(post, user)) return;

    const card = createPostCard(post);

    homeFeed.appendChild(card.cloneNode(true));

    if (post.type === "video" || post.type === "podcast-video") {
      videosFeed.appendChild(card.cloneNode(true));
    }

    if (post.type === "clip") {
      clipsFeed.appendChild(card.cloneNode(true));
    }

    if (post.type.startsWith("podcast")) {
      podcastsFeed.appendChild(card.cloneNode(true));
    }
  });
}

/* INIT */
onAuthStateChanged(auth, async (user) => {
  const posts = await loadPosts();
  render(posts, user);
});
