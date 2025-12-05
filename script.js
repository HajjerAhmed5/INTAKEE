// ======================================
// INTAKEE — CORE APP ENGINE (PART 1)
// Tab switching + auth modal + utilities
// ======================================

// Restore last tab or default to "home"
let currentTab = localStorage.getItem("intakee-current-tab") || "home";

// Tab elements
const navLinks = document.querySelectorAll(".bottom-nav a");
const sections = document.querySelectorAll("main section");

// --------------------------
// SHOW TAB FUNCTION
// --------------------------
// Hide search bar on Upload, Profile, and Settings
const searchBar = document.querySelector(".search-bar");

function updateSearchVisibility(tabName) {
  const hideTabs = ["upload", "profile", "settings"];
  searchBar.style.display = hideTabs.includes(tabName) ? "none" : "flex";
}
function showTab(tabName) {
  currentTab = tabName;
  localStorage.setItem("intakee-current-tab", tabName);

  // hide all pages
  sections.forEach(sec => sec.style.display = "none");

  // show selected page
  const page = document.getElementById(`tab-${tabName}`);
  if (page) page.style.display = "block";
  updateSearchVisibility(tabName);
  // update active button
  navLinks.forEach(link => link.classList.remove("active"));
  const activeLink = document.querySelector(`[data-tab="${tabName}"]`);
  if (activeLink) activeLink.classList.add("active");
}

// Initialize default tab
showTab(currentTab);

// Add click listeners to all nav items
navLinks.forEach(link => {
  link.addEventListener("click", () => {
    const tab = link.getAttribute("data-tab");
    showTab(tab);
  });
});

// ======================================
// AUTH DIALOG (OPEN/CLOSE)
// ======================================

const authDialog = document.getElementById("authDialog");
const openAuthBtn = document.getElementById("openAuth");

// open modal
openAuthBtn?.addEventListener("click", () => {
  authDialog.showModal();
});

// close modal (button inside <form method="dialog">)
authDialog.addEventListener("close", () => {
  console.log("Auth dialog closed");
});

// Utility: read file as data URL (used for avatar, banner, uploads)
function readFileAsDataURL(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.readAsDataURL(file);
  });
}

