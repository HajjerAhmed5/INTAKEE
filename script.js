/****************************************************
 * INTAKEE — FULL APP SCRIPT.JS (ALL FEATURES)
 * Single-file version — Firebase + Auth + Uploads +
 * Feed + Profile + Likes + Comments + Follow + Saved +
 * Search + Settings + Mini Player
 ****************************************************/

// ===================================================
// 1. FIREBASE IMPORTS
// ===================================================
import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  collection,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  orderBy,
  arrayUnion,
  arrayRemove
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";


// ===================================================
// 2. FIREBASE CONFIG
// ===================================================
const firebaseConfig = {
  apiKey: "AIzaSyD0_tL8PxUvGT7JqCBj3tuL7s3Kipl5E6g",
  authDomain: "intakee-5785e.firebaseapp.com",
  projectId: "intakee-5785e",
  storageBucket: "intakee-5785e.firebasestorage.app",
  messagingSenderId: "40666230072",
  appId: "1:40666230072:web:3e3875043b11d795b565cd",
  measurementId: "G-3319X7HL9G"
};


// ===================================================
// 3. INIT SERVICES
// ===================================================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);


// ===================================================
// 4. UTIL SHORTCUTS
// ===================================================
const qs = (x) => document.querySelector(x);
const qsa = (x) => document.querySelectorAll(x);


// ===================================================
// 5. GLOBAL VARS
// ===================================================
let currentUser = null;


// ===================================================
// 6. AUTH LISTENER
// ===================================================
onAuthStateChanged(auth, async (user) => {
  currentUser = user;

  if (user) {
    const uRef = doc(db, "users", user.uid);
    let snap = await getDoc(uRef);

    if (!snap.exists()) {
      await setDoc(uRef, {
        uid: user.uid,
        email: user.email,
        username: user.email.split("@")[0],
        bio: "",
        followers: [],
        following: [],
        saved: [],
        likes: [],
        createdAt: serverTimestamp()
      });
    }

    qs("#openAuth").style.display = "none";
    qs('[data-tab="profile"]').style.display = "flex";
  } else {
    qs("#openAuth").style.display = "block";
  }

  document.dispatchEvent(new CustomEvent("intakee:auth", { detail: { user } }));
});


// ===================================================
// 7. AUTH — SIGNUP / LOGIN / LOGOUT
// ===================================================
const authDialog = qs("#authDialog");

qs("#openAuth").onclick = () => authDialog.showModal();

qs("#signupBtn").onclick = async () => {
  let email = qs("#signupEmail").value.trim();
  let pass  = qs("#signupPassword").value.trim();
  let usern = qs("#signupUsername").value.trim();
  let ageOK = qs("#signupAgeConfirm").checked;

  if (!email || !pass || !usern) return alert("Fill all fields");
  if (!ageOK) return alert("Age confirmation required");

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: usern });

    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid,
      email,
      username: usern,
      bio: "",
      followers: [],
      following: [],
      saved: [],
      likes: [],
      createdAt: serverTimestamp()
    });

    authDialog.close();
  } catch (err) {
    alert(err.message);
  }
};

qs("#loginBtn").onclick = async () => {
  let email = qs("#loginEmail").value.trim();
  let pass  = qs("#loginPassword").value.trim();

  try {
    await signInWithEmailAndPassword(auth, email, pass);
    authDialog.close();
  } catch (err) {
    alert(err.message);
  }
};

qs("#forgotBtn").onclick = async () => {
  let email = qs("#loginEmail").value.trim();
  if (!email) return alert("Enter email first");

  await sendPasswordResetEmail(auth, email);
  alert("Password reset email sent.");
};

qs("#settings-logout").onclick = () => signOut(auth);


// ===================================================
// 8. TAB SWITCHING
// ===================================================
const tabs = qsa(".bottom-nav a");
const sections = {
  home: qs("#tab-home"),
  videos: qs("#tab-videos"),
  podcast: qs("#tab-podcast"),
  upload: qs("#tab-upload"),
  clips: qs("#tab-clips"),
  profile: qs("#tab-profile"),
  settings: qs("#tab-settings")
};

tabs.forEach(btn => {
  btn.addEventListener("click", () => {
    let tab = btn.dataset.tab;

    tabs.forEach(t => t.classList.remove("active"));
    btn.classList.add("active");

    Object.values(sections).forEach(s => s.style.display = "none");
    sections[tab].style.display = "block";

    if (tab === "home") loadHomeFeed();
    if (tab === "videos") loadVideosFeed();
    if (tab === "podcast") loadPodcastFeed();
    if (tab === "clips") loadClipsFeed();
    if (tab === "profile" && currentUser) loadProfile(currentUser.uid);
  });
});


// ===================================================
// 9. UPLOAD SYSTEM
// ===================================================
qs("#btnUpload").onclick = async () => {
  if (!currentUser) return alert("Login required.");

  const type = qs("#uploadTypeSelect").value;
  const title = qs("#uploadTitleInput").value;
  const desc  = qs("#uploadDescInput").value;
  const thumb = qs("#uploadThumbInput").files[0];
  const file  = qs("#uploadFileInput").files[0];

  if (!title || !thumb || !file) return alert("Missing fields");

  // Upload thumbnail
  const tRef = ref(storage, `thumbnails/${Date.now()}-${thumb.name}`);
  const tTask = await uploadBytesResumable(tRef, thumb);
  const thumbURL = await getDownloadURL(tTask.ref);

  // Upload file
  const fRef = ref(storage, `uploads/${Date.now()}-${file.name}`);
  const fTask = await uploadBytesResumable(fRef, file);
  const fileURL = await getDownloadURL(fTask.ref);

  // Save post to Firestore
  await addDoc(collection(db, "posts"), {
    uid: currentUser.uid,
    username: currentUser.displayName,
    title,
    desc,
    type,
    thumbnailUrl: thumbURL,
    fileUrl: fileURL,
    likes: [],
    dislikes: [],
    createdAt: serverTimestamp()
  });

  alert("Upload complete!");
};


// ===================================================
// 10. FEED SYSTEM
// ===================================================
async function loadHomeFeed() {
  const wrap = qs("#home-feed");
  wrap.innerHTML = "";

  const qRef = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  const snap = await getDocs(qRef);

  snap.forEach(docu => {
    const p = docu.data();
    p.id = docu.id;
    wrap.appendChild(renderPostCard(p));
  });
}

