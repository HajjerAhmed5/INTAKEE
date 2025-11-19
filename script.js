// =======================================================
// INTAKEE — MAIN JS (FINAL FIXED VERSION • PART 1/3)
// ORDER: AUTH → TABS → UPLOAD (matching your preference)
// =======================================================
'use strict';

// ---------- Firebase Instance (from index.html) ----------
const { app, auth, db, storage } = window.firebaseRefs || {};
if (!app || !auth || !db || !storage) {
  console.error("❌ Firebase did NOT initialize. Check index.html config.");
}

// ---------- Utility Helpers ----------
const qs  = (s, sc = document) => sc.querySelector(s);
const qsa = (s, sc = document) => [...sc.querySelectorAll(s)];
const $on = (el, ev, fn) => el && el.addEventListener(ev, fn);


// =======================================================
// 🔐 AUTHENTICATION SYSTEM
// =======================================================

// Elements
const dlgAuth   = qs('#authDialog');
const signupBtn = qs('#signupBtn');
const loginBtn  = qs('#loginBtn');
const forgotBtn = qs('#forgotBtn');
const logoutBtn = qs('#settings-logout');
const openAuth  = qs('#openAuth');

// ---------- Open Auth Modal ----------
$on(openAuth, 'click', () => dlgAuth.showModal());

// ---------- SIGN UP ----------
$on(signupBtn, 'click', async () => {
  const email    = qs('#signupEmail').value.trim();
  const password = qs('#signupPassword').value.trim();
  const username = qs('#signupUsername').value.trim().toLowerCase();
  const ageOK    = qs('#signupAgeConfirm').checked;

  if (!email || !password || !username) return alert("⚠️ Fill all fields.");
  if (!ageOK) return alert("⚠️ You must confirm you are 13+.");

  try {
    // Check if username exists
    const { collection, query, where, getDocs } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

    const qRef = query(collection(db, "users"), where("username", "==", username));
    const snap = await getDocs(qRef);
    if (!snap.empty) return alert("❌ Username already taken.");

    // Create the account
    const { createUserWithEmailAndPassword, updateProfile } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js");

    const cred = await createUserWithEmailAndPassword(auth, email, password);

    // Save Firestore user
    const { doc, setDoc, serverTimestamp } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

    await setDoc(doc(db, "users", cred.user.uid), {
      email,
      username,
      name: username,
      bio: "",
      private: false,
      showUploads: true,
      showSaved: true,
      followers: [],
      following: [],
      createdAt: serverTimestamp()
    });

    await updateProfile(cred.user, { displayName: username });

    alert(`🎉 Welcome @${username}!`);
    dlgAuth.close();

  } catch (err) {
    alert("❌ " + err.message);
    console.error(err);
  }
});

// ---------- LOGIN ----------
$on(loginBtn, 'click', async () => {
  const email = qs('#loginEmail').value.trim();
  const pass  = qs('#loginPassword').value.trim();
  if (!email || !pass) return alert("Enter email & password.");

  try {
    const { signInWithEmailAndPassword } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js");

    const cred = await signInWithEmailAndPassword(auth, email, pass);
    alert(`✅ Logged in as ${cred.user.displayName || cred.user.email}`);
    dlgAuth.close();

  } catch (err) {
    alert("❌ " + err.message);
    console.error(err);
  }
});

// ---------- FORGOT PASSWORD ----------
$on(forgotBtn, 'click', async () => {
  const email = prompt("Enter your email:");
  if (!email) return;

  try {
    const { sendPasswordResetEmail } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js");

    await sendPasswordResetEmail(auth, email);
    alert("📩 Reset link sent to your email.");

  } catch (err) {
    alert("❌ " + err.message);
  }
});

// ---------- LOGOUT ----------
$on(logoutBtn, 'click', async () => {
  try {
    const { signOut } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js");

    await signOut(auth);
    alert("👋 Logged out.");
  } catch (err) {
    alert("❌ Logout failed: " + err.message);
  }
});

// ---------- AUTH STATE ----------
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

onAuthStateChanged(auth, (user) => {
  console.log("AUTH STATE:", user);
  document.dispatchEvent(new CustomEvent("intakee:auth", { detail: { user } }));

  // Hide Login button if logged in
  if (openAuth) openAuth.style.display = user ? 'none' : 'block';
});


// =======================================================
// 🧭 TAB SWITCHING SYSTEM
// =======================================================

