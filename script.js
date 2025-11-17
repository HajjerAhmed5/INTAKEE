// ============================================================================
// INTAKEE — MAIN APP LOGIC (AUTHENTICATION + USER SETUP)
// ============================================================================
'use strict';

// ----- FIREBASE IMPORTS -----
import {
  getFirestore, collection, doc, setDoc, getDoc, query, where, addDoc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  updateProfile, sendPasswordResetEmail, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

// ----- FIREBASE REFS -----
const { app, auth, db, storage } = window.firebaseRefs || {};
if (!app || !auth || !db) {
  console.error("❌ Firebase not initialized properly. Check your index.html init section.");
}

// ----- SHORTCUT HELPERS -----
const qs = (s, sc = document) => sc.querySelector(s);
const qsa = (s, sc = document) => Array.from(sc.querySelectorAll(s));
const $on = (el, ev, fn) => el && el.addEventListener(ev, fn);
const notify = (msg) => alert(msg);

// ============================================================================
// SIGN UP LOGIC (Email + Password + Username + Age Confirm)
// ============================================================================
const signupBtn = qs('#signupBtn');
const loginBtn = qs('#loginBtn');
const logoutBtn = qs('#settings-logout');
const dlgAuth = qs('#authDialog');

if (signupBtn) {
  signupBtn.addEventListener('click', async () => {
    const email = qs('#signupEmail').value.trim();
    const password = qs('#signupPassword').value.trim();
    const username = prompt("Choose a username (no spaces):")?.trim().toLowerCase();
    const ageOK = qs('#signupAgeConfirm').checked;

    if (!ageOK) return notify("⚠️ You must confirm you are 13 or older.");
    if (!email || !password || !username) return notify("Please fill all fields.");

    try {
      // Check username availability
      const usernameRef = query(collection(db, "users"), where("username", "==", username));
      const snap = await getDocs(usernameRef);
      if (!snap.empty) return notify("❌ That username is already taken. Please choose another one.");

      // Create user in Firebase Auth
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: username });

      // Create Firestore user document
      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid,
        email,
        username,
        bio: "",
        createdAt: serverTimestamp(),
        private: false,
        showUploads: true,
        showSaved: true,
        followers: [],
        following: [],
        blocked: [],
        saved: []
      });

      notify(`✅ Welcome to INTAKEE, @${username}!`);
      dlgAuth.close();
    } catch (err) {
      console.error(err);
      notify("❌ " + err.message);
    }
  });
}

// ============================================================================
// LOGIN LOGIC
// ============================================================================
if (loginBtn) {
  loginBtn.addEventListener('click', async () => {
    const email = qs('#loginEmail').value.trim();
    const password = qs('#loginPassword').value.trim();
    if (!email || !password) return notify("Please enter email and password.");

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      notify(`✅ Signed in as ${cred.user.email}`);
      dlgAuth.close();
    } catch (err) {
      console.error(err);
      notify("❌ " + err.message);
    }
  });
}

// ============================================================================
// FORGOT PASSWORD (Reset via Firebase Email Link)
// ============================================================================
const forgotPasswordBtn = document.createElement('button');
forgotPasswordBtn.textContent = "Forgot Password?";
forgotPasswordBtn.className = "ghost";
forgotPasswordBtn.style.marginTop = "6px";
qs('#authDialog div[style*="display:grid"]').appendChild(forgotPasswordBtn);

$on(forgotPasswordBtn, 'click', async () => {
  const email = prompt("Enter your account email:");
  if (!email) return;
  try {
    await sendPasswordResetEmail(auth, email);
    notify("📩 Password reset link sent to your email.");
  } catch (err) {
    notify("❌ " + err.message);
  }
});

// ============================================================================
// AUTH STATE CHANGE — Update UI, Profile, and Feed
// ============================================================================
onAuthStateChanged(auth, async (user) => {
  console.log("👤 Auth state:", user ? user.email : "(signed out)");
  document.dispatchEvent(new CustomEvent('intakee:auth', { detail: { user } }));

  const openAuth = qs('#openAuth');
  if (openAuth) openAuth.style.display = user ? 'none' : 'block';

  if (user) {
    qs('#profile-name').textContent = user.displayName || user.email.split('@')[0];
    qs('#profile-handle').textContent = '@' + (user.displayName || user.email.split('@')[0]);
  } else {
    qs('#profile-name').textContent = 'Your Name';
    qs('#profile-handle').textContent = '@username';
  }
});

