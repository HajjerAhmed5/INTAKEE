/*
==========================================
INTAKEE — FEED SYSTEM (FINAL, LOCKED)
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
let feedsLoaded = false;

/* ================= AUTH ================= */
onAuthStateChanged(auth, user => {
  currentUser = user;
  if (!feedsLoaded) {
    feedsLoaded = true;
    loadAllFeeds();
  }
});

/* ================= LOAD ALL FEEDS ================= */
async function loadAllFeeds() {
  Object.values(feeds).forEach(feed => {
    if (feed) feed.innerHTML = "";
  });

  try {
    const q = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE)
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      showEmptyState();
      return;
    }

    snap.forEach(docSnap => {
      const post = { id: docSnap.id, ...docSnap.data() };
      renderPost(post);
    });

  } catch (err) {
    console.error("❌ Feed load failed:", err);
    showEmptyState();
  }
}

/* ================= EMPTY STATE ================= */
function showEmptyState() {
  if (feeds.home) {
    feeds.home.innerHTML = `
      <div class="empty-feed">
        <p>No posts yet.</p>
      </div>
    `;
  }
}

/* ================= RENDER POST ================= */
function renderPost(post) {
  if (!post.mediaURL && !post.thumbnailURL) return;

  const type = (post.type || "").toLowerCase();

  const targets = [
    feeds.home,
    type === "video" && feeds.videos,
    type === "podcast" && feeds.podcasts,
    type === "clip" && feeds.clips
  ].filter(Boolean);

  targets.forEach(feed => {
    if (!feed) return;

    const card = document.createElement("div");
    card.className = "feed-card";

    let media;

    if ((type === "video" || type === "clip") && post.mediaURL) {
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

    const info = document.createElement("div");
    info.className = "feed-info";
    info.innerHTML = `
      <h4>${post.title || "Untitled"}</h4>
      <p>@${post.username || "user"} • ${post.views || 0} views</p>
    `;

    card.appendChild(media);
    card.appendChild(info);

    card.onclick = () => {
      window.location.href = `/viewer.html?id=${post.id}`;
    };

    feed.appendChild(card);
  });
}
