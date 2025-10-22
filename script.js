// --- Firebase (modular CDN) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getStorage
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// TODO: replace with your real keys (the same ones you used before)
const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "YOUR_DOMAIN",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);
const st   = getStorage(app);

// (optional) expose for quick debugging
window.__fb = { auth, db, st };
/* ===============================
   INTAKEE — Core JS Scaffold
   (Placeholders first; wire Firebase later)
   =============================== */

// ---------- 0) Auth event (placeholder) ----------
// --- Real Auth header wiring ---
onAuthStateChanged(auth, (user) => {
  // Tell the UI when user logs in or out
  document.dispatchEvent(new CustomEvent("intakee:auth", { detail: { user } }));
  console.log(user ? `Signed in as ${user.email}` : "Signed out");
});

// --- Logout button ---
document.getElementById("btnSignOut")?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    console.log("User signed out");
  } catch (err) {
    console.error("Logout error:", err);
  }
});

// ---------- 1) Tiny helpers ----------
const qs  = (s, sc) => (sc || document).querySelector(s);
const qsa = (s, sc) => Array.from((sc || document).querySelectorAll(s));

// Convenience wrappers to append children
function append(el, ...kids) { kids.forEach(k => k && el.appendChild(k)); return el; }

// ---------- 2) Demo content so you can see the UI NOW ----------
const demo = {
  videos: [
    {
      id: "v1",
      type: "video",
      title: "How to color-grade in 3 minutes",
      thumbnailUrl: "https://images.unsplash.com/photo-1517602302552-471fe67acf66?q=80&w=1280&auto=format&fit=crop",
      mediaUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
      creatorName: "INTAKEE Studio",
      views: 12800,
      createdAt: Date.now()
    },
    {
      id: "v2",
      type: "video",
      title: "Studio tour: lighting on a budget",
      thumbnailUrl: "https://images.unsplash.com/photo-1484704849700-f032a568e944?q=80&w=1280&auto=format&fit=crop",
      mediaUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
      creatorName: "Hajer",
      views: 6400,
      createdAt: Date.now()
    }
  ],
  podcasts: [
    {
      id: "p1",
      type: "podcast-audio",
      title: "The Creator Mindset — Episode 01",
      showName: "INTAKEE Talks",
      coverUrl: "https://images.unsplash.com/photo-1620228885840-8a9b1bb3b0ef?q=80&w=1200&auto=format&fit=crop",
      mediaUrl: "https://www.w3schools.com/html/horse.mp3",
      createdAt: Date.now()
    },
    {
      id: "p2",
      type: "podcast-audio",
      title: "Growing an audience from zero",
      showName: "INTAKEE Talks",
      coverUrl: "https://images.unsplash.com/photo-1520975922322-53b6038dc2da?q=80&w=1200&auto=format&fit=crop",
      mediaUrl: "https://www.w3schools.com/html/horse.mp3",
      createdAt: Date.now()
    }
  ],
  clips: [
    {
      id: "c1",
      type: "clip",
      title: "Day 1 in the studio",
      creatorHandle: "intakee",
      mediaUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm",
      likeCount: 231, commentCount: 12, createdAt: Date.now()
    },
    {
      id: "c2",
      type: "clip",
      title: "Behind the scenes",
      creatorHandle: "hajer",
      mediaUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      likeCount: 91, commentCount: 4, createdAt: Date.now()
    }
  ]
};

// ---------- 3) Renderers (use the functions defined in index.html) ----------
function mountVideos(targetId, items) {
  const root = qs(`#${targetId}`);
  root.innerHTML = "";
  items.forEach(p => append(root, window.renderVideoCard(p)));
}

function mountPodcasts(targetId, items) {
  const root = qs(`#${targetId}`);
  root.innerHTML = "";
  items.forEach(p => append(root, window.renderPodcastRow(p)));
}

function mountClips(targetId, items) {
  const root = qs(`#${targetId}`);
  root.innerHTML = "";
  items.forEach(p => append(root, window.renderClipFullScreen(p)));
}

function mountProfileGrid(items) {
  const grid = qs("#profile-grid");
  const empty = qs("#profile-empty");
  grid.innerHTML = "";
  items.forEach(p => {
    // Reuse the same video-card/clip layout for consistency
    let card;
    if (p.type === "clip") {
      card = document.createElement("article");
      card.className = "card ratio-9x16";
      card.innerHTML = `<video src="${p.mediaUrl}" muted playsinline loop style="width:100%;height:100%;object-fit:cover;border-radius:12px;"></video>`;
    } else if (p.type?.startsWith("podcast")) {
      card = document.createElement("article");
      card.className = "card ratio-1x1";
      card.innerHTML = `<img src="${p.coverUrl || p.thumbnailUrl || ""}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:12px;">`;
    } else {
      card = document.createElement("article");
      card.className = "card ratio-16x9";
      card.innerHTML = `<img src="${p.thumbnailUrl || ""}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:12px;">`;
    }
    grid.appendChild(card);
  });
  empty.style.display = items.length ? "none" : "";
}

