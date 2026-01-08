/*
==========================================
INTAKEE — FEED SYSTEM (FINAL, WORKING)
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
  getDocs
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

/* ================= FEED MAP ================= */
const feeds = {
  home: document.querySelector("#home .feed-grid"),
  videos: document.querySelector("#videos .feed-grid"),
  podcasts: document.querySelector("#podcasts .feed-grid"),
  clips: document.querySelector("#clips .feed-grid")
};

const PAGE_SIZE = 20;
let currentUser = null;

/* ================= AUTH ================= */
onAuthStateChanged(auth, user => {
  currentUser = user;
  loadAllFeeds();
});

/* ================= LOAD ALL FEEDS ================= */
async function loadAllFeeds() {
  Object.values(feeds).forEach(f => f && (f.innerHTML = ""));

  const q = query(
    collection(db, "posts"),
    orderBy("createdAt", "desc"),
    limit(PAGE_SIZE)
  );

  const snap = await getDocs(q);

  snap.forEach(doc => {
    const post = { id: doc.id, ...doc.data() };
    renderPost(post);
  });
}

/* ================= RENDER POST ================= */
function renderPost(post) {
  const type = (post.type || "").toLowerCase();

  const targets = [
    feeds.home,
    type === "video" && feeds.videos,
    type === "podcast" && feeds.podcasts,
    type === "clip" && feeds.clips
  ].filter(Boolean);

  targets.forEach(feed => {
    const card = document.createElement("div");
    card.className = "feed-card";

    let media;
    if (type === "video" || type === "clip") {
      media = document.createElement("video");
      media.src = post.mediaURL;
      media.muted = true;
      media.playsInline = true;
      media.preload = "metadata";
    } else {
      media = document.createElement("img");
      media.src = post.thumbnailURL || "/default-thumb.png";
    }

    media.className = "feed-media";

    card.innerHTML = `
      <div class="feed-info">
        <h4>${post.title || "Untitled"}</h4>
        <p>@${post.username || "user"} • ${post.views || 0} views</p>
      </div>
    `;

    card.prepend(media);

    card.onclick = () => {
      window.location.href = `/viewer.html?id=${post.id}`;
    };

    feed.appendChild(card);
  });
}