async function loadVideosFeed() {
  const wrap = qs("#videos-feed");
  wrap.innerHTML = "";

  const qRef = query(collection(db, "posts"),
    where("type", "in", ["video","podcast-video"]),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(qRef);
  snap.forEach(docu => wrap.appendChild(renderPostCard({ ...docu.data(), id: docu.id })));
}

async function loadPodcastFeed() {
  const wrap = qs("#podcast-feed");
  wrap.innerHTML = "";

  const qRef = query(collection(db, "posts"),
    where("type", "in", ["podcast-audio"]),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(qRef);
  snap.forEach(docu => wrap.appendChild(renderPostCard({ ...docu.data(), id: docu.id })));
}

async function loadClipsFeed() {
  const wrap = qs("#clips-feed");
  wrap.innerHTML = "";

  const qRef = query(collection(db, "posts"),
    where("type", "==", "clip"),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(qRef);
  snap.forEach(docu => wrap.appendChild(renderPostCard({ ...docu.data(), id: docu.id })));
}


// ===================================================
// 11. POST CARD RENDERER
// ===================================================
function renderPostCard(p) {
  const div = document.createElement("div");
  div.className = "video-card";
  div.innerHTML = `
    <div class="thumb-16x9">
      <img src="${p.thumbnailUrl}">
    </div>
    <div class="meta">
      <h3>${p.title}</h3>
      <p class="muted">@${p.username}</p>
      <div style="margin-top:8px; display:flex; gap:12px;">
        <button class="like-btn" data-id="${p.id}">👍 ${p.likes?.length || 0}</button>
        <button class="dislike-btn" data-id="${p.id}">👎 ${p.dislikes?.length || 0}</button>
        <button class="save-btn" data-id="${p.id}">💾 Save</button>
      </div>
    </div>
  `;
  return div;
}


// ===================================================
// 12. LIKE / DISLIKE SYSTEM
// ===================================================
document.addEventListener("click", async (e) => {
  if (e.target.closest(".like-btn")) {
    if (!currentUser) return alert("Login required");
    let id = e.target.dataset.id;
    likePost(id);
  }

  if (e.target.closest(".dislike-btn")) {
    if (!currentUser) return alert("Login required");
    let id = e.target.dataset.id;
    dislikePost(id);
  }
});

async function likePost(id) {
  const refPost = doc(db, "posts", id);
  const snap = await getDoc(refPost);
  let p = snap.data();

  let likes = p.likes || [];
  let dislikes = p.dislikes || [];

  const uid = currentUser.uid;

  if (likes.includes(uid)) {
    likes = likes.filter(x => x !== uid);
  } else {
    likes.push(uid);
    dislikes = dislikes.filter(x => x !== uid);
  }

  await updateDoc(refPost, { likes, dislikes });
  loadHomeFeed();
}

async function dislikePost(id) {
  const refPost = doc(db, "posts", id);
  const snap = await getDoc(refPost);
  let p = snap.data();

  let likes = p.likes || [];
  let dislikes = p.dislikes || [];

  const uid = currentUser.uid;

  if (dislikes.includes(uid)) {
    dislikes = dislikes.filter(x => x !== uid);
  } else {
    dislikes.push(uid);
    likes = likes.filter(x => x !== uid);
  }

  await updateDoc(refPost, { likes, dislikes });
  loadHomeFeed();
}


// ===================================================
// 13. SAVE / UNSAVE POSTS
// ===================================================
document.addEventListener("click", async (e) => {
  if (!e.target.closest(".save-btn")) return;
  if (!currentUser) return alert("Login required");

  const id = e.target.dataset.id;
  const uref = doc(db, "users", currentUser.uid);
  const snap = await getDoc(uref);
  let saved = snap.data().saved || [];

  if (saved.includes(id)) {
    saved = saved.filter(x => x !== id);
  } else {
    saved.push(id);
  }

  await updateDoc(uref, { saved });
  alert("Saved updated");
});


// ===================================================
// 14. PROFILE SYSTEM
// ===================================================
async function loadProfile(uid) {
  const wrapGrid = qs("#profile-grid");
  const emptyMsg = qs("#profile-empty");

  wrapGrid.innerHTML = "";

  const qRef = query(
    collection(db, "posts"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(qRef);

  if (snap.empty) {
    emptyMsg.style.display = "block";
  } else {
    emptyMsg.style.display = "none";
  }

  snap.forEach(docu => {
    const p = docu.data();
    wrapGrid.innerHTML += `
      <div class="tile">
        <img class="thumb" src="${p.thumbnailUrl}">
        <div class="meta">${p.title}</div>
      </div>
    `;
  });
}


// ===================================================
// 15. FOLLOW SYSTEM
// ===================================================
document.addEventListener("click", async (e) => {
  if (!e.target.matches("#btn-follow") &&
      !e.target.matches("#btn-unfollow")) return;

  if (!currentUser) return alert("Login required");

  const viewedUid = currentProfileViewing;
  const myRef = doc(db, "users", currentUser.uid);
  const theirRef = doc(db, "users", viewedUid);

  const mySnap = await getDoc(myRef);
  const theirSnap = await getDoc(theirRef);

  let myData = mySnap.data();
  let themData = theirSnap.data();

  const isFollowing = myData.following?.includes(viewedUid);

  if (isFollowing) {
    await updateDoc(myRef, {
      following: myData.following.filter(x => x !== viewedUid)
    });
    await updateDoc(theirRef, {
      followers: themData.followers.filter(x => x !== currentUser.uid)
    });
  } else {
    await updateDoc(myRef, {
      following: [...(myData.following || []), viewedUid]
    });
    await updateDoc(theirRef, {
      followers: [...(themData.followers || []), currentUser.uid]
    });
  }
});


// ===================================================
// 16. SETTINGS TOGGLES
// ===================================================
qsa(".settings-toggle input").forEach(tog => {
  tog.addEventListener("change", () => {
    console.log(`Toggle changed: ${tog.id} = ${tog.checked}`);
  });
});


// ===================================================
// 17. SEARCH SYSTEM
// ===================================================
qs("#globalSearch").addEventListener("input", async (e) => {
  const term = e.target.value.trim().toLowerCase();
  if (!term) return loadHomeFeed();

  const wrap = qs("#home-feed");
  wrap.innerHTML = "";

  const snap = await getDocs(collection(db, "posts"));

  snap.forEach(docu => {
    const p = docu.data();
    p.id = docu.id;

    if (p.title.toLowerCase().includes(term) ||
        p.username.toLowerCase().includes(term)) {
      wrap.appendChild(renderPostCard(p));
    }
  });
});


// ===================================================
// 18. MINI AUDIO PLAYER
// ===================================================
const mini = qs("#mini-player");
const mpAudio = qs("#mp-audio");
const mpPlay = qs("#mp-play");
const mpClose = qs("#mp-close");

mpPlay.onclick = () => {
  if (mpAudio.paused) {
    mpAudio.play();
    mpPlay.innerHTML = `<i class="fa fa-pause"></i>`;
  } else {
    mpAudio.pause();
    mpPlay.innerHTML = `<i class="fa fa-play"></i>`;
  }
};

mpClose.onclick = () => {
  mpAudio.pause();
  mini.classList.remove("active");
};


// ===================================================
// END OF FILE
// ===================================================
/****************************************************
 * PART 2 — AUTHENTICATION SYSTEM
 * - Sign Up
 * - Login
 * - Logout
 * - Reset Password
 * - User Profile Creation
 * - UI Updates
 ****************************************************/

// AUTH DIALOG
const authDialog = qs("#authDialog");

qs("#openAuth").onclick = () => authDialog.showModal();


// ---------------------------
// SIGN UP
// ---------------------------
qs("#signupBtn").onclick = async () => {
  const email = qs("#signupEmail").value.trim();
  const pass  = qs("#signupPassword").value.trim();
  const usern = qs("#signupUsername").value.trim();
  const ageOK = qs("#signupAgeConfirm").checked;

  if (!email || !pass || !usern) {
    alert("Please fill in all fields.");
    return;
  }
  if (!ageOK) {
    alert("You must confirm you are 13 or older.");
    return;
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);

    // save username to Firebase Auth
    await updateProfile(cred.user, { displayName: usern });

    // create Firestore user doc
    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid,
      email,
      username: usern,
      bio: "",
      followers: [],
      following: [],
      saved: [],
      likes: [],
      createdAt: serverTimestamp()
    });

    alert("Account created!");
    authDialog.close();

  } catch (err) {
    alert(err.message);
  }
};


// ---------------------------
// LOGIN
// ---------------------------
qs("#loginBtn").onclick = async () => {
  const email = qs("#loginEmail").value.trim();
  const pass  = qs("#loginPassword").value.trim();

  if (!email || !pass) {
    alert("Enter email and password.");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, pass);
    authDialog.close();

  } catch (err) {
    alert(err.message);
  }
};


// ---------------------------
// FORGOT PASSWORD
// ---------------------------
qs("#forgotBtn").onclick = async () => {
  const email = qs("#loginEmail").value.trim();
  if (!email) return alert("Enter your email first.");

  try {
    await sendPasswordResetEmail(auth, email);
    alert("Password reset email sent.");
  } catch (err) {
    alert(err.message);
  }
};


// ---------------------------
// LOGOUT
// ---------------------------
qs("#settings-logout").onclick = () => {
  signOut(auth);
};


// ---------------------------
// DELETE ACCOUNT (Settings)
// ---------------------------
qs("#settings-delete-account").onclick = async () => {
  if (!currentUser) return alert("You must be logged in.");

  const confirmDelete = confirm("Are you sure? This cannot be undone.");

  if (!confirmDelete) return;

  try {
    await deleteDoc(doc(db, "users", currentUser.uid));
    await currentUser.delete();
    alert("Account deleted.");
  } catch (err) {
    alert(err.message);
  }
};


// ---------------------------
// AUTH STATE UI UPDATES
// ---------------------------
document.addEventListener("intakee:auth", async (e) => {
  const user = e.detail.user;

  if (user) {
    qs("#openAuth").style.display = "none"; // hide login button
    qs('[data-tab="profile"]').style.display = "flex";
  } else {
    qs("#openAuth").style.display = "block"; // show login button
  }
});
/****************************************************
 * PART 3 — TAB SWITCHING SYSTEM
 * - Controls bottom navigation
 * - Shows correct sections
 * - Loads feeds and profile when switching
 ****************************************************/

// Map tab name -> section element
const SECTIONS = {
  home: qs("#tab-home"),
  videos: qs("#tab-videos"),
  podcast: qs("#tab-podcast"),
  upload: qs("#tab-upload"),
  clips: qs("#tab-clips"),
  profile: qs("#tab-profile"),
  settings: qs("#tab-settings"),
};

// Get all bottom-nav buttons
const tabButtons = qsa(".bottom-nav a");

// Hide all tabs
function hideAllTabs() {
  Object.values(SECTIONS).forEach((sec) => (sec.style.display = "none"));
}

// Activate a tab by name
function activateTab(tabName) {
  // update UI selected state
  tabButtons.forEach((btn) =>
    btn.classList.toggle("active", btn.dataset.tab === tabName)
  );

  // hide all sections
  hideAllTabs();

  // show selected
  SECTIONS[tabName].style.display = "block";

  // load content
  if (tabName === "home") loadHomeFeed();
  if (tabName === "videos") loadVideosFeed();
  if (tabName === "podcast") loadPodcastFeed();
  if (tabName === "clips") loadClipsFeed();
  if (tabName === "profile" && currentUser) loadProfile(currentUser.uid);
}

// Bottom-nav clicking
tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;

    // Upload tab must be logged in
    if (tab === "upload" && !currentUser) {
      alert("You must be logged in to upload.");
      return;
    }

    activateTab(tab);
  });
});

