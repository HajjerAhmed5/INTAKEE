// ======================================
// INTAKEE — CORE APP ENGINE (PART 1)
// Tab switching + auth + utilities
// ======================================

// Restore last tab or default to "home"
let currentTab = localStorage.getItem("intakee-current-tab") || "home";

// Tab elements
const navLinks = document.querySelectorAll(".bottom-nav a");
const sections = document.querySelectorAll("main section");

// Hide search bar on Upload, Profile, Settings
const searchBar = document.querySelector(".search-bar");

function updateSearchVisibility(tabName) {
  const hideTabs = ["upload", "profile", "settings"];
  searchBar.style.display = hideTabs.includes(tabName) ? "none" : "flex";
}

function showTab(tabName) {
  currentTab = tabName;
  localStorage.setItem("intakee-current-tab", tabName);

  sections.forEach(sec => sec.style.display = "none");

  const page = document.getElementById(`tab-${tabName}`);
  if (page) page.style.display = "block";

  updateSearchVisibility(tabName);

  navLinks.forEach(link => link.classList.remove("active"));
  const activeLink = document.querySelector(`[data-tab="${tabName}"]`);
  if (activeLink) activeLink.classList.add("active");
}

showTab(currentTab);

navLinks.forEach(link => {
  link.addEventListener("click", () => {
    const tab = link.getAttribute("data-tab");
    showTab(tab);
  });
});

// ======================================
// AUTH DIALOG
// ======================================
const authDialog = document.getElementById("authDialog");
const openAuthBtn = document.getElementById("openAuth");

openAuthBtn?.addEventListener("click", () => {
  const user = getCurrentUser();
  if (user) {
    showTab("profile");
  } else {
    authDialog.showModal();
  }
});

authDialog.addEventListener("close", () => {
  console.log("Auth dialog closed");
});

// Utilities
function readFileAsDataURL(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.readAsDataURL(file);
  });
}

