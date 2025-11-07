// ============================================================================
// INTAKEE — vLaunch1 (Full Functional JS)
// ============================================================================

'use strict';

// ---------- Firebase Refs (From index.html) ----------
const { app, auth, db, storage, onAuthStateChanged } = window.firebaseRefs || {};
if (!app || !auth || !db || !storage) {
  alert("Firebase not connected. Check index.html config.");
  throw new Error("Firebase not initialized");
}

// ---------- Helpers ----------
const qs = (s, sc) => (sc || document).querySelector(s);
const qsa = (s, sc) => Array.from((sc || document).querySelectorAll(s));
const $on = (el, ev, fn) => el && el.addEventListener(ev, fn);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Elements ----------
const dlgAuth = qs('#authDialog');
const signUpForm = qs('#authSignUpForm');
const signInForm = qs('#authSignInForm');
const logoutBtn = qs('#settings-logout');

// Upload
const upType = qs('#uploadTypeSelect');
const upTitle = qs('#uploadTitleInput');
const upDesc = qs('#uploadDescInput');
const upThumb = qs('#uploadThumbInput');
const upFile = qs('#uploadFileInput');
const btnUpload = qs('#btnUpload');

// Feeds
const homeFeed = qs('#home-feed');
const videosFeed = qs('#videos-feed');
const podcastFeed = qs('#podcast-feed');
const clipsFeed = qs('#clips-feed');

// Search bars
const searchGlobal = qs('#globalSearch');
const searchVideos = qs('#videosSearch');
const searchPodcast = qs('#podcastSearch');
const searchClips = qs('#clipsSearch');

// Profile
const profileName = qs('#profile-name');
const profileHandle = qs('#profile-handle');
const profilePhotoImg = qs('#profile-photo');
const profileBanner = qs('#profileBanner');
const btnEditProfile = qs('#btn-edit-profile');
const btnSaveProfile = qs('#btnSaveProfile');
const btnCancelEdit = qs('#bio-cancel');
const bioView = qs('#bio-view');
const bioEditWrap = qs('#bio-edit-wrap');
const nameInput = qs('#profileNameInput');
const bioInput = qs('#profileBioInput');
const photoInput = qs('#profilePhotoInput');
const bannerInput = qs('#profileBannerInput');
const profileGrid = qs('#profile-grid');
const profileEmpty = qs('#profile-empty');

// Mini Player
const miniPlayer = qs('#mini-player');
const mpAudio = qs('#mp-audio');
const mpClose = qs('#mp-close');

// Settings toggles
const toggles = qsa('.toggle');

// ---------- State ----------
let _postsCache = [];
let _currentUser = null;

// ============================================================================
// AUTHENTICATION
// ============================================================================

$on(signUpForm, 'submit', async (e) => {
  e.preventDefault();
  const email = qs('#signUpEmail').value.trim();
  const pass = qs('#signUpPassword').value.trim();
  const displayName = qs('#signUpName').value.trim();
  const ageOK = qs('#signUpAge').checked;

  if (!ageOK) return alert("You must confirm you are 13 or older.");

  try {
    const { createUserWithEmailAndPassword, updateProfile } = await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js");
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName });

    await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js")
      .then(({ setDoc, doc, serverTimestamp }) =>
        setDoc(doc(db, 'users', cred.user.uid), {
          name: displayName || '',
          bio: '',
          createdAt: serverTimestamp()
        })
      );

    alert('✅ Account created!');
    dlgAuth.close();
  } catch (err) {
    alert(err.message);
  }
});

$on(signInForm, 'submit', async (e) => {
  e.preventDefault();
  const email = qs('#signInEmail').value.trim();
  const pass = qs('#signInPassword').value.trim();

  try {
    const { signInWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js");
    await signInWithEmailAndPassword(auth, email, pass);
    alert('✅ Signed in!');
    dlgAuth.close();
  } catch (err) {
    alert(err.message);
  }
});

$on(logoutBtn, 'click', async () => {
  const { signOut } = await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js");
  await signOut(auth);
  alert("Logged out");
});

// ============================================================================
// AUTH STATE
// ============================================================================

onAuthStateChanged(auth, async (user) => {
  _currentUser = user;
  document.dispatchEvent(new CustomEvent('intakee:auth', { detail: { user } }));
  if (user) {
    await loadFeeds();
    await loadProfile(user);
  } else {
    clearFeeds();
    resetProfile();
  }
});

// ============================================================================
// UPLOADS
// ============================================================================

$on(btnUpload, 'click', async () => {
  if (!_currentUser) return alert("Sign in to upload first.");

  const title = upTitle.value.trim();
  const desc = upDesc.value.trim();
  const file = upFile.files?.[0];
  const thumb = upThumb.files?.[0];
  const type = upType.value;

  if (!title || !file) return alert("Please provide a title and file.");

  btnUpload.disabled = true;
  btnUpload.textContent = "Uploading…";

  const { ref, uploadBytesResumable, getDownloadURL } = await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js");
  const { addDoc, collection, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

  try {
    // Upload media
    const mediaRef = ref(storage, `uploads/${_currentUser.uid}/${Date.now()}_${file.name}`);
    const task = uploadBytesResumable(mediaRef, file);
    await task;
    const mediaUrl = await getDownloadURL(mediaRef);

    // Thumbnail
    let thumbnailUrl = '';
    if (thumb) {
      const tRef = ref(storage, `thumbnails/${_currentUser.uid}/${Date.now()}_${thumb.name}`);
      await uploadBytesResumable(tRef, thumb);
      thumbnailUrl = await getDownloadURL(tRef);
    }

    await addDoc(collection(db, 'posts'), {
      uid: _currentUser.uid,
      title, desc, type, mediaUrl, thumbnailUrl,
      views: 0, likes: 0,
      createdAt: serverTimestamp()
    });

    alert("✅ Upload complete!");
    upFile.value = upThumb.value = upTitle.value = upDesc.value = '';
    await loadFeeds();
  } catch (err) {
    alert("Upload failed: " + err.message);
  } finally {
    btnUpload.disabled = false;
    btnUpload.textContent = "Upload";
  }
});

// ============================================================================
// FEEDS
// ============================================================================

async function loadFeeds() {
  const { getDocs, query, collection, orderBy, limit } = await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");
  const snap = await getDocs(query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50)));
  _postsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  renderFeed(homeFeed, _postsCache);
  renderFeed(videosFeed, _postsCache.filter(p => p.type === 'video'));
  renderFeed(podcastFeed, _postsCache.filter(p => p.type.includes('podcast')));
  renderFeed(clipsFeed, _postsCache.filter(p => p.type === 'clip'));
}

