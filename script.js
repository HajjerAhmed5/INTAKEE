// ============================================================================
// INTAKEE — Main App Logic (FINAL BUILD)
// Auth • Uploads • Profile • Feeds • Settings • Analytics • Legal Pages
// Works with Firebase initialized in index.html
// ============================================================================

'use strict';

// ---------- IMPORTS ----------
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

import {
  getFirestore, collection, addDoc, getDocs, getDoc, setDoc, updateDoc, doc,
  query, where, orderBy, serverTimestamp, limit
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

import {
  getStorage, ref, uploadBytes, uploadBytesResumable, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

// ---------- FIREBASE REFERENCES ----------
const { app, auth, db, storage, onAuthStateChanged: onAuthStateChangedFromInit } = (window.firebaseRefs || {});
;
if (!app || !auth || !db || !storage) {
  console.error("❌ Firebase not ready. Check the init block in index.html");
}
// ---------- DOM HELPERS ----------
const qs  = (s, sc) => (sc || document).querySelector(s);
const qsa = (s, sc) => Array.from((sc || document).querySelectorAll(s));
const $on = (el, ev, fn) => el && el.addEventListener(ev, fn);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ---------- ELEMENTS ----------
const dlgAuth = qs('#authDialog');
const signUpForm = qs('#authSignUpForm');
const signInForm = qs('#authSignInForm');
const logoutBtn  = qs('#settings-logout');
const btnUpload  = qs('#btnUpload');
const upFile     = qs('#uploadFileInput');
const upThumb    = qs('#uploadThumbInput');
const upTitle    = qs('#uploadTitleInput');
const upDesc     = qs('#uploadDescInput');
const upType     = qs('#uploadTypeSelect');
const homeFeed   = qs('#home-feed');
const videosFeed = qs('#videos-feed');
const podcastFeed= qs('#podcast-feed');
const clipsFeed  = qs('#clips-feed');
const homePills  = qsa('#tab-home .pills .pill');

// PROFILE elements
const profileName = qs('#profile-name');
const profileHandle = qs('#profile-handle');
const profilePhotoImg = qs('#profile-photo');
const profileBanner = qs('#profileBanner');
const bioView = qs('#bio-view');
const bioEditWrap = qs('#bio-edit-wrap');
const nameInput = qs('#profileNameInput');
const bioInput = qs('#profileBioInput');
const photoInput = qs('#profilePhotoInput');
const bannerInput = qs('#profileBannerInput');
const btnSaveProfile = qs('#btnSaveProfile');
const btnCancelEdit = qs('#bio-cancel');
const statPosts = qs('#stat-posts');
const statFollowers = qs('#stat-followers');
const statFollowing = qs('#stat-following');
const statLikes = qs('#stat-likes');
const profileGrid = qs('#profile-grid');
const profileEmpty = qs('#profile-empty');
const playPodcast = window.playPodcast;

 // ============================================================================
let _isLoadingFeed = false;
// ============================================================================
// AUTH SECTION (fixed + stable Firebase connection)
// ============================================================================

// --- Create Account ---
$on(signUpForm, 'submit', async (e) => {
  e.preventDefault();
  const name = qs('#signUpName').value.trim();
  const email = qs('#signUpEmail').value.trim();
  const pass = qs('#signUpPassword').value.trim();
  const ageOK = qs('#signUpAge').checked;

  if (!ageOK) return alert("You must confirm you are 13 or older.");
  if (!email || !pass) return alert("Enter email and password.");

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (name) await updateProfile(cred.user, { displayName: name });

    await setDoc(doc(db, 'users', cred.user.uid), {
      name: name || cred.user.displayName || '',
      bio: '',
      followers: 0,
      following: 0,
      likes: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    dlgAuth?.close();
    alert('✅ Account created!');
  } catch (err) {
    console.error('Signup error:', err);
    if (err.code === 'auth/email-already-in-use')
      alert('You already have an account. Try signing in instead.');
    else alert(err.message);
  }
});

// --- Sign In ---
$on(signInForm, 'submit', async (e) => {
  e.preventDefault();
  const email = qs('#signInEmail').value.trim();
  const pass = qs('#signInPassword').value.trim();
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    dlgAuth?.close();
    alert('✅ Signed in!');
  } catch (err) {
    console.error('Signin error:', err);
    if (err.code === 'auth/invalid-credential')
      alert('Invalid email or password. Please try again.');
    else alert(err.message);
  }
});

// --- Logout ---
// ============================================================================
// OWNER VISIBILITY (shows/hides elements based on login state)
// ============================================================================
function applyOwnerVisibility(user) {
  const isOwner = !!user;
  qsa('.owner-only').forEach(el => el.style.display = isOwner ? '' : 'none');

  // Hide mini-player when logged out
  if (!isOwner) {
    try {
      qs('#mp-audio')?.pause();
      qs('#mini-player')?.setAttribute('hidden', '');
    } catch {}
  }
}

$on(logoutBtn, 'click', async () => {
  try {
    await signOut(auth);
    alert('You’ve been logged out.');
  } catch (e) {
    console.error('Logout failed:', e);
    alert('Logout failed. Please refresh and try again.');
  }
});

// --- Auth State Listener ---
// ============================================================================
// OWNER VISIBILITY (shows/hides elements based on login state)
// ============================================================================
function applyOwnerVisibility(user) {
  const isOwner = !!user;
  qsa('.owner-only').forEach(el => el.style.display = isOwner ? '' : 'none');

  // Hide mini-player when logged out
  if (!isOwner) {
    try {
      qs('#mp-audio')?.pause();
      qs('#mini-player')?.setAttribute('hidden', '');
    } catch {}
  }
}
onAuthStateChanged(auth, async (user) => {
  console.log('Auth state:', user ? user.uid : '(no user)');
  document.dispatchEvent(new CustomEvent('intakee:auth', { detail: { user } }));
  applyOwnerVisibility(user);
  if (user) {
    await Promise.all([loadHomeFeed(), loadProfilePane(user)]);
  } else {
    clearAllFeedsForLoggedOut();
    await loadProfilePane(null);
  }
});
// ============================================================================
// UPLOADS
// ============================================================================
$on(qs("#goLiveBtn"), "click", () => {
  alert("🎥 Live streaming will be available soon.");
});

$on(btnUpload, "click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Please sign in to upload.");
  const type  = upType.value;
  const title = upTitle.value.trim();
  const desc  = upDesc.value.trim();
  const file  = upFile.files?.[0];
  const thumb = upThumb.files?.[0];
  if (!file)  return alert("Choose a video or audio file.");
  if (!title) return alert("Enter a title.");

  const originalText = btnUpload.textContent;
  btnUpload.disabled = true;
  btnUpload.textContent = "Uploading …";

  try {
    // Upload main media
    const mediaRef = ref(storage, `uploads/${user.uid}/${Date.now()}_${file.name}`);
    const task = uploadBytesResumable(mediaRef, file);
    task.on("state_changed", snap => {
      const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
      btnUpload.textContent = `Uploading ${pct}%`;
    });
    await task;
    const mediaUrl = await getDownloadURL(mediaRef);

    // Upload thumbnail (optional)
    let thumbnailUrl = "";
    if (thumb) {
      const tRef = ref(storage, `thumbnails/${user.uid}/${Date.now()}_${thumb.name}`);
      await uploadBytes(tRef, thumb);
      thumbnailUrl = await getDownloadURL(tRef);
    }

    // Save post doc
    await addDoc(collection(db, "posts"), {
      uid: user.uid,
      type, title, desc,
      mediaUrl, thumbnailUrl,
      views: 0, likeCount: 0, commentCount: 0,
      createdAt: serverTimestamp()
    });

    alert("✅ Upload complete!");
    upTitle.value = ""; upDesc.value = "";
    upFile.value = ""; upThumb.value = "";

    await loadHomeFeed();
    if (location.hash === "#profile") await loadProfileGrid(user.uid);
  } catch (err) {
    console.error("Upload failed:", err);
    alert("Upload failed: " + err.message);
  } finally {
    btnUpload.disabled = false;
    btnUpload.textContent = originalText;
  }
});

