// ============================================================================
// INTAKEE — Main Logic (Part 1: Authentication & User Setup)
// ============================================================================
'use strict';

// Firebase refs (initialized in index.html)
const { app, auth, db, storage, onAuthStateChanged } = window.firebaseRefs || {};
if (!app || !auth || !db || !storage) {
  console.error("❌ Firebase not ready — check index.html init block.");
}

// ---------- Helpers ----------
const qs = (s, sc = document) => sc.querySelector(s);
const qsa = (s, sc = document) => Array.from(sc.querySelectorAll(s));
const $on = (el, ev, fn) => el && el.addEventListener(ev, fn);
const notify = (msg) => alert(msg);

// ---------- Auth Elements ----------
const dlgAuth = qs('#authDialog');
const signUpForm = qs('#authSignUpForm');
const signInForm = qs('#authSignInForm');
const logoutBtn = qs('#settings-logout');
const openAuth = qs('#openAuth');

// ============================================================================
// SIGN UP
// ============================================================================
$on(signUpForm, 'submit', async (e) => {
  e.preventDefault();
  const name = qs('#signUpName').value.trim();
  const email = qs('#signUpEmail').value.trim();
  const pass = qs('#signUpPassword').value.trim();
  const ageOK = qs('#signUpAge').checked;
  if (!ageOK) return notify("⚠️ You must confirm you are 13 or older.");
  if (!email || !pass) return notify("Please enter email and password.");

  try {
    const { createUserWithEmailAndPassword, updateProfile } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js");
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (name) await updateProfile(cred.user, { displayName: name });

    const { doc, setDoc, serverTimestamp } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

    await setDoc(doc(db, 'users', cred.user.uid), {
      name,
      bio: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      private: false,
      showUploads: true,
      showSaved: true,
      blocked: [],
      followers: [],
      following: []
    });

    dlgAuth.close();
    notify("✅ Account created successfully!");
  } catch (err) {
    console.error(err);
    notify(err.message);
  }
});

// ============================================================================
// SIGN IN
// ============================================================================
$on(signInForm, 'submit', async (e) => {
  e.preventDefault();
  const email = qs('#signInEmail').value.trim();
  const pass = qs('#signInPassword').value.trim();
  if (!email || !pass) return notify("Please fill both fields.");

  try {
    const { signInWithEmailAndPassword } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js");
    await signInWithEmailAndPassword(auth, email, pass);
    dlgAuth.close();
    notify("✅ Welcome back!");
  } catch (err) {
    console.error(err);
    notify(err.message);
  }
});

// ============================================================================
// LOGOUT
// ============================================================================
$on(logoutBtn, 'click', async () => {
  try {
    const { signOut } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js");
    await signOut(auth);
    notify("You’ve been logged out.");
  } catch (err) {
    notify("Logout failed: " + err.message);
  }
});

// ============================================================================
// AUTH STATE CHANGE
// ============================================================================
onAuthStateChanged(auth, async (user) => {
  console.log("👤 Auth state:", user ? user.email : "(signed out)");

  // Dispatch global event for profile/settings/etc.
  document.dispatchEvent(new CustomEvent('intakee:auth', { detail: { user } }));

  if (openAuth) openAuth.style.display = user ? 'none' : 'block';

  if (user) {
    qs('#profile-name').textContent = user.displayName || 'Your Name';
    qs('#profile-handle').textContent = '@' + (user.email.split('@')[0] || 'username');
  } else {
    qs('#profile-name').textContent = 'Your Name';
    qs('#profile-handle').textContent = '@username';
  }
});
// ============================================================================
// INTAKEE — Part 2: Upload System (Video / Clip / Podcast)
// ============================================================================
'use strict';

// --- Upload Elements ---
const upType   = qs('#uploadTypeSelect');
const upTitle  = qs('#uploadTitleInput');
const upDesc   = qs('#uploadDescInput');
const upThumb  = qs('#uploadThumbInput');
const upFile   = qs('#uploadFileInput');
const btnUpload = qs('#btnUpload');
const goLiveBtn = qs('#goLiveBtn');

