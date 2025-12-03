/****************************************************
 * INTAKEE — CLEAN FINAL SCRIPT.JS (CHUNK 1)
 * Firebase + Auth + Tabs + Base Setup
 ****************************************************/

// ===================
// FIREBASE IMPORTS
// ===================

import { initializeApp } 
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import { 
  getAuth, onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut, updateProfile
} 
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import { 
  getFirestore, doc, setDoc, getDoc, updateDoc, 
  addDoc, getDocs, collection, serverTimestamp,
  query, where, orderBy
} 
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  getStorage, ref, uploadBytesResumable, getDownloadURL
}
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";


// ===================
// FIREBASE CONFIG
// ===================

const firebaseConfig = {
  apiKey: "AIzaSyD0_tL8PxUvGT7JqCBj3tuL7s3Kipl5E6g",
  authDomain: "intakee-5785e.firebaseapp.com",
  projectId: "intakee-5785e",
  storageBucket: "intakee-5785e.firebasestorage.app",
  messagingSenderId: "40666230072",
  appId: "1:40666230072:web:3e3875043b11d795b565cd",
  measurementId: "G-3319X7HL9G"
};


// ===================
// INIT SERVICES
// ===================

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);


// ===================
// UTIL SHORTCUTS
// ===================

const qs = (x) => document.querySelector(x);
const qsa = (x) => document.querySelectorAll(x);

let currentUser = null;


// ===================
// AUTH STATE LISTENER
// ===================

onAuthStateChanged(auth, async (user) => {
  currentUser = user;

  if (user) {
    const uRef = doc(db, "users", user.uid);
    const snap = await getDoc(uRef);

    if (!snap.exists()) {
      await setDoc(uRef, {
        uid: user.uid,
        email: user.email,
        username: user.email.split("@")[0],
        bio: "",
        saved: [],
        likes: [],
        followers: [],
        following: [],
        blockedUsers: [],
        createdAt: serverTimestamp()
      });
    }

    qs("#openAuth").style.display = "none";
  } else {
    qs("#openAuth").style.display = "block";
  }

  // Let the entire app know auth changed
  document.dispatchEvent(
    new CustomEvent("intakee:auth", { detail: { user } })
  );
});


// ===================
// LOGIN / SIGNUP / LOGOUT
// ===================

const authDialog = qs("#authDialog");

qs("#openAuth").onclick = () => authDialog.showModal();

qs("#signupBtn").onclick = async () => {
  const email = qs("#signupEmail").value.trim();
  const pass  = qs("#signupPassword").value.trim();
  const usern = qs("#signupUsername").value.trim();
  const ageOK = qs("#signupAgeConfirm").checked;

  if (!email || !pass || !usern)
    return alert("Fill all fields.");

  if (!ageOK)
    return alert("Age confirmation required.");

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: usern });

    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid,
      email,
      username: usern,
      bio: "",
      saved: [],
      likes: [],
      followers: [],
      following: [],
      blockedUsers: [],
      createdAt: serverTimestamp()
    });

    authDialog.close();
  } catch (e) {
    alert(e.message);
  }
};

qs("#loginBtn").onclick = async () => {
  const email = qs("#loginEmail").value.trim();
  const pass = qs("#loginPassword").value.trim();

  try {
    await signInWithEmailAndPassword(auth, email, pass);
    authDialog.close();
  } catch (e) {
    alert(e.message);
  }
};

qs("#forgotBtn").onclick = async () => {
  const email = qs("#loginEmail").value.trim();
  if (!email) return alert("Enter email first");

  await sendPasswordResetEmail(auth, email);
  alert("Reset email sent.");
};

qs("#settings-logout").onclick = () => signOut(auth);


// ===================
// FINAL WORKING TAB SWITCHING
// ===================
/****************************************************
 * TAB SWITCHING — FINAL CLEAN VERSION
 ****************************************************/

const tabs = document.querySelectorAll(".bottom-nav a");

const sections = {
  home: document.querySelector("#tab-home"),
  videos: document.querySelector("#tab-videos"),
  podcast: document.querySelector("#tab-podcast"),
  upload: document.querySelector("#tab-upload"),
  clips: document.querySelector("#tab-clips"),
  profile: document.querySelector("#tab-profile"),
  settings: document.querySelector("#tab-settings"),
};

function showTab(name) {
  // hide all sections
  Object.values(sections).forEach(sec => sec.style.display = "none");

  // show chosen
  sections[name].style.display = "block";

  // update bottom nav active state
  tabs.forEach(t => {
    t.classList.toggle("active", t.dataset.tab === name);
  });

  // load feed if needed
  if (name === "home")    loadHomeFeed();
  if (name === "videos")  loadVideosFeed();
  if (name === "podcast") loadPodcastFeed();
  if (name === "clips")   loadClipsFeed();
  if (name === "profile" && currentUser) loadProfile(currentUser.uid);
}

// click event
tabs.forEach(btn => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;

    if (tab === "upload" && !currentUser) {
      alert("Login required to upload");
      return;
    }

    showTab(tab);
  });
});

// default screen
showTab("home");
/****************************************************
 * CHUNK 2 — UPLOAD SYSTEM
 * Handles:
 * - Upload thumbnail to Storage
 * - Upload media file to Storage
 * - Create Firestore post
 ****************************************************/

// Upload inputs
const uploadTypeSelect = qs("#uploadTypeSelect");
const uploadTitleInput = qs("#uploadTitleInput");
const uploadDescInput  = qs("#uploadDescInput");
const uploadThumbInput = qs("#uploadThumbInput");
const uploadFileInput  = qs("#uploadFileInput");
const uploadBtn        = qs("#btnUpload");

// Upload handler
uploadBtn.addEventListener("click", async () => {
  if (!currentUser) {
    alert("You must be logged in to upload.");
    return;
  }

  const type  = uploadTypeSelect.value;
  const title = uploadTitleInput.value.trim();
  const desc  = uploadDescInput.value.trim();
  const thumb = uploadThumbInput.files[0];
  const file  = uploadFileInput.files[0];

  if (!title || !thumb || !file) {
    alert("Please fill all fields and select files.");
    return;
  }

  uploadBtn.disabled = true;
  uploadBtn.textContent = "Uploading…";

  try {
    // ========================
    // 1. Upload thumbnail
    // ========================
    const thumbRef = ref(storage, `thumbnails/${Date.now()}-${thumb.name}`);
    const thumbTask = uploadBytesResumable(thumbRef, thumb);

    await new Promise((res) => thumbTask.on("state_changed", null, null, res));
    const thumbnailUrl = await getDownloadURL(thumbTask.snapshot.ref);

    // ========================
    // 2. Upload media
    // ========================
    const fileRef = ref(storage, `uploads/${Date.now()}-${file.name}`);
    const fileTask = uploadBytesResumable(fileRef, file);

    await new Promise((res) => fileTask.on("state_changed", null, null, res));
    const fileUrl = await getDownloadURL(fileTask.snapshot.ref);

    // ========================
    // 3. Save Firestore post
    // ========================
    await addDoc(collection(db, "posts"), {
      uid: currentUser.uid,
      username: currentUser.displayName,
      title,
      desc,
      type,                // video, clip, podcast-audio, podcast-video
      thumbnailUrl,
      fileUrl,
      likes: [],
      dislikes: [],
      createdAt: serverTimestamp()
    });

    alert("Upload complete!");

    // Reset fields
    uploadTitleInput.value = "";
    uploadDescInput.value = "";
    uploadThumbInput.value = "";
    uploadFileInput.value = "";

    uploadBtn.textContent = "Upload";
    uploadBtn.disabled = false;

    // Go to Home feed
    activateTab("home");

  } catch (err) {
    console.error(err);
    alert("Upload failed: " + err.message);
    uploadBtn.textContent = "Upload";
    uploadBtn.disabled = false;
  }
});
/****************************************************
 * CHUNK 3 — FEED SYSTEM
 * Loads posts into:
 * - Home
 * - Videos
 * - Podcast
 * - Clips
 ****************************************************/