// Utility: load or initialize localStorage JSON
function loadData(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

// Utility: save JSON to localStorage
function saveData(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
// ======================================
// PART 2 — USER AUTH (LOCAL VERSION)
// ======================================

// Stored in localStorage:
// intakee-users → list of all users
// intakee-current-user → email of logged-in user

let users = loadData("intakee-users", []);
let currentUserEmail = localStorage.getItem("intakee-current-user") || null;

// Get UI elements
const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");
const signupUsername = document.getElementById("signupUsername");
const signupAgeConfirm = document.getElementById("signupAgeConfirm");
const signupBtn = document.getElementById("signupBtn");

const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");

const logoutBtn = document.getElementById("settings-logout");
const deleteAccountBtn = document.getElementById("settings-delete-account");


// =====================================================
// CREATE ACCOUNT
// =====================================================
signupBtn?.addEventListener("click", () => {
  const email = signupEmail.value.trim();
  const password = signupPassword.value.trim();
  const username = signupUsername.value.trim();
  const ageConfirmed = signupAgeConfirm.checked;

  if (!email || !password || !username) {
    alert("Fill all fields.");
    return;
  }
  if (password.length < 6) {
    alert("Password must be at least 6 characters.");
    return;
  }
  if (!ageConfirmed) {
    alert("You must confirm you are 13 or older.");
    return;
  }
  if (users.some(u => u.email === email)) {
    alert("Email already exists.");
    return;
  }

  const newUser = {
    email,
    password,
    username,
    bio: "Add a short bio to introduce yourself.",
    photo: "",
    banner: "",
    posts: [],
    saved: [],
    likes: [],
    playlists: []
  };

  users.push(newUser);
  saveData("intakee-users", users);

  alert("Account created! Please sign in.");
  signupEmail.value = "";
  signupPassword.value = "";
  signupUsername.value = "";
  signupAgeConfirm.checked = false;
});


// =====================================================
// LOGIN
// =====================================================
loginBtn?.addEventListener("click", () => {
  const email = loginEmail.value.trim();
  const password = loginPassword.value.trim();

  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    alert("Invalid email or password.");
    return;
  }

  currentUserEmail = user.email;
  localStorage.setItem("intakee-current-user", currentUserEmail);

  alert("Logged in!");
  authDialog.close();

  refreshProfileUI();
});


// =====================================================
// LOGOUT
// =====================================================
logoutBtn?.addEventListener("click", () => {
  localStorage.removeItem("intakee-current-user");
  currentUserEmail = null;

  alert("Logged out.");
  refreshProfileUI();
  showTab("home");
});


// =====================================================
// DELETE ACCOUNT
// =====================================================
deleteAccountBtn?.addEventListener("click", () => {
  if (!currentUserEmail) {
    alert("You are not logged in.");
    return;
  }

  if (!confirm("Are you sure you want to permanently delete your account?")) {
    return;
  }

  users = users.filter(u => u.email !== currentUserEmail);
  saveData("intakee-users", users);

  localStorage.removeItem("intakee-current-user");
  currentUserEmail = null;

  alert("Account deleted.");
  refreshProfileUI();
  showTab("home");
});


// =====================================================
// FETCH CURRENT USER OBJECT
// =====================================================
function getCurrentUser() {
  if (!currentUserEmail) return null;
  return users.find(u => u.email === currentUserEmail) || null;
}


// =====================================================
// UPDATE PROFILE UI BASED ON LOGIN STATE
// =====================================================
function refreshProfileUI() {
  const user = getCurrentUser();

  const profileName = document.getElementById("profile-name");
  const profileHandle = document.getElementById("profile-handle");
  const profileBio = document.getElementById("bio-view");
  const profilePhoto = document.getElementById("profile-photo");
  const profileBanner = document.getElementById("profileBanner");

  const editBtn = document.getElementById("btn-edit-profile");
  const followBtn = document.getElementById("btn-follow");
  const unfollowBtn = document.getElementById("btn-unfollow");

  if (!user) {
    // not logged in
    profileName.textContent = "Your Name";
    profileHandle.textContent = "@username";
    profileBio.textContent = "Add a short bio to introduce yourself.";
    profilePhoto.src = "";
    profileBanner.style.background = "#222";

    editBtn.style.display = "none";
    followBtn.style.display = "none";
    unfollowBtn.style.display = "none";

    return;
  }

  // logged-in user
  profileName.textContent = user.username;
  profileHandle.textContent = "@" + user.username.toLowerCase();
  profileBio.textContent = user.bio || "Add a short bio to introduce yourself.";

  profilePhoto.src = user.photo || "";
  profileBanner.style.backgroundImage = user.banner ? `url(${user.banner})` : "none";

  editBtn.style.display = "inline-block";
  followBtn.style.display = "none";
  unfollowBtn.style.display = "none";
}


// Initialize profile UI on load
refreshProfileUI();
// ======================================
// PART 3 — PROFILE EDITING (PHOTO, BANNER, BIO)
// ======================================

const editProfileBtn = document.getElementById("btn-edit-profile");
const bioEditWrap = document.getElementById("bio-edit-wrap");
const bioCancelBtn = document.getElementById("bio-cancel");
const profileNameInput = document.getElementById("profileNameInput");
const profileBioInput = document.getElementById("profileBioInput");
const profilePhotoInput = document.getElementById("profilePhotoInput");
const profileBannerInput = document.getElementById("profileBannerInput");
const saveProfileBtn = document.getElementById("btnSaveProfile");

const profilePhotoView = document.getElementById("profile-photo");
const profileBannerView = document.getElementById("profileBanner");


// --------------------------------------
// OPEN PROFILE EDITOR
// --------------------------------------
editProfileBtn?.addEventListener("click", () => {
  const user = getCurrentUser();
  if (!user) {
    alert("You must be logged in.");
    return;
  }

  // Fill form with existing data
  profileNameInput.value = user.username;
  profileBioInput.value = user.bio || "";

  bioEditWrap.style.display = "block";
});


// --------------------------------------
// CANCEL EDIT
// --------------------------------------
bioCancelBtn?.addEventListener("click", () => {
  bioEditWrap.style.display = "none";
});


// --------------------------------------
// SAVE PROFILE CHANGES
// --------------------------------------
saveProfileBtn?.addEventListener("click", async () => {
  let user = getCurrentUser();
  if (!user) return alert("Not logged in.");

  const newName = profileNameInput.value.trim();
  const newBio = profileBioInput.value.trim();

  if (!newName) return alert("Name cannot be empty.");

  // Update name + bio
  user.username = newName;
  user.bio = newBio;

  // Save profile photo
  if (profilePhotoInput.files.length > 0) {
    const file = profilePhotoInput.files[0];
    user.photo = await readFileAsDataURL(file);
  }

  // Save banner
  if (profileBannerInput.files.length > 0) {
    const file = profileBannerInput.files[0];
    user.banner = await readFileAsDataURL(file);
  }

  // Save back to users list
  users = users.map(u => u.email === user.email ? user : u);
  saveData("intakee-users", users);

  // Update current session
  refreshProfileUI();

  alert("Profile updated!");
  bioEditWrap.style.display = "none";
});


// --------------------------------------
// PROFILE SUB-TABS (Uploads / Saved / Likes / Playlists)
// --------------------------------------

const profileTabs = document.querySelectorAll(".profile-tabs .pill");

profileTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    const selected = tab.getAttribute("data-profile-tab");

    profileTabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    document.getElementById("profile-grid").style.display = selected === "uploads" ? "flex" : "none";
    document.getElementById("profile-saved").style.display = selected === "saved" ? "flex" : "none";
    document.getElementById("profile-likes").style.display = selected === "likes" ? "flex" : "none";
    document.getElementById("profile-playlists").style.display = selected === "playlists" ? "flex" : "none";
  });
});
// ======================================
// PART 4 — UPLOAD SYSTEM + CONTENT FEEDS
// ======================================