// --- Utility ---
function resetUploadForm() {
  upTitle.value = '';
  upDesc.value  = '';
  upThumb.value = '';
  upFile.value  = '';
  upType.value  = 'video';
  btnUpload.textContent = 'Upload';
  btnUpload.disabled = false;
}

// --- Upload Handler ---
$on(btnUpload, 'click', async () => {
  const user = auth.currentUser;
  if (!user) return alert('Please log in before uploading.');

  const type  = upType.value;
  const title = upTitle.value.trim();
  const desc  = upDesc.value.trim();
  const file  = upFile.files[0];
  const thumb = upThumb.files[0];

  if (!file)  return alert('Please select a file to upload.');
  if (!title) return alert('Please enter a title.');

  btnUpload.disabled = true;
  btnUpload.textContent = 'Uploading... 0%';

  try {
    // --- Firebase imports ---
    const { ref, uploadBytesResumable, getDownloadURL, uploadBytes } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js");
    const { addDoc, collection, serverTimestamp } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

    // --- File path logic ---
    const ext = file.name.split('.').pop();
    const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filePath = `uploads/${user.uid}/${Date.now()}_${safeTitle}.${ext}`;

    // --- Upload main file ---
    const storageRef = ref(storage, filePath);
    const task = uploadBytesResumable(storageRef, file);

    task.on('state_changed', snap => {
      const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
      btnUpload.textContent = `Uploading... ${pct}%`;
    });

    await task;
    const fileUrl = await getDownloadURL(storageRef);

    // --- Upload thumbnail if provided ---
    let thumbUrl = '';
    if (thumb) {
      const thumbPath = `thumbnails/${user.uid}/${Date.now()}_${thumb.name}`;
      const tRef = ref(storage, thumbPath);
      await uploadBytes(tRef, thumb);
      thumbUrl = await getDownloadURL(tRef);
    }

    // --- Save metadata to Firestore ---
    await addDoc(collection(db, 'posts'), {
      uid: user.uid,
      type,
      title,
      desc,
      mediaUrl: fileUrl,
      thumbnailUrl: thumbUrl,
      private: false,
      createdAt: serverTimestamp(),
      likeCount: 0,
      viewCount: 0,
      comments: 0
    });

    alert('✅ Upload complete!');
    resetUploadForm();

    // Trigger feed refresh event
    document.dispatchEvent(new CustomEvent('intakee:feedRefresh'));
  } catch (err) {
    console.error('Upload failed:', err);
    alert('❌ Upload failed: ' + err.message);
    btnUpload.disabled = false;
    btnUpload.textContent = 'Upload';
  }
});

// --- Go Live (placeholder) ---
$on(goLiveBtn, 'click', () => {
  alert('🚀 Live streaming will be available in a future update.');
});
// ============================================================================
// INTAKEE — Part 3: Feed Rendering (Home, Videos, Podcasts, Clips)
// ============================================================================
'use strict';

// --- Feed Containers ---
const homeFeed   = qs('#home-feed');
const videosFeed = qs('#videos-feed');
const podcastFeed = qs('#podcast-feed');
const clipsFeed  = qs('#clips-feed');

const searchGlobal  = qs('#globalSearch');
let _allPosts = [];
let _isLoadingFeed = false;

// ============================================================================
// FETCH POSTS
// ============================================================================
async function fetchAllPosts() {
  try {
    const { collection, getDocs, orderBy, query, limit } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");
    const qRef = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(100));
    const snap = await getDocs(qRef);
    _allPosts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("❌ Error loading feed:", err);
    _allPosts = [];
  }
}