const tabs = {
  home: qs("#tab-home"),
  videos: qs("#tab-videos"),
  podcast: qs("#tab-podcast"),
  clips: qs("#tab-clips"),
  upload: qs("#tab-upload"),
  profile: qs("#tab-profile"),
  settings: qs("#tab-settings")
};

const navLinks = qsa(".bottom-nav a");

function switchTab(tabName) {
  Object.keys(tabs).forEach(name => {
    tabs[name].style.display = name === tabName ? "block" : "none";
  });

  navLinks.forEach(link =>
    link.classList.toggle("active", link.dataset.tab === tabName)
  );
}

navLinks.forEach(link => {
  link.addEventListener("click", () => {
    switchTab(link.dataset.tab);
    window.scrollTo(0, 0);
  });
});

// Default tab
switchTab("home");


// =======================================================
// 📤 UPLOAD SYSTEM
// =======================================================

const upType  = qs('#uploadTypeSelect');
const upTitle = qs('#uploadTitleInput');
const upDesc  = qs('#uploadDescInput');
const upThumb = qs('#uploadThumbInput');
const upFile  = qs('#uploadFileInput');
const btnUpload = qs('#btnUpload');
const goLiveBtn = qs('#goLiveBtn');

// Clear upload form
function resetUploadForm() {
  upType.value = "video";
  upTitle.value = "";
  upDesc.value = "";
  upThumb.value = "";
  upFile.value = "";
}

// ---------- UPLOAD HANDLER ----------
$on(btnUpload, "click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Please sign in to upload.");

  const type = upType.value;
  const title = upTitle.value.trim();
  const desc = upDesc.value.trim();
  const file = upFile.files[0];
  const thumb = upThumb.files[0];

  if (!file) return alert("Select a file to upload.");
  if (!title) return alert("Enter a title.");

  btnUpload.disabled = true;
  btnUpload.textContent = "Uploading... 0%";

  try {
    const { ref, uploadBytesResumable, getDownloadURL, uploadBytes } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js");

    const { addDoc, collection, serverTimestamp } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

    // Upload main media
    const ext = file.name.split('.').pop();
    const safeTitle = title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const path = `uploads/${user.uid}/${Date.now()}_${safeTitle}.${ext}`;

    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, file);

    task.on("state_changed", snap => {
      const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
      btnUpload.textContent = `Uploading... ${pct}%`;
    });

    await task;
    const mediaUrl = await getDownloadURL(storageRef);

    // Upload thumbnail
    let thumbUrl = "";
    if (thumb) {
      const tRef = ref(storage, `thumbnails/${user.uid}/${Date.now()}_${thumb.name}`);
      await uploadBytes(tRef, thumb);
      thumbUrl = await getDownloadURL(tRef);
    }

    // Save post
    await addDoc(collection(db, "posts"), {
      uid: user.uid,
      type,
      title,
      desc,
      mediaUrl,
      thumbnailUrl: thumbUrl,
      createdAt: serverTimestamp(),
      likeCount: 0,
      commentCount: 0,
      viewCount: 0,
      private: false,
    });

    alert("✅ Upload complete!");
    resetUploadForm();
    document.dispatchEvent(new CustomEvent("intakee:feedRefresh"));

  } catch (err) {
    alert("❌ Upload failed: " + err.message);
    console.error(err);
  }

  btnUpload.disabled = false;
  btnUpload.textContent = "Upload";
});

// Go Live (coming soon)
$on(goLiveBtn, "click", () => alert("🎥 Live streaming coming soon!"));
// =======================================================
// 📺 FEED SYSTEM — FETCH + RENDER
// =======================================================

const homeFeed    = qs('#home-feed');
const videosFeed  = qs('#videos-feed');
const podcastFeed = qs('#podcast-feed');
const clipsFeed   = qs('#clips-feed');

let _allPosts = [];

// ---------- Fetch All Posts ----------
async function fetchAllPosts() {
  const { collection, getDocs, orderBy, query, limit } =
    await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

  const qRef = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(200));
  const snap = await getDocs(qRef);

  _allPosts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ---------- Render Feed ----------
