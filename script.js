// ============================================================================
// INTAKEE — Main App Logic (Auth, Uploads, Feeds, Profile, Search)
// Works with Firebase that is initialized in index.html (window.firebaseRefs)
// ============================================================================

'use strict';

// ---------- Firebase (use instance from index.html; DO NOT initialize here) ----------
import {
  // Auth
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

import {
  // Firestore
  getFirestore, collection, addDoc, getDocs, getDoc, setDoc, updateDoc, doc,
  query, where, orderBy, serverTimestamp, limit
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

import {
  // Storage
  getStorage, ref, uploadBytes, uploadBytesResumable, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

// Pull the already-initialized refs from index.html
const { app, auth, db, storage } = (window.firebaseRefs || {});
if (!app || !auth || !db || !storage) {
  console.error("❌ Firebase not ready. Check the init block in index.html.");
}

// ---------- Tiny DOM helpers ----------
const qs  = (s,sc)=> (sc||document).querySelector(s);
const qsa = (s,sc)=> Array.from((sc||document).querySelectorAll(s));
const $on = (el, ev, fn) => el && el.addEventListener(ev, fn);

// ---------- Elements ----------
const dlgAuth = qs('#authDialog');
const signUpForm = qs('#authSignUpForm');
const signInForm = qs('#authSignInForm');
const logoutBtn  = qs('#settings-logout');

// Upload section
const upType   = qs('#uploadTypeSelect');
const upTitle  = qs('#uploadTitleInput');
const upDesc   = qs('#uploadDescInput');
const upThumb  = qs('#uploadThumbInput');
const upFile   = qs('#uploadFileInput');
const btnUpload= qs('#btnUpload');
const btnGoLive= qs('#goLiveBtn');

// Feeds + search
const homeFeed   = qs('#home-feed');
const videosFeed = qs('#videos-feed');
const podcastFeed= qs('#podcast-feed');
const clipsFeed  = qs('#clips-feed');

const searchGlobal  = qs('#globalSearch');
const searchVideos  = qs('#videosSearch');
const searchPodcast = qs('#podcastSearch');
const searchClips   = qs('#clipsSearch');

const homePills = qsa('#tab-home .pills .pill');

// Profile
const profileName     = qs('#profile-name');
const profileHandle   = qs('#profile-handle');
const profilePhotoImg = qs('#profile-photo');
const profileBanner   = qs('#profileBanner');
const btnEditProfile  = qs('#btn-edit-profile');
const btnSaveProfile  = qs('#btnSaveProfile');
const btnCancelEdit   = qs('#bio-cancel');
const bioView         = qs('#bio-view');
const bioEditWrap     = qs('#bio-edit-wrap');
const nameInput       = qs('#profileNameInput');
const bioInput        = qs('#profileBioInput');
const photoInput      = qs('#profilePhotoInput');
const bannerInput     = qs('#profileBannerInput');
const statPosts       = qs('#stat-posts');
const statFollowers   = qs('#stat-followers');
const statFollowing   = qs('#stat-following');
const statLikes       = qs('#stat-likes');
const profileGrid     = qs('#profile-grid');
const profileEmpty    = qs('#profile-empty');

// Mini player bridge (provided in index.html)
const playPodcast = window.playPodcast;

// ---------- State ----------
let _postsCache = [];  // latest pulled posts (up to 50)

// ============================================================================
// AUTH
// ============================================================================

// Create account
$on(signUpForm, 'submit', async (e) => {
  e.preventDefault();
  const displayName = qs('#signUpName').value.trim();
  const email = qs('#signUpEmail').value.trim();
  const pass  = qs('#signUpPassword').value.trim();
  const ageOK = qs('#signUpAge').checked;

  if (!ageOK) return alert("You must confirm you are 13 or older.");
  if (!email || !pass) return alert("Enter email and password.");

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }
    // Create/merge user doc
    await setDoc(doc(db, 'users', cred.user.uid), {
      name: displayName || cred.user.displayName || '',
      bio: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });

    dlgAuth?.close();
    alert('✅ Account created!');
  } catch (err) {
    console.error('Signup error:', err);
    alert(err.message);
  }
});

// Sign in
$on(signInForm, 'submit', async (e) => {
  e.preventDefault();
  const email = qs('#signInEmail').value.trim();
  const pass  = qs('#signInPassword').value.trim();
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    dlgAuth?.close();
    alert('✅ Signed in!');
  } catch (err) {
    console.error('Signin error:', err);
    alert(err.message);
  }
});