// ============================================================================
// LOGOUT
// ============================================================================
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try {
      await signOut(auth);
      notify("👋 You’ve been logged out.");
    } catch (err) {
      notify("❌ " + err.message);
    }
  });
}
// ============================================================================
// INTAKEE — PART 2: UPLOADS / FEEDS / LIKES & DISLIKES
// ============================================================================
'use strict';

// --- Helper Shortcuts (reuse from above) ---
const qs = (s, sc = document) => sc.querySelector(s);
const qsa = (s, sc = document) => Array.from(sc.querySelectorAll(s));
const $on = (el, ev, fn) => el && el.addEventListener(ev, fn);
const notify = (msg) => alert(msg);

// ---------- Upload Form ----------
const upType   = qs('#uploadTypeSelect');
const upTitle  = qs('#uploadTitleInput');
const upDesc   = qs('#uploadDescInput');
const upThumb  = qs('#uploadThumbInput');
const upFile   = qs('#uploadFileInput');
const btnUpload = qs('#btnUpload');
const goLiveBtn = qs('#goLiveBtn');

// Reset upload inputs
function resetUploadForm() {
  upType.value = 'video';
  upTitle.value = '';
  upDesc.value = '';
  upThumb.value = '';
  upFile.value = '';
  btnUpload.textContent = 'Upload';
  btnUpload.disabled = false;
}

// ============================================================================
// UPLOAD HANDLER (VIDEO / CLIP / PODCAST)
// ============================================================================
$on(btnUpload, 'click', async () => {
  const user = auth.currentUser;
  if (!user) return notify("Please sign in before uploading.");

  const type = upType.value;
  const title = upTitle.value.trim();
  const desc = upDesc.value.trim();
  const file = upFile.files[0];
  const thumb = upThumb.files[0];

  if (!title || !file) return notify("Please add a title and select a file.");
  btnUpload.disabled = true;
  btnUpload.textContent = 'Uploading... 0%';

  try {
    const { ref, uploadBytesResumable, getDownloadURL, uploadBytes } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js");
    const { addDoc, collection, serverTimestamp } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

    const ext = file.name.split('.').pop();
    const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filePath = `uploads/${user.uid}/${Date.now()}_${safeTitle}.${ext}`;
    const storageRef = ref(storage, filePath);

    const task = uploadBytesResumable(storageRef, file);
    task.on('state_changed', snap => {
      const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
      btnUpload.textContent = `Uploading... ${pct}%`;
    });

    await task;
    const mediaUrl = await getDownloadURL(storageRef);

    // Thumbnail (optional)
    let thumbUrl = '';
    if (thumb) {
      const thumbPath = `thumbnails/${user.uid}/${Date.now()}_${thumb.name}`;
      const tRef = ref(storage, thumbPath);
      await uploadBytes(tRef, thumb);
      thumbUrl = await getDownloadURL(tRef);
    }

    await addDoc(collection(db, 'posts'), {
      uid: user.uid,
      username: user.displayName || user.email.split('@')[0],
      type,
      title,
      desc,
      mediaUrl,
      thumbnailUrl: thumbUrl,
      private: false,
      likeCount: 0,
      dislikeCount: 0,
      createdAt: serverTimestamp()
    });

    notify("✅ Upload complete!");
    resetUploadForm();
    document.dispatchEvent(new CustomEvent('intakee:feedRefresh'));
  } catch (err) {
    console.error("Upload error:", err);
    notify("❌ Upload failed: " + err.message);
    btnUpload.disabled = false;
    btnUpload.textContent = 'Upload';
  }
});

$on(goLiveBtn, 'click', () => {
  notify("🚀 Live streaming feature coming soon!");
});

// ============================================================================
// FEED & LIKE / DISLIKE SYSTEM
// ============================================================================
const homeFeed   = qs('#home-feed');
const videosFeed = qs('#videos-feed');
const podcastFeed = qs('#podcast-feed');
const clipsFeed  = qs('#clips-feed');
let _allPosts = [];

// --- Fetch All Posts ---
async function fetchAllPosts() {
  try {
    const { collection, getDocs, orderBy, query, limit } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");
    const qRef = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(100));
    const snap = await getDocs(qRef);
    _allPosts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("❌ Error loading feed:", err);
  }
}