function loadData(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function saveData(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ======================================
// USER AUTH (LOCAL STORAGE VERSION)
// ======================================
let users = loadData("intakee-users", []);
let currentUserEmail = localStorage.getItem("intakee-current-user") || null;

// Elements
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

// CREATE ACCOUNT
signupBtn?.addEventListener("click", () => {
  const email = signupEmail.value.trim();
  const password = signupPassword.value.trim();
  const username = signupUsername.value.trim();
  const ageConfirmed = signupAgeConfirm.checked;

  if (!email || !password || !username) return alert("Fill all fields.");
  if (password.length < 6) return alert("Password must be at least 6 characters.");
  if (!ageConfirmed) return alert("You must confirm you are 13 or older.");
  if (users.some(u => u.email === email)) return alert("Email already exists.");

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

// LOGIN
loginBtn?.addEventListener("click", () => {
  const email = loginEmail.value.trim();
  const password = loginPassword.value.trim();

  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return alert("Invalid email or password.");

  currentUserEmail = user.email;
  localStorage.setItem("intakee-current-user", currentUserEmail);

  alert("Logged in!");
  authDialog.close();

  refreshProfileUI();
  refreshLoginButton();
});

// LOGOUT
logoutBtn?.addEventListener("click", () => {
  localStorage.removeItem("intakee-current-user");
  currentUserEmail = null;

  alert("Logged out.");
  refreshProfileUI();
  refreshLoginButton();
  showTab("home");
});

// DELETE ACCOUNT
deleteAccountBtn?.addEventListener("click", () => {
  if (!currentUserEmail) return alert("You are not logged in.");
  if (!confirm("Delete account permanently?")) return;

  users = users.filter(u => u.email !== currentUserEmail);
  saveData("intakee-users", users);

  localStorage.removeItem("intakee-current-user");
  currentUserEmail = null;

  alert("Account deleted.");
  refreshProfileUI();
  refreshLoginButton();
  showTab("home");
});

// GET CURRENT USER
function getCurrentUser() {
  if (!currentUserEmail) return null;
  return users.find(u => u.email === currentUserEmail) || null;
}

// ======================================
// LOGIN BUTTON TEXT UPDATE ("Login" → username)
// ======================================
function refreshLoginButton() {
  const user = getCurrentUser();
  const btn = document.getElementById("openAuth");

  if (!btn) return;

  if (user) {
    btn.textContent = user.username;
  } else {
    btn.textContent = "Login";
  }
}
refreshLoginButton();

// ======================================
// PROFILE UI UPDATE
// ======================================
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

  profileName.textContent = user.username;
  profileHandle.textContent = "@" + user.username.toLowerCase();
  profileBio.textContent = user.bio || "Add a short bio to introduce yourself.";

  profilePhoto.src = user.photo || "";
  profileBanner.style.backgroundImage = user.banner ? `url(${user.banner})` : "none";

  editBtn.style.display = "inline-block";
  followBtn.style.display = "none";
  unfollowBtn.style.display = "none";
}
refreshProfileUI();

// ======================================
// PROFILE EDITING
// ======================================
const editProfileBtn = document.getElementById("btn-edit-profile");
const bioEditWrap = document.getElementById("bio-edit-wrap");
const bioCancelBtn = document.getElementById("bio-cancel");

const profileNameInput = document.getElementById("profileNameInput");
const profileBioInput = document.getElementById("profileBioInput");
const profilePhotoInput = document.getElementById("profilePhotoInput");
const profileBannerInput = document.getElementById("profileBannerInput");
const saveProfileBtn = document.getElementById("btnSaveProfile");

editProfileBtn?.addEventListener("click", () => {
  const user = getCurrentUser();
  if (!user) return alert("You must be logged in.");

  profileNameInput.value = user.username;
  profileBioInput.value = user.bio || "";
  bioEditWrap.style.display = "block";
});

bioCancelBtn?.addEventListener("click", () => {
  bioEditWrap.style.display = "none";
});

saveProfileBtn?.addEventListener("click", async () => {
  let user = getCurrentUser();
  if (!user) return alert("Not logged in.");

  const newName = profileNameInput.value.trim();
  const newBio = profileBioInput.value.trim();

  if (!newName) return alert("Name cannot be empty.");

  user.username = newName;
  user.bio = newBio;

  if (profilePhotoInput.files.length > 0) {
    user.photo = await readFileAsDataURL(profilePhotoInput.files[0]);
  }

  if (profileBannerInput.files.length > 0) {
    user.banner = await readFileAsDataURL(profileBannerInput.files[0]);
  }

  users = users.map(u => u.email === user.email ? user : u);
  saveData("intakee-users", users);

  refreshProfileUI();
  refreshLoginButton();

  alert("Profile updated!");
  bioEditWrap.style.display = "none";
});
// ======================================
// PART 4 — UPLOAD SYSTEM + CONTENT FEEDS
// ======================================

let posts = loadData("intakee-posts", []);

// Upload inputs
const uploadTypeSelect = document.getElementById("uploadTypeSelect");
const uploadTitleInput = document.getElementById("uploadTitleInput");
const uploadDescInput = document.getElementById("uploadDescInput");
const uploadThumbInput = document.getElementById("uploadThumbInput");
const uploadFileInput = document.getElementById("uploadFileInput");
const uploadBtn = document.getElementById("btnUpload");

// --------------------------------------
// PART 4 — UPLOAD SYSTEM + CONTENT FEEDS
// --------------------------------------
// --------------------------------------
// UPLOAD HANDLER (FIXED VERSION)
// --------------------------------------
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

  // Convert to base64
  const fileData = await readFileAsDataURL(file);
  const thumbData = await readFileAsDataURL(thumbFile);

  // New post
  const newPost = {
    id: Date.now(),
    user: user.email,
    username: user.username,
    type,
    title,
    desc,
    fileData,
    thumbData,
    createdAt: Date.now(),
    likes: 0,
    dislikes: 0
  };

  // Save post
  posts.unshift(newPost);
  saveData("intakee-posts", posts);

  // Save under user
  user.posts.push(newPost.id);
  users = users.map(u => u.email === user.email ? user : u);
  saveData("intakee-users", users);

  alert("Upload complete!");

  // Reset form SAFELY
  uploadTitleInput.value = "";
  uploadDescInput.value = "";
  uploadThumbInput.value = null;
  uploadFileInput.value = null;

  refreshFeeds();
  refreshProfileUploads();
});
// ======================================
// FEED RENDERING
// ======================================
const homeFeed = document.getElementById("home-feed");
const videosFeed = document.getElementById("videos-feed");
const podcastFeed = document.getElementById("podcast-feed");
const clipsFeed = document.getElementById("clips-feed");

// Create card
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

  div.querySelector(".play-btn").addEventListener("click", () => {
    openViewer(post);
  });

  return div;
}