// Logout
$on(logoutBtn, 'click', async () => {
  try {
    await signOut(auth);
    alert('You’ve been logged out.');
  } catch (e) {
    console.error('Logout failed:', e);
    alert('Logout failed.');
  }
});

// Reflect auth in UI and load profile section
onAuthStateChanged(getAuth(), async (user) => {
  console.log('Auth state:', user ? user.uid : '(no user)');
  document.dispatchEvent(new CustomEvent('intakee:auth', { detail: { user } }));
  applyOwnerVisibility(user);
  await loadProfilePane(user);
});

// ============================================================================
// UPLOADS
// ============================================================================

$on(btnGoLive, 'click', () => {
  alert('Live streaming will be available soon.');
});

$on(btnUpload, 'click', async () => {
  const user = auth.currentUser;
  if (!user) return alert('Please sign in to upload.');

  const type  = upType.value;
  const title = upTitle.value.trim();
  const desc  = upDesc.value.trim();
  const file  = upFile.files?.[0];
  const thumb = upThumb.files?.[0];

  if (!file)  return alert('Choose a video or audio file.');
  if (!title) return alert('Enter a title.');

  try {
    // 1) Upload media (with progress)
    const mediaPath = `uploads/${user.uid}/${Date.now()}_${file.name}`;
    const mediaRef  = ref(storage, mediaPath);
    const task      = uploadBytesResumable(mediaRef, file);

    task.on('state_changed', (snap) => {
      const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
      // You can show a progress bar here if you want
      console.log('Upload progress:', pct + '%');
    });

    await task;
    const mediaUrl = await getDownloadURL(mediaRef);

    // 2) Upload thumbnail (optional)
    let thumbnailUrl = '';
    if (thumb) {
      const tRef = ref(storage, `thumbnails/${user.uid}/${Date.now()}_${thumb.name}`);
      await uploadBytes(tRef, thumb);
      thumbnailUrl = await getDownloadURL(tRef);
    }

    // 3) Create post doc
    await addDoc(collection(db, 'posts'), {
      uid: user.uid,
      type, title, desc,
      mediaUrl, thumbnailUrl,
      views: 0, likeCount: 0, commentCount: 0,
      createdAt: serverTimestamp()
    });

    alert('✅ Upload complete!');
    // Reset form
    upTitle.value = '';
    upDesc.value = '';
    upFile.value = '';
    upThumb.value = '';

    // Refresh feeds and profile grid (if open)
    await loadHomeFeed();
    if (location.hash === '#profile') {
      await loadProfileGrid(user.uid);
    }
  } catch (err) {
    console.error('Upload failed:', err);
    alert('Upload failed: ' + err.message);
  }
});

// ============================================================================
// FEEDS (Home, Videos, Podcast, Clips)
// ============================================================================

async function fetchLatestPosts() {
  const qRef = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50));
  const snap = await getDocs(qRef);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function renderHome(filter = 'all') {
  if (!homeFeed) return;
  homeFeed.innerHTML = '';

  const list = _postsCache.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'new') return true; // same as all for now (already ordered by createdAt)
    if (filter === 'following') return false; // not implemented yet
    // video / clip / podcast (podcast includes podcast-audio & podcast-video)
    if (filter === 'podcast') return p.type && p.type.startsWith('podcast');
    return p.type === filter;
  });

  if (!list.length) {
    homeFeed.innerHTML = `<div class="muted">No posts yet. Sign in and be the first to upload.</div>`;
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
    } else {
      el = window.renderVideoCard?.(post) || document.createElement('div');
    }
    homeFeed.appendChild(el || document.createTextNode(''));
  });
}