// --- Render Feed Cards ---
function renderFeed(container, list, type = 'all') {
  container.innerHTML = '';
  if (!list || !list.length) {
    container.innerHTML = `<div class="muted">No posts yet.</div>`;
    return;
  }

  list.forEach(post => {
    if (type !== 'all' && post.type !== type) return;

    const card = document.createElement('div');
    card.className = 'card video-card';
    const thumb = post.thumbnailUrl || '/placeholder.png';

    // Card HTML
    card.innerHTML = `
      <div class="thumb-16x9">
        <img src="${thumb}" alt="${post.title}">
        <button class="play-btn" data-url="${post.mediaUrl}">
          <i class="fa fa-play"></i>
        </button>
      </div>
      <div class="meta">
        <h4 class="title">${post.title}</h4>
        <p class="muted small">${post.username || 'Unknown'}</p>
      </div>
      <div class="row space-between small muted">
        <span>${post.type.toUpperCase()}</span>
        <span>${post.likeCount || 0} 👍 | ${post.dislikeCount || 0} 👎</span>
      </div>
    `;

    // --- Play Button ---
    const btn = card.querySelector('.play-btn');
    if (post.type.startsWith('podcast')) {
      btn.addEventListener('click', () => playPodcast(post.mediaUrl, post.title));
    } else {
      btn.addEventListener('click', () => window.open(post.mediaUrl, '_blank'));
    }

    // --- Likes & Dislikes (only for video/podcast) ---
    if (['video', 'podcast', 'podcast-audio'].includes(post.type)) {
      const footer = document.createElement('div');
      footer.className = 'row';
      footer.style.marginTop = "8px";

      const likeBtn = document.createElement('button');
      likeBtn.className = 'ghost';
      likeBtn.innerHTML = '👍 Like';
      likeBtn.addEventListener('click', () => toggleReaction(post.id, true));

      const dislikeBtn = document.createElement('button');
      dislikeBtn.className = 'ghost';
      dislikeBtn.innerHTML = '👎 Dislike';
      dislikeBtn.addEventListener('click', () => toggleReaction(post.id, false));

      footer.append(likeBtn, dislikeBtn);
      card.appendChild(footer);
    }

    container.appendChild(card);
  });
}

// --- Like / Dislike Toggle (mutually exclusive) ---
async function toggleReaction(postId, isLike = true) {
  const user = auth.currentUser;
  if (!user) return notify("Sign in to react.");

  try {
    const { doc, getDoc, updateDoc, increment } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

    const postRef = doc(db, 'posts', postId);
    const snap = await getDoc(postRef);
    if (!snap.exists()) return;

    const post = snap.data();
    const userReaction = post?.[`${user.uid}_reaction`];

    // Clear old reaction
    const updates = {};
    if (userReaction === 'like' && !isLike) {
      updates.likeCount = increment(-1);
      updates.dislikeCount = increment(1);
    } else if (userReaction === 'dislike' && isLike) {
      updates.dislikeCount = increment(-1);
      updates.likeCount = increment(1);
    } else if (!userReaction) {
      updates[isLike ? 'likeCount' : 'dislikeCount'] = increment(1);
    } else {
      // Toggle off same reaction
      updates[userReaction === 'like' ? 'likeCount' : 'dislikeCount'] = increment(-1);
      updates[`${user.uid}_reaction`] = null;
      await updateDoc(postRef, updates);
      document.dispatchEvent(new CustomEvent('intakee:feedRefresh'));
      return;
    }

    updates[`${user.uid}_reaction`] = isLike ? 'like' : 'dislike';
    await updateDoc(postRef, updates);
    document.dispatchEvent(new CustomEvent('intakee:feedRefresh'));
  } catch (err) {
    console.error(err);
    notify("Error: " + err.message);
  }
}

// ============================================================================
// LOAD FEEDS
// ============================================================================
async function loadFeeds() {
  await fetchAllPosts();
  renderFeed(homeFeed, _allPosts);
  renderFeed(videosFeed, _allPosts.filter(p => p.type === 'video'));
  renderFeed(podcastFeed, _allPosts.filter(p => p.type.startsWith('podcast')));
  renderFeed(clipsFeed, _allPosts.filter(p => p.type === 'clip'));
}

document.addEventListener('intakee:feedRefresh', loadFeeds);
document.addEventListener('intakee:auth', e => {
  const user = e.detail.user;
  if (user) loadFeeds();
  else homeFeed.innerHTML = `<div class="muted">Please sign in to view content.</div>`;
});
loadFeeds();
// ============================================================================
// INTAKEE — PART 3: SETTINGS, PRIVACY, BLOCK/UNBLOCK, FINAL BOOT
// ============================================================================
'use strict';

