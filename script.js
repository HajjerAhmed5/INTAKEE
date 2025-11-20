// =======================================================
// INTAKEE — MAIN APP LOGIC (PART 1)
// Auth, Tabs, Feed Loading, Viewer Redirect, Search Logic
// =======================================================
'use strict';

// -------------------------------
// Firebase (from index.html setup)
// -------------------------------
const { app, auth, db, storage } = window.firebaseRefs || {};
if (!app || !auth || !db) {
  console.error("❌ Firebase not initialized properly. Check index.html config.");
}

// -------------------------------
// Helpers
// -------------------------------
const qs  = (s, sc=document) => sc.querySelector(s);
const qsa = (s, sc=document) => [...sc.querySelectorAll(s)];
const $on = (el, ev, fn) => el && el.addEventListener(ev, fn);

// =======================================================
// TABS + SEARCH BAR LOGIC
// =======================================================
const tabs = {
  home: qs('#tab-home'),
  videos: qs('#tab-videos'),
  podcast: qs('#tab-podcast'),
  upload: qs('#tab-upload'),
  clips: qs('#tab-clips'),
  profile: qs('#tab-profile'),
  settings: qs('#tab-settings')
};

const navLinks = qsa('.bottom-nav a');
const searchBar = qs('.search-bar');

// Hide search bar on Upload + Settings tabs
function handleSearchBar(tab) {
  if (tab === 'upload' || tab === 'settings') {
    searchBar.style.display = 'none';
  } else {
    searchBar.style.display = 'flex';
  }
}

function switchTab(tabName) {
  Object.keys(tabs).forEach(name => {
    tabs[name].style.display = name === tabName ? 'block' : 'none';
  });

  navLinks.forEach(link => {
    link.classList.toggle('active', link.dataset.tab === tabName);
  });

  handleSearchBar(tabName);
}

navLinks.forEach(link => {
  $on(link, 'click', () => {
    const tabName = link.dataset.tab;
    switchTab(tabName);
  });
});

// Default tab = Home
switchTab('home');

// =======================================================
// AUTHENTICATION
// =======================================================
const dlgAuth = qs('#authDialog');
const openAuthBtn = qs('#openAuth');
const signupBtn = qs('#signupBtn');
const loginBtn  = qs('#loginBtn');
const forgotBtn = qs('#forgotBtn');
const logoutBtn = qs('#settings-logout');

// Open modal
$on(openAuthBtn, 'click', () => dlgAuth.showModal());

// Close on clicking ✕
dlgAuth.addEventListener('click', e => {
  if (e.target.tagName === 'BUTTON' && e.target.textContent === '✕') {
    dlgAuth.close();
  }
});

// SIGN-UP
$on(signupBtn, 'click', async () => {
  const email = qs('#signupEmail').value.trim();
  const password = qs('#signupPassword').value.trim();
  const username = qs('#signupUsername').value.trim().toLowerCase();
  const ageOK = qs('#signupAgeConfirm').checked;

  if (!email || !password || !username || !ageOK) {
    return alert("Fill all fields and confirm age 13+.");
  }

  try {
    // Check username unique
    const { 
      getDocs, query, collection, where 
    } = await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

    const q = query(collection(db, "users"), where("username", "==", username));
    const snap = await getDocs(q);
    if (!snap.empty) return alert("Username already taken.");

    // Create account
    const { createUserWithEmailAndPassword, updateProfile } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js");

    const cred = await createUserWithEmailAndPassword(auth, email, password);

    // Save user in Firestore
    const { doc, setDoc, serverTimestamp } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

    await setDoc(doc(db, "users", cred.user.uid), {
      email,
      username,
      name: username,
      bio: "",
      photoURL: "",
      bannerURL: "",
      followers: [],
      following: [],
      private: false,
      showUploads: true,
      showSaved: true,
      createdAt: serverTimestamp()
    });

    await updateProfile(cred.user, { displayName: username });

    alert("Account created!");
    dlgAuth.close();

  } catch (err) {
    alert("Error: " + err.message);
  }
});