// ============================================================================
// FEEDS & SEARCH
// ============================================================================
async function fetchLatestPosts() {
  if (!auth.currentUser) return [];
  const qRef = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(50));
  const snap = await getDocs(qRef);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function clearAllFeedsForLoggedOut() {
  const msg = `<div class="muted">Sign in to view or upload posts.</div>`;
  if (homeFeed) homeFeed.innerHTML = msg;
  if (videosFeed) videosFeed.innerHTML = msg;
  if (podcastFeed) podcastFeed.innerHTML = msg;
  if (clipsFeed) clipsFeed.innerHTML = msg;
}

function renderHome(filter = "all") {
  if (!homeFeed) return;
  homeFeed.innerHTML = "";
  const list = _postsCache.filter(p => {
    if (filter === "all" || filter === "new") return true;
    if (filter === "following") return false;
    if (filter === "podcast") return p.type?.startsWith("podcast");
    return p.type === filter;
  });
  if (!list.length) {
    homeFeed.innerHTML = `<div class="muted">No posts yet.</div>`;
    return;
  }
  list.forEach(post => {
    let el;
    if (post.type === "video" || post.type === "podcast-video") el = window.renderVideoCard?.(post);
    else if (post.type?.startsWith("podcast")) el = window.renderPodcastRow?.(post);
    else if (post.type === "clip") el = window.renderClipFullScreen?.(post);
    else el = window.renderVideoCard?.(post);
    homeFeed.appendChild(el || document.createTextNode(""));
  });
}