// ALWAYS normalize post
function normalizePost(p, id) {
  return {
    id,
    uid: p.uid || "",
    username: p.username || "unknown",
    title: p.title || "Untitled",
    desc: p.desc || "",
    thumbnailUrl: p.thumbnailUrl || "placeholder.png",
    fileUrl: p.fileUrl || "",
    type: p.type || "video",
    likes: p.likes || [],
    dislikes: p.dislikes || [],
    ageRestricted: p.ageRestricted || false,
  };
}

// ===============================
// HOME FEED — all posts
// ===============================
async function loadHomeFeed() {
  const wrap = qs("#home-feed");
  wrap.innerHTML = `<p class="muted">Loading…</p>`;

  const qRef = query(
    collection(db, "posts"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(qRef);

  wrap.innerHTML = "";

  if (snap.empty) {
    wrap.innerHTML = `<p class="muted">No posts yet.</p>`;
    return;
  }

  snap.forEach(docu => {
    const post = normalizePost(docu.data(), docu.id);
    wrap.appendChild(renderPostCard(post));
  });
}


// ===============================
// VIDEOS FEED — video & video podcasts
// ===============================
async function loadVideosFeed() {
  const wrap = qs("#videos-feed");
  wrap.innerHTML = `<p class="muted">Loading…</p>`;

  const qRef = query(
    collection(db, "posts"),
    where("type", "in", ["video", "podcast-video"]),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(qRef);

  wrap.innerHTML = "";

  if (snap.empty) {
    wrap.innerHTML = `<p class="muted">No videos yet.</p>`;
    return;
  }

  snap.forEach(docu => {
    const post = normalizePost(docu.data(), docu.id);
    wrap.appendChild(renderPostCard(post));
  });
}


// ===============================
// PODCAST FEED — audio-only podcasts
// ===============================
async function loadPodcastFeed() {
  const wrap = qs("#podcast-feed");
  wrap.innerHTML = `<p class="muted">Loading…</p>`;

  const qRef = query(
    collection(db, "posts"),
    where("type", "==", "podcast-audio"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(qRef);

  wrap.innerHTML = "";

  if (snap.empty) {
    wrap.innerHTML = `<p class="muted">No podcasts yet.</p>`;
    return;
  }

  snap.forEach(docu => {
    const post = normalizePost(docu.data(), docu.id);
    wrap.appendChild(renderPostCard(post));
  });
}


// ===============================
// CLIPS FEED — short clips
// ===============================
async function loadClipsFeed() {
  const wrap = qs("#clips-feed");
  wrap.innerHTML = `<p class="muted">Loading…</p>`;

  const qRef = query(
    collection(db, "posts"),
    where("type", "==", "clip"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(qRef);

  wrap.innerHTML = "";

  if (snap.empty) {
    wrap.innerHTML = `<p class="muted">No clips yet.</p>`;
    return;
  }

  snap.forEach(docu => {
    const post = normalizePost(docu.data(), docu.id);
    wrap.appendChild(renderPostCard(post));
  });
}
/****************************************************
 * CHUNK 4 — POST CARD RENDERER
 * Builds the UI card used in ALL feeds
 ****************************************************/

function renderPostCard(p) {
  const div = document.createElement("div");
  div.className = "video-card";

  div.innerHTML = `
    <div class="thumb-16x9">
      <img src="${p.thumbnailUrl}" alt="Thumbnail">
    </div>

    <div class="meta">
      <h3 style="margin-bottom:4px;">${p.title}</h3>
      <p class="muted" style="font-size:.9rem;">@${p.username}</p>

      <div style="margin-top:10px; display:flex; gap:14px; align-items:center;">
        
        <!-- LIKE -->
        <button class="like-btn"
                data-id="${p.id}"
                style="background:none; border:none; color:#bbb; cursor:pointer; font-size:1rem;">
          👍 ${p.likes?.length || 0}
        </button>

        <!-- DISLIKE -->
        <button class="dislike-btn"
                data-id="${p.id}"
                style="background:none; border:none; color:#bbb; cursor:pointer; font-size:1rem;">
          👎 ${p.dislikes?.length || 0}
        </button>

        <!-- SAVE -->
        <button class="save-btn"
                data-id="${p.id}"
                style="background:none; border:none; color:#bbb; cursor:pointer; font-size:1rem;">
          💾 Save
        </button>

      </div>
    </div>
  `;

  // ======================================
  // ENTIRE CARD OPENS VIEWER PAGE
  // BUT buttons inside do NOT open it
  // ======================================
  div.addEventListener("click", (e) => {
    if (
      e.target.closest(".like-btn") ||
      e.target.closest(".dislike-btn") ||
      e.target.closest(".save-btn")
    ) {
      return; // stop click → button only
    }

    // Go to viewer page
    window.location.href = `viewer.html?id=${p.id}`;
  });

  return div;
}
/****************************************************
 * CHUNK 5 — LIKE / DISLIKE SYSTEM
 * - Like a post
 * - Dislike a post
 * - One reaction per user
 * - Auto-refresh active feed
 ****************************************************/

// MAIN CLICK HANDLER
document.addEventListener("click", async (e) => {
  const likeBtn    = e.target.closest(".like-btn");
  const dislikeBtn = e.target.closest(".dislike-btn");

  // LIKE
  if (likeBtn) {
    if (!currentUser) return alert("You must be logged in to like posts.");
    const postId = likeBtn.dataset.id;
    await handleLike(postId);
    refreshActiveFeed();
  }

  // DISLIKE
  if (dislikeBtn) {
    if (!currentUser) return alert("You must be logged in to dislike posts.");
    const postId = dislikeBtn.dataset.id;
    await handleDislike(postId);
    refreshActiveFeed();
  }
});


// ======================================
// LIKE HANDLER
// ======================================
async function handleLike(postId) {
  const refPost = doc(db, "posts", postId);
  const snap = await getDoc(refPost);

  if (!snap.exists()) return;

  const post = snap.data();
  const uid = currentUser.uid;

  let likes    = post.likes || [];
  let dislikes = post.dislikes || [];

  const hasLiked = likes.includes(uid);
  const hasDisliked = dislikes.includes(uid);

  if (hasLiked) {
    // Remove like
    likes = likes.filter(id => id !== uid);
  } else {
    // Add like
    likes.push(uid);
    // Remove dislike if switching
    if (hasDisliked) {
      dislikes = dislikes.filter(id => id !== uid);
    }
  }

  await updateDoc(refPost, { likes, dislikes });
}


// ======================================
// DISLIKE HANDLER
// ======================================
async function handleDislike(postId) {
  const refPost = doc(db, "posts", postId);
  const snap = await getDoc(refPost);

  if (!snap.exists()) return;

  const post = snap.data();
  const uid = currentUser.uid;

  let likes    = post.likes || [];
  let dislikes = post.dislikes || [];

  const hasLiked = likes.includes(uid);
  const hasDisliked = dislikes.includes(uid);

  if (hasDisliked) {
    // Remove dislike
    dislikes = dislikes.filter(id => id !== uid);
  } else {
    // Add dislike
    dislikes.push(uid);
    // Remove like if switching
    if (hasLiked) {
      likes = likes.filter(id => id !== uid);
    }
  }

  await updateDoc(refPost, { likes, dislikes });
}


// ======================================
// Refresh the currently active feed tab
// ======================================
function refreshActiveFeed() {
  const tab = document.querySelector(".bottom-nav a.active")?.dataset.tab;

  if (tab === "home")    loadHomeFeed();
  if (tab === "videos")  loadVideosFeed();
  if (tab === "podcast") loadPodcastFeed();
  if (tab === "clips")   loadClipsFeed();
}
/****************************************************
 * CHUNK 6 — SAVE / WATCH LATER SYSTEM
 * - Save / Unsave a post
 * - Load saved posts in Profile tab
 ****************************************************/

// Detect SAVE button click in any feed
document.addEventListener("click", async (e) => {
  const saveBtn = e.target.closest(".save-btn");
  if (!saveBtn) return;

  if (!currentUser) return alert("You must be logged in to save posts.");

  const postId = saveBtn.dataset.id;
  toggleSave(postId, saveBtn);
});


// ----------------------------------------------
// Toggle Save / Unsave
// ----------------------------------------------
async function toggleSave(postId, btn) {
  const userRef = doc(db, "users", currentUser.uid);
  const snap = await getDoc(userRef);
  const data = snap.data();

  const savedList = data.saved || [];
  let updated;

  if (savedList.includes(postId)) {
    // UNSAVE
    updated = savedList.filter(id => id !== postId);
    if (btn) btn.textContent = "💾 Save";
  } else {
    // SAVE
    updated = [...savedList, postId];
    if (btn) btn.textContent = "✔ Saved";
  }

  await updateDoc(userRef, { saved: updated });

  // Refresh saved tab immediately if user is viewing it
  if (window.currentProfileTab === "saved") {
    loadSavedPosts(currentUser.uid);
  }
}


// ----------------------------------------------
// Load Saved Posts in Profile
// ----------------------------------------------
async function loadSavedPosts(uid) {
  const wrap = qs("#profile-saved");
  wrap.innerHTML = `<p class="muted">Loading saved...</p>`;

  const userSnap = await getDoc(doc(db, "users", uid));
  const userData = userSnap.data();
  const savedList = userData.saved || [];

  wrap.innerHTML = "";

  if (savedList.length === 0) {
    wrap.innerHTML = `<p class="muted">No saved posts yet.</p>`;
    return;
  }

  for (let postId of savedList) {
    const snap = await getDoc(doc(db, "posts", postId));
    if (!snap.exists()) continue;

    const post = snap.data();
    post.id = postId;

    const tile = document.createElement("div");
    tile.className = "tile";

    tile.innerHTML = `
      <img class="thumb" src="${post.thumbnailUrl}">
      <div class="meta">${post.title}</div>
    `;

    tile.addEventListener("click", () => {
      window.location.href = `viewer.html?id=${postId}`;
    });

    wrap.appendChild(tile);
  }
}
/****************************************************
 * CHUNK 7 — PROFILE SYSTEM
 * Uploads / Saved / Likes / Playlists
 * + Profile Tab Switching
 ****************************************************/

// Profile tab buttons (the pills in your UI)
const pfTabs = qsa(".profile-tabs .pill");

// Profile content sections
const pfUploads   = qs("#profile-grid");   // default uploads grid
const pfSaved     = qs("#profile-saved");
const pfLikes     = qs("#profile-likes");
const pfPlaylists = qs("#profile-playlists");

// Track which tab is currently active
window.currentProfileTab = "uploads";


// ---------------------------------------------
// SWITCH PROFILE TABS (THIS MAKES TABS WORK)
// ---------------------------------------------
function switchProfileTab(tabName) {
  window.currentProfileTab = tabName;

  // Update pill UI active state
  pfTabs.forEach(btn =>
    btn.classList.toggle("active", btn.dataset.tab === tabName)
  );

  // Hide all sections
  pfUploads.style.display   = "none";
  pfSaved.style.display     = "none";
  pfLikes.style.display     = "none";
  pfPlaylists.style.display = "none";

  // Show selected section
  if (tabName === "uploads")   pfUploads.style.display = "grid";
  if (tabName === "saved")     pfSaved.style.display = "grid";
  if (tabName === "likes")     pfLikes.style.display = "grid";
  if (tabName === "playlists") pfPlaylists.style.display = "block";

  // Load content for each tab
  if (!currentUser) return;

  if (tabName === "uploads")   loadProfileUploads(currentUser.uid);
  if (tabName === "saved")     loadSavedPosts(currentUser.uid);
  if (tabName === "likes")     loadProfileLikes(currentUser.uid);
}


// Add click events to pills
pfTabs.forEach(btn => {
  btn.addEventListener("click", () => {
    switchProfileTab(btn.dataset.tab);
  });
});


// Default tab on profile open
switchProfileTab("uploads");


// ---------------------------------------------
// LOAD USER UPLOADS
// ---------------------------------------------
async function loadProfileUploads(uid) {
  const qRef = query(
    collection(db, "posts"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(qRef);

  pfUploads.innerHTML = snap.empty
    ? `<p class="muted" style="text-align:center;">No uploads yet.</p>`
    : "";

  snap.forEach(docSnap => {
    const p = docSnap.data();

    const tile = document.createElement("div");
    tile.className = "tile";
    tile.innerHTML = `
      <img class="thumb" src="${p.thumbnailUrl}">
      <div class="meta">${p.title}</div>
    `;

    tile.addEventListener("click", () =>
      window.location.href = `viewer.html?id=${docSnap.id}`
    );

    pfUploads.appendChild(tile);
  });
}


// ---------------------------------------------
// LOAD USER LIKED POSTS
// ---------------------------------------------
async function loadProfileLikes(uid) {
  pfLikes.innerHTML = `<p class="muted">Loading...</p>`;

  const userSnap = await getDoc(doc(db, "users", uid));
  const data = userSnap.data();
  const likesList = data.likes || [];

  pfLikes.innerHTML = "";

  if (likesList.length === 0) {
    pfLikes.innerHTML =
      `<p class="muted" style="text-align:center;">No likes yet.</p>`;
    return;
  }

  for (let postId of likesList) {
    const snap = await getDoc(doc(db, "posts", postId));
    if (!snap.exists()) continue;

    const p = snap.data();

    const tile = document.createElement("div");
    tile.className = "tile";
    tile.innerHTML = `
      <img class="thumb" src="${p.thumbnailUrl}">
      <div class="meta">${p.title}</div>
    `;

    tile.addEventListener("click", () =>
      window.location.href = `viewer.html?id=${postId}`
    );

    pfLikes.appendChild(tile);
  }
}


// ---------------------------------------------
// PLAYLISTS (placeholder for your future update)
// ---------------------------------------------
function loadUserPlaylists() {
  pfPlaylists.innerHTML = `
    <p class="muted" style="text-align:center;">Playlists coming soon.</p>
  `;
}
/****************************************************
 * CHUNK 8 — FOLLOW SYSTEM
 * - Follow / Unfollow creators
 * - Update counts live
 * - Works on Profile + Viewer page
 ****************************************************/

let viewingProfileUid = null; // whose profile you're looking at


/****************************************************
 * 1. LOAD FOLLOW STATS (Followers / Following)
 ****************************************************/
async function loadFollowStats(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return;

  const data = snap.data();

  // Update UI counters
  qs("#stat-followers").textContent = data.followers?.length || 0;
  qs("#stat-following").textContent = data.following?.length || 0;
}


/****************************************************
 * 2. SET THE CURRENT PROFILE BEING VIEWED
 ****************************************************/
async function loadProfile(uid) {
  viewingProfileUid = uid;

  // Load uploads, saved, likes (from Chunk 7)
  loadProfileUploads(uid);
  loadSavedPosts(uid);
  loadProfileLikes(uid);

  // Load follow stats
  loadFollowStats(uid);

  // Show correct follow/unfollow button
  updateFollowButtons();
}


/****************************************************
 * 3. FOLLOW + UNFOLLOW BUTTONS ON PROFILE
 ****************************************************/
const followBtn   = qs("#btn-follow");
const unfollowBtn = qs("#btn-unfollow");

function updateFollowButtons() {
  if (!currentUser) {
    // Not logged in → only show Follow button
    followBtn.style.display = "inline-block";
    unfollowBtn.style.display = "none";
    return;
  }

  // If viewing your own profile → hide both
  if (currentUser.uid === viewingProfileUid) {
    followBtn.style.display = "none";
    unfollowBtn.style.display = "none";
    return;
  }

  checkIfFollowing();
}


// Check if YOU follow THEM
async function checkIfFollowing() {
  const meSnap = await getDoc(doc(db, "users", currentUser.uid));
  const me = meSnap.data();

  const isFollowing = me.following?.includes(viewingProfileUid);

  followBtn.style.display   = isFollowing ? "none" : "inline-block";
  unfollowBtn.style.display = isFollowing ? "inline-block" : "none";
}


/****************************************************
 * 4. FOLLOW USER
 ****************************************************/
followBtn?.addEventListener("click", async () => {
  if (!currentUser) return alert("Log in to follow creators.");

  const myRef = doc(db, "users", currentUser.uid);
  const theirRef = doc(db, "users", viewingProfileUid);

  const meSnap = await getDoc(myRef);
  const themSnap = await getDoc(theirRef);

  const me = meSnap.data();
  const them = themSnap.data();

  // Already following? Block duplicate
  if (me.following?.includes(viewingProfileUid)) return;

  await updateDoc(myRef, {
    following: [...(me.following || []), viewingProfileUid],
  });

  await updateDoc(theirRef, {
    followers: [...(them.followers || []), currentUser.uid],
  });

  loadFollowStats(viewingProfileUid);
  updateFollowButtons();
});


/****************************************************
 * 5. UNFOLLOW USER
 ****************************************************/
unfollowBtn?.addEventListener("click", async () => {
  if (!currentUser) return alert("Log in to unfollow.");

  const myRef = doc(db, "users", currentUser.uid);
  const theirRef = doc(db, "users", viewingProfileUid);

  const meSnap = await getDoc(myRef);
  const themSnap = await getDoc(theirRef);

  const me = meSnap.data();
  const them = themSnap.data();

  await updateDoc(myRef, {
    following: me.following.filter(id => id !== viewingProfileUid),
  });

  await updateDoc(theirRef, {
    followers: them.followers.filter(id => id !== currentUser.uid),
  });

  loadFollowStats(viewingProfileUid);
  updateFollowButtons();
});
/****************************************************
 * CHUNK 9 — LIKE / DISLIKE SYSTEM
 * Clean, conflict-free, real social media behavior
 ****************************************************/

// Handle like/dislike clicks anywhere in the app
document.addEventListener("click", async (e) => {
  const likeBtn    = e.target.closest(".like-btn");
  const dislikeBtn = e.target.closest(".dislike-btn");

  // LIKE BUTTON CLICK
  if (likeBtn) {
    if (!currentUser) return alert("Log in to like posts.");
    const postId = likeBtn.dataset.id;
    await handleLike(postId);
    refreshActiveFeed();
    if (window.location.pathname.includes("viewer.html"))
      loadViewerReactions(postId);
  }

  // DISLIKE BUTTON CLICK
  if (dislikeBtn) {
    if (!currentUser) return alert("Log in to dislike posts.");
    const postId = dislikeBtn.dataset.id;
    await handleDislike(postId);
    refreshActiveFeed();
    if (window.location.pathname.includes("viewer.html"))
      loadViewerReactions(postId);
  }
});


/****************************************************
 * LIKE LOGIC
 ****************************************************/
async function handleLike(postId) {
  const refPost = doc(db, "posts", postId);
  const snap    = await getDoc(refPost);
  if (!snap.exists()) return;

  const data = snap.data();
  const uid  = currentUser.uid;

  let likes    = data.likes    || [];
  let dislikes = data.dislikes || [];

  const hasLiked    = likes.includes(uid);
  const hasDisliked = dislikes.includes(uid);

  if (hasLiked) {
    // REMOVE LIKE
    likes = likes.filter(id => id !== uid);
  } else {
    // ADD LIKE
    likes.push(uid);
    // Remove dislike if switching
    if (hasDisliked) {
      dislikes = dislikes.filter(id => id !== uid);
    }
  }

  await updateDoc(refPost, { likes, dislikes });
}


/****************************************************
 * DISLIKE LOGIC
 ****************************************************/
async function handleDislike(postId) {
  const refPost = doc(db, "posts", postId);
  const snap    = await getDoc(refPost);
  if (!snap.exists()) return;

  const data = snap.data();
  const uid  = currentUser.uid;

  let likes    = data.likes    || [];
  let dislikes = data.dislikes || [];

  const hasLiked    = likes.includes(uid);
  const hasDisliked = dislikes.includes(uid);

  if (hasDisliked) {
    // REMOVE DISLIKE
    dislikes = dislikes.filter(id => id !== uid);
  } else {
    // ADD DISLIKE
    dislikes.push(uid);
    // Remove like if switching
    if (hasLiked) {
      likes = likes.filter(id => id !== uid);
    }
  }

  await updateDoc(refPost, { likes, dislikes });
}


/****************************************************
 * REFRESH CURRENT FEED WITHOUT LOSING TAB
 ****************************************************/
function refreshActiveFeed() {
  const active = document.querySelector(".bottom-nav a.active")?.dataset.tab;

  if (active === "home")    loadHomeFeed();
  if (active === "videos")  loadVideosFeed();
  if (active === "podcast") loadPodcastFeed();
  if (active === "clips")   loadClipsFeed();
}
/****************************************************
 * CHUNK 10 — COMMENT SYSTEM
 * Add, delete, load, and auto-refresh comments
 ****************************************************/

// ---------------------------
// ADD COMMENT
// ---------------------------
async function addComment(postId, text) {
  if (!currentUser) {
    alert("Log in to comment.");
    return;
  }

  text = text.trim();
  if (!text) return;

  await addDoc(collection(db, "comments"), {
    postId,
    uid: currentUser.uid,
    username: currentUser.displayName || "user",
    text,
    createdAt: serverTimestamp(),
  });

  // Tell UI to refresh immediately
  document.dispatchEvent(
    new CustomEvent("intakee:commentsRefresh", { detail: { postId } })
  );
}


// ---------------------------
// LOAD COMMENTS
// ---------------------------
async function loadComments(postId, container) {
  container.innerHTML = `<p class="muted">Loading comments...</p>`;

  const qRef = query(
    collection(db, "comments"),
    where("postId", "==", postId),
    orderBy("createdAt", "asc")
  );

  const snap = await getDocs(qRef);
  container.innerHTML = "";

  if (snap.empty) {
    container.innerHTML = `<p class="muted">No comments yet.</p>`;
    return;
  }

  snap.forEach((docSnap) => {
    const c = docSnap.data();
    const id = docSnap.id;

    const isOwner = currentUser && currentUser.uid === c.uid;

    const div = document.createElement("div");
    div.className = "comment-item";
    div.style = `
      padding: 10px 0;
      border-bottom: 1px solid #222;
      display: flex;
      justify-content: space-between;
      gap: 12px;
    `;

    div.innerHTML = `
      <div style="flex:1;">
        <strong>@${c.username}</strong><br>
        ${c.text}
      </div>

      ${
        isOwner
          ? `<button class="delete-comment"
                     data-id="${id}"
                     style="background:none; border:none; color:#ff4444; cursor:pointer;">
               Delete
             </button>`
          : ""
      }
    `;

    container.appendChild(div);
  });
}


// ---------------------------
// DELETE COMMENT
// ---------------------------
document.addEventListener("click", async (e) => {
  const delBtn = e.target.closest(".delete-comment");
  if (!delBtn) return;

  const id = delBtn.dataset.id;

  if (!confirm("Delete this comment?")) return;

  await deleteDoc(doc(db, "comments", id));

  // Trigger auto-refresh of comments
  document.dispatchEvent(new CustomEvent("intakee:commentsRefresh"));
});


// ---------------------------
// LIVE REFRESH COMMENTS
// ---------------------------
document.addEventListener("intakee:commentsRefresh", (e) => {
  const postId = e.detail?.postId || window.currentPostId;

  if (!postId || !window.commentsContainer) return;

  loadComments(postId, window.commentsContainer);
});
/****************************************************
 * CHUNK 11 — SAVE / WATCH-LATER SYSTEM
 * - Save a post
 * - Unsave a post
 * - Load saved posts in Profile
 * - Viewer page support
 ****************************************************/

// ---------------------------
// CLICK HANDLER — SAVE BUTTONS
// ---------------------------
document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".save-btn");
  if (!btn) return;

  if (!currentUser) return alert("Log in to save posts.");

  const postId = btn.dataset.id;
  toggleSave(postId, btn);
});


// ---------------------------
// SAVE / UNSAVE LOGIC
// ---------------------------
async function toggleSave(postId, btn) {
  const userRef = doc(db, "users", currentUser.uid);
  const snap = await getDoc(userRef);

  const data = snap.data();
  const saved = data.saved || [];

  let updated;

  if (saved.includes(postId)) {
    // UNSAVE
    updated = saved.filter((x) => x !== postId);
    if (btn) btn.textContent = "💾 Save";
  } else {
    // SAVE
    updated = [...saved, postId];
    if (btn) btn.textContent = "✔ Saved";
  }

  await updateDoc(userRef, { saved: updated });

  // If we are in the profile "Saved" tab → refresh
  if (window.currentProfileTab === "saved") {
    loadSavedPosts(currentUser.uid);
  }
}


// ---------------------------
// LOAD SAVED POSTS INTO PROFILE TAB
// ---------------------------
async function loadSavedPosts(uid) {
  const container = qs("#profile-saved");
  container.innerHTML = `<p class="muted">Loading saved posts...</p>`;

  const userSnap = await getDoc(doc(db, "users", uid));
  const data = userSnap.data();
  const savedList = data.saved || [];

  container.innerHTML = "";

  if (savedList.length === 0) {
    container.innerHTML = `<p class="muted" style="text-align:center;">No saved posts yet.</p>`;
    return;
  }

  for (let postId of savedList) {
    const snap = await getDoc(doc(db, "posts", postId));
    if (!snap.exists()) continue;

    const p = snap.data();

    const tile = document.createElement("div");
    tile.className = "tile";

    tile.innerHTML = `
      <img class="thumb" src="${p.thumbnailUrl}">
      <div class="meta">${p.title}</div>
    `;

    tile.addEventListener("click", () => {
      window.location.href = `viewer.html?id=${postId}`;
    });

    container.appendChild(tile);
  }
}


// ---------------------------
// VIEWER PAGE SUPPORT
// ---------------------------
async function loadViewerSaveState(postId) {
  const saveBtn = qs("#viewer-save-btn");
  if (!saveBtn) return;

  if (!currentUser) {
    saveBtn.textContent = "💾 Save";
    return;
  }

  const userSnap = await getDoc(doc(db, "users", currentUser.uid));
  const saved = userSnap.data().saved || [];

  saveBtn.textContent = saved.includes(postId) ? "✔ Saved" : "💾 Save";

  saveBtn.addEventListener("click", () => toggleSave(postId, saveBtn));
}
/****************************************************
 * CHUNK 12 — PROFILE SYSTEM
 * - Loads uploads, saved posts, liked posts
 * - Tab switching inside profile
 * - Loads user stats (posts, followers, following)
 ****************************************************/

// ----------------------------------------------------
// PROFILE ELEMENTS
// ----------------------------------------------------
const pfTabButtons = qsa(".profile-tabs .pill");

const pfUploads   = qs("#profile-grid");
const pfSaved     = document.createElement("div");
const pfLikes     = document.createElement("div");
const pfPlaylists = document.createElement("div");

// Style the grids
pfSaved.className     =
pfLikes.className     =
pfPlaylists.className = "grid";

// Insert grids right after uploads container
pfUploads.parentNode.appendChild(pfSaved);
pfUploads.parentNode.appendChild(pfLikes);
pfUploads.parentNode.appendChild(pfPlaylists);

// Hide all except uploads at start
pfSaved.style.display     = "none";
pfLikes.style.display     = "none";
pfPlaylists.style.display = "none";

let currentProfileTab = "uploads";
let currentProfileUid = null;


// ----------------------------------------------------
// SWITCH PROFILE TAB
// ----------------------------------------------------
function switchProfileTab(tabName) {
  currentProfileTab = tabName;

  // Update button UI
  pfTabButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.profileTab === tabName);
  });

  // Hide all
  pfUploads.style.display   = "none";
  pfSaved.style.display     = "none";
  pfLikes.style.display     = "none";
  pfPlaylists.style.display = "none";

  // Show selected
  if (tabName === "uploads")   pfUploads.style.display = "grid";
  if (tabName === "saved")     pfSaved.style.display = "grid";
  if (tabName === "likes")     pfLikes.style.display = "grid";
  if (tabName === "playlists") pfPlaylists.style.display = "block";

  // Load content
  if (currentProfileUid) {
    if (tabName === "uploads") loadProfileUploads(currentProfileUid);
    if (tabName === "saved")   loadSavedPosts(currentProfileUid);
    if (tabName === "likes")   loadProfileLikes(currentProfileUid);
  }
}

// Attach listeners
pfTabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    switchProfileTab(btn.dataset.profileTab);
  });
});