function renderByType(feedEl, typePrefix) {
  if (!feedEl) return;
  feedEl.innerHTML = '';
  const list = _postsCache.filter(p => (typePrefix === 'podcast'
    ? p.type?.startsWith('podcast')
    : p.type === typePrefix));
  if (!list.length) {
    feedEl.innerHTML = `<div class="muted">No ${typePrefix} posts yet.</div>`;
    return;
  }
  list.forEach(post => {
    let el;
    if (typePrefix === 'video') el = window.renderVideoCard?.(post);
    else if (typePrefix === 'podcast') el = window.renderPodcastRow?.(post);
    else if (typePrefix === 'clip') el = window.renderClipFullScreen?.(post);
    feedEl.appendChild(el || document.createTextNode(''));
  });
}

async function loadHomeFeed() {
  try {
    _postsCache = await fetchLatestPosts();
  } catch (e) {
    console.warn('Feed load warning:', e.message);
    _postsCache = [];
  }
  renderHome('all');
  renderByType(videosFeed, 'video');
  renderByType(podcastFeed, 'podcast');
  renderByType(clipsFeed,  'clip');
}

// Home filter pills
homePills.forEach(btn => {
  $on(btn, 'click', () => {
    qsa('#tab-home .pills .pill').forEach(b => b.classList.toggle('active', b===btn));
    const f = btn.dataset.filter;
    renderHome(f === 'newest' ? 'new' : f);
  });
});

// Searches (client-side filter against _postsCache)
$on(searchGlobal,  'input', e => searchAll(e.target.value));
$on(searchVideos,  'input', e => filterSection(videosFeed, 'video', e.target.value));
$on(searchPodcast, 'input', e => filterSection(podcastFeed, 'podcast', e.target.value));
$on(searchClips,   'input', e => filterSection(clipsFeed, 'clip', e.target.value));

function searchAll(term = '') {
  if (!homeFeed) return;
  const t = term.trim().toLowerCase();
  if (!t) return renderHome('all');
  const list = _postsCache.filter(p =>
    (p.title||'').toLowerCase().includes(t) ||
    (p.desc||'').toLowerCase().includes(t)
  );
  homeFeed.innerHTML = '';
  list.forEach(p => homeFeed.appendChild(
    (p.type==='clip' ? window.renderClipFullScreen?.(p)
     : p.type?.startsWith('podcast') ? window.renderPodcastRow?.(p)
     : window.renderVideoCard?.(p)) || document.createTextNode('')
  ));
}

function filterSection(feedEl, typePrefix, term='') {
  if (!feedEl) return;
  const t = term.trim().toLowerCase();
  const list = _postsCache.filter(p =>
    (typePrefix === 'podcast' ? p.type?.startsWith('podcast') : p.type === typePrefix) &&
    ((p.title||'').toLowerCase().includes(t) || (p.desc||'').toLowerCase().includes(t))
  );
  feedEl.innerHTML = '';
  list.forEach(p => {
    let el;
    if (typePrefix==='video') el = window.renderVideoCard?.(p);
    else if (typePrefix==='podcast') el = window.renderPodcastRow?.(p);
    else if (typePrefix==='clip') el = window.renderClipFullScreen?.(p);
    feedEl.appendChild(el || document.createTextNode(''));
  });
}

// ============================================================================
// PROFILE (view + edit)
// ============================================================================

function applyOwnerVisibility(user) {
  const isOwner = !!user;
  qsa('.owner-only').forEach(el => el.style.display = isOwner ? '' : 'none');
}