function renderFeed(container, list, type = "all") {
  container.innerHTML = "";

  if (!list || list.length === 0) {
    container.innerHTML = `<p class="muted">No posts yet.</p>`;
    return;
  }

  list.forEach(post => {
    if (type !== "all" && post.type !== type) return;

    const card = document.createElement("div");
    card.className = "feed-card card";

    const thumb = post.thumbnailUrl || "placeholder.png";
    const icon = post.type === "video"
      ? "fa-video"
      : post.type === "clip"
      ? "fa-bolt"
      : "fa-podcast";

    card.innerHTML = `
      <div class="thumb-wrap">
        <img class="thumb-img" src="${thumb}">
        <button class="play-btn" data-url="${post.mediaUrl}" data-type="${post.type}">
          <i class="fa ${icon}"></i>
        </button>
      </div>

      <div class="feed-info">
        <h3>${post.title}</h3>
        <p>${post.desc || ""}</p>
        <div class="muted small">${post.type.toUpperCase()}</div>
      </div>
    `;

    // Play Button
    const playBtn = card.querySelector(".play-btn");
    playBtn.onclick = () => {
      if (post.type.startsWith("podcast")) {
        playPodcast(post.mediaUrl, post.title);
      } else {
        window.open(post.mediaUrl, "_blank");
      }
    };

    attachLikeButtons(card, post.id, post.type);
    if (post.type !== "clip") attachCommentInput(card, post.id);

    container.appendChild(card);
  });
}

// ---------- Load All Feeds ----------
async function loadFeeds() {
  await fetchAllPosts();

  renderFeed(homeFeed,    _allPosts);
  renderFeed(videosFeed,  _allPosts.filter(p => p.type === "video"));
  renderFeed(podcastFeed, _allPosts.filter(p => p.type.startsWith("podcast")));
  renderFeed(clipsFeed,   _allPosts.filter(p => p.type === "clip"));
}

document.addEventListener("intakee:feedRefresh", loadFeeds);


// =======================================================
// ❤️ LIKES / DISLIKES
// =======================================================

async function toggleLike(postId, isLike = true) {
  const user = auth.currentUser;
  if (!user) return alert("Sign in to like posts.");

  const { doc, updateDoc, increment } =
    await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

  const ref = doc(db, "posts", postId);

  await updateDoc(ref, {
    likeCount: increment(isLike ? 1 : -1)
  });

  document.dispatchEvent(new CustomEvent("intakee:feedRefresh"));
}

function attachLikeButtons(card, postId, type) {
  if (type === "clip") return; // clips have no likes/dislikes

  const wrap = document.createElement("div");
  wrap.className = "like-row";

  const likeBtn = document.createElement("button");
  const disBtn  = document.createElement("button");

  likeBtn.className = "icon-btn";
  disBtn.className  = "icon-btn";

  likeBtn.innerHTML = `<i class="fa fa-thumbs-up"></i>`;
  disBtn.innerHTML  = `<i class="fa fa-thumbs-down"></i>`;

  likeBtn.onclick = () => toggleLike(postId, true);
  disBtn.onclick  = () => toggleLike(postId, false);

  wrap.append(likeBtn, disBtn);
  card.appendChild(wrap);
}


// =======================================================
// 💬 COMMENTS
// =======================================================

async function postComment(postId, text) {
  const user = auth.currentUser;
  if (!user) return alert("Sign in to comment.");
  if (!text.trim()) return;

  const { collection, addDoc, serverTimestamp } =
    await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

  await addDoc(collection(db, "posts", postId, "comments"), {
    uid: user.uid,
    text: text.trim(),
    createdAt: serverTimestamp()
  });

  loadComments(postId);
}

async function loadComments(postId) {
  const { collection, getDocs, query, orderBy } =
    await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

  const qRef = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "asc"));
  const snap = await getDocs(qRef);

  const box = qs(`#comments-${postId}`);
  if (!box) return;

  box.innerHTML = snap.empty
    ? `<p class="muted small">No comments yet.</p>`
    : snap.docs
        .map(d => {
          const data = d.data();
          return `<p><span class="muted small">${data.uid.slice(0, 6)}:</span> ${data.text}</p>`;
        })
        .join("");
}

function attachCommentInput(card, postId) {
  const wrap = document.createElement("div");
  wrap.className = "comment-block";

  wrap.innerHTML = `
    <input type="text" id="commentInput-${postId}" placeholder="Add a comment..." />
    <button class="ghost" id="commentBtn-${postId}">Post</button>
    <div id="comments-${postId}" class="comments"></div>
  `;

  const btn = wrap.querySelector(`#commentBtn-${postId}`);
  const input = wrap.querySelector(`#commentInput-${postId}`);

  btn.onclick = () => {
    postComment(postId, input.value);
    input.value = "";
  };

  loadComments(postId);
}
// =======================================================
// 👤 PROFILE SYSTEM
// =======================================================

const profileName      = qs('#profile-name');
const profileHandle    = qs('#profile-handle');
const profilePhotoImg  = qs('#profile-photo');
const profileBanner    = qs('#profileBanner');