function renderFeed(container, list) {
  if (!container) return;
  container.innerHTML = '';
  if (!list.length) {
    container.innerHTML = `<div class="muted">No posts yet.</div>`;
    return;
  }

  list.forEach(p => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <div class="thumb-16x9">
        <img src="${p.thumbnailUrl || ''}" alt="">
      </div>
      <h4>${p.title}</h4>
      <p class="muted small">${p.desc || ''}</p>
      <button class="ghost delete-btn" data-id="${p.id}">Delete</button>
      ${p.type.includes('podcast') ? `<button class="primary play-btn" data-url="${p.mediaUrl}" data-title="${p.title}">Play</button>` : ''}
    `;
    container.appendChild(card);
  });

  qsa('.play-btn', container).forEach(btn =>
    $on(btn, 'click', () => playPodcast(btn.dataset.url, btn.dataset.title))
  );

  qsa('.delete-btn', container).forEach(btn =>
    $on(btn, 'click', () => deletePost(btn.dataset.id))
  );
}

function clearFeeds() {
  [homeFeed, videosFeed, podcastFeed, clipsFeed].forEach(el => {
    if (el) el.innerHTML = `<div class="muted">Please sign in to upload and interact.</div>`;
  });
}

// ============================================================================
// DELETE POST
// ============================================================================

async function deletePost(id) {
  if (!_currentUser) return alert("Sign in first.");
  if (!confirm("Delete this post permanently?")) return;
  const { deleteDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");
  await deleteDoc(doc(db, 'posts', id));
  alert("Post deleted.");
  await loadFeeds();
  await loadProfile(_currentUser);
}

// ============================================================================
// PODCAST PLAYER (AUDIO ONLY)
// ============================================================================

function playPodcast(url, title) {
  if (!url) return;
  miniPlayer.hidden = false;
  mpAudio.src = url;
  mpAudio.play().catch(() => {});
  qs('#mp-title').textContent = title;
}

$on(mpClose, 'click', () => {
  mpAudio.pause();
  miniPlayer.hidden = true;
});

// ============================================================================
// PROFILE
// ============================================================================

async function loadProfile(user) {
  if (!user) return;
  const { getDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");
  const uDoc = await getDoc(doc(db, 'users', user.uid));
  const data = uDoc.exists() ? uDoc.data() : {};
  profileName.textContent = data.name || user.displayName || 'Your Name';
  profileHandle.textContent = '@' + (user.email?.split('@')[0] || 'user');
  bioView.textContent = data.bio || 'Add a short bio to introduce yourself.';
  await loadUserPosts(user.uid);
}

async function loadUserPosts(uid) {
  const { getDocs, query, collection, where, orderBy } = await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");
  const snap = await getDocs(query(collection(db, 'posts'), where('uid', '==', uid), orderBy('createdAt', 'desc')));
  const posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  profileGrid.innerHTML = '';
  if (!posts.length) {
    profileEmpty.style.display = '';
  } else {
    profileEmpty.style.display = 'none';
    posts.forEach(p => {
      const div = document.createElement('div');
      div.className = 'card';
      div.innerHTML = `<h4>${p.title}</h4><p class="muted small">${p.desc}</p>`;
      profileGrid.appendChild(div);
    });
  }
}

function resetProfile() {
  profileName.textContent = 'Your Name';
  profileHandle.textContent = '@username';
  profilePhotoImg.src = '';
  profileGrid.innerHTML = '';
  profileEmpty.style.display = '';
}

// Edit + Save Profile
$on(btnEditProfile, 'click', () => {
  if (!_currentUser) return alert("Sign in to edit profile.");
  bioEditWrap.style.display = '';
});
$on(btnCancelEdit, 'click', () => (bioEditWrap.style.display = 'none'));

$on(btnSaveProfile, 'click', async () => {
  if (!_currentUser) return alert("Sign in first.");
  const { updateProfile } = await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js");
  const { setDoc, doc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

  try {
    const name = nameInput.value.trim();
    const bio = bioInput.value.trim();
    if (name) await updateProfile(_currentUser, { displayName: name });
    await setDoc(doc(db, 'users', _currentUser.uid), { name, bio, updatedAt: serverTimestamp() }, { merge: true });
    bioEditWrap.style.display = 'none';
    alert("Profile updated!");
    await loadProfile(_currentUser);
  } catch (e) {
    alert("Error: " + e.message);
  }
});

// ============================================================================
// SETTINGS (Toggles)
// ============================================================================

toggles.forEach(t => {
  $on(t, 'click', () => {
    const on = t.dataset.on === 'true';
    t.dataset.on = String(!on);
    t.classList.toggle('active', !on);
  });
});

// ============================================================================
// BOOT
// ============================================================================

(async function boot() {
  if (auth.currentUser) await loadFeeds();
  console.log("✅ INTAKEE vLaunch1 Ready");
})();