let posts = loadData("intakee-posts", []);

// Inputs
const uploadTypeSelect = document.getElementById("uploadTypeSelect");
const uploadTitleInput = document.getElementById("uploadTitleInput");
const uploadDescInput = document.getElementById("uploadDescInput");
const uploadThumbInput = document.getElementById("uploadThumbInput");
const uploadFileInput = document.getElementById("uploadFileInput");
const uploadBtn = document.getElementById("btnUpload");


// =====================================================
// UPLOAD BUTTON HANDLER
// =====================================================
uploadBtn?.addEventListener("click", async () => {
  const user = getCurrentUser();
  if (!user) {
    alert("You must be logged in to upload.");
    showTab("profile");
    return;
  }

  const type = uploadTypeSelect.value;
  const title = uploadTitleInput.value.trim();
  const desc = uploadDescInput.value.trim();
  const file = uploadFileInput.files[0];
  const thumbFile = uploadThumbInput.files[0];

  if (!title || !file || !thumbFile) {
    alert("Please fill all required fields (title, file, thumbnail).");
    return;
  }

  const fileData = await readFileAsDataURL(file);
  const thumbData = await readFileAsDataURL(thumbFile);

  const newPost = {
    id: Date.now(),
    user: user.email,
    username: user.username,
    type,                // video, clip, podcast-audio, podcast-video
    title,
    desc,
    fileData,
    thumbData,
    createdAt: Date.now(),
    likes: 0,
    dislikes: 0
  };

  posts.unshift(newPost);
  saveData("intakee-posts", posts);

  user.posts.push(newPost.id);
  users = users.map(u => u.email === user.email ? user : u);
  saveData("intakee-users", users);

  alert("Upload complete!");

  // Reset form
  uploadTitleInput.value = "";
  uploadDescInput.value = "";
  uploadThumbInput.value = "";
  uploadFileInput.value = "";

  refreshFeeds();
  refreshProfileUploads();
});


// =====================================================
// FEED RENDERING
// =====================================================
const homeFeed = document.getElementById("home-feed");
const videosFeed = document.getElementById("videos-feed");
const podcastFeed = document.getElementById("podcast-feed");
const clipsFeed = document.getElementById("clips-feed");