// ============================================================================
// RENDER FUNCTIONS
// ============================================================================
function renderFeed(container, list, type = 'all') {
  container.innerHTML = '';

  if (!list || !list.length) {
    container.innerHTML = `<div class="muted">No posts yet.</div>`;
    return;
  }

  list.forEach(post => {
    // Filter by type
    if (type !== 'all' && post.type !== type) return;

    // Create post card
    const card = document.createElement('div');
    card.className = 'feed-card';

    const thumbnail = post.thumbnailUrl || '/placeholder.png';
    const mediaTypeIcon = post.type === 'video'
      ? 'fa-video'
      : post.type === 'clip'
      ? 'fa-bolt'
      : 'fa-podcast';

    // Main card HTML
    card.innerHTML = `
      <div class="thumb">
        <img src="${thumbnail}" alt="${post.title}">
        <button class="play-btn" data-url="${post.mediaUrl}" data-type="${post.type}" data-title="${post.title}">
          <i class="fa ${mediaTypeIcon}"></i>
        </button>
      </div>
      <div class="feed-meta">
        <h4>${post.title}</h4>
        <p>${post.desc || ''}</p>
        <span class="muted small">${post.type.toUpperCase()}</span>
      </div>
    `;

    // Add click event to play podcasts in mini-player
    const playBtn = card.querySelector('.play-btn');
    if (post.type.startsWith('podcast')) {
      playBtn.addEventListener('click', () => {
        playPodcast(post.mediaUrl, post.title);
      });
    } else if (post.type === 'video' || post.type === 'clip') {
      playBtn.addEventListener('click', () => {
        window.open(post.mediaUrl, '_blank');
      });
    }

    container.appendChild(card);
  });
}

// ============================================================================
// LOAD & DISPLAY FEEDS
// ============================================================================
async function loadFeeds() {
  if (_isLoadingFeed) return;
  _isLoadingFeed = true;
  await fetchAllPosts();
  _isLoadingFeed = false;

  // Home Feed — all posts
  renderFeed(homeFeed, _allPosts, 'all');

  // Video Feed
  renderFeed(videosFeed, _allPosts.filter(p => p.type === 'video'), 'video');

  // Podcast Feed
  renderFeed(podcastFeed, _allPosts.filter(p => p.type.startsWith('podcast')), 'podcast');

  // Clips Feed
  renderFeed(clipsFeed, _allPosts.filter(p => p.type === 'clip'), 'clip');
}

// ============================================================================
// GLOBAL SEARCH
// ============================================================================
$on(searchGlobal, 'input', (e) => {
  const term = e.target.value.toLowerCase().trim();
  if (!term) {
    renderFeed(homeFeed, _allPosts);
    return;
  }

  const filtered = _allPosts.filter(p =>
    (p.title || '').toLowerCase().includes(term) ||
    (p.desc || '').toLowerCase().includes(term)
  );
  renderFeed(homeFeed, filtered);
});

// ============================================================================
// REFRESH FEED ON UPLOAD / LOGIN
// ============================================================================
document.addEventListener('intakee:auth', (e) => {
  const user = e.detail.user;
  if (user) loadFeeds();
  else homeFeed.innerHTML = `<div class="muted">Sign in to upload or interact.</div>`;
});

document.addEventListener('intakee:feedRefresh', loadFeeds);

// Initial load
loadFeeds();
// ============================================================================
// INTAKEE — Part 4: Profile Management (Bio, Photo, Banner, Delete Posts)
// ============================================================================
'use strict';

// --- Profile Elements ---
const profileName      = qs('#profile-name');
const profileHandle    = qs('#profile-handle');
const profilePhotoImg  = qs('#profile-photo');
const profileBanner    = qs('#profileBanner');
const bioView          = qs('#bio-view');
const bioEditWrap      = qs('#bio-edit-wrap');
const nameInput        = qs('#profileNameInput');
const bioInput         = qs('#profileBioInput');
const photoInput       = qs('#profilePhotoInput');
const bannerInput      = qs('#profileBannerInput');
const btnEditProfile   = qs('#btn-edit-profile');
const btnSaveProfile   = qs('#btnSaveProfile');
const btnCancelEdit    = qs('#bio-cancel');
const statPosts        = qs('#stat-posts');
const statFollowers    = qs('#stat-followers');
const statFollowing    = qs('#stat-following');
const statLikes        = qs('#stat-likes');
const profileGrid      = qs('#profile-grid');
const profileEmpty     = qs('#profile-empty');

// --- Visibility Controls ---
function applyOwnerVisibility(user) {
  const isOwner = !!user;
  qsa('.owner-only').forEach(el => el.style.display = isOwner ? '' : 'none');
}

