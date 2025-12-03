/****************************************************
 * INTAKEE — MASTER SCRIPT.JS (FINAL BUILD)
 * Part 1 — Firebase Init + Auth + Tabs
 ****************************************************/

// ============ FIREBASE IMPORTS ============

import { initializeApp } 
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import { 
  getAuth, onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import { 
  getFirestore, doc, setDoc, getDoc, updateDoc,
  addDoc, getDocs, collection, serverTimestamp,
  query, where, orderBy, arrayUnion, arrayRemove
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  getStorage, ref, uploadBytesResumable, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";


// ============ FIREBASE CONFIG ============

const firebaseConfig = {
  apiKey: "AIzaSyD0_tL8PxUvGT7JqCBj3tuL7s3Kipl5E6g",
  authDomain: "intakee-5785e.firebaseapp.com",
  projectId: "intakee-5785e",
  storageBucket: "intakee-5785e.firebasestorage.app",
  messagingSenderId: "40666230072",
  appId: "1:40666230072:web:3e3875043b11d795b565cd",
  measurementId: "G-3319X7HL9G"
};


// ============ INIT SERVICES ============

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);


// ============ UTIL SHORTCUTS ============

const qs = (x) => document.querySelector(x);
const qsa = (x) => document.querySelectorAll(x);
let currentUser = null;


// ============ AUTH STATE LISTENER ============

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

  document.dispatchEvent(new CustomEvent("intakee:auth", { detail: { user } }));
});


// ============ LOGIN / SIGNUP / LOGOUT ============

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


// ============ TAB SWITCHING ============

const tabs = qsa(".bottom-nav a");

const sections = {
  home: qs("#tab-home"),
  videos: qs("#tab-videos"),
  podcast: qs("#tab-podcast"),
  upload: qs("#tab-upload"),
  clips: qs("#tab-clips"),
  profile: qs("#tab-profile"),
  settings: qs("#tab-settings"),
};

function showTab(name) {
  Object.values(sections).forEach(sec => sec.style.display = "none");
  sections[name].style.display = "block";

  tabs.forEach(t =>
    t.classList.toggle("active", t.dataset.tab === name)
  );

  if (name === "home")    loadHomeFeed();
  if (name === "videos")  loadVideosFeed();
  if (name === "podcast") loadPodcastFeed();
  if (name === "clips")   loadClipsFeed();
  if (name === "profile" && currentUser) loadProfile(currentUser.uid);
}

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

showTab("home");  // default tab
/****************************************************
 * PART 2 — UPLOAD SYSTEM (FINAL)
 * Handles:
 * - Upload thumbnail
 * - Upload media file
 * - Create Firestore post
 * - Allowed types: video, clip, podcast-audio, podcast-video
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
    // 2. Upload media file
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
      username: currentUser.displayName || currentUser.email.split("@")[0],
      title,
      desc,
      type,                // video, clip, podcast-audio, podcast-video
      thumbnailUrl,
      fileUrl,
      likes: [],
      dislikes: [],
      ageRestricted: false, // you can add this later
      createdAt: serverTimestamp()
    });

    alert("Upload complete!");

    uploadTitleInput.value = "";
    uploadDescInput.value = "";
    uploadThumbInput.value = "";
    uploadFileInput.value = "";

    uploadBtn.textContent = "Upload";
    uploadBtn.disabled = false;

    // return to home feed
    showTab("home");

  } catch (err) {
    console.error(err);
    alert("Upload failed: " + err.message);
    uploadBtn.textContent = "Upload";
    uploadBtn.disabled = false;
  }
});
/****************************************************
 * PART 3 — FEED SYSTEM (Home, Videos, Podcast, Clips)
 * Loads posts from Firestore and displays them in:
 * - home-feed
 * - videos-feed
 * - podcast-feed
 * - clips-feed
 * Opens viewer.html?id=POST_ID when a post is clicked
 ****************************************************/