// LOGIN
$on(loginBtn, 'click', async () => {
  const email = qs('#loginEmail').value.trim();
  const password = qs('#loginPassword').value.trim();

  if (!email || !password) return alert("Enter email and password.");

  try {
    const { signInWithEmailAndPassword } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js");

    const cred = await signInWithEmailAndPassword(auth, email, password);
    alert(`Welcome back, ${cred.user.displayName || cred.user.email}`);
    dlgAuth.close();

  } catch (err) {
    alert("Login failed: " + err.message);
  }
});

// FORGOT PASSWORD
$on(forgotBtn, 'click', async () => {
  const email = prompt("Enter your account email:");
  if (!email) return;

  try {
    const { sendPasswordResetEmail } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js");

    await sendPasswordResetEmail(auth, email);
    alert("Password reset email sent.");
  } catch (err) {
    alert("Error: " + err.message);
  }
});

// LOGOUT
$on(logoutBtn, 'click', async () => {
  const { signOut } =
    await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js");

  await signOut(auth);
  alert("Logged out.");
});

// =======================================================
// AUTH STATE LISTENER
// =======================================================
onAuthStateChanged(auth, user => {
  if (user) {
    openAuthBtn.style.display = 'none';
    document.dispatchEvent(new CustomEvent('intakee:auth', { detail: { user } }));
  } else {
    openAuthBtn.style.display = 'block';
    document.dispatchEvent(new CustomEvent('intakee:auth', { detail: { user: null } }));
  }
});

// =======================================================
// FEED LOADING + VIEWER REDIRECT
// =======================================================
const homeFeed = qs('#home-feed');
const videosFeed = qs('#videos-feed');
const podcastFeed = qs('#podcast-feed');
const clipsFeed = qs('#clips-feed');

let _allPosts = [];

async function fetchAllPosts() {
  const { collection, getDocs, query, orderBy, limit } =
    await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

  const qRef = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(200));
  const snap = await getDocs(qRef);

  _allPosts = snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));
}

function renderFeed(container, list) {
  container.innerHTML = "";

  if (!list.length) {
    container.innerHTML = `<div class="muted">No posts yet.</div>`;
    return;
  }

  list.forEach(post => {
    const card = document.createElement('div');
    card.className = "feed-card";

    const thumb = post.thumbnailUrl || "placeholder.png";

    card.innerHTML = `
      <div class="thumb">
        <img src="${thumb}" alt="">
        <button class="play-btn" data-id="${post.id}">
          <i class="fa fa-play"></i>
        </button>
      </div>
      <h4>${post.title}</h4>
      <p class="muted small">${post.type.toUpperCase()}</p>
    `;

    // Viewer redirect
    card.querySelector('.play-btn').addEventListener('click', () => {
      window.location.href = `viewer.html?id=${post.id}`;
    });

    container.appendChild(card);
  });
}

async function loadFeeds() {
  await fetchAllPosts();
  renderFeed(homeFeed, _allPosts);
  renderFeed(videosFeed, _allPosts.filter(p => p.type === "video"));
  renderFeed(podcastFeed, _allPosts.filter(p => p.type.includes("podcast")));
  renderFeed(clipsFeed, _allPosts.filter(p => p.type === "clip"));
}

document.addEventListener('intakee:feedRefresh', loadFeeds);

// Initial feed load
loadFeeds();
// =======================================================
// INTAKEE — MAIN APP LOGIC (PART 2)
// Upload, Profile, Settings, Mini Player, Boot
// =======================================================

// -------------------------------
// UPLOAD LOGIC
// -------------------------------
const upType   = qs("#uploadTypeSelect");
const upTitle  = qs("#uploadTitleInput");
const upDesc   = qs("#uploadDescInput");
const upThumb  = qs("#uploadThumbInput");
const upFile   = qs("#uploadFileInput");
const btnUpload = qs("#btnUpload");

function resetUploadForm() {
  upTitle.value = "";
  upDesc.value = "";
  upThumb.value = "";
  upFile.value = "";
  upType.value = "video";
}