// Edit toggles
$on(btnEditProfile, 'click', () => {
  if (!auth.currentUser) return alert('Sign in to edit profile.');
  bioEditWrap.style.display = '';
});
$on(btnCancelEdit, 'click', () => {
  bioEditWrap.style.display = 'none';
});

// Save profile
$on(btnSaveProfile, 'click', async () => {
  const user = auth.currentUser;
  if (!user) return alert('Sign in first.');

  const name = nameInput.value.trim();
  const bio  = bioInput.value.trim();

  try {
    // Avatar (optional)
    if (photoInput.files?.[0]) {
      const r = ref(storage, `avatars/${user.uid}.jpg`);
      await uploadBytes(r, photoInput.files[0]);
      const url = await getDownloadURL(r);
      await updateProfile(user, { photoURL: url });
      profilePhotoImg.src = url;
    }
    // Banner (optional)
    if (bannerInput.files?.[0]) {
      const r = ref(storage, `banners/${user.uid}.jpg`);
      await uploadBytes(r, bannerInput.files[0]);
      const url = await getDownloadURL(r);
      profileBanner.style.backgroundImage = `url(${url})`;
    }
    // Name (optional)
    if (name) {
      await updateProfile(user, { displayName: name });
      profileName.textContent = name;
    }

    await setDoc(doc(db, 'users', user.uid), {
      name: name || user.displayName || '',
      bio,
      updatedAt: serverTimestamp()
    }, { merge: true });

    bioView.textContent = bio || 'Add a short bio to introduce yourself.';
    bioEditWrap.style.display = 'none';
    alert('✅ Profile updated!');
  } catch (e) {
    console.error('Profile update error:', e);
    alert('Update failed: ' + e.message);
  }
});

// Load profile panel
async function loadProfilePane(user) {
  if (!profileName) return;
  if (!user) {
    profileName.textContent = 'Your Name';
    profileHandle.textContent = '@username';
    profilePhotoImg.removeAttribute('src');
    bioView.textContent = 'Add a short bio to introduce yourself.';
    profileBanner.style.backgroundImage = 'none';
    profileGrid.innerHTML = '';
    profileEmpty.style.display = '';
    statPosts.textContent = '0';
    statFollowers.textContent = '0';
    statFollowing.textContent = '0';
    statLikes.textContent = '0';
    return;
  }

  const uDoc = await getDoc(doc(db, 'users', user.uid));
  const u = uDoc.exists() ? uDoc.data() : {};
  profileName.textContent = user.displayName || u.name || 'Your Name';
  profileHandle.textContent = '@' + (user.email?.split('@')[0] || 'username');
  bioView.textContent = (u.bio || '').trim() || 'Add a short bio to introduce yourself.';
  if (user.photoURL) profilePhotoImg.src = user.photoURL;

  await loadProfileGrid(user.uid);
}

async function loadProfileGrid(uid) {
  const snap = await getDocs(query(collection(db, 'posts'),
    where('uid', '==', uid), orderBy('createdAt', 'desc')));
  const items = snap.docs.map(d => ({ id:d.id, ...d.data() }));

  profileGrid.innerHTML = '';
  if (!items.length) {
    profileEmpty.style.display = '';
  } else {
    profileEmpty.style.display = 'none';
    items.forEach(p => {
      const el =
        p.type === 'clip' ? window.renderClipFullScreen?.(p) :
        p.type?.startsWith('podcast') ? window.renderPodcastRow?.(p) :
        window.renderVideoCard?.(p);
      const box = document.createElement('div');
      box.className = 'card';
      if (el) box.appendChild(el);
      profileGrid.appendChild(box);
    });
  }

  statPosts.textContent = String(items.length);
  // placeholders (not wired yet)
  statFollowers.textContent = statFollowers.textContent || '0';
  statFollowing.textContent = statFollowing.textContent || '0';
  statLikes.textContent = statLikes.textContent || '0';
}

// ============================================================================
// BOOT
// ============================================================================

(async function boot() {
  await loadHomeFeed();
  console.log('✅ App boot complete');
})();