// Refresh feeds
function refreshFeeds() {
  homeFeed.innerHTML = "";
  videosFeed.innerHTML = "";
  podcastFeed.innerHTML = "";
  clipsFeed.innerHTML = "";

  posts.forEach(post => {
    homeFeed.appendChild(createPostCard(post));

    if (post.type === "video") videosFeed.appendChild(createPostCard(post));
    if (post.type === "clip") clipsFeed.appendChild(createPostCard(post));
    if (post.type.includes("podcast")) podcastFeed.appendChild(createPostCard(post));
  });
}

refreshFeeds();

// ======================================
// PROFILE — UPLOADS
// ======================================
function refreshProfileUploads() {
  const user = getCurrentUser();
  const profileGrid = document.getElementById("profile-grid");
  const emptyMsg = document.getElementById("profile-empty");

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

  userPosts.forEach(post => profileGrid.appendChild(createPostCard(post)));
}

refreshProfileUploads();

// ======================================
// PART 5 — VIEWER (PLAY VIDEO / AUDIO)
// ======================================
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
      <button id="like-btn" class="viewer-btn">👍 Like (${post.likes})</button>
      <button id="dislike-btn" class="viewer-btn">👎 Dislike (${post.dislikes})</button>
      <button id="save-btn" class="viewer-btn">⭐ Save</button>
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

// Render media type
function showMedia(post) {
  const box = document.getElementById("viewer-media");

  if (post.type === "video" || post.type === "clip" || post.type === "podcast-video") {
    box.innerHTML = `
      <video controls style="width:100%; border-radius:12px;">
        <source src="${post.fileData}">
      </video>
    `;
  } else if (post.type === "podcast-audio") {
    box.innerHTML = `
      <audio controls style="width:100%">
        <source src="${post.fileData}">
      </audio>
    `;
  }
}

// ======================================
// LIKE / DISLIKE SYSTEM
// ======================================
function setupLikeSystem(post) {
  const likeBtn = document.getElementById("like-btn");
  const dislikeBtn = document.getElementById("dislike-btn");

  likeBtn.onclick = () => {
    post.likes++;
    saveData("intakee-posts", posts);
    likeBtn.textContent = `👍 Like (${post.likes})`;
  };

  dislikeBtn.onclick = () => {
    post.dislikes++;
    saveData("intakee-posts", posts);
    dislikeBtn.textContent = `👎 Dislike (${post.dislikes})`;
  };
}

// ======================================
// SAVE SYSTEM
// ======================================
function setupSaveSystem(post) {
  const saveBtn = document.getElementById("save-btn");
  const user = getCurrentUser();

  if (!user) {
    saveBtn.onclick = () => alert("You must be logged in to save posts.");
    return;
  }

  saveBtn.onclick = () => {
    if (!user.saved.includes(post.id)) user.saved.push(post.id);

    users = users.map(u => u.email === user.email ? user : u);
    saveData("intakee-users", users);

    saveBtn.textContent = "⭐ Saved!";
  };
}
// ======================================
// PART 6 — SAVED POSTS + LIKED POSTS + STATS
// ======================================

const savedGrid = document.getElementById("profile-saved");
const likedGrid = document.getElementById("profile-likes");

// -----------------------
// REFRESH SAVED POSTS
// -----------------------
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

  savedPosts.forEach(post => savedGrid.appendChild(createPostCard(post)));
}

// -----------------------
// REFRESH LIKED POSTS
// -----------------------
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

  likedPosts.forEach(post => likedGrid.appendChild(createPostCard(post)));
}

// -----------------------
// PROFILE STATS
// -----------------------
function refreshProfileStats() {
  const user = getCurrentUser();
  if (!user) {
    document.getElementById("stat-posts").textContent = "0";
    document.getElementById("stat-followers").textContent = "0";
    document.getElementById("stat-following").textContent = "0";
    document.getElementById("stat-likes").textContent = "0";
    return;
  }

  const userPosts = posts.filter(p => p.user === user.email);
  document.getElementById("stat-posts").textContent = userPosts.length;

  document.getElementById("stat-followers").textContent = user.followers?.length || 0;
  document.getElementById("stat-following").textContent = user.following?.length || 0;

  const totalLikes = userPosts.reduce((sum, p) => sum + p.likes, 0);
  document.getElementById("stat-likes").textContent = totalLikes;
}

// -----------------------
// REFRESH ALL PROFILE SECTIONS
// -----------------------
function refreshAllProfileSections() {
  refreshProfileUploads();
  refreshSavedPosts();
  refreshLikedPosts();
  refreshProfileStats();
}


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

// Load settings
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

// Save settings
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

// Add listeners
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
  toggle?.addEventListener("change", saveUserSettings);
});