$on(btnUpload, "click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Sign in to upload.");

  const title = upTitle.value.trim();
  const desc  = upDesc.value.trim();
  const type  = upType.value;
  const file  = upFile.files[0];
  const thumb = upThumb.files[0];

  if (!title || !file) {
    return alert("Add a title and file.");
  }

  btnUpload.disabled = true;
  btnUpload.textContent = "Uploading...";

  try {
    const {
      ref, uploadBytesResumable, getDownloadURL, uploadBytes
    } = await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js");

    const { addDoc, collection, serverTimestamp } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

    const ext = file.name.split(".").pop();
    const safe = title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const path = `uploads/${user.uid}/${Date.now()}_${safe}.${ext}`;

    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, file);

    task.on("state_changed", snap => {
      const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
      btnUpload.textContent = `Uploading... ${pct}%`;
    });

    await task;
    const mediaUrl = await getDownloadURL(storageRef);

    let thumbUrl = "";
    if (thumb) {
      const tRef = ref(storage, `thumbnails/${user.uid}/${Date.now()}_${thumb.name}`);
      await uploadBytes(tRef, thumb);
      thumbUrl = await getDownloadURL(tRef);
    }

    await addDoc(collection(db, "posts"), {
      uid: user.uid,
      title, desc,
      type,
      mediaUrl,
      thumbnailUrl: thumbUrl,
      likeCount: 0,
      viewCount: 0,
      commentCount: 0,
      createdAt: serverTimestamp()
    });

    alert("Upload complete!");
    resetUploadForm();
    document.dispatchEvent(new CustomEvent("intakee:feedRefresh"));

  } catch (err) {
    alert("Upload failed: " + err.message);
  }

  btnUpload.disabled = false;
  btnUpload.textContent = "Upload";
});

// -------------------------------
// PROFILE LOGIC
// -------------------------------
const profileName   = qs("#profile-name");
const profileHandle = qs("#profile-handle");
const profilePhoto  = qs("#profile-photo");
const profileBanner = qs("#profileBanner");
const bioView       = qs("#bio-view");

const btnEditProfile = qs("#btn-edit-profile");
const bioWrap        = qs("#bio-edit-wrap");

const nameInput  = qs("#profileNameInput");
const bioInput   = qs("#profileBioInput");
const photoInput = qs("#profilePhotoInput");
const bannerInput = qs("#profileBannerInput");

const btnSaveProfile = qs("#btnSaveProfile");
const btnCancelEdit  = qs("#bio-cancel");

const profileGrid = qs("#profile-grid");
const profileEmpty = qs("#profile-empty");

const statPosts = qs("#stat-posts");
const statFollowers = qs("#stat-followers");
const statFollowing = qs("#stat-following");
const statLikes = qs("#stat-likes");

// Show edit UI
$on(btnEditProfile, "click", () => {
  if (!auth.currentUser) return alert("Sign in first.");
  bioWrap.style.display = "";
  nameInput.value = profileName.textContent.trim();
  bioInput.value = bioView.textContent.trim() === "Add a short bio to introduce yourself."
    ? "" : bioView.textContent.trim();
});

// Cancel edit
$on(btnCancelEdit, "click", () => {
  bioWrap.style.display = "none";
});

// Save profile
$on(btnSaveProfile, "click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Sign in first.");

  const name = nameInput.value.trim();
  const bio  = bioInput.value.trim();

  try {
    const {
      ref, uploadBytes, getDownloadURL
    } = await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js");

    const {
      setDoc, doc, serverTimestamp
    } = await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

    const { updateProfile } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js");

    // Profile image
    if (photoInput.files[0]) {
      const pRef = ref(storage, `avatars/${user.uid}_${Date.now()}.jpg`);
      await uploadBytes(pRef, photoInput.files[0]);
      const photoURL = await getDownloadURL(pRef);
      await updateProfile(user, { photoURL });
      profilePhoto.src = photoURL;
    }

    // Banner image
    if (bannerInput.files[0]) {
      const bRef = ref(storage, `banners/${user.uid}_${Date.now()}.jpg`);
      await uploadBytes(bRef, bannerInput.files[0]);
      const bannerURL = await getDownloadURL(bRef);
      profileBanner.style.backgroundImage = `url(${bannerURL})`;
    }

    // Save name + bio
    await setDoc(doc(db, "users", user.uid), {
      name,
      bio,
      updatedAt: serverTimestamp()
    }, { merge: true });

    profileName.textContent = name || user.displayName || "Your Name";
    bioView.textContent = bio || "Add a short bio to introduce yourself.";

    bioWrap.style.display = "none";
    alert("Profile updated!");

  } catch (err) {
    alert("Profile update failed: " + err.message);
  }
});