function createPostCard(post) {
  const div = document.createElement("div");
  div.className = "card";

  div.innerHTML = `
    <img src="${post.thumbData}" style="width:100%; border-radius:12px; margin-bottom:10px;">

    <h3>${post.title}</h3>
    <p class="muted">${post.username}</p>

    <button class="play-btn" data-id="${post.id}" style="
      width:100%; padding:10px; margin-top:10px;
      background:#222; color:white; border:none; border-radius:8px;">
      Play
    </button>
  `;

  // Play button event
  div.querySelector(".play-btn").addEventListener("click", () => {
    openViewer(post);
  });

  return div;
}


// =====================================================
// REFRESH ALL FEEDS
// =====================================================
function refreshFeeds() {
  homeFeed.innerHTML = "";
  videosFeed.innerHTML = "";
  podcastFeed.innerHTML = "";
  clipsFeed.innerHTML = "";

  posts.forEach(post => {
    const card = createPostCard(post);

    // Home feed → ALL content
    homeFeed.appendChild(card.cloneNode(true));

    // Videos feed
    if (post.type === "video") videosFeed.appendChild(createPostCard(post));

    // Podcast feed
    if (post.type === "podcast-audio" || post.type === "podcast-video")
      podcastFeed.appendChild(createPostCard(post));

    // Clips feed
    if (post.type === "clip") clipsFeed.appendChild(createPostCard(post));
  });
}


// =====================================================
// PROFILE — SHOW USER'S OWN UPLOADS
// =====================================================
function refreshProfileUploads() {
  const profileGrid = document.getElementById("profile-grid");
  const emptyMsg = document.getElementById("profile-empty");

  const user = getCurrentUser();
  if (!user) {
    profileGrid.innerHTML = "";
    emptyMsg.style.display = "block";
    return;
  }

  const userPosts = posts.filter(p => p.user === user.email);

  if (userPosts.length === 0) {
    profileGrid.innerHTML = "";
    emptyMsg.style.display = "block";
    return;
  }

  emptyMsg.style.display = "none";
  profileGrid.innerHTML = "";

  userPosts.forEach(post => {
    const card = createPostCard(post);
    profileGrid.appendChild(card);
  });
}


// Run feeds on load
refreshFeeds();
refreshProfileUploads();
// ======================================
// PART 5 — MEDIA VIEWER + LIKE/SAVE
// ======================================

// Viewer elements
let viewerOverlay;
function createViewer() {
  viewerOverlay = document.createElement("div");
  viewerOverlay.id = "viewer-overlay";
  viewerOverlay.style.position = "fixed";
  viewerOverlay.style.top = 0;
  viewerOverlay.style.left = 0;
  viewerOverlay.style.right = 0;
  viewerOverlay.style.bottom = 0;
  viewerOverlay.style.background = "rgba(0,0,0,0.95)";
  viewerOverlay.style.zIndex = 5000;
  viewerOverlay.style.padding = "20px";
  viewerOverlay.style.overflowY = "auto";
  viewerOverlay.style.color = "white";

  document.body.appendChild(viewerOverlay);
}


// ---------------------------------------------------
// OPEN VIEWER FOR ANY POST
// ---------------------------------------------------
function openViewer(post) {
  if (!viewerOverlay) createViewer();

  viewerOverlay.innerHTML = `
    <button id="viewer-close" style="
      background:none; border:none; color:white; font-size:28px; float:right;
    ">✕</button>

    <h2>${post.title}</h2>
    <p class="muted">${post.username}</p>

    <div id="viewer-media" style="margin-top:15px;"></div>

    <div style="margin-top:20px;">
      <button id="like-btn" style="padding:10px; margin-right:10px; background:#222; color:white; border:none; border-radius:8px;">
        👍 Like (${post.likes})
      </button>
      <button id="dislike-btn" style="padding:10px; margin-right:10px; background:#222; color:white; border:none; border-radius:8px;">
        👎 Dislike (${post.dislikes})
      </button>
      <button id="save-btn" style="padding:10px; background:#333; color:white; border:none; border-radius:8px;">
        ⭐ Save
      </button>
    </div>

    <p style="margin-top:20px;">${post.desc || ""}</p>
  `;

  showMedia(post);
  viewerOverlay.style.display = "block";

  document.getElementById("viewer-close").onclick = () => {
    viewerOverlay.style.display = "none";
  };

  setupLikeSystem(post);
  setupSaveSystem(post);
}