// default screen
activateTab("home");
/****************************************************
 * PART 4 — UPLOAD SYSTEM
 * - Upload video / clip / podcast
 * - Upload thumbnail
 * - Store in Firebase Storage
 * - Save Firestore post document
 ****************************************************/

const uploadTypeSelect = qs("#uploadTypeSelect");
const uploadTitleInput = qs("#uploadTitleInput");
const uploadDescInput  = qs("#uploadDescInput");
const uploadThumbInput = qs("#uploadThumbInput");
const uploadFileInput  = qs("#uploadFileInput");
const uploadBtn        = qs("#btnUpload");

// MAIN UPLOAD HANDLER
uploadBtn.onclick = async () => {
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
    alert("Please fill all upload fields (title, thumbnail, file).");
    return;
  }

  try {
    uploadBtn.disabled = true;
    uploadBtn.textContent = "Uploading...";

    // ------------------------------
    // 1. Upload thumbnail
    // ------------------------------
    const thumbRef = ref(storage, `thumbnails/${Date.now()}-${thumb.name}`);
    const thumbTask = uploadBytesResumable(thumbRef, thumb);

    await new Promise((resolve) => {
      thumbTask.on("state_changed", null, null, resolve);
    });

    const thumbnailUrl = await getDownloadURL(thumbTask.snapshot.ref);

    // ------------------------------
    // 2. Upload actual media file
    // ------------------------------
    const fileRef = ref(storage, `uploads/${Date.now()}-${file.name}`);
    const fileTask = uploadBytesResumable(fileRef, file);

    await new Promise((resolve) => {
      fileTask.on("state_changed", null, null, resolve);
    });

    const fileUrl = await getDownloadURL(fileTask.snapshot.ref);

    // ------------------------------
    // 3. Save Firestore document
    // ------------------------------
    await addDoc(collection(db, "posts"), {
      uid: currentUser.uid,
      username: currentUser.displayName,
      title,
      desc,
      type,                 // "video", "clip", "podcast-audio", "podcast-video"
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

    uploadBtn.disabled = false;
    uploadBtn.textContent = "Upload";

    // Go back to home feed
    activateTab("home");

  } catch (err) {
    console.error(err);
    alert("Upload failed: " + err.message);
    uploadBtn.disabled = false;
    uploadBtn.textContent = "Upload";
  }
};
/****************************************************
 * PART 5 — FEED SYSTEM
 * - Loads posts into Home, Videos, Podcast, Clips tabs
 * - Sorts by newest
 * - Uses renderPostCard() to build UI
 ****************************************************/

// MAIN FEED LOADERS (called when switching tabs)

// ---------------------------------------------
// HOME FEED (all post types)
// ---------------------------------------------
async function loadHomeFeed() {
  const wrap = qs("#home-feed");
  wrap.innerHTML = `<p class="muted">Loading...</p>`;

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

  snap.forEach((docu) => {
    const post = docu.data();
    post.id = docu.id;
    wrap.appendChild(renderPostCard(post));
  });
}


// ---------------------------------------------
// VIDEOS FEED (video + video podcasts)
// ---------------------------------------------
async function loadVideosFeed() {
  const wrap = qs("#videos-feed");
  wrap.innerHTML = `<p class="muted">Loading...</p>`;

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

  snap.forEach((docu) => {
    const post = docu.data();
    post.id = docu.id;
    wrap.appendChild(renderPostCard(post));
  });
}


// ---------------------------------------------
// PODCAST FEED (audio-only podcasts)
// ---------------------------------------------
async function loadPodcastFeed() {
  const wrap = qs("#podcast-feed");
  wrap.innerHTML = `<p class="muted">Loading...</p>`;

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

  snap.forEach((docu) => {
    const post = docu.data();
    post.id = docu.id;
    wrap.appendChild(renderPostCard(post));
  });
}


// ---------------------------------------------
// CLIPS FEED (short clips)
// ---------------------------------------------
async function loadClipsFeed() {
  const wrap = qs("#clips-feed");
  wrap.innerHTML = `<p class="muted">Loading...</p>`;

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

  snap.forEach((docu) => {
    const post = docu.data();
    post.id = docu.id;
    wrap.appendChild(renderPostCard(post));
  });
}

// Auto-load Home on start
loadHomeFeed();
/****************************************************
 * PART 6 — POST CARD RENDERER
 * - Creates the UI card for posts in feeds
 * - Attached to loadHomeFeed(), loadVideosFeed(), etc.
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

  // Entire card opens viewer page
  div.addEventListener("click", (e) => {
    // Prevent buttons inside from triggering viewer
    if (
      e.target.closest(".like-btn") ||
      e.target.closest(".dislike-btn") ||
      e.target.closest(".save-btn")
    ) {
      return;
    }

    // Later we will make viewer.html
    // For now it will use a placeholder
    window.location.href = `viewer.html?id=${p.id}`;
  });

  return div;
}
/****************************************************
 * PART 7 — LIKE / DISLIKE SYSTEM
 * - Users can like or dislike each post
 * - One reaction per user (like OR dislike)
 * - Updates Firestore and refreshes feed
 ****************************************************/

// Global click handler for like & dislike buttons
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


// ---------------------------------------------
// LIKE HANDLER
// ---------------------------------------------
async function handleLike(postId) {
  const refPost = doc(db, "posts", postId);
  const snap = await getDoc(refPost);

  if (!snap.exists()) return;

  const data = snap.data();
  const uid = currentUser.uid;

  let likes    = data.likes || [];
  let dislikes = data.dislikes || [];

  const hasLiked    = likes.includes(uid);
  const hasDisliked = dislikes.includes(uid);

  if (hasLiked) {
    // Remove like
    likes = likes.filter((x) => x !== uid);
  } else {
    // Add like
    likes.push(uid);
    // Remove dislike if switching
    if (hasDisliked) {
      dislikes = dislikes.filter((x) => x !== uid);
    }
  }

  await updateDoc(refPost, { likes, dislikes });
}


// ---------------------------------------------
// DISLIKE HANDLER
// ---------------------------------------------
async function handleDislike(postId) {
  const refPost = doc(db, "posts", postId);
  const snap = await getDoc(refPost);

  if (!snap.exists()) return;

  const data = snap.data();
  const uid = currentUser.uid;

  let likes    = data.likes || [];
  let dislikes = data.dislikes || [];

  const hasLiked    = likes.includes(uid);
  const hasDisliked = dislikes.includes(uid);

  if (hasDisliked) {
    // Remove dislike
    dislikes = dislikes.filter((x) => x !== uid);
  } else {
    // Add dislike
    dislikes.push(uid);
    // Remove like if switching
    if (hasLiked) {
      likes = likes.filter((x) => x !== uid);
    }
  }

  await updateDoc(refPost, { likes, dislikes });
}


// ---------------------------------------------
// REFRESH CURRENT FEED WITHOUT LOSING TAB
// ---------------------------------------------
function refreshActiveFeed() {
  const activeTab = document.querySelector(".bottom-nav a.active")?.dataset.tab;

  if (activeTab === "home")   loadHomeFeed();
  if (activeTab === "videos") loadVideosFeed();
  if (activeTab === "podcast") loadPodcastFeed();
  if (activeTab === "clips")   loadClipsFeed();
}
/****************************************************
 * PART 8 — COMMENT SYSTEM
 * - Add comments
 * - Load comments
 * - Delete own comments
 * - Auto-refresh
 ****************************************************/

// Add a comment
async function addComment(postId, text) {
  if (!currentUser) {
    alert("You must be logged in to comment.");
    return;
  }

  text = text.trim();
  if (!text) return;

  await addDoc(collection(db, "comments"), {
    postId,
    uid: currentUser.uid,
    username: currentUser.displayName,
    text,
    createdAt: serverTimestamp(),
  });

  // Trigger live refresh
  document.dispatchEvent(
    new CustomEvent("intakee:commentsRefresh", {
      detail: { postId },
    })
  );
}


// Load comments for a specific post
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

  snap.forEach((docu) => {
    const c = docu.data();
    const id = docu.id;

    const isOwner = currentUser && currentUser.uid === c.uid;

    const div = document.createElement("div");
    div.className = "comment-item";
    div.style = `
      padding:10px 0;
      border-bottom:1px solid #222;
      display:flex;
      justify-content:space-between;
      gap:12px;
    `;

    div.innerHTML = `
      <div style="flex:1;">
        <strong>@${c.username}</strong><br>
        <span>${c.text}</span>
      </div>

      ${
        isOwner
          ? `<button 
               class="delete-comment" 
               data-id="${id}" 
               style="background:none; border:none; color:#f55; cursor:pointer;">
               Delete
             </button>`
          : ""
      }
    `;

    container.appendChild(div);
  });
}