// Load user profile + posts
async function loadProfilePane(user) {
  if (!user) {
    profileGrid.innerHTML = "";
    profileEmpty.style.display = "block";
    return;
  }

  try {
    const { getDoc, doc } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

    const snap = await getDoc(doc(db, "users", user.uid));
    const data = snap.exists() ? snap.data() : {};

    profileName.textContent = data.name || user.displayName || "Your Name";
    profileHandle.textContent = "@" + (data.username || user.email.split("@")[0]);
    bioView.textContent = (data.bio || "").trim() || "Add a short bio to introduce yourself.";

    if (user.photoURL) profilePhoto.src = user.photoURL;
    if (data.bannerURL) profileBanner.style.backgroundImage = `url(${data.bannerURL})`;

    await loadUserPosts(user.uid);

  } catch (err) {
    console.error("Profile load error:", err);
  }
}

// Load posts for profile
async function loadUserPosts(uid) {
  const {
    collection, getDocs, query, where, orderBy
  } = await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

  const qRef = query(
    collection(db, "posts"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(qRef);
  const posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  profileGrid.innerHTML = "";
  if (!posts.length) {
    profileEmpty.style.display = "block";
  } else {
    profileEmpty.style.display = "none";
  }

  posts.forEach(post => {
    const card = document.createElement("div");
    card.className = "profile-post-card";

    const thumb = post.thumbnailUrl || "placeholder.png";

    // Mixed layout:
    // video → rectangle
    // clip → square
    // podcast → square
    const isWide = post.type === "video" || post.type === "podcast-video";

    card.innerHTML = `
      <div class="thumb" style="aspect-ratio:${isWide ? '16/9' : '1/1'};">
        <img src="${thumb}">
        <div class="overlay">
          <span>${post.type.toUpperCase()}</span>
          <button class="danger delete-post" data-id="${post.id}">
            <i class="fa fa-trash"></i>
          </button>
        </div>
      </div>
      <h4>${post.title}</h4>
    `;

    // click → viewer page
    card.querySelector(".thumb").onclick = () => {
      window.location.href = `viewer.html?id=${post.id}`;
    };

    profileGrid.appendChild(card);
  });

  statPosts.textContent = posts.length;
}

// Delete post
$on(profileGrid, "click", async e => {
  const btn = e.target.closest(".delete-post");
  if (!btn) return;

  if (!confirm("Delete this post permanently?")) return;

  const id = btn.dataset.id;

  try {
    const { deleteDoc, doc } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

    await deleteDoc(doc(db, "posts", id));

    btn.closest(".profile-post-card").remove();
    alert("Post deleted.");

  } catch (err) {
    alert("Failed to delete: " + err.message);
  }
});

// -------------------------------
// SETTINGS PAGE
// -------------------------------
const togglePrivate = qs("#toggle-private");
const toggleUploads = qs("#toggle-uploads");
const toggleSaved   = qs("#toggle-saved");

function applyToggle(tog, state) {
  tog.dataset.on = state ? "true" : "false";
  tog.classList.toggle("active", state);
  tog.textContent = state ? "ON" : "OFF";
}

async function saveSetting(field, value) {
  const user = auth.currentUser;
  if (!user) return;

  const { updateDoc, doc } =
    await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

  await updateDoc(doc(db, "users", user.uid), { [field]: value });
}

[togglePrivate, toggleUploads, toggleSaved].forEach(tog => {
  $on(tog, "click", () => {
    const newState = !(tog.dataset.on === "true");
    applyToggle(tog, newState);

    if (tog.id === "toggle-private") saveSetting("private", newState);
    if (tog.id === "toggle-uploads") saveSetting("showUploads", newState);
    if (tog.id === "toggle-saved")   saveSetting("showSaved", newState);
  });
});

// Accordion for legal sections
qsa(".accordion-header").forEach(header => {
  header.addEventListener("click", () => {
    const id = header.dataset.target;
    const body = qs(`#${id}`);
    const icon = header.querySelector("i");

    if (body.style.display === "block") {
      body.style.display = "none";
      icon.style.transform = "rotate(0deg)";
    } else {
      body.style.display = "block";
      icon.style.transform = "rotate(180deg)";
    }
  });
});

// -------------------------------
// MINI AUDIO PLAYER
// -------------------------------
const miniPlayer = qs("#mini-player");
const miniAudio  = qs("#mp-audio");
const miniPlay   = qs("#mp-play");
const miniClose  = qs("#mp-close");

let mpIsPlaying = false;

function playPodcast(url, title="Now Playing") {
  miniPlayer.hidden = false;
  miniAudio.src = url;
  miniAudio.play();
  mpIsPlaying = true;
  miniPlay.innerHTML = `<i class="fa fa-pause"></i>`;
}

$on(miniPlay, "click", () => {
  if (!miniAudio.src) return;

  if (mpIsPlaying) {
    miniAudio.pause();
    miniPlay.innerHTML = `<i class="fa fa-play"></i>`;
    mpIsPlaying = false;
  } else {
    miniAudio.play();
    miniPlay.innerHTML = `<i class="fa fa-pause"></i>`;
    mpIsPlaying = true;
  }
});

$on(miniClose, "click", () => {
  try { miniAudio.pause(); } catch {}
  miniPlayer.hidden = true;
  miniAudio.src = "";
});

// -------------------------------
// AUTH + PROFILE INITIALIZER
// -------------------------------
document.addEventListener("intakee:auth", e => {
  const user = e.detail.user;

  if (user) {
    loadProfilePane(user);
    loadFeeds();
  } else {
    profileGrid.innerHTML = "";
    profileEmpty.style.display = "block";
  }
});

// -------------------------------
// INITIAL BOOT
// -------------------------------
(async function boot() {
  console.log("🚀 INTAKEE app booted");
  await loadFeeds();
})();
// ===============================================
// INTAKEE — SETTINGS PAGE CONTROLS
// ===============================================

// Shortcut
const qs = s => document.querySelector(s);
const qsa = s => document.querySelectorAll(s);

// HIDE SEARCH BAR on Upload + Settings
function updateSearchBarVisibility(activeTab) {
  const search = qs(".search-bar");
  if (!search) return;

  if (activeTab === "upload" || activeTab === "settings") {
    search.style.display = "none";
  } else {
    search.style.display = "flex";
  }
}

// LISTEN FOR TAB SWITCH
qsa(".bottom-nav a").forEach(btn => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;
    updateSearchBarVisibility(tab);
  });
});