// ---------------------------------------------------
// SHOW MEDIA (VIDEO / AUDIO / PODCAST)
// ---------------------------------------------------
function showMedia(post) {
  const mediaBox = document.getElementById("viewer-media");

  // VIDEO or CLIP
  if (post.type === "video" || post.type === "clip" || post.type === "podcast-video") {
    mediaBox.innerHTML = `
      <video controls style="width:100%; border-radius:12px;">
        <source src="${post.fileData}">
      </video>
    `;
  }

  // AUDIO PODCAST → USE MINI PLAYER
  else if (post.type === "podcast-audio") {
    mediaBox.innerHTML = `
      <div style="padding:20px; background:#111; border-radius:12px; text-align:center;">
        <p>Audio Podcast</p>
        <button id="play-audio" style="
          padding:12px 20px; background:#333; color:white;
          border:none; border-radius:8px;
        ">▶ Play Audio</button>
      </div>
    `;

    document.getElementById("play-audio").onclick = () => {
      startMiniPlayer(post);
    };
  }
}


// ======================================
// MINI PLAYER FOR AUDIO PODCASTS
// ======================================
const miniPlayer = document.getElementById("mini-player");
const miniAudio = document.getElementById("mp-audio");
const miniPlayBtn = document.getElementById("mp-play");
const miniCloseBtn = document.getElementById("mp-close");

function startMiniPlayer(post) {
  miniAudio.src = post.fileData;
  miniPlayer.hidden = false;
  miniAudio.play();

  miniPlayBtn.innerHTML = '<i class="fa fa-pause"></i>';

  miniPlayBtn.onclick = () => {
    if (miniAudio.paused) {
      miniAudio.play();
      miniPlayBtn.innerHTML = '<i class="fa fa-pause"></i>';
    } else {
      miniAudio.pause();
      miniPlayBtn.innerHTML = '<i class="fa fa-play"></i>';
    }
  };

  miniCloseBtn.onclick = () => {
    miniPlayer.hidden = true;
    miniAudio.pause();
  };
}


// ======================================
// LIKE + DISLIKE SYSTEM
// ======================================
function setupLikeSystem(post) {
  const likeBtn = document.getElementById("like-btn");
  const dislikeBtn = document.getElementById("dislike-btn");

  likeBtn.onclick = () => {
    post.likes++;
    saveData("intakee-posts", posts);
    likeBtn.innerHTML = `👍 Like (${post.likes})`;
  };

  dislikeBtn.onclick = () => {
    post.dislikes++;
    saveData("intakee-posts", posts);
    dislikeBtn.innerHTML = `👎 Dislike (${post.dislikes})`;
  };
}


// ======================================
// SAVE SYSTEM (FOR PROFILE → SAVED TAB)
// ======================================
function setupSaveSystem(post) {
  const saveBtn = document.getElementById("save-btn");
  const user = getCurrentUser();

  if (!user) {
    saveBtn.onclick = () => alert("You must be logged in to save posts.");
    return;
  }

  saveBtn.onclick = () => {
    if (!user.saved.includes(post.id)) {
      user.saved.push(post.id);
    }

    users = users.map(u => u.email === user.email ? user : u);
    saveData("intakee-users", users);

    saveBtn.innerHTML = "⭐ Saved!";
  };
}
// ======================================
// PART 6 — SAVED POSTS + LIKED POSTS + STATS
// ======================================

// Elements
const savedGrid = document.getElementById("profile-saved");
const likedGrid = document.getElementById("profile-likes");


// =====================================================
// REFRESH SAVED POSTS
// =====================================================
function refreshSavedPosts() {
  const user = getCurrentUser();
  if (!user) {
    savedGrid.innerHTML = "<p class='muted'>Login to view saved posts.</p>";
    return;
  }

  const savedPosts = posts.filter(p => user.saved.includes(p.id));

  savedGrid.innerHTML = "";
  if (savedPosts.length === 0) {
    savedGrid.innerHTML = "<p class='muted'>No saved posts yet.</p>";
    return;
  }

  savedPosts.forEach(post => {
    const card = createPostCard(post);
    savedGrid.appendChild(card);
  });
}