// ======================================
// SETTINGS: BLOCKED USERS & REPORT PREVIEW
// ======================================
document.getElementById("openBlockedUsers")?.addEventListener("click", () => {
  alert("Blocked Users feature activates when Firebase is added.");
});

document.getElementById("openReportModal")?.addEventListener("click", () => {
  alert("Report system activates when Firebase moderation is added.");
});

document.getElementById("settings-forgot-password")?.addEventListener("click", () => {
  alert("Password reset email will work when Firebase Auth is connected.");
});

document.getElementById("settings-forgot-username")?.addEventListener("click", () => {
  alert("Username recovery will work when Firebase is connected.");
});


// ======================================
// PART 8 — LEGAL TEXT (FULL PROTECTION)
// ======================================

const legalTexts = {
  privacy: `
<h3>Privacy Policy</h3>
<p>
INTAKEE respects your privacy. We only collect information required to operate the platform.
We do NOT sell user data. Users are fully responsible for the content they upload.
INTAKEE is not liable for user-generated content.
</p>
`,

  terms: `
<h3>Terms of Service</h3>
<p>
By using INTAKEE, you accept full responsibility for any content you upload.
INTAKEE does not review or verify user uploads, and legal liability remains with the creator.
</p>
`,

  guidelines: `
<h3>Community Guidelines</h3>
<p>No nudity, pornographic content, copyright violations, harassment, or illegal activity.</p>
<p>Creators are responsible for everything they upload.</p>
`,

  dmca: `
<h3>Copyright / DMCA</h3>
<p>Copyright holders may request removal of infringing content. INTAKEE complies with legal DMCA requests.</p>
`,

  liability: `
<h3>Liability Disclaimer</h3>
<p>
INTAKEE is not responsible for damages, misinformation, or harm resulting from user-generated content.
All responsibility belongs to the user who uploads it.
</p>
`,

  safety: `
<h3>Safety Policy</h3>
<p>We prohibit harmful content, exploitation of minors, terrorism, and self-harm encouragement.</p>
`,

  ownership: `
<h3>Content Ownership & Responsibility</h3>
<p>
Creators retain ownership but grant INTAKEE permission to display their content.
Creators accept full legal responsibility for anything they upload.
</p>
`,

  enforcement: `
<h3>Reporting & Enforcement</h3>
<p>
Users may report content. INTAKEE will review reports but does not guarantee removal unless required by law.
</p>
`
};

// Inject legal text
function loadLegalText() {
  document.getElementById("legal-privacy").innerHTML = legalTexts.privacy;
  document.getElementById("legal-terms").innerHTML = legalTexts.terms;
  document.getElementById("legal-guidelines").innerHTML = legalTexts.guidelines;
  document.getElementById("legal-dmca").innerHTML = legalTexts.dmca;
  document.getElementById("legal-liability").innerHTML = legalTexts.liability;
  document.getElementById("legal-safety").innerHTML = legalTexts.safety;
  document.getElementById("legal-ownership").innerHTML = legalTexts.ownership;
  document.getElementById("legal-enforcement").innerHTML = legalTexts.enforcement;
}


// ======================================
// FINAL INITIALIZATION
// ======================================
function initializeApp() {
  refreshFeeds();
  refreshProfileUI();
  refreshAllProfileSections();
  refreshLoginButton();
  loadUserSettings();
  loadLegalText();
}

initializeApp();

console.log("%cINTAKEE READY — ALL SYSTEMS ACTIVE", "color:#0f0; font-size:16px;");
// ======================================
// SEARCH SYSTEM
// ======================================
const searchInput = document.getElementById("globalSearch");

searchInput?.addEventListener("input", () => {
  const q = searchInput.value.toLowerCase().trim();
  filterSearchResults(q);
});

function filterSearchResults(query) {
  if (!query) {
    refreshFeeds();
    return;
  }

  homeFeed.innerHTML = "";
  videosFeed.innerHTML = "";
  podcastFeed.innerHTML = "";
  clipsFeed.innerHTML = "";

  const results = posts.filter(p =>
    p.title.toLowerCase().includes(query) ||
    p.username.toLowerCase().includes(query)
  );

  results.forEach(post => {
    const card = createPostCard(post);

    // Home
    homeFeed.appendChild(card.cloneNode(true));

    // Videos
    if (post.type === "video") videosFeed.appendChild(createPostCard(post));

    // Podcast
    if (post.type.includes("podcast"))
      podcastFeed.appendChild(createPostCard(post));

    // Clips
    if (post.type === "clip") clipsFeed.appendChild(createPostCard(post));
  });
}