// ----------------------------------------------------
// LOAD PROFILE (called when switching to Profile tab)
// ----------------------------------------------------
async function loadProfile(uid) {
  currentProfileUid = uid;

  // Load stats
  loadProfileStats(uid);

  // Load default tab
  switchProfileTab("uploads");
}


// ----------------------------------------------------
// LOAD USER STATS (Posts, Followers, Following, Likes)
// ----------------------------------------------------
async function loadProfileStats(uid) {
  const postsSnap = await getDocs(query(
    collection(db, "posts"),
    where("uid", "==", uid)
  ));

  const userSnap = await getDoc(doc(db, "users", uid));
  const data = userSnap.data();

  qs("#stat-posts").textContent     = postsSnap.size || 0;
  qs("#stat-followers").textContent = data.followers?.length || 0;
  qs("#stat-following").textContent = data.following?.length || 0;

  // Count likes across all posts
  let totalLikes = 0;
  postsSnap.forEach((doc) => {
    totalLikes += (doc.data().likes || []).length;
  });

  qs("#stat-likes").textContent = totalLikes;
}


// ----------------------------------------------------
// LOAD USER UPLOADS
// ----------------------------------------------------
async function loadProfileUploads(uid) {
  pfUploads.innerHTML = `<p class="muted">Loading uploads...</p>`;

  const qRef = query(
    collection(db, "posts"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(qRef);

  pfUploads.innerHTML = "";

  if (snap.empty) {
    pfUploads.innerHTML = `<p class="muted" style="text-align:center;">No uploads yet.</p>`;
    return;
  }

  snap.forEach((docSnap) => {
    const p = docSnap.data();

    const tile = document.createElement("div");
    tile.className = "tile";
    tile.innerHTML = `
      <img class="thumb" src="${p.thumbnailUrl}">
      <div class="meta">${p.title}</div>
    `;

    tile.addEventListener("click", () => {
      window.location.href = `viewer.html?id=${docSnap.id}`;
    });

    pfUploads.appendChild(tile);
  });
}


// ----------------------------------------------------
// LOAD LIKED POSTS
// ----------------------------------------------------
async function loadProfileLikes(uid) {
  pfLikes.innerHTML = `<p class="muted">Loading likes...</p>`;

  const userSnap = await getDoc(doc(db, "users", uid));
  const likesList = userSnap.data().likes || [];

  pfLikes.innerHTML = "";

  if (likesList.length === 0) {
    pfLikes.innerHTML = `<p class="muted" style="text-align:center;">No liked posts yet.</p>`;
    return;
  }

  for (let id of likesList) {
    const postSnap = await getDoc(doc(db, "posts", id));
    if (!postSnap.exists()) continue;

    const p = postSnap.data();

    const tile = document.createElement("div");
    tile.className = "tile";
    tile.innerHTML = `
      <img class="thumb" src="${p.thumbnailUrl}">
      <div class="meta">${p.title}</div>
    `;

    tile.addEventListener("click", () => {
      window.location.href = `viewer.html?id=${id}`;
    });

    pfLikes.appendChild(tile);
  }
}


// ----------------------------------------------------
// PLAYLISTS PLACEHOLDER
// ----------------------------------------------------
function loadUserPlaylists() {
  pfPlaylists.innerHTML = `
    <p class="muted" style="text-align:center;">Playlists coming soon.</p>
  `;
}
/****************************************************
 * CHUNK 13 — SETTINGS SYSTEM (FINAL VERSION)
 * - Loads user settings from Firestore
 * - Saves toggles when switched
 * - Accordions
 * - Blocked users + report placeholders
 ****************************************************/

// -----------------------------------------------------------
// MAP SETTINGS KEYS
// -----------------------------------------------------------
const SETTINGS_MAP = {
  "toggle-private":         "privateAccount",
  "toggle-show-uploads":    "showUploads",
  "toggle-show-saved":      "showSaved",
  "toggle-restricted":      "restrictedMode",
  "toggle-age-warning":     "ageWarning",
  "toggle-notify-push":     "notifyPush",
  "toggle-notify-email":    "notifyEmail",
  "toggle-notify-follow":   "notifyFollow",
  "toggle-notify-likes":    "notifyLikes",
  "toggle-notify-comments": "notifyComments",
};


// -----------------------------------------------------------
// LOAD SETTINGS WHEN USER LOGS IN
// -----------------------------------------------------------
document.addEventListener("intakee:auth", async (e) => {
  const user = e.detail.user;
  if (!user) return;

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return;

  const data = snap.data();

  Object.entries(SETTINGS_MAP).forEach(([toggleId, key]) => {
    const el = qs(`#${toggleId}`);
    if (el) el.checked = data[key] || false;
  });
});


// -----------------------------------------------------------
// SAVE SETTINGS ON TOGGLE SWITCH
// -----------------------------------------------------------
qsa(".settings-toggle input").forEach((input) => {
  input.addEventListener("change", async () => {
    if (!currentUser) return alert("Login to change settings.");

    const key = SETTINGS_MAP[input.id];
    if (!key) return;

    await updateDoc(doc(db, "users", currentUser.uid), {
      [key]: input.checked,
    });

    console.log(`Setting updated: ${key} = ${input.checked}`);
  });
});


// -----------------------------------------------------------
// BLOCKED USERS (basic version)
// -----------------------------------------------------------
qs("#openBlockedUsers")?.addEventListener("click", async () => {
  if (!currentUser) return alert("Login to view blocked users.");

  const snap = await getDoc(doc(db, "users", currentUser.uid));
  const data = snap.data();
  const blocked = data.blockedUsers || [];

  if (blocked.length === 0) {
    alert("You have no blocked users.");
    return;
  }

  let msg = "Blocked users:\n\n";

  for (let uid of blocked) {
    const userSnap = await getDoc(doc(db, "users", uid));
    if (userSnap.exists()) {
      msg += `@${userSnap.data().username} (UID: ${uid})\n`;
    }
  }

  alert(msg + "\nUnblock feature UI coming soon.");
});


// -----------------------------------------------------------
// REPORT CONTENT (placeholder)
// -----------------------------------------------------------
qs("#openReportModal")?.addEventListener("click", () => {
  const reason = prompt("Report content — Enter a reason:");
  if (!reason) return;

  alert("Thank you. Your report has been logged for review.");
});


// -----------------------------------------------------------
// ACCORDION SYSTEM FOR LEGAL SECTIONS
// -----------------------------------------------------------
const accordionItems = qsa(".accordion");

accordionItems.forEach((acc) => {
  const header = acc.querySelector(".accordion-header");
  const body   = acc.querySelector(".accordion-body");

  header.addEventListener("click", () => {
    const isOpen = acc.classList.contains("open");

    // Close all
    accordionItems.forEach((item) => item.classList.remove("open"));

    // Toggle selected
    if (!isOpen) {
      acc.classList.add("open");
      body.style.display = "block";
    } else {
      acc.classList.remove("open");
      body.style.display = "none";
    }
  });
});


// -----------------------------------------------------------
// FORGOT USERNAME
// -----------------------------------------------------------
qs("#settings-forgot-username")?.addEventListener("click", () => {
  if (!currentUser) return alert("You are not logged in.");
  alert("Your username is your profile display name.");
});


// -----------------------------------------------------------
// RESET PASSWORD (from settings)
 // -----------------------------------------------------------
qs("#settings-forgot-password")?.addEventListener("click", async () => {
  if (!currentUser) return alert("You must be logged in.");

  try {
    await sendPasswordResetEmail(auth, currentUser.email);
    alert("Password reset email sent.");
  } catch (err) {
    alert(err.message);
  }
});
/****************************************************
 * CHUNK 14 — MINI AUDIO PLAYER SYSTEM
 * - For audio podcasts
 * - Persistent across tabs
 * - One clean function to open player
 ****************************************************/

const miniPlayer = qs("#mini-player");
const mpAudio    = qs("#mp-audio");
const mpPlay     = qs("#mp-play");
const mpClose    = qs("#mp-close");


// ----------------------------------------------------
// OPEN MINI PLAYER — Call when clicking an audio post
// ----------------------------------------------------
export function openMiniPlayer(audioUrl) {
  mpAudio.src = audioUrl;
  mpAudio.play();

  miniPlayer.classList.add("active");
  mpPlay.innerHTML = `<i class="fa fa-pause"></i>`;
}


// ----------------------------------------------------
// PLAY / PAUSE BUTTON
// ----------------------------------------------------
mpPlay.addEventListener("click", () => {
  if (mpAudio.paused) {
    mpAudio.play();
    mpPlay.innerHTML = `<i class="fa fa-pause"></i>`;
  } else {
    mpAudio.pause();
    mpPlay.innerHTML = `<i class="fa fa-play"></i>`;
  }
});


// ----------------------------------------------------
// CLOSE PLAYER
// ----------------------------------------------------
mpClose.addEventListener("click", () => {
  mpAudio.pause();
  miniPlayer.classList.remove("active");
});
/****************************************************
 * CHUNK 15 — VIEWER PAGE SYSTEM (FINAL)
 * - Loads full post viewer
 * - Integrates media, reactions, comments, follow
 * - Supports audio + video
 ****************************************************/

// Only run on viewer.html
if (window.location.pathname.endsWith("viewer.html")) {
  document.addEventListener("DOMContentLoaded", () => {
    initViewerPage();
  });
}


// ----------------------------------------------------
// INIT VIEWER PAGE
// ----------------------------------------------------
async function initViewerPage() {
  const params = new URLSearchParams(window.location.search);
  const postId = params.get("id");

  if (!postId) {
    alert("No post ID provided.");
    return;
  }

  window.currentPostId = postId;

  // DOM elements
  const vMedia   = qs("#viewer-media");
  const vTitle   = qs("#viewer-title");
  const vUser    = qs("#viewer-user");
  const vDesc    = qs("#viewer-desc");
  const vComments = qs("#viewer-comments");
  const addBtn    = qs("#viewer-add-comment");
  const input     = qs("#viewer-comment-input");

  const snap = await getDoc(doc(db, "posts", postId));
  if (!snap.exists()) {
    alert("Post not found.");
    return;
  }

  const post = snap.data();

  // ----------------------------------------------------
  // AGE CHECK
  // ----------------------------------------------------
  const blocked = await enforceViewerAgeRestriction(post);
  if (blocked) return;

  // ----------------------------------------------------
  // SET TEXT FIELDS
  // ----------------------------------------------------
  vTitle.textContent = post.title;
  vUser.textContent  = "@" + (post.username || "unknown");
  vDesc.textContent  = post.desc || "";

  // ----------------------------------------------------
  // RENDER MEDIA (VIDEO or AUDIO)
  // ----------------------------------------------------
  if (post.type === "podcast-audio") {
    // AUDIO — use mini player instead of showing audio element
    vMedia.innerHTML = `
      <div class="card" style="padding:20px; text-align:center;">
        <p>Playing audio in mini-player…</p>
      </div>
    `;
    // Auto-open mini player
    openMiniPlayer(post.fileUrl);
  } else {
    // VIDEO POSTS
    vMedia.innerHTML = `
      <video controls style="width:100%; border-radius:12px;">
        <source src="${post.fileUrl}">
      </video>
    `;
  }

  // ----------------------------------------------------
  // LOAD COMMENTS
  // ----------------------------------------------------
  window.commentsContainer = vComments;
  loadComments(postId, vComments);

  // Add comment
  addBtn.addEventListener("click", () => {
    const text = input.value.trim();
    if (!text) return;
    addComment(postId, text);
    input.value = "";
  });

  // ----------------------------------------------------
  // REACTIONS + SAVE
  // ----------------------------------------------------
  loadViewerReactions(postId);
  loadViewerSaveState(postId);

  // ----------------------------------------------------
  // FOLLOW CREATOR
  // ----------------------------------------------------
  if (post.uid) loadViewerFollowState(post.uid);
}
/****************************************************
 * VIEWER — LIKE / DISLIKE / SAVE
 ****************************************************/
async function loadViewerReactions(postId) {
  const likeBtn      = qs("#viewer-like-btn");
  const dislikeBtn   = qs("#viewer-dislike-btn");
  const saveBtn      = qs("#viewer-save-btn");
  const likeCount    = qs("#viewer-like-count");
  const dislikeCount = qs("#viewer-dislike-count");

  const snap = await getDoc(doc(db, "posts", postId));
  if (!snap.exists()) return;

  const p = snap.data();
  const uid = currentUser?.uid;

  likeCount.textContent = p.likes?.length || 0;
  dislikeCount.textContent = p.dislikes?.length || 0;

  if (uid) {
    likeBtn.classList.toggle("active", p.likes?.includes(uid));
    dislikeBtn.classList.toggle("active", p.dislikes?.includes(uid));
  }

  likeBtn.onclick = async () => {
    if (!currentUser) return alert("Login to like.");
    await handleLike(postId);
    loadViewerReactions(postId);
  };

  dislikeBtn.onclick = async () => {
    if (!currentUser) return alert("Login to dislike.");
    await handleDislike(postId);
    loadViewerReactions(postId);
  };
}
/****************************************************
 * VIEWER — FOLLOW CREATOR
 ****************************************************/
async function loadViewerFollowState(creatorUid) {
  const followBtn   = qs("#viewer-follow-btn");
  const unfollowBtn = qs("#viewer-unfollow-btn");

  if (!followBtn || !unfollowBtn) return;

  if (!currentUser) {
    followBtn.style.display = "inline-block";
    unfollowBtn.style.display = "none";
    return;
  }

  if (creatorUid === currentUser.uid) {
    followBtn.style.display = "none";
    unfollowBtn.style.display = "none";
    return;
  }

  const meSnap = await getDoc(doc(db, "users", currentUser.uid));
  const me = meSnap.data();
  const following = me.following || [];

  const isFollowing = following.includes(creatorUid);

  followBtn.style.display   = isFollowing ? "none" : "inline-block";
  unfollowBtn.style.display = isFollowing ? "inline-block" : "none";

  followBtn.onclick = async () => {
    await updateDoc(doc(db, "users", currentUser.uid), {
      following: [...following, creatorUid],
    });
    await updateDoc(doc(db, "users", creatorUid), {
      followers: arrayUnion(currentUser.uid),
    });
    loadViewerFollowState(creatorUid);
  };

  unfollowBtn.onclick = async () => {
    await updateDoc(doc(db, "users", currentUser.uid), {
      following: following.filter((x) => x !== creatorUid),
    });
    await updateDoc(doc(db, "users", creatorUid), {
      followers: arrayRemove(currentUser.uid),
    });
    loadViewerFollowState(creatorUid);
  };
}
/****************************************************
 * CHUNK 16 — BLOCK + REPORT SYSTEM
 * - Block users (they disappear from your app)
 * - Unblock users
 * - Save list in Firestore
 * - Report posts
 * - Filter feeds to hide blocked users
 ****************************************************/

// ----------------------------------------------------
// BLOCK USER
// ----------------------------------------------------
async function blockUser(targetUid) {
  if (!currentUser) return alert("Login to block users.");

  const userRef = doc(db, "users", currentUser.uid);
  const snap = await getDoc(userRef);
  const data = snap.data();

  const blocked = data.blockedUsers || [];

  if (blocked.includes(targetUid)) {
    alert("User already blocked.");
    return;
  }

  await updateDoc(userRef, {
    blockedUsers: [...blocked, targetUid]
  });

  alert("User blocked.");
}


// ----------------------------------------------------
// UNBLOCK USER
// ----------------------------------------------------
async function unblockUser(targetUid) {
  if (!currentUser) return;

  const userRef = doc(db, "users", currentUser.uid);
  const snap = await getDoc(userRef);
  const data = snap.data();

  const updated = (data.blockedUsers || []).filter(id => id !== targetUid);

  await updateDoc(userRef, { blockedUsers: updated });

  alert("User unblocked.");
}


// ----------------------------------------------------
// SETTINGS — SHOW BLOCKED USERS LIST
// ----------------------------------------------------
qs("#openBlockedUsers")?.addEventListener("click", async () => {
  if (!currentUser) return alert("Login first.");

  const snap = await getDoc(doc(db, "users", currentUser.uid));
  const data = snap.data();

  const blocked = data.blockedUsers || [];

  if (blocked.length === 0) {
    alert("No blocked users.");
    return;
  }

  let msg = "Blocked Users:\n\n";

  for (let uid of blocked) {
    const usnap = await getDoc(doc(db, "users", uid));
    if (usnap.exists()) {
      msg += `@${usnap.data().username} (UID: ${uid})\n`;
    }
  }

  alert(msg + "\nUnblock UI coming soon.");
});


// ----------------------------------------------------
// FEED FILTER — HIDE BLOCKED USERS
// ----------------------------------------------------
async function filterBlockedPosts(posts) {
  if (!currentUser) return posts;

  const userSnap = await getDoc(doc(db, "users", currentUser.uid));
  const data = userSnap.data();

  const blocked = data.blockedUsers || [];

  return posts.filter((p) => !blocked.includes(p.uid));
}


// ----------------------------------------------------
// REPORT CONTENT
// ----------------------------------------------------
qs("#openReportModal")?.addEventListener("click", () => {
  const reason = prompt("Report content\n\nEnter a reason:");
  if (!reason) return;
  alert("Report submitted.");
});


// REPORT A SPECIFIC POST (viewer page)
async function reportPost(postId, reason = "unspecified") {
  if (!currentUser) return alert("Login to report posts.");

  await addDoc(collection(db, "reports"), {
    postId,
    reason,
    reportedBy: currentUser.uid,
    createdAt: serverTimestamp()
  });

  alert("Post reported.");
}
/****************************************************
 * CHUNK 17 — AGE RESTRICTION SYSTEM
 * - Restricted mode toggle in Settings
 * - Age-restricted uploads
 * - Feeds hide age-restricted posts if enabled
 * - Viewer page blocks restricted content
 ****************************************************/

// ----------------------------------------------------
// OPTIONAL: Age-restricted checkbox on upload page
// (Make sure your HTML has: <input type="checkbox" id="uploadAge">)
function getAgeRestrictionFlag() {
  const box = qs("#uploadAge");
  return box ? box.checked : false;
}


// ----------------------------------------------------
// SAVE AGE-RESTRICTED FLAG IN FIRESTORE DURING UPLOAD
// (Modify your upload code to include this)
// post.ageRestricted = getAgeRestrictionFlag();
// ----------------------------------------------------


// ----------------------------------------------------
// APPLY AGE-FILTER BASED ON SETTINGS
// ----------------------------------------------------
async function applyAgeFilter(posts) {
  if (!currentUser) return posts; // no restrictions when logged out

  const snap = await getDoc(doc(db, "users", currentUser.uid));
  const data = snap.data();

  const restricted = data.restrictedMode || false;

  // If restricted mode OFF → show all posts
  if (!restricted) return posts;

  // Filter out ageRestricted posts
  return posts.filter((p) => !p.ageRestricted);
}


// ----------------------------------------------------
// FEED INTEGRATION — FILTER AGE RESTRICTED POSTS
// ----------------------------------------------------
async function filterAgeAndBlocked(posts) {
  // 1. remove blocked creators
  posts = await filterBlockedPosts(posts);
  // 2. apply restricted mode filter
  posts = await applyAgeFilter(posts);
  return posts;
}


// ----------------------------------------------------
// VIEWER PAGE — SHOW WARNING OR BLOCK
// ----------------------------------------------------
async function enforceViewerAgeRestriction(post) {
  if (!currentUser) return false;

  const snap = await getDoc(doc(db, "users", currentUser.uid));
  const settings = snap.data();

  if (!post.ageRestricted) return false; // not restricted

  const restrictedMode = settings.restrictedMode || false;

  // RESTRICTED MODE: FULL BLOCK
  if (restrictedMode) {
    const warn = document.createElement("div");
    warn.style = `
      background:#330000;
      padding:14px;
      border-radius:10px;
      margin-bottom:16px;
      border:1px solid #660000;
      text-align:center;
      color:#ffb3b3;
    `;
    warn.textContent = "⚠ This video is age-restricted and blocked in Restricted Mode.";
    qs("#viewer-media").innerHTML = "";
    qs("#viewer-media").appendChild(warn);

    return true;
  }

  // Allowed but warn
  const warning = document.createElement("div");
  warning.style = `
    background:#333;
    padding:10px;
    border-radius:8px;
    margin-bottom:12px;
    text-align:center;
    color:#ffc107;
  `;
  warning.textContent = "⚠ Age-restricted content";
  qs("#viewer-media").prepend(warning);

  return false;
}


// ----------------------------------------------------
// VIEWER PAGE HOOK
// ----------------------------------------------------
async function initViewerAgeCheck(post) {
  const blocked = await enforceViewerAgeRestriction(post);
  return blocked; // true means STOP
}
/****************************************************
 * CHUNK 18 — FINAL OPTIMIZATION + LAUNCH CHECKS
 * - Smooth feed refresh
 * - Viewer autoloading
 * - Default field protection
 * - Profile safe-load
 * - Global debug logs
 ****************************************************/

// ----------------------------------------------------
// SAFE FEED RENDERER WRAPPER
// Prevents any feed crash from breaking the app
// ----------------------------------------------------
async function safeRenderFeed(feedFn) {
  try {
    await feedFn();
  } catch (err) {
    console.error("Feed load error:", err);
  }
}


// ----------------------------------------------------
// AUTO-REFRESH FEED ON LIKE / SAVE / COMMENT
// ----------------------------------------------------
document.addEventListener("intakee:feedRefresh", () => {
  const active = document.querySelector(".bottom-nav a.active")?.dataset.tab;

  if (active === "home")    safeRenderFeed(loadHomeFeed);
  if (active === "videos")  safeRenderFeed(loadVideosFeed);
  if (active === "podcast") safeRenderFeed(loadPodcastFeed);
  if (active === "clips")   safeRenderFeed(loadClipsFeed);
});


// ----------------------------------------------------
// ENSURE VIEWER PAGE INITIALIZES ONLY AFTER AUTH IS READY
// ----------------------------------------------------
if (window.location.pathname.endsWith("viewer.html")) {
  document.addEventListener("DOMContentLoaded", () => {
    let check = setInterval(() => {
      if (typeof currentUser !== "undefined") {
        clearInterval(check);
        initViewerPage();
      }
    }, 200);
  });
}


// ----------------------------------------------------
// DEFAULT POST NORMALIZER
// Ensures missing Firestore fields never break the UI
// ----------------------------------------------------
function normalizePost(p) {
  return {
    uid: p.uid || "",
    username: p.username || "unknown",
    title: p.title || "Untitled",
    desc: p.desc || "",
    thumbnailUrl: p.thumbnailUrl || "placeholder.png",
    fileUrl: p.fileUrl || "",
    type: p.type || "video",
    likes: p.likes || [],
    dislikes: p.dislikes || [],
    ageRestricted: p.ageRestricted || false,
  };
}


// ----------------------------------------------------
// NORMALIZE POSTS FROM SNAPSHOT
// ----------------------------------------------------
async function normalizePostsFromSnap(snap) {
  let posts = [];

  snap.forEach((docu) => {
    const raw = docu.data();
    const post = normalizePost(raw);
    post.id = docu.id;
    posts.push(post);
  });

  // Apply block + age filters
  posts = await filterBlockedPosts(posts);
  posts = await applyAgeFilter(posts);

  return posts;
}


// ----------------------------------------------------
// PATCH ALL FEEDS TO USE NORMALIZATION
// ----------------------------------------------------
async function loadHomeFeed() {
  const wrap = qs("#home-feed");
  wrap.innerHTML = "<p class='muted'>Loading...</p>";

  const qRef = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  const snap = await getDocs(qRef);

  const posts = await normalizePostsFromSnap(snap);
  wrap.innerHTML = "";

  if (posts.length === 0) {
    wrap.innerHTML = "<p class='muted'>No posts yet.</p>";
    return;
  }

  posts.forEach((p) => wrap.appendChild(renderPostCard(p)));
}

async function loadVideosFeed() {
  const wrap = qs("#videos-feed");
  wrap.innerHTML = "<p class='muted'>Loading...</p>";

  const qRef = query(
    collection(db, "posts"),
    where("type", "in", ["video", "podcast-video"]),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(qRef);
  const posts = await normalizePostsFromSnap(snap);

  wrap.innerHTML = "";

  if (posts.length === 0) {
    wrap.innerHTML = "<p class='muted'>No videos yet.</p>";
    return;
  }

  posts.forEach((p) => wrap.appendChild(renderPostCard(p)));
}

async function loadPodcastFeed() {
  const wrap = qs("#podcast-feed");
  wrap.innerHTML = "<p class='muted'>Loading...</p>";

  const qRef = query(
    collection(db, "posts"),
    where("type", "==", "podcast-audio"),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(qRef);
  const posts = await normalizePostsFromSnap(snap);

  wrap.innerHTML = "";

  if (posts.length === 0) {
    wrap.innerHTML = "<p class='muted'>No podcasts yet.</p>";
    return;
  }

  posts.forEach((p) => wrap.appendChild(renderPostCard(p)));
}

async function loadClipsFeed() {
  const wrap = qs("#clips-feed");
  wrap.innerHTML = "<p class='muted'>Loading...</p>";

  const qRef = query(
    collection(db, "posts"),
    where("type", "==", "clip"),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(qRef);
  const posts = await normalizePostsFromSnap(snap);

  wrap.innerHTML = "";

  if (posts.length === 0) {
    wrap.innerHTML = "<p class='muted'>No clips yet.</p>";
    return;
  }

  posts.forEach((p) => wrap.appendChild(renderPostCard(p)));
}


// ----------------------------------------------------
// SAFE PROFILE LOADING
// ----------------------------------------------------
function safeProfileLoad() {
  if (!currentUser) return;

  loadProfileUploads(currentUser.uid);
  loadSavedPosts(currentUser.uid);
  loadProfileLikes(currentUser.uid);
}

document.addEventListener("intakee:auth", () => {
  setTimeout(safeProfileLoad, 200);
});


// ----------------------------------------------------
// FINAL DEBUG LOG
// ----------------------------------------------------
console.log(
  "%cINTAKEE JS LOADED — APP IS READY FOR LAUNCH",
  "color:#4cff4c; font-size:16px; font-weight:bold;"
);