// Handle delete comment button
document.addEventListener("click", async (e) => {
  const delBtn = e.target.closest(".delete-comment");
  if (!delBtn) return;

  const id = delBtn.dataset.id;

  if (!confirm("Delete this comment?")) return;

  await deleteDoc(doc(db, "comments", id));

  document.dispatchEvent(new CustomEvent("intakee:commentsRefresh"));
});


// Live-reload comments
document.addEventListener("intakee:commentsRefresh", (e) => {
  if (!window.currentPostId || !window.commentsContainer) return;

  // Reload comments for this post
  loadComments(window.currentPostId, window.commentsContainer);
});
/****************************************************
 * PART 9 — FOLLOW SYSTEM
 * - Follow a creator
 * - Unfollow a creator
 * - Update UI and counts
 ****************************************************/

// These refer to the profile stats in your HTML
const statFollowers = qs("#stat-followers");
const statFollowing = qs("#stat-following");

let currentProfileViewing = null; // whose profile you're viewing


/****************************************************
 * LOAD FOLLOW COUNTS FOR PROFILE
 ****************************************************/
async function loadFollowStats(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return;

  const data = snap.data();

  statFollowers.textContent = data.followers?.length || 0;
  statFollowing.textContent = data.following?.length || 0;
}


/****************************************************
 * SET PROFILE VIEWING USER
 * Called when switching to Profile tab
 ****************************************************/
async function loadProfile(uid) {
  currentProfileViewing = uid;

  // Load uploads (from Part 11 later)
  loadProfileUploads(uid);

  // Load follower & following numbers
  loadFollowStats(uid);

  // Determine if follow button should show
  updateFollowButtonUI();
}


/****************************************************
 * FOLLOW / UNFOLLOW BUTTON
 ****************************************************/

// These correspond to your profile tab buttons
const followBtn  = qs("#btn-follow");
const unfollowBtn = qs("#btn-unfollow");

function updateFollowButtonUI() {
  const user = currentUser;

  if (!user) {
    // Not logged in → show Follow button only
    followBtn.style.display = "inline-block";
    unfollowBtn.style.display = "none";
    return;
  }

  if (user.uid === currentProfileViewing) {
    // Viewing your own profile → hide both
    followBtn.style.display = "none";
    unfollowBtn.style.display = "none";
    return;
  }

  // Check follow status
  checkIfFollowing(user.uid, currentProfileViewing);
}


// Check follow status from Firestore
async function checkIfFollowing(myUid, viewedUid) {
  const myRef = doc(db, "users", myUid);
  const snap = await getDoc(myRef);
  const me = snap.data();

  const isFollowing = me.following?.includes(viewedUid);

  if (isFollowing) {
    followBtn.style.display = "none";
    unfollowBtn.style.display = "inline-block";
  } else {
    followBtn.style.display = "inline-block";
    unfollowBtn.style.display = "none";
  }
}


/****************************************************
 * CLICK EVENTS — FOLLOW / UNFOLLOW
 ****************************************************/

// FOLLOW
followBtn?.addEventListener("click", async () => {
  if (!currentUser) return alert("Login required to follow.");

  const meRef = doc(db, "users", currentUser.uid);
  const themRef = doc(db, "users", currentProfileViewing);

  const meSnap = await getDoc(meRef);
  const themSnap = await getDoc(themRef);

  const me = meSnap.data();
  const them = themSnap.data();

  // Already following?
  if (me.following?.includes(currentProfileViewing)) return;

  // Add follow
  await updateDoc(meRef, {
    following: [...(me.following || []), currentProfileViewing],
  });

  await updateDoc(themRef, {
    followers: [...(them.followers || []), currentUser.uid],
  });

  // Update UI
  loadFollowStats(currentProfileViewing);
  updateFollowButtonUI();
});