// =================================================
// 1) ACCORDION (Legal Section)
// =================================================
qsa(".accordion-header").forEach(header => {
  header.addEventListener("click", () => {
    const parent = header.parentElement;
    parent.classList.toggle("open");
  });
});

// =================================================
// 2) AUTO-FILL LEGAL TEXT (SAFE + DETAILED)
// =================================================
qs("#legal-privacy").innerHTML = `
<p>
<strong>Privacy Policy</strong><br><br>
INTAKEE collects only what is necessary to operate your account:
email, username, profile details, uploads, likes, comments, and basic usage activity.
We do <strong>not</strong> sell or share personal information with third parties.<br><br>

All user-generated content (videos, podcasts, clips, thumbnails, audio, comments)
is the full legal responsibility of the creator who uploaded it.
INTAKEE is not liable for creator behavior, actions, or posted materials.<br><br>

We may review or remove content only if it violates laws, involves serious harm,
or threatens platform safety. Users may request deletion of their data at:
<strong>intakee2025@gmail.com</strong>.
</p>
`;

qs("#legal-terms").innerHTML = `
<p>
<strong>Terms of Service</strong><br><br>
By using INTAKEE, you agree:
<ul>
  <li>You are 13 years or older.</li>
  <li>You are responsible for all content you upload.</li>
  <li>You agree not to upload nudity, pornographic material,
      illegal content, hateful content, or violent threats.</li>
</ul>

Creators hold full ownership of their uploads and assume full legal responsibility
for any consequences of their content.<br><br>

INTAKEE provides the platform but is not responsible for user-generated content.
Repeated violations may result in account limits or removal.
</p>
`;