// ============================================================================
// EDIT PROFILE UI TOGGLE
// ============================================================================
$on(btnEditProfile, 'click', () => {
  if (!auth.currentUser) return alert('Sign in to edit your profile.');
  bioEditWrap.style.display = '';
  nameInput.value = profileName.textContent.trim();
  bioInput.value  = bioView.textContent === 'Add a short bio to introduce yourself.'
    ? ''
    : bioView.textContent.trim();
});

$on(btnCancelEdit, 'click', () => {
  bioEditWrap.style.display = 'none';
});

// ============================================================================
// SAVE PROFILE CHANGES
// ============================================================================
$on(btnSaveProfile, 'click', async () => {
  const user = auth.currentUser;
  if (!user) return alert('You must be signed in.');

  const name = nameInput.value.trim();
  const bio  = bioInput.value.trim();

  try {
    const { ref, uploadBytes, getDownloadURL } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js");
    const { doc, setDoc, serverTimestamp } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");
    const { updateProfile } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js");

    // Upload new avatar
    if (photoInput.files[0]) {
      const avatarRef = ref(storage, `avatars/${user.uid}_${Date.now()}.jpg`);
      await uploadBytes(avatarRef, photoInput.files[0]);
      const photoURL = await getDownloadURL(avatarRef);
      await updateProfile(user, { photoURL });
      profilePhotoImg.src = photoURL;
    }

    // Upload new banner
    if (bannerInput.files[0]) {
      const bannerRef = ref(storage, `banners/${user.uid}_${Date.now()}.jpg`);
      await uploadBytes(bannerRef, bannerInput.files[0]);
      const bannerURL = await getDownloadURL(bannerRef);
      profileBanner.style.backgroundImage = `url(${bannerURL})`;
    }

    // Update name & bio
    if (name) await updateProfile(user, { displayName: name });
    await setDoc(doc(db, 'users', user.uid), {
      name: name || user.displayName || '',
      bio: bio || '',
      updatedAt: serverTimestamp()
    }, { merge: true });

    // Update UI
    profileName.textContent = name || user.displayName || 'Your Name';
    bioView.textContent = bio || 'Add a short bio to introduce yourself.';
    bioEditWrap.style.display = 'none';
    alert('✅ Profile updated!');
  } catch (err) {
    console.error(err);
    alert('Update failed: ' + err.message);
  }
});