// UNFOLLOW
unfollowBtn?.addEventListener("click", async () => {
  if (!currentUser) return alert("Login required to unfollow.");

  const meRef = doc(db, "users", currentUser.uid);
  const themRef = doc(db, "users", currentProfileViewing);

  const meSnap = await getDoc(meRef);
  const themSnap = await getDoc(themRef);

  const me = meSnap.data();
  const them = themSnap.data();

  await updateDoc(meRef, {
    following: me.following.filter((id) => id !== currentProfileViewing),
  });

  await updateDoc(themRef, {
    followers: them.followers.filter((id) => id !== currentUser.uid),
  });

  // Update UI
  loadFollowStats(currentProfileViewing);
  updateFollowButtonUI();
});
/****************************************************
 * PART 10 — SAVE / WATCH LATER SYSTEM
 * - Save a post
 * - Unsave a post
 * - Load saved posts on profile
 * - Auto-refresh on save/unsave
 ****************************************************/

// Detect save button clicks in all feeds
document.addEventListener("click", async (e) => {
  const saveBtn = e.target.closest(".save-btn");
  if (!saveBtn) return;

  if (!currentUser) {
    alert("You must be logged in to save posts.");
    return;
  }

  const postId = saveBtn.dataset.id;
  toggleSave(postId, saveBtn);
});


// ---------------------------------------------------
// SAVE / UNSAVE LOGIC
// ---------------------------------------------------

async function toggleSave(postId, btn) {
  const userRef = doc(db, "users", currentUser.uid);
  const snap = await getDoc(userRef);

  const data = snap.data();
  const saved = data.saved || [];

  let updated;

  if (saved.includes(postId)) {
    // Unsave
    updated = saved.filter((x) => x !== postId);
    if (btn) btn.textContent = "💾 Save";
  } else {
    // Save
    updated = [...saved, postId];
    if (btn) btn.textContent = "✔ Saved";
  }

  await updateDoc(userRef, { saved: updated });

  // Only refresh saved tab if active
  if (window.currentProfileTab === "saved") {
    loadSavedPosts(currentUser.uid);
  }
}


// ---------------------------------------------------
// LOAD SAVED POSTS FOR PROFILE TAB
// ---------------------------------------------------

async function loadSavedPosts(uid) {
  const savedWrap = qs("#profile-saved");
  savedWrap.innerHTML = `<p class="muted">Loading saved posts...</p>`;

  const userSnap = await getDoc(doc(db, "users", uid));
  const data = userSnap.data();

  const savedList = data.saved || [];
  savedWrap.innerHTML = "";

  if (savedList.length === 0) {
    savedWrap.innerHTML = `<p class="muted">No saved posts yet.</p>`;
    return;
  }

  for (let postId of savedList) {
    const snap = await getDoc(doc(db, "posts", postId));
    if (!snap.exists()) continue;

    const p = snap.data();
    p.id = postId;

    const tile = document.createElement("div");
    tile.className = "tile";

    tile.innerHTML = `
      <img class="thumb" src="${p.thumbnailUrl}">
      <div class="meta">${p.title}</div>
    `;

    tile.addEventListener("click", () => {
      window.location.href = `viewer.html?id=${postId}`;
    });

    savedWrap.appendChild(tile);
  }
}
/****************************************************
 * PART 11 — PROFILE SYSTEM
 * - Displays uploads, saved, likes
 * - Profile tab switching
 * - Loads content from Firestore
 ****************************************************/

// Profile tab buttons
const pfTabs = qsa(".profile-tabs .pill");

const pfUploads   = qs("#profile-grid");     // main uploads grid
const pfSaved     = document.createElement("div");
const pfLikes     = document.createElement("div");
const pfPlaylists = document.createElement("div");

// Style grids
pfSaved.className     =
pfLikes.className     =
pfPlaylists.className = "grid";

// Insert after uploads
pfUploads.parentNode.appendChild(pfSaved);
pfUploads.parentNode.appendChild(pfLikes);
pfUploads.parentNode.appendChild(pfPlaylists);

// Hide non-default sections
pfSaved.style.display     = "none";
pfLikes.style.display     = "none";
pfPlaylists.style.display = "none";


// -----------------------------------------------------------
// PROFILE TAB SWITCHING
// -----------------------------------------------------------
let currentProfileTab = "uploads";

function switchProfileTab(tab) {
  currentProfileTab = tab;

  // Update UI buttons
  pfTabs.forEach(btn =>
    btn.classList.toggle("active", btn.dataset.profileTab === tab)
  );

  // Hide all
  pfUploads.style.display   = "none";
  pfSaved.style.display     = "none";
  pfLikes.style.display     = "none";
  pfPlaylists.style.display = "none";

  // Show correct section
  if (tab === "uploads")   pfUploads.style.display = "grid";
  if (tab === "saved")     pfSaved.style.display = "grid";
  if (tab === "likes")     pfLikes.style.display = "grid";
  if (tab === "playlists") pfPlaylists.style.display = "block";

  // Load content
  if (currentUser) {
    if (tab === "uploads") loadProfileUploads(currentUser.uid);
    if (tab === "saved")   loadSavedPosts(currentUser.uid);
    if (tab === "likes")   loadProfileLikes(currentUser.uid);
  }
}

// Attach switching
pfTabs.forEach(btn => {
  btn.addEventListener("click", () => {
    switchProfileTab(btn.dataset.profileTab);
  });
});

// Default tab
switchProfileTab("uploads");


// -----------------------------------------------------------
// LOAD USER UPLOADS
// -----------------------------------------------------------
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