function renderByType(feedEl, typePrefix) {
  if (!feedEl) return;
  feedEl.innerHTML = "";
  const list = _postsCache.filter(p => typePrefix === "podcast" ? p.type?.startsWith("podcast") : p.type === typePrefix);
  if (!list.length) {
    feedEl.innerHTML = `<div class="muted">No ${typePrefix}s yet.</div>`;
    return;
  }
  list.forEach(p => {
    let el;
    if (typePrefix === "video") el = window.renderVideoCard?.(p);
    else if (typePrefix === "podcast") el = window.renderPodcastRow?.(p);
    else if (typePrefix === "clip") el = window.renderClipFullScreen?.(p);
    feedEl.appendChild(el || document.createTextNode(""));
  });
}

async function loadHomeFeed() {
  if (_isLoadingFeed) return;
  _isLoadingFeed = true;
  try {
    _postsCache = await fetchLatestPosts();
  } catch (e) {
    console.warn("Feed load warning:", e.message);
    _postsCache = [];
  } finally {
    _isLoadingFeed = false;
  }
  renderHome("all");
  // ============================================================================
// ACCESS CONTROL — guest vs signed-in users
// ============================================================================

// 1. Allow everyone to view public feeds
//    but block age-restricted posts unless logged in
function canViewPost(post) {
  // Always allow if no restriction flag
  if (!post.ageRestricted) return true;

  // If restricted, allow only signed-in users age 13+
  const user = auth.currentUser;
  if (!user) return false;
  try {
    const birthYear = user.birthYear || 0; // (optional: add in signup later)
    const age = new Date().getFullYear() - birthYear;
    return age >= 13;
  } catch {
    return true; // fallback allow
  }
}

// Modify your feed rendering to respect this:
function renderHome(filter = 'all') {
  if (!homeFeed) return;
  homeFeed.innerHTML = '';

  const list = _postsCache.filter(p => {
    if (!canViewPost(p)) return false;
    if (filter === 'all') return true;
    if (filter === 'new') return true;
    if (filter === 'following') return false;
    if (filter === 'podcast') return p.type?.startsWith('podcast');
    return p.type === filter;
  });

  if (!list.length) {
    homeFeed.innerHTML = `<div class="muted">No posts yet.</div>`;
    return;
  }

  list.forEach(post => {
    let el;
    if (post.type === 'video' || post.type === 'podcast-video') {
      el = window.renderVideoCard?.(post);
    } else if (post.type?.startsWith('podcast')) {
      el = window.renderPodcastRow?.(post);
    } else if (post.type === 'clip') {
      el = window.renderClipFullScreen?.(post);
    }
    if (el) homeFeed.appendChild(el);
  });
}

// 2. Protect interactions (likes, comments, follows, uploads)
window.requireAuth = function (action = "interact") {
  if (!auth.currentUser) {
    alert(`Sign in to ${action} on INTAKEE.`);
    return false;
  }
  return true;
};

// Example usage inside your code:
// if (!requireAuth("like this post")) return;
// if (!requireAuth("upload")) return;

// 3. Add guest warning for restricted posts
function renderRestrictedMessage() {
  const div = document.createElement('div');
  div.className = 'restricted-overlay';
  div.innerHTML = `
    <div class="restricted-message">
      <i class="fa fa-lock"></i>
      <p>This content is age-restricted. Please sign in to view.</p>
      <button class="primary" onclick="document.getElementById('authDialog').showModal()">Sign In</button>
    </div>
  `;
  return div;
}
// Optional — in renderVideoCard/renderPodcastRow, you can insert:
// if (post.ageRestricted && !auth.currentUser) return renderRestrictedMessage();
  renderByType(videosFeed, "video");
  renderByType(podcastFeed, "podcast");
  renderByType(clipsFeed, "clip");
}