// ============================================================================
// LOAD PROFILE DATA
// ============================================================================
async function loadProfilePane(user) {
  if (!user) {
    // Reset when logged out
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

  try {
    const { doc, getDoc } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");
    const uDoc = await getDoc(doc(db, 'users', user.uid));
    const u = uDoc.exists() ? uDoc.data() : {};

    profileName.textContent = user.displayName || u.name || 'Your Name';
    profileHandle.textContent = '@' + (user.email.split('@')[0] || 'username');
    bioView.textContent = (u.bio || '').trim() || 'Add a short bio to introduce yourself.';
    if (user.photoURL) profilePhotoImg.src = user.photoURL;
  } catch (err) {
    console.error('Error loading profile:', err);
  }

  await loadUserPosts(user.uid);
}

// ============================================================================
// LOAD USER POSTS INTO PROFILE GRID
// ============================================================================
async function loadUserPosts(uid) {
  const { collection, getDocs, query, where, orderBy } =
    await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

  const qRef = query(
    collection(db, 'posts'),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc')
  );

  const snap = await getDocs(qRef);
  const posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  profileGrid.innerHTML = '';
  if (!posts.length) {
    profileEmpty.style.display = '';
  } else {
    profileEmpty.style.display = 'none';
    posts.forEach(p => {
      const card = document.createElement('div');
      card.className = 'profile-post-card';
      const thumb = p.thumbnailUrl || '/placeholder.png';

      card.innerHTML = `
        <div class="thumb">
          <img src="${thumb}" alt="">
          <div class="overlay">
            <span>${p.type.toUpperCase()}</span>
            <button class="danger delete-post" data-id="${p.id}"><i class="fa fa-trash"></i></button>
          </div>
        </div>
        <h4>${p.title || 'Untitled'}</h4>
      `;
      profileGrid.appendChild(card);
    });
  }

  statPosts.textContent = posts.length;
}

// ============================================================================
// DELETE A POST
// ============================================================================
$on(profileGrid, 'click', async (e) => {
  const btn = e.target.closest('.delete-post');
  if (!btn) return;

  const id = btn.dataset.id;
  if (!confirm('Delete this post permanently?')) return;

  try {
    const { doc, deleteDoc } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");
    await deleteDoc(doc(db, 'posts', id));
    btn.closest('.profile-post-card').remove();
    alert('🗑️ Post deleted.');
  } catch (err) {
    alert('Failed to delete: ' + err.message);
  }
});

// ============================================================================
// HANDLE LOGIN STATE
// ============================================================================
document.addEventListener('intakee:auth', (e) => {
  const user = e.detail.user;
  applyOwnerVisibility(user);
  if (user) loadProfilePane(user);
});
// ============================================================================
// INTAKEE — Part 5: Settings, Privacy & Account Actions
// ============================================================================
'use strict';

// ---------- Settings Elements ----------
const togglePrivate  = qs('#toggle-private');
const toggleUploads  = qs('#toggle-uploads');
const toggleSaved    = qs('#toggle-saved');
const settingsLogout = qs('#settings-logout');

// ---------- Toggle Helper ----------
function applyToggleState(tog, on) {
  tog.dataset.on = on.toString();
  tog.classList.toggle('active', on);
}

// ============================================================================
// LOAD SETTINGS FROM FIRESTORE
// ============================================================================
async function loadUserSettings(uid) {
  try {
    const { doc, getDoc } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");
    const uDoc = await getDoc(doc(db, 'users', uid));
    if (!uDoc.exists()) return;

    const s = uDoc.data();
    applyToggleState(togglePrivate, s.private || false);
    applyToggleState(toggleUploads, s.showUploads ?? true);
    applyToggleState(toggleSaved,   s.showSaved ?? true);
  } catch (err) {
    console.warn('⚠️ Could not load settings:', err.message);
  }
}

// ============================================================================
// SAVE SETTINGS TO FIRESTORE
// ============================================================================
async function saveUserSetting(field, value) {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const { doc, updateDoc } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");
    await updateDoc(doc(db, 'users', user.uid), { [field]: value });
  } catch (err) {
    console.error('⚠️ Failed to save setting:', err.message);
  }
}

// ============================================================================
// TOGGLE CLICKS
// ============================================================================
[ togglePrivate, toggleUploads, toggleSaved ].forEach(tog => {
  $on(tog, 'click', () => {
    const newState = !(tog.dataset.on === 'true');
    applyToggleState(tog, newState);

    // save to Firestore
    if (tog.id === 'toggle-private') saveUserSetting('private', newState);
    if (tog.id === 'toggle-uploads') saveUserSetting('showUploads', newState);
    if (tog.id === 'toggle-saved')   saveUserSetting('showSaved', newState);

    alert(`Setting updated: ${tog.id.replace('toggle-', '')} → ${newState}`);
  });
});

// ============================================================================
// LOGOUT BUTTON
// ============================================================================
$on(settingsLogout, 'click', async () => {
  try {
    const { signOut } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js");
    await signOut(auth);
    alert('✅ You have been logged out.');
  } catch (err) {
    alert('Logout failed: ' + err.message);
  }
});