// -----------------------------------------------------------
// LOAD USER LIKED POSTS
// -----------------------------------------------------------
async function loadProfileLikes(uid) {
  pfLikes.innerHTML = `<p class="muted">Loading...</p>`;

  const userRef = await getDoc(doc(db, "users", uid));
  const data = userRef.data();
  const likesList = data.likes || [];

  pfLikes.innerHTML = "";

  if (likesList.length === 0) {
    pfLikes.innerHTML = `<p class="muted" style="text-align:center;">No liked posts yet.</p>`;
    return;
  }

  for (let postId of likesList) {
    const postSnap = await getDoc(doc(db, "posts", postId));
    if (!postSnap.exists()) continue;

    const p = postSnap.data();
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


// -----------------------------------------------------------
// PLAYLISTS — Placeholder
// -----------------------------------------------------------
function loadUserPlaylists() {
  pfPlaylists.innerHTML = `
    <p class="muted" style="text-align:center;">Playlists coming soon.</p>
  `;
}
/****************************************************
 * PART 12 — GLOBAL SEARCH SYSTEM
 * - Searches posts by title, username
 * - Live results inside Home feed
 ****************************************************/

const searchInput = qs("#globalSearch");

searchInput.addEventListener("input", async (e) => {
  const term = e.target.value.trim().toLowerCase();

  // If search bar is empty → reload full home feed
  if (term === "") {
    loadHomeFeed();
    return;
  }

  const wrap = qs("#home-feed");
  wrap.innerHTML = `<p class="muted">Searching...</p>`;

  const snap = await getDocs(collection(db, "posts"));
  wrap.innerHTML = "";

  let found = false;

  snap.forEach((docSnap) => {
    const post = docSnap.data();
    post.id = docSnap.id;

    const titleMatch = post.title.toLowerCase().includes(term);
    const userMatch = post.username.toLowerCase().includes(term);

    if (titleMatch || userMatch) {
      wrap.appendChild(renderPostCard(post));
      found = true;
    }
  });

  if (!found) {
    wrap.innerHTML = `<p class="muted">No results found.</p>`;
  }
});
/****************************************************
 * PART 13 — SETTINGS SYSTEM
 * - Handles toggles (private, restricted, notifications)
 * - Opens sections (blocked users, report content)
 * - Accordion legal documents
 * - Saves settings to Firestore
 ****************************************************/

// SETTINGS TOGGLES IN FIRESTORE
const SETTINGS_KEYS = [
  "privateAccount",
  "showUploads",
  "showSaved",
  "restrictedMode",
  "ageWarning",
  "notifyPush",
  "notifyEmail",
  "notifyFollow",
  "notifyLikes",
  "notifyComments"
];

// Map HTML toggle IDs → Firestore keys
const toggleMap = {
  "toggle-private":       "privateAccount",
  "toggle-show-uploads":  "showUploads",
  "toggle-show-saved":    "showSaved",
  "toggle-restricted":    "restrictedMode",
  "toggle-age-warning":   "ageWarning",
  "toggle-notify-push":   "notifyPush",
  "toggle-notify-email":  "notifyEmail",
  "toggle-notify-follow": "notifyFollow",
  "toggle-notify-likes":  "notifyLikes",
  "toggle-notify-comments": "notifyComments"
};


// -----------------------------------------------------------
// LOAD USER SETTINGS WHEN LOGGED IN
// -----------------------------------------------------------
document.addEventListener("intakee:auth", async (e) => {
  const user = e.detail.user;
  if (!user) return;

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return;

  const data = snap.data();

  // Apply settings to toggles
  Object.entries(toggleMap).forEach(([toggleId, settingKey]) => {
    const input = qs(`#${toggleId}`);
    if (input) {
      input.checked = data[settingKey] || false;
    }
  });
});


// -----------------------------------------------------------
// SAVE SETTINGS ON TOGGLE CHANGE
// -----------------------------------------------------------
qsa(".settings-toggle input").forEach((input) => {
  input.addEventListener("change", async () => {
    if (!currentUser) {
      alert("You must be logged in.");
      input.checked = !input.checked; // revert
      return;
    }

    const settingKey = toggleMap[input.id];
    if (!settingKey) return;

    await updateDoc(doc(db, "users", currentUser.uid), {
      [settingKey]: input.checked
    });

    console.log(`Setting updated: ${settingKey} = ${input.checked}`);
  });
});


// -----------------------------------------------------------
// BLOCKED USERS (placeholder)
// -----------------------------------------------------------
qs("#openBlockedUsers")?.addEventListener("click", () => {
  alert("Blocked users feature coming soon.");
});


// -----------------------------------------------------------
// REPORT CONTENT (placeholder)
// -----------------------------------------------------------
qs("#openReportModal")?.addEventListener("click", () => {
  alert("Content reporting will be available after launch.");
});


// -----------------------------------------------------------
// ACCORDIONS (LEGAL SECTIONS)
// -----------------------------------------------------------
const accordions = qsa(".accordion");

accordions.forEach((acc) => {
  const header = acc.querySelector(".accordion-header");
  const body   = acc.querySelector(".accordion-body");

  header.addEventListener("click", () => {
    const isOpen = acc.classList.contains("open");

    // Close all others
    accordions.forEach((a) => a.classList.remove("open"));

    // Toggle selected one
    if (!isOpen) {
      acc.classList.add("open");
      body.style.display = "block";
    }
  });
});


// -----------------------------------------------------------
// FORGOT USERNAME (placeholder)
// -----------------------------------------------------------
qs("#settings-forgot-username")?.addEventListener("click", () => {
  alert("Your username is your display name shown on your profile.");
});
/****************************************************
 * PART 14 — MINI AUDIO PLAYER SYSTEM
 * - For podcast audio playback
 * - Persistent mini-player across tabs
 ****************************************************/

const miniPlayer = qs("#mini-player");
const mpAudio    = qs("#mp-audio");
const mpPlay     = qs("#mp-play");
const mpClose    = qs("#mp-close");

// -----------------------------------------------------------
// OPEN MINI PLAYER WITH AUDIO SOURCE
// -----------------------------------------------------------

export function openMiniPlayer(audioUrl) {
  mpAudio.src = audioUrl;
  mpAudio.play();

  mpPlay.innerHTML = `<i class="fa fa-pause"></i>`;
  miniPlayer.classList.add("active");
}


// -----------------------------------------------------------
// PLAY / PAUSE BUTTON
// -----------------------------------------------------------

mpPlay.addEventListener("click", () => {
  if (mpAudio.paused) {
    mpAudio.play();
    mpPlay.innerHTML = `<i class="fa fa-pause"></i>`;
  } else {
    mpAudio.pause();
    mpPlay.innerHTML = `<i class="fa fa-play"></i>`;
  }
});


// -----------------------------------------------------------
// CLOSE MINI PLAYER
// -----------------------------------------------------------

mpClose.addEventListener("click", () => {
  mpAudio.pause();
  miniPlayer.classList.remove("active");
});
/****************************************************
 * PART 15 — VIEWER PAGE SUPPORT
 * - Loads a single post by ID
 * - Displays media (video or audio)
 * - Integrates with likes, comments, follows
 ****************************************************/

// Only run viewer logic if on viewer.html
if (window.location.pathname.endsWith("viewer.html")) {
  initViewerPage();
}

async function initViewerPage() {
  // Get ?id=xxxxx from URL
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get("id");

  if (!postId) {
    alert("No post ID provided.");
    return;
  }

  window.currentPostId = postId;

  const viewerMedia     = qs("#viewer-media");
  const viewerTitle     = qs("#viewer-title");
  const viewerUser      = qs("#viewer-user");
  const viewerDesc      = qs("#viewer-desc");
  const viewerComments  = qs("#viewer-comments");
  const addCommentBtn   = qs("#viewer-add-comment");
  const commentInput    = qs("#viewer-comment-input");

  // Load post
  const snap = await getDoc(doc(db, "posts", postId));
  if (!snap.exists()) {
    alert("Post not found.");
    return;
  }

  const post = snap.data();

  // Set UI content
  viewerTitle.textContent = post.title;
  viewerUser.textContent  = "@" + post.username;
  viewerDesc.textContent  = post.desc || "";

  // Render media
  if (post.type === "podcast-audio") {
    // AUDIO PODCAST
    viewerMedia.innerHTML = `
      <audio controls style="width:100%;">
        <source src="${post.fileUrl}">
      </audio>
    `;
  } else {
    // VIDEO
    viewerMedia.innerHTML = `
      <video controls style="width:100%; border-radius:12px;">
        <source src="${post.fileUrl}">
      </video>
    `;
  }

  // Make sure comments load
  window.commentsContainer = viewerComments;
  loadComments(postId, viewerComments);

  // Handle comment submission
  addCommentBtn?.addEventListener("click", () => {
    const text = commentInput.value.trim();
    if (!text) return;
    addComment(postId, text);
    commentInput.value = "";
  });

  // Load like/dislike/save status
  loadViewerReactions(postId);

  // Load follow button for creator
  loadViewerFollowState(post.uid);
}


/****************************************************
 * VIEWER — LIKE/DISLIKE BUTTONS
 ****************************************************/
async function loadViewerReactions(postId) {
  const likeBtn    = qs("#viewer-like-btn");
  const dislikeBtn = qs("#viewer-dislike-btn");
  const saveBtn    = qs("#viewer-save-btn");
  const likeCount  = qs("#viewer-like-count");
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

  // Like button
  likeBtn.addEventListener("click", async () => {
    if (!currentUser) return alert("Login to like.");
    await handleLike(postId);
    loadViewerReactions(postId);
  });

  // Dislike button
  dislikeBtn.addEventListener("click", async () => {
    if (!currentUser) return alert("Login to dislike.");
    await handleDislike(postId);
    loadViewerReactions(postId);
  });

  // Save button
  saveBtn.addEventListener("click", async () => {
    if (!currentUser) return alert("Login to save.");
    toggleSave(postId, saveBtn);
    loadViewerReactions(postId);
  });
}


/****************************************************
 * VIEWER — FOLLOW BUTTON
 ****************************************************/
async function loadViewerFollowState(creatorUid) {
  const followBtn = qs("#viewer-follow-btn");
  const unfollowBtn = qs("#viewer-unfollow-btn");

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

  const isFollowing = me.following?.includes(creatorUid);

  if (isFollowing) {
    followBtn.style.display = "none";
    unfollowBtn.style.display = "inline-block";
  } else {
    followBtn.style.display = "inline-block";
    unfollowBtn.style.display = "none";
  }

  // Follow handler
  followBtn.addEventListener("click", async () => {
    await updateDoc(doc(db, "users", currentUser.uid), {
      following: [...(me.following || []), creatorUid],
    });

    await updateDoc(doc(db, "users", creatorUid), {
      followers: arrayUnion(currentUser.uid),
    });

    loadViewerFollowState(creatorUid);
  });

  // Unfollow handler
  unfollowBtn.addEventListener("click", async () => {
    await updateDoc(doc(db, "users", currentUser.uid), {
      following: me.following.filter(id => id !== creatorUid),
    });

    await updateDoc(doc(db, "users", creatorUid), {
      followers: arrayRemove(currentUser.uid),
    });

    loadViewerFollowState(creatorUid);
  });
}
/****************************************************
 * PART 16 — BLOCK + REPORT SYSTEM
 * - Block users (they disappear from your app)
 * - Unblock users
 * - Save block list in Firestore
 * - Report posts (saved for admin review)
 ****************************************************/


/****************************************************
 * BLOCK USER FUNCTIONALITY
 ****************************************************/

// Block a user
async function blockUser(targetUid) {
  if (!currentUser) return alert("Login to block users.");

  const userRef = doc(db, "users", currentUser.uid);
  const snap = await getDoc(userRef);

  const data = snap.data();
  const blockedList = data.blockedUsers || [];

  if (blockedList.includes(targetUid)) {
    alert("User already blocked.");
    return;
  }

  await updateDoc(userRef, {
    blockedUsers: [...blockedList, targetUid]
  });

  alert("User has been blocked.");
}


// Unblock a user
async function unblockUser(targetUid) {
  if (!currentUser) return alert("Login first.");

  const userRef = doc(db, "users", currentUser.uid);
  const snap = await getDoc(userRef);

  const data = snap.data();
  const updated = (data.blockedUsers || []).filter(id => id !== targetUid);

  await updateDoc(userRef, {
    blockedUsers: updated
  });

  alert("User unblocked.");
}


/****************************************************
 * BLOCKED USERS LIST — OPEN FROM SETTINGS
 ****************************************************/
qs("#openBlockedUsers")?.addEventListener("click", async () => {
  if (!currentUser) return alert("Login to see blocked users.");

  const userSnap = await getDoc(doc(db, "users", currentUser.uid));
  const data = userSnap.data();

  const blocked = data.blockedUsers || [];

  if (blocked.length === 0) {
    alert("You have no blocked users.");
    return;
  }

  let list = "Blocked users:\n\n";

  for (let uid of blocked) {
    const uSnap = await getDoc(doc(db, "users", uid));
    if (uSnap.exists()) {
      list += `@${uSnap.data().username}  (UID: ${uid})\n`;
    }
  }

  alert(list + "\nTo unblock someone, new UI will be added soon.");
});


/****************************************************
 * FEED FILTER — Hide posts from blocked creators
 ****************************************************/

async function filterBlockedPosts(postsArray) {
  if (!currentUser) return postsArray; // no filtering when logged out

  const userSnap = await getDoc(doc(db, "users", currentUser.uid));
  const myData = userSnap.data();
  const blocked = myData.blockedUsers || [];

  // remove posts whose uid is in blocked list
  return postsArray.filter(p => !blocked.includes(p.uid));
}

// Modify your feed loaders to use the filter
// Example (for Home feed):
// const snap = await getDocs(qRef);
// let posts = [];
// snap.forEach(doc => posts.push({ ...doc.data(), id: doc.id }));
// posts = await filterBlockedPosts(posts);


/****************************************************
 * REPORT SYSTEM — From Settings (Report Content)
 ****************************************************/

qs("#openReportModal")?.addEventListener("click", () => {
  const reason = prompt(
    "Report content\n\nEnter the reason for reporting (harassment, hate, impersonation, danger, etc.):"
  );

  if (!reason) return;

  alert("Thank you. Your report has been logged and will be reviewed.");
});


// Report a specific post (future, viewer page)
export async function reportPost(postId, reason = "inappropriate") {
  if (!currentUser) {
    alert("Login to report posts.");
    return;
  }

  await addDoc(collection(db, "reports"), {
    postId,
    reportedBy: currentUser.uid,
    reason,
    createdAt: serverTimestamp(),
  });

  alert("Post reported. Thank you.");
}
/****************************************************
 * PART 17 — AGE RESTRICTION + RESTRICTED MODE
 * - Age restricted posts hidden unless allowed
 * - Restricted mode toggle in Settings
 * - Viewer warnings
 * - Stores preferences in Firestore
 ****************************************************/


/****************************************************
 * 1. WHEN USER UPLOADS A POST (OPTIONAL)
 * Add age-restricted checkbox in your UI later.
 ****************************************************/

// Optional future field during upload:
// <input type="checkbox" id="uploadAgeRestrict"> Age-restricted

// Modify upload code to include:
// const ageRestricted = qs("#uploadAgeRestrict")?.checked || false;

// Add to Firestore post doc:
// ageRestricted: ageRestricted,

// For now, default = false:
function defaultAgeFlag() {
  return false; // placeholder
}


/****************************************************
 * 2. FILTER POSTS IN FEEDS IF RESTRICTED MODE ON
 ****************************************************/

async function applyAgeFilter(posts) {
  if (!currentUser) return posts;

  const snap = await getDoc(doc(db, "users", currentUser.uid));
  const data = snap.data();

  const restricted = data.restrictedMode || false;

  // If restricted mode OFF → show everything
  if (!restricted) return posts;

  // Hide posts that have ageRestricted: true
  return posts.filter(p => !p.ageRestricted);
}


/****************************************************
 * 3. INTEGRATION WITH FEED LOADERS
 * Modify feed loaders to apply filter.
 ****************************************************/

async function filterFeedResults(querySnap) {
  let posts = [];
  querySnap.forEach(docu => posts.push({ ...docu.data(), id: docu.id }));

  // Step 1: Hide blocked creators
  posts = await filterBlockedPosts(posts);

  // Step 2: Hide age-restricted posts (if setting enabled)
  posts = await applyAgeFilter(posts);

  return posts;
}

// Replace the old feed loading loop:
// snap.forEach(docu => wrap.appendChild(renderPostCard(docu.data())));

// With:
// const posts = await filterFeedResults(snap);
// posts.forEach(p => wrap.appendChild(renderPostCard(p)));


/****************************************************
 * 4. VIEWER PAGE — AGE WARNING
 ****************************************************/

function showAgeWarning() {
  const warn = document.createElement("div");
  warn.style = `
    padding: 14px;
    background: #220000;
    border: 1px solid #660000;
    color: #ff9999;
    text-align: center;
    border-radius: 10px;
    margin-bottom: 16px;
  `;
  warn.textContent = "⚠ This content is age-restricted and hidden under your settings.";
  return warn;
}

async function enforceViewerAgeRestriction(post) {
  if (!currentUser) return false;

  const snap = await getDoc(doc(db, "users", currentUser.uid));
  const settings = snap.data();

  if (!post.ageRestricted) return false; // no restriction

  if (!settings.restrictedMode && !settings.ageWarning) {
    // user has unrestricted content allowed
    return false;
  }

  // If restricted mode ON → block viewing
  if (settings.restrictedMode) {
    qs("#viewer-media").innerHTML = "";
    qs("#viewer-media").appendChild(showAgeWarning());
    return true;
  }

  // If ageWarning ON → show warning box but still show content
  if (settings.ageWarning) {
    const warn = document.createElement("div");
    warn.style = `
      padding: 10px;
      background:#333;
      color:#ffcc00;
      margin-bottom:10px;
      border-radius:8px;
      text-align:center;
    `;
    warn.textContent = "⚠ Age-sensitive content";
    qs("#viewer-media").prepend(warn);
  }

  return false;
}


/****************************************************
 * 5. HOOK INTO VIEWER PAGE
 ****************************************************/
async function initViewerPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get("id");

  if (!postId) return;

  window.currentPostId = postId;

  const viewerMedia = qs("#viewer-media");

  const snap = await getDoc(doc(db, "posts", postId));
  if (!snap.exists()) {
    alert("Post not found.");
    return;
  }

  const post = snap.data();

  // Age restriction check FIRST
  const blocked = await enforceViewerAgeRestriction(post);
  if (blocked) return; // stop here if restricted mode is ON

  // If allowed, continue with normal rendering
  renderViewerMedia(post);

  // Load reactions, comments, follow, etc.
  loadViewerReactions(postId);
  loadViewerFollowState(post.uid);
  window.commentsContainer = qs("#viewer-comments");
  loadComments(postId, window.commentsContainer);
}


/****************************************************
 * 6. RENDER MEDIA AFTER AGE ALLOWANCE
 ****************************************************/
function renderViewerMedia(post) {
  const viewerMedia = qs("#viewer-media");

  if (post.type === "podcast-audio") {
    viewerMedia.innerHTML = `
      <audio controls style="width:100%;">
        <source src="${post.fileUrl}">
      </audio>
    `;
  } else {
    viewerMedia.innerHTML = `
      <video controls style="width:100%; border-radius:12px;">
        <source src="${post.fileUrl}">
      </video>
    `;
  }
}
/****************************************************
 * PART 18 — FINAL OPTIMIZATION + LAUNCH CHECKS
 * - Ensures the app is stable and production-ready
 * - Smooth refresh events
 * - Load viewer if on viewer page
 ****************************************************/


/****************************************************
 * 1. SAFE FEED RENDERING WRAPPER
 ****************************************************/
async function safeRenderFeed(feedFunction) {
  try {
    await feedFunction();
  } catch (err) {
    console.error("Feed load error:", err);
  }
}


/****************************************************
 * 2. AUTO-REFRESH ACTIVE FEED ON LIKE/SAVE/COMMENT
 ****************************************************/
document.addEventListener("intakee:feedRefresh", () => {
  const active = document.querySelector(".bottom-nav a.active")?.dataset.tab;

  if (active === "home")    safeRenderFeed(loadHomeFeed);
  if (active === "videos")  safeRenderFeed(loadVideosFeed);
  if (active === "podcast") safeRenderFeed(loadPodcastFeed);
  if (active === "clips")   safeRenderFeed(loadClipsFeed);
});


/****************************************************
 * 3. ENSURE VIEWER PAGE INITIALIZES AT THE RIGHT TIME
 ****************************************************/
if (window.location.pathname.endsWith("viewer.html")) {
  document.addEventListener("DOMContentLoaded", () => {
    // Wait for Firebase auth to be ready first
    let waitAuth = setInterval(() => {
      if (typeof currentUser !== "undefined") {
        clearInterval(waitAuth);
        initViewerPage();
      }
    }, 200);
  });
}


/****************************************************
 * 4. DEFAULT VALUES PROTECTION
 * Prevents crashes if Firestore fields are missing.
 ****************************************************/
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


/****************************************************
 * 5. APPLY NORMALIZATION TO ALL FEED LOADERS
 ****************************************************/
async function normalizePostsFromSnap(snap) {
  let posts = [];

  snap.forEach((docu) => {
    const raw = docu.data();
    const post = normalizePost(raw);
    post.id = docu.id;
    posts.push(post);
  });

  // Filter blocked users
  posts = await filterBlockedPosts(posts);

  // Filter age restrictions
  posts = await applyAgeFilter(posts);

  return posts;
}


/****************************************************
 * 6. PATCH FEED LOADERS TO USE NORMALIZATION
 ****************************************************/
async function loadHomeFeed() {
  const wrap = qs("#home-feed");
  wrap.innerHTML = `<p class="muted">Loading...</p>`;

  const qRef = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  const snap = await getDocs(qRef);

  const posts = await normalizePostsFromSnap(snap);
  wrap.innerHTML = "";

  if (posts.length === 0) {
    wrap.innerHTML = `<p class="muted">No posts yet.</p>`;
    return;
  }

  posts.forEach((p) => wrap.appendChild(renderPostCard(p)));
}

async function loadVideosFeed() {
  const wrap = qs("#videos-feed");
  wrap.innerHTML = `<p class="muted">Loading...</p>`;

  const qRef = query(
    collection(db, "posts"),
    where("type", "in", ["video", "podcast-video"]),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(qRef);

  const posts = await normalizePostsFromSnap(snap);
  wrap.innerHTML = "";

  if (posts.length === 0) {
    wrap.innerHTML = `<p class="muted">No videos yet.</p>`;
    return;
  }

  posts.forEach((p) => wrap.appendChild(renderPostCard(p)));
}

async function loadPodcastFeed() {
  const wrap = qs("#podcast-feed");
  wrap.innerHTML = `<p class="muted">Loading...</p>`;

  const qRef = query(
    collection(db, "posts"),
    where("type", "==", "podcast-audio"),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(qRef);

  const posts = await normalizePostsFromSnap(snap);
  wrap.innerHTML = "";

  if (posts.length === 0) {
    wrap.innerHTML = `<p class="muted">No podcasts yet.</p>`;
    return;
  }

  posts.forEach((p) => wrap.appendChild(renderPostCard(p)));
}

async function loadClipsFeed() {
  const wrap = qs("#clips-feed");
  wrap.innerHTML = `<p class="muted">Loading...</p>`;

  const qRef = query(
    collection(db, "posts"),
    where("type", "==", "clip"),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(qRef);

  const posts = await normalizePostsFromSnap(snap);
  wrap.innerHTML = "";

  if (posts.length === 0) {
    wrap.innerHTML = `<p class="muted">No clips yet.</p>`;
    return;
  }

  posts.forEach((p) => wrap.appendChild(renderPostCard(p)));
}


/****************************************************
 * 7. ENSURE PROFILE DEFAULTS DON'T BREAK
 ****************************************************/
function safeProfileLoad() {
  if (!currentUser) return;

  loadProfileUploads(currentUser.uid);
  loadSavedPosts(currentUser.uid);
  loadProfileLikes(currentUser.uid);
}

document.addEventListener("intakee:auth", () => {
  // Delay slightly so DOM is ready
  setTimeout(safeProfileLoad, 200);
});


/****************************************************
 * 8. FINAL DEBUG CLEANUP + LOGS
 ****************************************************/
console.log("%cINTAKEE SCRIPT LOADED SUCCESSFULLY", "color:#4cff4c; font-weight:bold; font-size:16px;");