homePills.forEach(btn => {
  $on(btn, "click", () => {
    qsa("#tab-home .pill").forEach(b => b.classList.toggle("active", b === btn));
    const f = btn.dataset.filter;
    renderHome(f === "newest" ? "new" : f);
  });
});

// Debounced search
function debounce(fn, ms = 200) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
$on(qs("#globalSearch"), "input", debounce(e => searchAll(e.target.value)));
$on(qs("#videosSearch"), "input", debounce(e => filterSection(videosFeed, "video", e.target.value)));
$on(qs("#podcastSearch"), "input", debounce(e => filterSection(podcastFeed, "podcast", e.target.value)));
$on(qs("#clipsSearch"), "input", debounce(e => filterSection(clipsFeed, "clip", e.target.value)));

function searchAll(term = "") {
  if (!homeFeed) return;
  const t = term.trim().toLowerCase();
  if (!t) return renderHome("all");
  const list = _postsCache.filter(p => (p.title || "").toLowerCase().includes(t) || (p.desc || "").toLowerCase().includes(t));
  homeFeed.innerHTML = "";
  if (!list.length) { homeFeed.innerHTML = `<div class="muted">No results.</div>`; return; }
  list.forEach(p => homeFeed.appendChild(
    (p.type === "clip" ? window.renderClipFullScreen?.(p)
     : p.type?.startsWith("podcast") ? window.renderPodcastRow?.(p)
     : window.renderVideoCard?.(p)) || document.createTextNode("")
  ));
}

function filterSection(feedEl, typePrefix, term = "") {
  if (!feedEl) return;
  const t = term.trim().toLowerCase();
  const list = _postsCache.filter(p =>
    (typePrefix === "podcast" ? p.type?.startsWith("podcast") : p.type === typePrefix) &&
    ((p.title || "").toLowerCase().includes(t) || (p.desc || "").toLowerCase().includes(t))
  );
  feedEl.innerHTML = "";
  if (!list.length) { feedEl.innerHTML = `<div class="muted">No results.</div>`; return; }
  list.forEach(p => {
    let el;
    if (typePrefix === "video") el = window.renderVideoCard?.(p);
    else if (typePrefix === "podcast") el = window.renderPodcastRow?.(p);
    else if (typePrefix === "clip") el = window.renderClipFullScreen?.(p);
    feedEl.appendChild(el || document.createTextNode(""));
  });
}