// ---------- 4) Initial demo mount ----------
function mountAllDemo() {
  // HOME feed: mix (videos + podcasts + clips) — you can customize order later
  const homeMix = [...demo.videos, ...demo.podcasts, ...demo.clips];
  const homeRoot = qs("#home-feed");
  homeRoot.innerHTML = "";
  homeMix.forEach(p => {
    const node =
      p.type === "video" || p.type === "podcast-video"
        ? window.renderVideoCard(p)
        : p.type === "podcast-audio"
        ? window.renderPodcastRow(p)
        : window.renderClipFullScreen(p);
    homeRoot.appendChild(node);
  });

  // Tabs
  mountVideos("videos-feed", demo.videos);
  mountPodcasts("podcast-feed", demo.podcasts);
  mountClips("clips-feed", demo.clips);

  // Profile header placeholders
  qs("#profile-name").textContent = "INTAKEE Creator";
  qs("#profile-handle").textContent = "@intakee";
  qs("#bio-view").textContent = "Freedom to create. Simple to share.";
  qs("#profile-photo").src = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop";
  qs("#profileBanner").style.backgroundImage =
    "url('https://images.unsplash.com/photo-1495567720989-cebdbdd97913?q=80&w=1600&auto=format&fit=crop')";

  // Profile grid: show your uploads (use videos + clips for variety)
  mountProfileGrid([...demo.videos, ...demo.clips]);
}
mountAllDemo();

// ---------- 5) Filters/search (placeholders) ----------
qsa(".pills .pill").forEach(btn => {
  btn.addEventListener("click", () => {
    qsa(".pills .pill").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    // TODO: Filter home feed by btn.dataset.filter
    // For now, just no-op visual.
  });
});

qs("#videosSearch")?.addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase().trim();
  // TODO: replace with Firestore query; for now, simple filter
  const filtered = demo.videos.filter(v => v.title.toLowerCase().includes(q));
  mountVideos("videos-feed", filtered);
});

qs("#podcastSearch")?.addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase().trim();
  const filtered = demo.podcasts.filter(p => p.title.toLowerCase().includes(q) || (p.showName||"").toLowerCase().includes(q));
  mountPodcasts("podcast-feed", filtered);
});

qs("#clipsSearch")?.addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase().trim();
  const filtered = demo.clips.filter(c => c.title.toLowerCase().includes(q) || (c.creatorHandle||"").toLowerCase().includes(q));
  mountClips("clips-feed", filtered);
});

// ---------- 6) Upload button (placeholder) ----------
qs("#btnUpload")?.addEventListener("click", () => {
  alert("TODO: Wire Firebase upload logic here.\n\nUse addDoc(posts) + unique Storage path per file + store thumbnailPath.\nI’ll plug this in next.");
});

// ---------- 7) Profile edit (placeholder) ----------
qs("#btn-edit-profile")?.addEventListener("click", () => {
  qs("#bio-view").style.display = "none";
  qs("#bio-edit-wrap").style.display = "";
  qs("#profileNameInput").value = qs("#profile-name").textContent || "";
  qs("#profileBioInput").value  = "Freedom to create. Simple to share.";
});
qs("#bio-cancel")?.addEventListener("click", () => {
  qs("#bio-view").style.display = "";
  qs("#bio-edit-wrap").style.display = "none";
});
qs("#btnSaveProfile")?.addEventListener("click", () => {
  // TODO: Persist to Firestore users/{uid}
  const name = qs("#profileNameInput").value.trim();
  const bio  = qs("#profileBioInput").value.trim();
  if (name) qs("#profile-name").textContent = name;
  qs("#bio-view").textContent = bio || " ";
  qs("#bio-view").style.display = "";
  qs("#bio-edit-wrap").style.display = "none";
  alert("Saved (placeholder).");
});

// ---------- 8) Settings toggles (placeholder persistence) ----------
["private","uploads","likes","saved","playlists"].forEach(key => {
  const el = qs(`#toggle-${key}`);
  if (!el) return;
  // Default values
  const saved = localStorage.getItem(`privacy:${key}`);
  if (saved) el.setAttribute("data-on", saved === "true");
  el.addEventListener("click", () => {
    const on = el.getAttribute("data-on") !== "true";
    el.setAttribute("data-on", on ? "true" : "false");
    localStorage.setItem(`privacy:${key}`, String(on));
    // TODO: Persist under users/{uid}.privacy
  });
});

// ---------- 9) Expose a tiny dev hook ----------
window.__INTAKEE__ = {
  reloadDemo: mountAllDemo,
  demo
};

console.log("INTAKEE scaffold ready — UI is live with demo data. Wire Firebase next.");