// ----- HELPERS -----
const qs = (s, sc = document) => sc.querySelector(s);
const qsa = (s, sc = document) => Array.from(sc.querySelectorAll(s));
const $on = (el, ev, fn) => el && el.addEventListener(ev, fn);
const notify = (msg) => alert(msg);

// ============================================================================
// SETTINGS — TOGGLES & SAVES
// ============================================================================
const togglePrivate  = qs('#toggle-private');
const toggleUploads  = qs('#toggle-uploads');
const toggleSaved    = qs('#toggle-saved');
const settingsLogout = qs('#settings-logout');

// Apply visual state
function applyToggleState(tog, on) {
  if (!tog) return;
  tog.dataset.on = on ? 'true' : 'false';
  tog.classList.toggle('active', on);
}

// Load settings from Firestore
async function loadUserSettings(uid) {
  try {
    const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");
    const uDoc = await getDoc(doc(db, 'users', uid));
    if (!uDoc.exists()) return;

    const s = uDoc.data();
    applyToggleState(togglePrivate, s.private || false);
    applyToggleState(toggleUploads, s.showUploads ?? true);
    applyToggleState(toggleSaved, s.showSaved ?? true);
  } catch (err) {
    console.warn("⚠️ Settings load failed:", err.message);
  }
}

// Save user setting
async function saveUserSetting(field, value) {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");
    await updateDoc(doc(db, 'users', user.uid), { [field]: value });
  } catch (err) {
    console.error("⚠️ Save failed:", err);
  }
}

// Toggle click handlers
[ togglePrivate, toggleUploads, toggleSaved ].forEach(tog => {
  $on(tog, 'click', () => {
    const newState = !(tog.dataset.on === 'true');
    applyToggleState(tog, newState);
    if (tog.id === 'toggle-private') saveUserSetting('private', newState);
    if (tog.id === 'toggle-uploads') saveUserSetting('showUploads', newState);
    if (tog.id === 'toggle-saved') saveUserSetting('showSaved', newState);
    notify(`Setting updated: ${tog.id.replace('toggle-', '')} → ${newState}`);
  });
});

// ============================================================================
// BLOCK / UNBLOCK SYSTEM
// ============================================================================

// Add buttons dynamically under profile section
const profileActions = qs('.profile-actions');
if (profileActions) {
  const blockBtn = document.createElement('button');
  blockBtn.textContent = '🚫 Block User';
  blockBtn.className = 'ghost';
  blockBtn.id = 'btn-block';
  profileActions.appendChild(blockBtn);

  const unblockBtn = document.createElement('button');
  unblockBtn.textContent = '✅ Unblock User';
  unblockBtn.className = 'ghost';
  unblockBtn.id = 'btn-unblock';
  profileActions.appendChild(unblockBtn);
}

// Block a user
async function blockUser(targetUid) {
  const user = auth.currentUser;
  if (!user || !targetUid) return notify('You must be signed in.');
  try {
    const { doc, updateDoc, arrayUnion } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");
    await updateDoc(doc(db, 'users', user.uid), {
      blocked: arrayUnion(targetUid)
    });
    notify('🚫 User blocked. They will no longer appear in your feed.');
  } catch (err) {
    console.error('Block failed:', err);
    notify('Block failed: ' + err.message);
  }
}

// Unblock a user
async function unblockUser(targetUid) {
  const user = auth.currentUser;
  if (!user || !targetUid) return notify('You must be signed in.');
  try {
    const { doc, updateDoc, arrayRemove } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");
    await updateDoc(doc(db, 'users', user.uid), {
      blocked: arrayRemove(targetUid)
    });
    notify('✅ User unblocked.');
  } catch (err) {
    console.error('Unblock failed:', err);
    notify('Unblock failed: ' + err.message);
  }
}

// Hook up buttons
$on(qs('#btn-block'), 'click', async () => {
  const targetUid = prompt("Enter the user ID to block:");
  if (targetUid) await blockUser(targetUid);
});
$on(qs('#btn-unblock'), 'click', async () => {
  const targetUid = prompt("Enter the user ID to unblock:");
  if (targetUid) await unblockUser(targetUid);
});