// ============================================================================
// PROFILE (view + edit)
// ============================================================================
$on(qs("#btn-edit-profile"), "click", () => {
  if (!auth.currentUser) return alert("Sign in to edit your profile.");
  bioEditWrap.style.display = "";
});
$on(btnCancelEdit, "click", () => { bioEditWrap.style.display = "none"; });

$on(btnSaveProfile, "click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Sign in first.");
  const name = nameInput.value.trim();
  const bio = bioInput.value.trim();
  try {
    if (photoInput.files?.[0]) {
      const r = ref(storage, `avatars/${user.uid}.jpg`);
      await uploadBytes(r, photoInput.files[0]);
      const url = await getDownloadURL(r);
      await updateProfile(user, { photoURL: url });
      profilePhotoImg.src = url;
    }
    if (bannerInput.files?.[0]) {
      const r = ref(storage, `banners/${user.uid}.jpg`);
      await uploadBytes(r, bannerInput.files[0]);
      const url = await getDownloadURL(r);
      profileBanner.style.backgroundImage = `url(${url})`;
    }
    if (name) { await updateProfile(user, { displayName: name }); profileName.textContent = name; }

    await setDoc(doc(db, "users", user.uid), {
      name: name || user.displayName || "",
      bio, updatedAt: serverTimestamp()
    }, { merge: true });

    bioView.textContent = bio || "Add a short bio to introduce yourself.";
    bioEditWrap.style.display = "none";
    alert("✅ Profile updated!");
  } catch (e) {
    alert("Profile update failed: " + e.message);
  }
});

async function loadProfilePane(user) {
  if (!profileName) return;
  if (!user) {
    profileName.textContent = "Your Name";
    profileHandle.textContent = "@username";
    profilePhotoImg.removeAttribute("src");
    bioView.textContent = "Add a short bio to introduce yourself.";
    profileBanner.style.backgroundImage = "none";
    profileGrid.innerHTML = "";
    profileEmpty.style.display = "";
    statPosts.textContent = statFollowers.textContent = statFollowing.textContent = statLikes.textContent = "0";
    return;
  }
  const uDoc = await getDoc(doc(db, "users", user.uid));
  const u = uDoc.exists() ? uDoc.data() : {};
  profileName.textContent = user.displayName || u.name || "Your Name";
  profileHandle.textContent = "@" + (user.email?.split("@")[0] || "user");
  bioView.textContent = (u.bio || "").trim() || "Add a short bio to introduce yourself.";
  if (user.photoURL) profilePhotoImg.src = user.photoURL;
  statFollowers.textContent = u.followers || 0;
  statFollowing.textContent = u.following || 0;
  statLikes.textContent = u.likes || 0;
  await loadProfileGrid(user.uid);
}

async function loadProfileGrid(uid) {
  const snap = await getDocs(query(collection(db, "posts"), where("uid", "==", uid), orderBy("createdAt", "desc")));
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  profileGrid.innerHTML = "";
  if (!items.length) { profileEmpty.style.display = ""; }
  else {
    profileEmpty.style.display = "none";
    items.forEach(p => {
      const el = p.type === "clip" ? window.renderClipFullScreen?.(p)
        : p.type?.startsWith("podcast") ? window.renderPodcastRow?.(p)
        : window.renderVideoCard?.(p);
      const box = document.createElement("div");
      box.className = "card"; if (el) box.appendChild(el);
      profileGrid.appendChild(box);
    });
  }
  statPosts.textContent = String(items.length);
}
// ============================================================================
// SETTINGS (toggles, privacy, delete, etc.)
// ============================================================================