async function loadFeed(targetId, filterType = null) {
  const feedEl = qs(`#${targetId}`);
  feedEl.innerHTML = `<p class="muted">Loading...</p>`;

  let qRef;

  if (filterType) {
    // Filter by type (video, clip, podcast-audio, podcast-video)
    qRef = query(
      collection(db, "posts"),
      where("type", "==", filterType),
      orderBy("createdAt", "desc")
    );
  } else {
    // All posts for Home feed
    qRef = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc")
    );
  }

  const snap = await getDocs(qRef);

  if (snap.empty) {
    feedEl.innerHTML = `<p class="muted">No posts yet.</p>`;
    return;
  }

  feedEl.innerHTML = ""; // Clear old content

  snap.forEach((docSnap) => {
    const post = docSnap.data();
    const postId = docSnap.id;

    const card = document.createElement("div");
    card.className = "card";

    // Thumbnail container
    card.innerHTML = `
      <img src="${post.thumbnailUrl}" 
           style="width:100%;border-radius:10px;object-fit:cover;max-height:240px;">

      <h3 style="margin:10px 0 6px 0;">${post.title}</h3>

      <p class="muted" style="font-size:14px;">
        @${post.username || "user"} • ${post.type.replace("-", " ")}
      </p>
    `;

    // Click to open viewer
    card.addEventListener("click", () => {
      window.location.href = `viewer.html?id=${postId}`;
    });

    feedEl.appendChild(card);
  });
}


/****************************************************
 * INDIVIDUAL FEED LOADERS
 ****************************************************/

function loadHomeFeed() {
  loadFeed("home-feed", null); // all posts
}

function loadVideosFeed() {
  loadFeed("videos-feed", "video");
}

function loadPodcastFeed() {
  // Load both audio + video podcasts
  loadFeed("podcast-feed", "podcast-audio");
  loadFeed("podcast-feed", "podcast-video");
}

function loadClipsFeed() {
  loadFeed("clips-feed", "clip");
}
/****************************************************
 * PART 4 — REAL TAB SWITCHING SYSTEM
 * Controls navigation between:
 * home, videos, podcast, upload, clips, profile, settings
 ****************************************************/

const sections = {
  home: qs("#tab-home"),
  videos: qs("#tab-videos"),
  podcast: qs("#tab-podcast"),
  upload: qs("#tab-upload"),
  clips: qs("#tab-clips"),
  profile: qs("#tab-profile"),
  settings: qs("#tab-settings")
};

const tabButtons = document.querySelectorAll(".bottom-nav a");

/** Hide ALL tabs */
function hideAllTabs() {
  Object.values(sections).forEach(sec => {
    if (sec) sec.style.display = "none";
  });
}

/** Activate a specific tab */
function activateTab(tabName) {
  // Update active button style
  tabButtons.forEach(btn =>
    btn.classList.toggle("active", btn.dataset.tab === tabName)
  );

  hideAllTabs();
  sections[tabName].style.display = "block";

  // Load correct feed
  if (tabName === "home") loadHomeFeed();
  if (tabName === "videos") loadVideosFeed();
  if (tabName === "podcast") loadPodcastFeed();
  if (tabName === "clips") loadClipsFeed();

  // Load logged-in profile
  if (tabName === "profile" && currentUser) {
    loadProfile(currentUser.uid);
  }
}

/** Handle click on bottom nav */
tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;

    // Upload is protected
    if (tab === "upload" && !currentUser) {
      alert("Login to upload.");
      return;
    }

    activateTab(tab);
  });
});

// Default starting page
activateTab("home");
/****************************************************
 * PART 5 — AUTHENTICATION SYSTEM
 * Signup / Login / Logout / Delete / Forgot Password
 ****************************************************/

// Firebase Auth refs
const authDialog = qs("#authDialog");
const openAuthBtn = qs("#openAuth");

const signupEmail = qs("#signupEmail");
const signupPassword = qs("#signupPassword");
const signupUsername = qs("#signupUsername");
const signupAgeConfirm = qs("#signupAgeConfirm");
const signupBtn = qs("#signupBtn");

const loginEmail = qs("#loginEmail");
const loginPassword = qs("#loginPassword");
const loginBtn = qs("#loginBtn");

const forgotBtn = qs("#forgotBtn");

const logoutBtn = qs("#settings-logout");
const deleteAccountBtn = qs("#settings-delete-account");

let globalUser = null;

/****************************************************
 * OPEN / CLOSE AUTH POPUP
 ****************************************************/