// ============================================================================
// DELETE ACCOUNT
// ============================================================================
document.querySelectorAll('.settings-item button.danger').forEach(btn => {
  $on(btn, 'click', async () => {
    const user = auth.currentUser;
    if (!user) return notify("You must be signed in.");
    if (!confirm("⚠️ Delete your account permanently? This cannot be undone.")) return;

    try {
      const { deleteUser } = await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js");
      const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

      await deleteDoc(doc(db, 'users', user.uid));
      await deleteUser(user);
      notify("🗑️ Account deleted.");
    } catch (err) {
      console.error(err);
      notify("❌ " + err.message);
    }
  });
});

// ============================================================================
// AUTO-LOAD SETTINGS ON LOGIN
// ============================================================================
document.addEventListener('intakee:auth', e => {
  const user = e.detail.user;
  if (user) loadUserSettings(user.uid);
});

// ============================================================================
// MINI-PLAYER AUDIO HANDLER
// ============================================================================
const miniPlayer = qs('#mini-player');
const miniAudio  = qs('#mp-audio');
const miniTitle  = qs('#mp-title');
const miniSub    = qs('#mp-sub');
const miniPlay   = qs('#mp-play');
const miniClose  = qs('#mp-close');
let isPlaying = false;

function playPodcast(url, title = 'Now Playing') {
  if (!url) return notify("Invalid podcast file.");
  miniPlayer.hidden = false;
  miniTitle.textContent = title;
  miniAudio.src = url;

  miniAudio.play().then(() => {
    isPlaying = true;
    miniPlay.innerHTML = '<i class="fa fa-pause"></i>';
  }).catch(err => console.warn('Audio failed:', err));
}

$on(miniPlay, 'click', () => {
  if (!miniAudio.src) return;
  if (isPlaying) {
    miniAudio.pause();
    miniPlay.innerHTML = '<i class="fa fa-play"></i>';
  } else {
    miniAudio.play();
    miniPlay.innerHTML = '<i class="fa fa-pause"></i>';
  }
  isPlaying = !isPlaying;
});

$on(miniClose, 'click', () => {
  miniAudio.pause();
  miniAudio.src = '';
  miniPlayer.hidden = true;
  isPlaying = false;
});

// ============================================================================
// SAFE BOOT (APP INITIALIZATION)
// ============================================================================
(async function bootApp() {
  console.log("🚀 Booting INTAKEE...");
  try {
    const user = auth.currentUser;
    if (user) await loadUserSettings(user.uid);
    await loadFeeds();
    console.log("✅ INTAKEE ready.");
  } catch (err) {
    console.error("❌ Boot failed:", err);
  }
})();
// ============================================================================
// INTAKEE — PART 4: USERNAME RECOVERY (FORGOT USERNAME)
// ============================================================================
'use strict';

const authDialog = document.getElementById('authDialog');

// --- Create “Forgot Username?” link below Login form ---
const forgotUserBtn = document.createElement('button');
forgotUserBtn.textContent = "Forgot Username?";
forgotUserBtn.className = "ghost";
forgotUserBtn.style.marginTop = "6px";

const loginSection = document.querySelectorAll('#authDialog div[style*="display:grid"]')[1];
if (loginSection) loginSection.appendChild(forgotUserBtn);

// --- Handler ---
$on(forgotUserBtn, 'click', async () => {
  const email = prompt("Enter your account email:");
  if (!email) return;

  try {
    const { collection, getDocs, query, where, doc, setDoc, serverTimestamp } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

    // Step 1: Check if this email exists
    const usersRef = query(collection(db, "users"), where("email", "==", email));
    const snap = await getDocs(usersRef);

    if (snap.empty) return notify("❌ No account found with that email.");

    // Step 2: Generate recovery code
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
    await setDoc(doc(db, "recoveries", email.replace(/\W/g, "_")), {
      email,
      code,
      createdAt: serverTimestamp()
    });

    // Step 3: “Send” the code (console now, later email)
    console.log(`📩 Recovery code for ${email}: ${code}`);
    notify("A 6-digit recovery code has been sent to your email. (Check console in dev mode)");

    // Step 4: Prompt user for code
    const entered = prompt("Enter the 6-digit recovery code:");
    if (!entered) return notify("Cancelled.");
    if (entered !== code) return notify("❌ Invalid code.");

    // Step 5: Display username
    const userData = snap.docs[0].data();
    const username = userData.username || userData.email.split("@")[0];
    notify(`✅ Your username is: ${username}`);

  } catch (err) {
    console.error(err);
    notify("❌ " + err.message);
  }
});