async function loadUserSettings(user) {
  if (!user) return;
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    const data = snap.exists() ? (snap.data().settings || {}) : {};
    _userSettings = data;
    applyToggle("#toggle-private", data.private);
    applyToggle("#toggle-uploads", data.uploadsVisible);
    applyToggle("#toggle-likes", data.likesVisible);
    applyToggle("#toggle-saved", data.savedVisible);
    applyToggle("#toggle-playlists", data.playlistsVisible);
  } catch (e) {
    console.warn("Settings load error:", e.message);
  }
}

function applyToggle(id, on) {
  const el = qs(id);
  if (!el) return;
  el.dataset.on = on ? "true" : "false";
  el.classList.toggle("on", !!on);
}

function toggleSetting(id, key) {
  const el = qs(id);
  if (!el) return;
  const newVal = el.dataset.on !== "true";
  el.dataset.on = newVal ? "true" : "false";
  el.classList.toggle("on", newVal);
  const user = auth.currentUser;
  if (user)
    setDoc(doc(db, "users", user.uid), { settings: { [key]: newVal } }, { merge: true });
}

$on(qs("#toggle-private"),   "click", () => toggleSetting("#toggle-private",   "private"));
$on(qs("#toggle-uploads"),   "click", () => toggleSetting("#toggle-uploads",   "uploadsVisible"));
$on(qs("#toggle-likes"),     "click", () => toggleSetting("#toggle-likes",     "likesVisible"));
$on(qs("#toggle-saved"),     "click", () => toggleSetting("#toggle-saved",     "savedVisible"));
$on(qs("#toggle-playlists"), "click", () => toggleSetting("#toggle-playlists", "playlistsVisible"));

// Delete account placeholder
qsa(".settings-item .ghost").forEach(btn => {
  $on(btn, "click", () => alert("⚙️ This feature will be available soon."));
});

// ============================================================================
// ANALYTICS COUNTERS (views, likes, follows)
// ============================================================================

// Increment view count
window.incrementView = async function (postId) {
  try {
    const postRef = doc(db, "posts", postId);
    const snap = await getDoc(postRef);
    if (snap.exists()) {
      const data = snap.data();
      await updateDoc(postRef, { views: (data.views || 0) + 1 });
    }
  } catch (e) {
    console.warn("View increment error:", e.message);
  }
};

// Like / Unlike
window.toggleLike = async function (postId, liked) {
  try {
    const postRef = doc(db, "posts", postId);
    const snap = await getDoc(postRef);
    if (snap.exists()) {
      const data = snap.data();
      const newCount = (data.likeCount || 0) + (liked ? 1 : -1);
      await updateDoc(postRef, { likeCount: Math.max(newCount, 0) });
    }
  } catch (e) {
    console.warn("Like toggle error:", e.message);
  }
};

// Follow / Unfollow
window.toggleFollow = async function (targetUid, follow = true) {
  const user = auth.currentUser;
  if (!user || user.uid === targetUid) return;
  try {
    const uRef = doc(db, "users", user.uid);
    const tRef = doc(db, "users", targetUid);
    const uSnap = await getDoc(uRef);
    const tSnap = await getDoc(tRef);
    const uData = uSnap.exists() ? uSnap.data() : {};
    const tData = tSnap.exists() ? tSnap.data() : {};
    await updateDoc(uRef, { following: (uData.following || 0) + (follow ? 1 : -1) });
    await updateDoc(tRef, { followers: (tData.followers || 0) + (follow ? 1 : -1) });
    alert(follow ? "✅ Followed!" : "Unfollowed.");
  } catch (e) {
    console.warn("Follow toggle error:", e.message);
  }
};

// ============================================================================
// BOOT SEQUENCE
// ============================================================================
(async function boot() {
  try {
    if (!auth.currentUser) {
      clearAllFeedsForLoggedOut();
    } else {
      await loadHomeFeed();
      await loadUserSettings(auth.currentUser);
      await loadProfilePane(auth.currentUser);
    }
    window.loadLegalPages?.();
    console.log("✅ INTAKEE boot complete — all systems ready.");
  } catch (e) {
    console.error("Boot error:", e);
  }
})();