openAuthBtn?.addEventListener("click", () => {
  authDialog.showModal();
});

/****************************************************
 * SIGN UP USER
 ****************************************************/
import {
  createUserWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

signupBtn.addEventListener("click", async () => {
  const email = signupEmail.value.trim();
  const pass = signupPassword.value.trim();
  const uname = signupUsername.value.trim();

  if (!signupAgeConfirm.checked) return alert("You must be 13 or older.");
  if (!email || !pass || !uname) return alert("Fill all fields.");

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);

    // Set display name
    await updateProfile(cred.user, { displayName: uname });

    // Create Firestore profile
    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid,
      email,
      username: uname,
      profilePhotoUrl: "",
      bannerUrl: "",
      bio: "",
      followers: [],
      following: [],
      saved: [],
      private: false,
      createdAt: Date.now()
    });

    alert("Account created!");
    authDialog.close();
  } catch (err) {
    alert(err.message);
  }
});

/****************************************************
 * LOGIN USER
 ****************************************************/
import {
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

loginBtn.addEventListener("click", async () => {
  const email = loginEmail.value.trim();
  const pass = loginPassword.value.trim();

  try {
    await signInWithEmailAndPassword(auth, email, pass);
    alert("Logged in!");
    authDialog.close();
  } catch (err) {
    alert(err.message);
  }
});

/****************************************************
 * FORGOT PASSWORD
 ****************************************************/
forgotBtn.addEventListener("click", async () => {
  const email = prompt("Enter your email:");
  if (!email) return;

  try {
    await sendPasswordResetEmail(auth, email);
    alert("Password reset email sent.");
  } catch (err) {
    alert(err.message);
  }
});

/****************************************************
 * LOGOUT
 ****************************************************/
logoutBtn?.addEventListener("click", async () => {
  await auth.signOut();
  alert("Logged out.");
  activateTab("home");
});

/****************************************************
 * DELETE ACCOUNT
 ****************************************************/
import {
  deleteUser
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

deleteAccountBtn?.addEventListener("click", async () => {
  if (!confirm("Are you sure? This cannot be undone.")) return;

  if (!globalUser) return alert("No user.");

  try {
    await deleteDoc(doc(db, "users", globalUser.uid));
    await deleteUser(globalUser);

    alert("Account deleted.");
    activateTab("home");
  } catch (err) {
    alert(err.message);
  }
});

/****************************************************
 * AUTH STATE LISTENER
 ****************************************************/
onAuthStateChanged(auth, async (user) => {
  globalUser = user;

  if (user) {
    openAuthBtn.textContent = "Profile";
  } else {
    openAuthBtn.textContent = "Login";
  }
});
/****************************************************
 * PART 6 — UPLOAD SYSTEM
 * Upload Videos, Clips, Podcasts (audio or video)
 * Thumbnail + File Upload to Firebase Storage
 * Save Post in Firestore
 ****************************************************/

// Upload elements
const uploadTypeSelect  = qs("#uploadTypeSelect");
const uploadTitleInput  = qs("#uploadTitleInput");
const uploadDescInput   = qs("#uploadDescInput");
const uploadThumbInput  = qs("#uploadThumbInput");
const uploadFileInput   = qs("#uploadFileInput");
const uploadBtn         = qs("#btnUpload");

import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const storage = getStorage(app);

/****************************************************
 * VALIDATE UPLOAD
 ****************************************************/
function validateUpload() {
  if (!globalUser) {
    alert("You must log in to upload.");
    activateTab("profile");
    return false;
  }

  if (!uploadTitleInput.value.trim()) {
    alert("Title is required.");
    return false;
  }

  if (!uploadFileInput.files[0]) {
    alert("Upload a video or audio file.");
    return false;
  }

  if (!uploadThumbInput.files[0]) {
    alert("Upload a thumbnail image.");
    return false;
  }

  return true;
}

/****************************************************
 * UPLOAD FILE TO STORAGE
 ****************************************************/
async function uploadToStorage(file, path) {
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file);
  return await getDownloadURL(fileRef);
}

/****************************************************
 * MAIN UPLOAD HANDLER
 ****************************************************/
uploadBtn.addEventListener("click", async () => {
  if (!validateUpload()) return;

  const title = uploadTitleInput.value.trim();
  const desc  = uploadDescInput.value.trim();
  const type  = uploadTypeSelect.value;

  const mediaFile = uploadFileInput.files[0];
  const thumbFile = uploadThumbInput.files[0];

  const postId = `${globalUser.uid}_${Date.now()}`;

  uploadBtn.disabled = true;
  uploadBtn.textContent = "Uploading...";

  try {
    // Upload media
    const mediaUrl = await uploadToStorage(
      mediaFile,
      `posts/${postId}/media_${mediaFile.name}`
    );

    // Upload thumbnail
    const thumbUrl = await uploadToStorage(
      thumbFile,
      `posts/${postId}/thumb_${thumbFile.name}`
    );

    // Save in Firestore
    await setDoc(doc(db, "posts", postId), {
      id: postId,
      uid: globalUser.uid,
      title,
      desc,
      type,
      fileUrl: mediaUrl,
      thumbUrl: thumbUrl,
      createdAt: Date.now(),
      likes: [],
      dislikes: [],
      views: 0,
      comments: 0
    });

    alert("Uploaded successfully!");

    // Reset UI
    uploadTitleInput.value = "";
    uploadDescInput.value  = "";
    uploadFileInput.value  = "";
    uploadThumbInput.value = "";

    // Go to viewer
    window.location.href = `viewer.html?id=${postId}`;

  } catch (err) {
    alert("Upload failed: " + err.message);
  }

  uploadBtn.disabled = false;
  uploadBtn.textContent = "Upload";
});
/****************************************************
 * PART 7 — FEED SYSTEM
 * Loads all posts from Firestore
 * Filters by type: video, podcast, clip, audio
 * Works with viewer.html
 ****************************************************/

import {
  collection, query, orderBy, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const homeFeed   = qs("#home-feed");
const videosFeed = qs("#videos-feed");
const podcastFeed = qs("#podcast-feed");
const clipsFeed  = qs("#clips-feed");

/****************************************************
 * RENDER SMALL CARD FOR FEEDS
 ****************************************************/
function renderPostCard(post) {
  const div = document.createElement("div");
  div.className = "card";
  div.style.cursor = "pointer";

  div.innerHTML = `
    <img src="${post.thumbUrl}" style="width:100%; border-radius:12px;">

    <h3 style="margin:10px 0;">${post.title}</h3>

    <p class="muted">@${post.uid.substring(0,6)}</p>
  `;

  div.onclick = () => {
    window.location.href = `viewer.html?id=${post.id}`;
  };

  return div;
}

/****************************************************
 * LOAD ALL POSTS
 ****************************************************/
async function loadAllPosts() {
  const qRef = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  const snap = await getDocs(qRef);

  let posts = [];
  snap.forEach(doc => {
    posts.push(doc.data());
  });

  return posts;
}

/****************************************************
 * LOAD HOME FEED (Everything)
 ****************************************************/
async function loadHomeFeed() {
  homeFeed.innerHTML = "<p class='muted'>Loading…</p>";

  const posts = await loadAllPosts();
  homeFeed.innerHTML = "";

  if (posts.length === 0) {
    homeFeed.innerHTML = "<p class='muted'>No posts yet.</p>";
    return;
  }

  posts.forEach(p => homeFeed.appendChild(renderPostCard(p)));
}

/****************************************************
 * LOAD VIDEOS FEED
 ****************************************************/
async function loadVideosFeed() {
  videosFeed.innerHTML = "<p class='muted'>Loading…</p>";

  const posts = await loadAllPosts();
  videosFeed.innerHTML = "";

  const filtered = posts.filter(p => p.type === "video");

  if (filtered.length === 0) {
    videosFeed.innerHTML = "<p class='muted'>No videos yet.</p>";
    return;
  }

  filtered.forEach(p => videosFeed.appendChild(renderPostCard(p)));
}

/****************************************************
 * LOAD PODCAST FEED
 ****************************************************/
async function loadPodcastFeed() {
  podcastFeed.innerHTML = "<p class='muted'>Loading…</p>";

  const posts = await loadAllPosts();
  podcastFeed.innerHTML = "";

  const filtered = posts.filter(p => p.type.includes("podcast"));

  if (filtered.length === 0) {
    podcastFeed.innerHTML = "<p class='muted'>No podcasts yet.</p>";
    return;
  }

  filtered.forEach(p => podcastFeed.appendChild(renderPostCard(p)));
}

/****************************************************
 * LOAD CLIPS FEED
 ****************************************************/
async function loadClipsFeed() {
  clipsFeed.innerHTML = "<p class='muted'>Loading…</p>";

  const posts = await loadAllPosts();
  clipsFeed.innerHTML = "";

  const filtered = posts.filter(p => p.type === "clip");

  if (filtered.length === 0) {
    clipsFeed.innerHTML = "<p class='muted'>No clips yet.</p>";
    return;
  }

  filtered.forEach(p => clipsFeed.appendChild(renderPostCard(p)));
}
/****************************************************
 * PART 8 — PROFILE SYSTEM
 * Loads:
 * - Uploads
 * - Saved posts
 * - Liked posts
 * - User stats
 * - Profile edit
 * - Profile picture + banner
 ****************************************************/

const profileGrid       = qs("#profile-grid");
const profileSavedGrid  = qs("#profile-saved");
const profileLikesGrid  = qs("#profile-likes");
const profilePlaylists  = qs("#profile-playlists");

const profileNameEl   = qs("#profile-name");
const profileHandleEl = qs("#profile-handle");
const profileBioEl    = qs("#bio-view");

const profilePhotoEl  = qs("#profile-photo");
const profileBannerEl = qs("#profileBanner");

const statPostsEl     = qs("#stat-posts");
const statFollowersEl = qs("#stat-followers");
const statFollowingEl = qs("#stat-following");
const statLikesEl     = qs("#stat-likes");

const editBtn          = qs("#btn-edit-profile");
const saveProfileBtn   = qs("#btnSaveProfile");
const cancelEditBtn    = qs("#bio-cancel");

const profileNameInput = qs("#profileNameInput");
const profileBioInput  = qs("#profileBioInput");
const profilePhotoInput = qs("#profilePhotoInput");
const profileBannerInput = qs("#profileBannerInput");

let viewingUserId = null;

/****************************************************
 * OPEN PROFILE TAB
 ****************************************************/
async function loadProfile(uid) {
  viewingUserId = uid;

  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return;

  const u = snap.data();

  // Set Name + Username + Bio
  profileNameEl.textContent = u.username || "User";
  profileHandleEl.textContent = "@" + (u.username || "user");
  profileBioEl.textContent = u.bio || "No bio yet.";

  // Photos
  profilePhotoEl.src = u.profilePhotoUrl || "https://via.placeholder.com/100/333/fff?text=User";
  profileBannerEl.style.backgroundImage = u.bannerUrl 
    ? `url(${u.bannerUrl})` 
    : `linear-gradient(45deg,#111,#000)`;

  // Stats
  statPostsEl.textContent     = u.posts?.length || 0;
  statFollowersEl.textContent = u.followers?.length || 0;
  statFollowingEl.textContent = u.following?.length || 0;

  // Count total likes across all posts
  let totalLikes = 0;
  if (u.posts?.length) {
    for (let postId of u.posts) {
      const ps = await getDoc(doc(db,"posts",postId));
      if (ps.exists()) {
        totalLikes += (ps.data().likes?.length || 0);
      }
    }
  }
  statLikesEl.textContent = totalLikes;

  // Owner-only buttons
  if (currentUser && currentUser.uid === uid) {
    document.querySelectorAll(".owner-only").forEach(el => el.style.display = "inline-block");
    editBtn.style.display = "inline-block";
  } else {
    document.querySelectorAll(".owner-only").forEach(el => el.style.display = "none");
    editBtn.style.display = "none";
  }

  loadProfileTabs();
}

/****************************************************
 * PROFILE TABS (Uploads / Saved / Likes / Playlists)
 ****************************************************/
function loadProfileTabs() {
  const pills = document.querySelectorAll(".profile-tabs .pill");

  pills.forEach(pill => {
    pill.onclick = () => {
      pills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");

      const tab = pill.dataset.profileTab;
      showProfileTab(tab);
    };
  });

  showProfileTab("uploads");
}

/****************************************************
 * SHOW TAB CONTENT
 ****************************************************/
async function showProfileTab(tab) {
  profileGrid.style.display       = "none";
  profileSavedGrid.style.display  = "none";
  profileLikesGrid.style.display  = "none";
  profilePlaylists.style.display  = "none";

  if (tab === "uploads") {
    profileGrid.style.display = "grid";
    loadProfileUploads();
  }

  if (tab === "saved") {
    profileSavedGrid.style.display = "grid";
    loadProfileSaved();
  }

  if (tab === "likes") {
    profileLikesGrid.style.display = "grid";
    loadProfileLikes();
  }

  if (tab === "playlists") {
    profilePlaylists.style.display = "block";
  }
}

/****************************************************
 * PROFILE — USER UPLOADS
 ****************************************************/
async function loadProfileUploads() {
  profileGrid.innerHTML = "<p class='muted'>Loading…</p>";

  const postsRef = collection(db, "posts");
  const snap = await getDocs(postsRef);

  profileGrid.innerHTML = "";

  snap.forEach(docSnap => {
    const post = docSnap.data();
    if (post.uid === viewingUserId) {
      profileGrid.appendChild(renderPostCard(post));
    }
  });

  if (profileGrid.innerHTML === "") {
    profileGrid.innerHTML = "<p class='muted'>No uploads yet.</p>";
  }
}

/****************************************************
 * PROFILE — SAVED POSTS
 ****************************************************/
async function loadProfileSaved() {
  profileSavedGrid.innerHTML = "<p class='muted'>Loading…</p>";

  const userSnap = await getDoc(doc(db,"users",viewingUserId));
  const u = userSnap.data();
  const saved = u.saved || [];

  profileSavedGrid.innerHTML = "";

  for (let postId of saved) {
    const ps = await getDoc(doc(db,"posts",postId));
    if (ps.exists()) {
      profileSavedGrid.appendChild(renderPostCard(ps.data()));
    }
  }

  if (profileSavedGrid.innerHTML === "") {
    profileSavedGrid.innerHTML = "<p class='muted'>No saved posts.</p>";
  }
}

/****************************************************
 * PROFILE — LIKED POSTS
 ****************************************************/
async function loadProfileLikes() {
  profileLikesGrid.innerHTML = "<p class='muted'>Loading…</p>";

  const postsRef = collection(db,"posts");
  const snap = await getDocs(postsRef);

  profileLikesGrid.innerHTML = "";

  snap.forEach(docSnap => {
    const post = docSnap.data();
    if (post.likes?.includes(viewingUserId)) {
      profileLikesGrid.appendChild(renderPostCard(post));
    }
  });

  if (profileLikesGrid.innerHTML === "") {
    profileLikesGrid.innerHTML = "<p class='muted'>No liked posts.</p>";
  }
}

/****************************************************
 * EDIT PROFILE
 ****************************************************/
editBtn.onclick = () => {
  qs("#bio-edit-wrap").style.display = "block";
  profileNameInput.value = profileNameEl.textContent;
  profileBioInput.value  = profileBioEl.textContent;
};

cancelEditBtn.onclick = () => {
  qs("#bio-edit-wrap").style.display = "none";
};

saveProfileBtn.onclick = async () => {
  const userRef = doc(db,"users",currentUser.uid);

  const updates = {
    username: profileNameInput.value.trim(),
    bio: profileBioInput.value.trim()
  };

  // Photo upload?
  if (profilePhotoInput.files[0]) {
    const f = profilePhotoInput.files[0];
    const storageRef = ref(storage, `profiles/${currentUser.uid}/photo.jpg`);
    await uploadBytes(storageRef, f);
    updates.profilePhotoUrl = await getDownloadURL(storageRef);
  }

  // Banner upload?
  if (profileBannerInput.files[0]) {
    const f = profileBannerInput.files[0];
    const storageRef = ref(storage, `profiles/${currentUser.uid}/banner.jpg`);
    await uploadBytes(storageRef, f);
    updates.bannerUrl = await getDownloadURL(storageRef);
  }

  await updateDoc(userRef, updates);

  qs("#bio-edit-wrap").style.display = "none";
  loadProfile(currentUser.uid);
};