// =====================================================
// REFRESH LIKED POSTS
// =====================================================
function refreshLikedPosts() {
  const user = getCurrentUser();
  if (!user) {
    likedGrid.innerHTML = "<p class='muted'>Login to view liked posts.</p>";
    return;
  }

  const likedPosts = posts.filter(p => user.likes?.includes(p.id));

  likedGrid.innerHTML = "";
  if (!likedPosts || likedPosts.length === 0) {
    likedGrid.innerHTML = "<p class='muted'>No liked posts yet.</p>";
    return;
  }

  likedPosts.forEach(post => {
    const card = createPostCard(post);
    likedGrid.appendChild(card);
  });
}


// =====================================================
// UPDATE PROFILE STATS
// =====================================================
function refreshProfileStats() {
  const user = getCurrentUser();
  if (!user) {
    document.getElementById("stat-posts").textContent = "0";
    document.getElementById("stat-followers").textContent = "0";
    document.getElementById("stat-following").textContent = "0";
    document.getElementById("stat-likes").textContent = "0";
    return;
  }

  // Posts count
  const userPosts = posts.filter(p => p.user === user.email);
  document.getElementById("stat-posts").textContent = userPosts.length;

  // Followers & following → will update when follow system is implemented
  document.getElementById("stat-followers").textContent = user.followers?.length || 0;
  document.getElementById("stat-following").textContent = user.following?.length || 0;

  // Total likes received
  const totalLikes = userPosts.reduce((sum, p) => sum + p.likes, 0);
  document.getElementById("stat-likes").textContent = totalLikes;
}


// =====================================================
// UPDATE EVERYTHING IN PROFILE PAGE
// =====================================================
function refreshAllProfileSections() {
  refreshProfileUploads();
  refreshSavedPosts();
  refreshLikedPosts();
  refreshProfileStats();
}


// =====================================================
// LIKE LISTENER — ADD POST TO USER'S LIKED LIST
// (Modify Part 5's like system to support "Likes Tab")
// =====================================================
function addToLikedPosts(postId) {
  const user = getCurrentUser();
  if (!user) return;

  if (!user.likes.includes(postId)) {
    user.likes.push(postId);
  }

  users = users.map(u => u.email === user.email ? user : u);
  saveData("intakee-users", users);

  refreshLikedPosts();
  refreshProfileStats();
}

// Override like system to also save liked post
const oldSetupLike = setupLikeSystem;
setupLikeSystem = function(post) {
  const likeBtn = document.getElementById("like-btn");
  const dislikeBtn = document.getElementById("dislike-btn");

  likeBtn.onclick = () => {
    post.likes++;
    saveData("intakee-posts", posts);
    likeBtn.innerHTML = `👍 Like (${post.likes})`;

    addToLikedPosts(post.id);
  };

  dislikeBtn.onclick = () => {
    post.dislikes++;
    saveData("intakee-posts", posts);
    dislikeBtn.innerHTML = `👎 Dislike (${post.dislikes})`;
  };
};


// Run profile feeds on load
refreshSavedPosts();
refreshLikedPosts();
refreshProfileStats();
// ======================================
// PART 7 — SETTINGS SYSTEM
// ======================================

const togglePrivate = document.getElementById("toggle-private");
const toggleShowUploads = document.getElementById("toggle-show-uploads");
const toggleShowSaved = document.getElementById("toggle-show-saved");
const toggleRestricted = document.getElementById("toggle-restricted");
const toggleAgeWarning = document.getElementById("toggle-age-warning");

const toggleNotifyPush = document.getElementById("toggle-notify-push");
const toggleNotifyEmail = document.getElementById("toggle-notify-email");
const toggleNotifyFollow = document.getElementById("toggle-notify-follow");
const toggleNotifyLikes = document.getElementById("toggle-notify-likes");
const toggleNotifyComments = document.getElementById("toggle-notify-comments");


// ==========================
// LOAD USER SETTINGS
// ==========================
function loadUserSettings() {
  const user = getCurrentUser();
  if (!user) return;

  user.settings = user.settings || {
    private: false,
    showUploads: true,
    showSaved: true,
    restricted: false,
    ageWarning: false,
    notifyPush: true,
    notifyEmail: false,
    notifyFollow: true,
    notifyLikes: true,
    notifyComments: true
  };

  // Apply to toggles
  togglePrivate.checked = user.settings.private;
  toggleShowUploads.checked = user.settings.showUploads;
  toggleShowSaved.checked = user.settings.showSaved;
  toggleRestricted.checked = user.settings.restricted;
  toggleAgeWarning.checked = user.settings.ageWarning;

  toggleNotifyPush.checked = user.settings.notifyPush;
  toggleNotifyEmail.checked = user.settings.notifyEmail;
  toggleNotifyFollow.checked = user.settings.notifyFollow;
  toggleNotifyLikes.checked = user.settings.notifyLikes;
  toggleNotifyComments.checked = user.settings.notifyComments;
}