const bioView       = qs('#bio-view');
const bioEditWrap   = qs('#bio-edit-wrap');
const nameInput     = qs('#profileNameInput');
const bioInput      = qs('#profileBioInput');
const photoInput    = qs('#profilePhotoInput');
const bannerInput   = qs('#profileBannerInput');

const btnEditProfile = qs('#btn-edit-profile');
const btnSaveProfile = qs('#btnSaveProfile');
const btnCancelEdit  = qs('#bio-cancel');

const statPosts     = qs('#stat-posts');
const statFollowers = qs('#stat-followers');
const statFollowing = qs('#stat-following');
const statLikes     = qs('#stat-likes');

const profileGrid   = qs('#profile-grid');
const profileEmpty  = qs('#profile-empty');


// ---------- Only show “owner-only” elements when logged in ----------
function applyOwnerVisibility(user) {
  qsa('.owner-only').forEach(el => {
    el.style.display = user ? '' : 'none';
  });
}


// =======================================================
// ✏️ EDIT PROFILE
// =======================================================

$on(btnEditProfile, 'click', () => {
  if (!auth.currentUser) return alert("Sign in to edit profile.");

  bioEditWrap.style.display = "block";

  nameInput.value = profileName.textContent.trim();
  bioInput.value = bioView.textContent === "Add a short bio to introduce yourself."
    ? ""
    : bioView.textContent.trim();
});

$on(btnCancelEdit, 'click', () => {
  bioEditWrap.style.display = "none";
});


// ---------- SAVE PROFILE ----------
$on(btnSaveProfile, 'click', async () => {
  const user = auth.currentUser;
  if (!user) return alert("Sign in to update profile.");

  const name = nameInput.value.trim();
  const bio  = bioInput.value.trim();

  try {
    const { ref, uploadBytes, getDownloadURL } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js");

    const { doc, setDoc, serverTimestamp } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

    const { updateProfile } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js");

    // Avatar Upload
    if (photoInput.files[0]) {
      const avatarRef = ref(storage, `avatars/${user.uid}_${Date.now()}.jpg`);
      await uploadBytes(avatarRef, photoInput.files[0]);
      const url = await getDownloadURL(avatarRef);
      await updateProfile(user, { photoURL: url });
      profilePhotoImg.src = url;
    }

    // Banner Upload
    if (bannerInput.files[0]) {
      const bannerRef = ref(storage, `banners/${user.uid}_${Date.now()}.jpg`);
      await uploadBytes(bannerRef, bannerInput.files[0]);
      const url = await getDownloadURL(bannerRef);
      profileBanner.style.backgroundImage = `url(${url})`;
    }

    // Update Firestore
    await setDoc(doc(db, "users", user.uid), {
      name,
      bio,
      updatedAt: serverTimestamp()
    }, { merge: true });

    if (name) await updateProfile(user, { displayName: name });

    profileName.textContent = name || user.displayName || "Your Name";
    bioView.textContent = bio || "Add a short bio to introduce yourself.";

    bioEditWrap.style.display = "none";
    alert("✅ Profile updated!");

  } catch (err) {
    alert("❌ Update failed: " + err.message);
    console.error(err);
  }
});


// =======================================================
// 📚 LOAD PROFILE PANEL
// =======================================================

async function loadProfilePane(user) {
  if (!user) {
    profileName.textContent = "Your Name";
    profileHandle.textContent = "@username";
    profilePhotoImg.src = "";
    bioView.textContent = "Add a short bio to introduce yourself.";
    profileBanner.style.backgroundImage = "none";
    profileGrid.innerHTML = "";
    profileEmpty.style.display = "block";
    return;
  }

  try {
    const { doc, getDoc } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

    const snap = await getDoc(doc(db, "users", user.uid));
    const data = snap.exists() ? snap.data() : {};

    profileName.textContent = data.name || user.displayName || "Your Name";
    profileHandle.textContent = "@" + (data.username || user.email.split("@")[0]);
    bioView.textContent = data.bio?.trim() || "Add a short bio to introduce yourself.";

    if (user.photoURL) profilePhotoImg.src = user.photoURL;

    await loadUserPosts(user.uid);

  } catch (err) {
    console.error("Profile load error:", err);
  }
}


// =======================================================
// 🖼️ LOAD USER POSTS ON PROFILE
// =======================================================