qs("#legal-guidelines").innerHTML = `
<p>
<strong>Community Guidelines</strong><br><br>
INTAKEE supports creativity, free speech, and expression, but all users must follow these rules:
<ul>
  <li>No nudity or sexual content</li>
  <li>No harassment or threats</li>
  <li>No hate speech</li>
  <li>No illegal activities</li>
  <li>No violent or harmful content</li>
</ul>

Failure to follow these rules may result in content removal or account action.
</p>
`;

// =================================================
// 3) FIREBASE SETUP FROM WINDOW
// =================================================
const { auth, db } = window.firebaseRefs;

// =================================================
// 4) LOG OUT
// =================================================
qs("#settings-logout").addEventListener("click", async () => {
  await auth.signOut();
  alert("You have been logged out.");
});

// =================================================
// 5) FORGOT PASSWORD
// =================================================
import("https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js")
  .then(({ sendPasswordResetEmail }) => {
    qs("#settings-forgot-password").addEventListener("click", async () => {
      const email = prompt("Enter your account email:");
      if (!email) return;

      try {
        await sendPasswordResetEmail(auth, email);
        alert("A password reset email has been sent.");
      } catch (err) {
        alert("Error: " + err.message);
      }
    });
  });

// =================================================
// 6) FORGOT USERNAME
// =================================================
qs("#settings-forgot-username").addEventListener("click", async () => {
  const email = prompt("Enter your account email:");
  if (!email) return;

  try {
    const snap = await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js")
      .then(({ collection, query, where, getDocs }) =>
        getDocs(query(collection(db, "users"), where("email", "==", email)))
      );

    if (snap.empty) return alert("No account found for that email.");
    
    const data = snap.docs[0].data();
    alert(`Your username is: @${data.username}`);
  } catch (err) {
    alert("Error retrieving username: " + err.message);
  }
});

// =================================================
// 7) DELETE ACCOUNT
// =================================================
qs("#settings-delete-account").addEventListener("click", async () => {
  const confirmDelete = confirm("Delete your account permanently? This cannot be undone.");

  if (!confirmDelete) return;

  try {
    const user = auth.currentUser;
    if (!user) return alert("You must be logged in.");

    // Delete Firestore user doc
    const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");
    await deleteDoc(doc(db, "users", user.uid));

    // Delete Auth user
    await user.delete();

    alert("Account successfully deleted.");
  } catch (err) {
    alert("Error: " + err.message);
  }
});

// =================================================
// 8) PRIVACY & TOGGLES (PRIVATE / UPLOADS / SAVED)
// =================================================
async function saveSetting(field, value) {
  const user = auth.currentUser;
  if (!user) return;

  const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");
  await updateDoc(doc(db, "users", user.uid), { [field]: value });
}

function setupToggle(id, field) {
  const el = qs(id);
  el.addEventListener("change", () => {
    saveSetting(field, el.checked);
  });
}

setupToggle("#toggle-private", "private");
setupToggle("#toggle-show-uploads", "showUploads");
setupToggle("#toggle-show-saved", "showSaved");

// Load user settings on auth
document.addEventListener("intakee:auth", async (e) => {
  const user = e.detail.user;
  if (!user) return;

  const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");
  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return;

  const d = snap.data();

  qs("#toggle-private").checked = d.private ?? false;
  qs("#toggle-show-uploads").checked = d.showUploads ?? true;
  qs("#toggle-show-saved").checked = d.showSaved ?? true;
});

// =================================================
// 9) BLOCKED USERS & REPORT MODAL (Placeholders)
// =================================================
qs("#openBlockedUsers").addEventListener("click", () =>
  alert("Blocked Users feature coming soon.")
);

qs("#openReportModal").addEventListener("click", () =>
  alert("Report Content feature coming soon.")
);