// ==========================
// SAVE SETTINGS
// ==========================
function saveUserSettings() {
  const user = getCurrentUser();
  if (!user) return;

  user.settings = {
    private: togglePrivate.checked,
    showUploads: toggleShowUploads.checked,
    showSaved: toggleShowSaved.checked,
    restricted: toggleRestricted.checked,
    ageWarning: toggleAgeWarning.checked,

    notifyPush: toggleNotifyPush.checked,
    notifyEmail: toggleNotifyEmail.checked,
    notifyFollow: toggleNotifyFollow.checked,
    notifyLikes: toggleNotifyLikes.checked,
    notifyComments: toggleNotifyComments.checked
  };

  users = users.map(u => u.email === user.email ? user : u);
  saveData("intakee-users", users);
}


// ==========================
// LISTENERS FOR EACH TOGGLE
// ==========================
[
  togglePrivate,
  toggleShowUploads,
  toggleShowSaved,
  toggleRestricted,
  toggleAgeWarning,
  toggleNotifyPush,
  toggleNotifyEmail,
  toggleNotifyFollow,
  toggleNotifyLikes,
  toggleNotifyComments
].forEach(toggle => {
  toggle?.addEventListener("change", () => {
    saveUserSettings();
  });
});


// ==========================
// INITIALIZE ON LOAD
// ==========================
loadUserSettings();
// ======================================
// PART 8 — FINAL POLISHING + ACCORDIONS
// ======================================


// ==========================
// SETTINGS ACCORDIONS
// ==========================
const accordions = document.querySelectorAll(".accordion");

accordions.forEach(acc => {
  const header = acc.querySelector(".accordion-header");
  const body = acc.querySelector(".accordion-body");

  header.addEventListener("click", () => {
    const isOpen = body.style.display === "block";
    body.style.display = isOpen ? "none" : "block";
    header.querySelector("span:last-child").textContent = isOpen ? "▼" : "▲";
  });
});


// ==========================
// BLOCKED USERS SYSTEM (PRE-FIREBASE)
// ==========================
let blockedUsers = loadData("intakee-blocked", []);

document.getElementById("openBlockedUsers")?.addEventListener("click", () => {
  alert(
    "Blocked Users Feature (Preview)\n\n" +
    "In the live Firebase version, you will be able to:\n" +
    "- Block a user\n" +
    "- Unblock a user\n" +
    "- Prevent users from seeing your posts\n" +
    "- Hide all content from blocked users\n\n" +
    "This is a placeholder until Firebase is connected."
  );
});


// ==========================
// REPORT CONTENT SYSTEM (PREVIEW)
// ==========================
document.getElementById("openReportModal")?.addEventListener("click", () => {
  alert(
    "Report System (Preview)\n\n" +
    "Users will be able to report posts.\n" +
    "Reports will be reviewed and action will be taken.\n" +
    "This demo version unlocks once Firebase moderation is added."
  );
});


// ==========================
// FORGOT USERNAME / PASSWORD (PREVIEW)
// ==========================
document.getElementById("settings-forgot-username")?.addEventListener("click", () => {
  alert("Forgot Username feature will be activated when Firebase login is implemented.");
});

document.getElementById("settings-forgot-password")?.addEventListener("click", () => {
  alert("Password reset email will work when Firebase Auth is connected.");
});


// ======================================
// FINAL INITIALIZATION
// Run all refresh functions so the app is ready on load
// ======================================

function initializeApp() {
  refreshFeeds();
  refreshProfileUI();
  refreshAllProfileSections();
  loadUserSettings();
}

initializeApp();

console.log("%cINTAKEE FRONTEND READY", "color: #0f0; font-size: 16px; font-weight: bold;");