// ============================================================================
// DELETE ACCOUNT (Placeholder with Warning)
// ============================================================================
document.querySelectorAll('.settings-item button.danger').forEach(btn => {
  $on(btn, 'click', async () => {
    const user = auth.currentUser;
    if (!user) return alert('You must be signed in.');
    if (!confirm('⚠️ Delete your account permanently? This cannot be undone.')) return;

    try {
      const { deleteUser } =
        await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js");
      const { doc, deleteDoc } =
        await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

      // delete Firestore user doc
      await deleteDoc(doc(db, 'users', user.uid));

      // delete from Auth
      await deleteUser(user);

      alert('🗑️ Account deleted successfully.');
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  });
});

// ============================================================================
// BLOCK / UNBLOCK USERS (foundation)
// ============================================================================
async function blockUser(targetUid) {
  const user = auth.currentUser;
  if (!user || !targetUid) return;
  try {
    const { doc, updateDoc, arrayUnion } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");
    await updateDoc(doc(db, 'users', user.uid), {
      blocked: arrayUnion(targetUid)
    });
    alert('🚫 User blocked.');
  } catch (err) {
    console.error('Block failed:', err);
  }
}

async function unblockUser(targetUid) {
  const user = auth.currentUser;
  if (!user || !targetUid) return;
  try {
    const { doc, updateDoc, arrayRemove } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");
    await updateDoc(doc(db, 'users', user.uid), {
      blocked: arrayRemove(targetUid)
    });
    alert('✅ User unblocked.');
  } catch (err) {
    console.error('Unblock failed:', err);
  }
}

// ============================================================================
// AUTO-LOAD SETTINGS ON LOGIN
// ============================================================================
document.addEventListener('intakee:auth', (e) => {
  const user = e.detail.user;
  if (user) loadUserSettings(user.uid);
});
// ============================================================================
// INTAKEE — Part 6: Mini-Player, Event Handling & Safe Boot
// ============================================================================
'use strict';

// ============================================================================
// MINI-PLAYER AUDIO CONTROLS
// ============================================================================
const miniPlayer = qs('#mini-player');
const miniAudio  = qs('#mp-audio');
const miniTitle  = qs('#mp-title');
const miniSub    = qs('#mp-sub');
const miniPlay   = qs('#mp-play');
const miniClose  = qs('#mp-close');

// Track play state
let isPlaying = false;

// Function to start playing a podcast or audio post
function playPodcast(url, title = 'Now Playing', subtitle = '') {
  if (!url) return alert('Invalid podcast URL.');
  miniPlayer.hidden = false;
  miniTitle.textContent = title;
  miniSub.textContent   = subtitle || '';
  miniAudio.src = url;

  miniAudio.play()
    .then(() => {
      isPlaying = true;
      miniPlay.innerHTML = '<i class="fa fa-pause"></i>';
    })
    .catch(err => console.warn('Audio play failed:', err));
}

// Play / Pause toggle
$on(miniPlay, 'click', () => {
  if (!miniAudio.src) return;
  if (isPlaying) {
    miniAudio.pause();
    miniPlay.innerHTML = '<i class="fa fa-play"></i>';
    isPlaying = false;
  } else {
    miniAudio.play().catch(() => {});
    miniPlay.innerHTML = '<i class="fa fa-pause"></i>';
    isPlaying = true;
  }
});

// Close mini-player
$on(miniClose, 'click', () => {
  try { miniAudio.pause(); } catch {}
  miniAudio.src = '';
  miniPlayer.hidden = true;
  isPlaying = false;
});

// Auto-pause when navigating away
window.addEventListener('hashchange', () => {
  if (!miniAudio.paused) miniAudio.pause();
  miniPlayer.hidden = true;
  isPlaying = false;
});

// ============================================================================
// EVENT LISTENERS (GLOBAL REFRESH)
// ============================================================================

// Feed refresh whenever user logs in/out or uploads
document.addEventListener('intakee:auth', (e) => {
  const user = e.detail.user;
  if (user) {
    loadFeeds();
    loadProfilePane(user);
  } else {
    homeFeed.innerHTML = '<div class="muted">Welcome to INTAKEE — sign in to post.</div>';
    profileGrid.innerHTML = '';
  }
});

document.addEventListener('intakee:feedRefresh', loadFeeds);

// ============================================================================
// SAFE BOOT (App Initialization)
// ============================================================================
(async function bootApp() {
  console.log('🚀 Booting INTAKEE...');
  try {
    // If user already signed in (Firebase caches), load immediately
    const user = auth.currentUser;
    if (user) {
      await Promise.all([loadFeeds(), loadProfilePane(user), loadUserSettings(user.uid)]);
    } else {
      await loadFeeds();
    }

    console.log('✅ App ready.');
  } catch (err) {
    console.error('❌ Boot failed:', err);
  }
})();