async function loadUserPosts(uid) {
  const { collection, getDocs, query, where, orderBy } =
    await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

  const qRef = query(
    collection(db, "posts"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(qRef);
  const posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  profileGrid.innerHTML = "";

  if (posts.length === 0) {
    profileEmpty.style.display = "block";
  } else {
    profileEmpty.style.display = "none";

    posts.forEach(p => {
      const card = document.createElement("div");
      card.className = "profile-post-card";

      const thumb = p.thumbnailUrl || "placeholder.png";

      card.innerHTML = `
        <div class="thumb">
          <img src="${thumb}">
          <div class="overlay">
            <span>${p.type.toUpperCase()}</span>
            <button class="danger delete-post" data-id="${p.id}">
              <i class="fa fa-trash"></i>
            </button>
          </div>
        </div>
        <h4>${p.title}</h4>
      `;

      profileGrid.appendChild(card);
    });
  }

  statPosts.textContent = posts.length;
}


// =======================================================
// 🗑 DELETE POST
// =======================================================

$on(profileGrid, "click", async e => {
  const btn = e.target.closest(".delete-post");
  if (!btn) return;

  if (!confirm("Delete this post permanently?")) return;

  try {
    const { doc, deleteDoc } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

    await deleteDoc(doc(db, "posts", btn.dataset.id));

    btn.closest(".profile-post-card").remove();
    alert("🗑️ Post deleted.");

  } catch (err) {
    alert("❌ Delete failed: " + err.message);
  }
});


// =======================================================
// ⚙️ SETTINGS — TOGGLES
// =======================================================

const togglePrivate = qs("#toggle-private");
const toggleUploads = qs("#toggle-uploads");
const toggleSaved   = qs("#toggle-saved");

function setToggle(el, on) {
  el.dataset.on = on ? "true" : "false";
  el.classList.toggle("active", on);
  el.textContent = on ? "ON" : "OFF";
}

async function loadUserSettings(uid) {
  const { doc, getDoc } =
    await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return;

  const s = snap.data();

  setToggle(togglePrivate, s.private || false);
  setToggle(toggleUploads, s.showUploads ?? true);
  setToggle(toggleSaved,   s.showSaved ?? true);
}

async function saveUserSetting(field, value) {
  const user = auth.currentUser;
  if (!user) return;

  const { doc, updateDoc } =
    await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

  await updateDoc(doc(db, "users", user.uid), { [field]: value });
}

[togglePrivate, toggleUploads, toggleSaved].forEach(tog => {
  $on(tog, "click", () => {
    const newState = tog.dataset.on !== "true";
    setToggle(tog, newState);

    if (tog === togglePrivate) saveUserSetting("private", newState);
    if (tog === toggleUploads) saveUserSetting("showUploads", newState);
    if (tog === toggleSaved)   saveUserSetting("showSaved", newState);

    alert(`Setting updated: ${tog.id.replace("toggle-", "")}`);
  });
});


// =======================================================
// 🎧 MINI AUDIO PLAYER
// =======================================================

const miniPlayer = qs('#mini-player');
const miniAudio  = qs('#mp-audio');
const miniPlay   = qs('#mp-play');
const miniClose  = qs('#mp-close');

let isPlaying = false;

function playPodcast(url, title = "Now Playing") {
  if (!url) return alert("Invalid audio URL");

  miniPlayer.hidden = false;
  miniAudio.src = url;

  miniAudio.play()
    .then(() => {
      isPlaying = true;
      miniPlay.innerHTML = `<i class="fa fa-pause"></i>`;
    })
    .catch(err => console.warn("Audio failed:", err));
}

$on(miniPlay, "click", () => {
  if (!miniAudio.src) return;
  if (isPlaying) {
    miniAudio.pause();
    miniPlay.innerHTML = `<i class="fa fa-play"></i>`;
  } else {
    miniAudio.play();
    miniPlay.innerHTML = `<i class="fa fa-pause"></i>`;
  }
  isPlaying = !isPlaying;
});

$on(miniClose, "click", () => {
  miniAudio.pause();
  miniAudio.src = "";
  miniPlayer.hidden = true;
  isPlaying = false;
});


// =======================================================
// 🚀 BOOT SYSTEM
// =======================================================

document.addEventListener("intakee:auth", async e => {
  const user = e.detail.user;

  applyOwnerVisibility(user);

  if (user) {
    await loadProfilePane(user);
    await loadUserSettings(user.uid);
  }

  await loadFeeds();
});

// FIRST LOAD
(async () => {
  console.log("🚀 INTAKEE is starting...");
  await loadFeeds();
  console.log("✅ INTAKEE ready.");
})();
