// ======================================
// INTAKEE — REAL FIREBASE VERSION
// Auth + Firestore + Storage + Feeds + Profiles
// ======================================

// --------------------------------------
// IMPORT FIREBASE MODULES
// --------------------------------------
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  updateProfile,
  deleteUser
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  addDoc,
  deleteDoc,  
  collection,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js";

import { app } from "./firebase-init.js";

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// =================================================================
// UI HELPERS
// =================================================================
function $(id) {
  return document.getElementById(id);
}

// ======================================
// TAB SWITCHING (WORKING AGAIN)
// ======================================
let currentTab = localStorage.getItem("intakee-current-tab") || "home";

const navLinks = document.querySelectorAll(".bottom-nav a");
const sections = document.querySelectorAll("main section");
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

navLinks.forEach(link => {
  link.addEventListener("click", () => {
    const tab = link.getAttribute("data-tab");
    showTab(tab);
  });
});

showTab(currentTab);

// =================================================================
// AUTH UI
// =================================================================
const authDialog = $("authDialog");
const openAuthBtn = $("openAuth");

openAuthBtn.addEventListener("click", () => {
  if (auth.currentUser) {
    showTab("profile");
  } else {
    authDialog.showModal();
  }
});

// =================================================================
// SIGN UP
// =================================================================
  document.getElementById("signupBtn").addEventListener("click", async () => {
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value.trim();
  const username = document.getElementById("signupUsername").value.trim();
  const ageOK = document.getElementById("signupAgeConfirm").checked;

  if (!email || !password || !username) return alert("Fill all fields");
  if (password.length < 6) return alert("Password too short");
  if (!ageOK) return alert("You must be 13+");

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "users", cred.user.uid), {
      username,
      bio: "Add a short bio to introduce yourself.",
      photoURL: "",
      bannerURL: "",
      followers: [],
      following: [],
      saved: [],
      liked: [],
      settings: {
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
      }
    });

    alert("Account created!");
  } catch (e) {
    alert(e.message);
  }
});

// =================================================================
// LOGIN
// =================================================================
$("loginBtn").addEventListener("click", async () => {
  const email = $("loginEmail").value.trim();
  const password = $("loginPassword").value.trim();

  try {
    await signInWithEmailAndPassword(auth, email, password);
    authDialog.close();
  } catch (e) {
    alert("Wrong email or password.");
  }
});

// =================================================================
// LOGOUT
// =================================================================
$("settings-logout").addEventListener("click", async () => {
  await signOut(auth);
  alert("Logged out");
  showTab("home");
});

// =================================================================
// DELETE ACCOUNT
// =================================================================
$("settings-delete-account")?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Not logged in.");

  if (!confirm("Delete your account permanently?")) return;

  try {
    await deleteDoc(doc(db, "users", user.uid));
    await deleteUser(user);
    alert("Account deleted.");
  } catch (e) {
    alert(e.message);
  }
});

// =================================================================
// AUTH STATE LISTENER (LIVE UPDATE PROFILE UI)
// =================================================================
let currentUserData = null;

onAuthStateChanged(auth, async user => {
  if (user) {
    const snap = await getDoc(doc(db, "users", user.uid));
    currentUserData = snap.data();

    refreshProfileUI();
    refreshLoginButton();
    loadUserSettings();
    refreshFeeds();
  } else {
    currentUserData = null;
    refreshProfileUI();
    refreshLoginButton();
  }
});

// =================================================================
// PROFILE UI
// =================================================================
function refreshLoginButton() {
  if (auth.currentUser && currentUserData) {
    $("openAuth").textContent = currentUserData.username;
  } else {
    $("openAuth").textContent = "Login";
  }
}

function refreshProfileUI() {
  if (!auth.currentUser || !currentUserData) {
    $("profile-name").textContent = "Your Name";
    $("profile-handle").textContent = "@username";
    $("profile-photo").src = "";
    $("profileBanner").style.background = "#222";
    $("bio-view").textContent = "Add a short bio to introduce yourself.";
    $("btn-edit-profile").style.display = "none";
    return;
  }

  $("profile-name").textContent = currentUserData.username;
  $("profile-handle").textContent = "@" + currentUserData.username.toLowerCase();
  $("bio-view").textContent = currentUserData.bio;

  if (currentUserData.photoURL) $("profile-photo").src = currentUserData.photoURL;
  if (currentUserData.bannerURL)
    $("profileBanner").style.backgroundImage = `url(${currentUserData.bannerURL})`;

  $("btn-edit-profile").style.display = "inline-block";
}

// =================================================================
// PROFILE EDIT
// =================================================================
$("btn-edit-profile").addEventListener("click", () => {
  if (!currentUserData) return alert("Login first.");

  $("profileNameInput").value = currentUserData.username;
  $("profileBioInput").value = currentUserData.bio;
  $("bio-edit-wrap").style.display = "block";
});

$("bio-cancel").addEventListener("click", () => {
  $("bio-edit-wrap").style.display = "none";
});

// SAVE PROFILE CHANGES
$("btnSaveProfile").addEventListener("click", async () => {
  const newName = $("profileNameInput").value.trim();
  const newBio = $("profileBioInput").value.trim();

  if (!newName) return alert("Name cannot be empty.");

  let photoURL = currentUserData.photoURL;
  let bannerURL = currentUserData.bannerURL;

  // Upload profile photo
  if ($("profilePhotoInput").files.length > 0) {
    const file = $("profilePhotoInput").files[0];
    const fileRef = ref(storage, `profile/${auth.currentUser.uid}/photo.jpg`);
    await uploadBytes(fileRef, file);
    photoURL = await getDownloadURL(fileRef);
  }

  // Upload banner
  if ($("profileBannerInput").files.length > 0) {
    const file = $("profileBannerInput").files[0];
    const fileRef = ref(storage, `profile/${auth.currentUser.uid}/banner.jpg`);
    await uploadBytes(fileRef, file);
    bannerURL = await getDownloadURL(fileRef);
  }

  // Update Firestore
  await updateDoc(doc(db, "users", auth.currentUser.uid), {
    username: newName,
    bio: newBio,
    photoURL,
    bannerURL
  });

  $("bio-edit-wrap").style.display = "none";
  alert("Profile updated!");
});

// =================================================================
// UPLOAD SYSTEM (REAL FIREBASE STORAGE)
// =================================================================
$("btnUpload").addEventListener("click", async () => {
  if (!auth.currentUser) return alert("Login first.");

  const type = $("uploadTypeSelect").value;
  const title = $("uploadTitleInput").value.trim();
  const desc = $("uploadDescInput").value.trim();
  const file = $("uploadFileInput").files[0];
  const thumb = $("uploadThumbInput").files[0];

  if (!title || !file || !thumb)
    return alert("Please fill all required fields.");

  const postId = Date.now().toString();

  // Upload thumbnail
  const thumbRef = ref(storage, `thumbnails/${auth.currentUser.uid}/${postId}.jpg`);
  await uploadBytes(thumbRef, thumb);
  const thumbURL = await getDownloadURL(thumbRef);

  // Upload media file
  const fileRef = ref(storage, `uploads/${auth.currentUser.uid}/${postId}`);
  await uploadBytes(fileRef, file);
  const fileURL = await getDownloadURL(fileRef);

  // Save post in Firestore
  await setDoc(doc(db, "posts", postId), {
    id: postId,
    userId: auth.currentUser.uid,
    username: currentUserData.username,
    type,
    title,
    desc,
    thumbURL,
    fileURL,
    likes: 0,
    dislikes: 0,
    createdAt: Date.now()
  });

  alert("Upload complete!");

  $("uploadTitleInput").value = "";
  $("uploadDescInput").value = "";
  $("uploadFileInput").value = "";
  $("uploadThumbInput").value = "";
});

// =================================================================
// FEEDS (REAL-TIME FIRESTORE)
// =================================================================
async function refreshFeeds() {
  const q = query(
    collection(db, "posts"),
    orderBy("createdAt", "desc")
  );

  onSnapshot(q, snapshot => {
    const home = $("home-feed");
    const videos = $("videos-feed");
    const clips = $("clips-feed");
    const podcasts = $("podcast-feed");

    home.innerHTML = "";
    videos.innerHTML = "";
    clips.innerHTML = "";
    podcasts.innerHTML = "";

    snapshot.forEach(docSnap => {
      const post = docSnap.data();
      const card = createPostCard(post);

      home.appendChild(card.cloneNode(true));

      if (post.type === "video") videos.appendChild(createPostCard(post));
      if (post.type === "clip") clips.appendChild(createPostCard(post));
      if (post.type.includes("podcast"))
        podcasts.appendChild(createPostCard(post));
    });
  });
}

function createPostCard(post) {
  const div = document.createElement("div");
  div.className = "card";
  div.innerHTML = `
    <img src="${post.thumbURL}" style="width:100%; border-radius:12px;">
    <h3>${post.title}</h3>
    <p class="muted">${post.username}</p>
    <button class="play-btn" data-id="${post.id}">Play</button>
  `;

  div.querySelector(".play-btn").addEventListener("click", () => {
    openViewer(post);
  });

  return div;
}

// =================================================================
// VIEWER (VIDEO/AUDIO)
// =================================================================
let viewerOverlay = null;

function openViewer(post) {
  if (!viewerOverlay) {
    viewerOverlay = document.createElement("div");
    viewerOverlay.id = "viewer-overlay";
    viewerOverlay.style.position = "fixed";
    viewerOverlay.style.top = 0;
    viewerOverlay.style.left = 0;
    viewerOverlay.style.right = 0;
    viewerOverlay.style.bottom = 0;
    viewerOverlay.style.background = "#000d";
    viewerOverlay.style.zIndex = 5000;
    viewerOverlay.style.padding = "20px";
    viewerOverlay.style.overflowY = "auto";
    document.body.appendChild(viewerOverlay);
  }

  viewerOverlay.innerHTML = `
    <button id="viewer-close" style="
      float:right; background:none; border:none; color:white; font-size:30px;">✕</button>
    <h2>${post.title}</h2>
    <p class="muted">${post.username}</p>
    <div id="viewer-media" style="margin-top:15px;"></div>
  `;

  const media = $("viewer-media");

  if (post.type === "video" || post.type === "clip" || post.type === "podcast-video") {
    media.innerHTML = `<video controls style="width:100%; border-radius:12px;">
      <source src="${post.fileURL}">
    </video>`;
  } else {
    media.innerHTML = `<audio controls style="width:100%">
      <source src="${post.fileURL}">
    </audio>`;
  }

  $("viewer-close").onclick = () => viewerOverlay.style.display = "none";
  viewerOverlay.style.display = "block";
}

// =================================================================
// SEARCH BAR
// =================================================================
$("globalSearch")?.addEventListener("input", async e => {
  const qText = e.target.value.toLowerCase().trim();

  if (qText === "") {
    refreshFeeds();
    return;
  }

  const home = $("home-feed");
  home.innerHTML = "";

  const snap = await getDocs(collection(db, "posts"));
  snap.forEach(docSnap => {
    const post = docSnap.data();
    if (
      post.title.toLowerCase().includes(qText) ||
      post.username.toLowerCase().includes(qText)
    ) {
      home.appendChild(createPostCard(post));
    }
  });
});

// =================================================================
// SETTINGS (SAVED IN FIRESTORE)
// =================================================================
function loadUserSettings() {
  if (!currentUserData) return;

  $("toggle-private").checked = currentUserData.settings.private;
  $("toggle-show-uploads").checked = currentUserData.settings.showUploads;
  $("toggle-show-saved").checked = currentUserData.settings.showSaved;
  $("toggle-restricted").checked = currentUserData.settings.restricted;
  $("toggle-age-warning").checked = currentUserData.settings.ageWarning;

  $("toggle-notify-push").checked = currentUserData.settings.notifyPush;
  $("toggle-notify-email").checked = currentUserData.settings.notifyEmail;
  $("toggle-notify-follow").checked = currentUserData.settings.notifyFollow;
  $("toggle-notify-likes").checked = currentUserData.settings.notifyLikes;
  $("toggle-notify-comments").checked = currentUserData.settings.notifyComments;
}

async function saveUserSettings() {
  if (!auth.currentUser) return;

  const newSettings = {
    private: $("toggle-private").checked,
    showUploads: $("toggle-show-uploads").checked,
    showSaved: $("toggle-show-saved").checked,
    restricted: $("toggle-restricted").checked,
    ageWarning: $("toggle-age-warning").checked,
    notifyPush: $("toggle-notify-push").checked,
    notifyEmail: $("toggle-notify-email").checked,
    notifyFollow: $("toggle-notify-follow").checked,
    notifyLikes: $("toggle-notify-likes").checked,
    notifyComments: $("toggle-notify-comments").checked
  };

  await updateDoc(doc(db, "users", auth.currentUser.uid), {
    settings: newSettings
  });
}

[
  "toggle-private",
  "toggle-show-uploads",
  "toggle-show-saved",
  "toggle-restricted",
  "toggle-age-warning",
  "toggle-notify-push",
  "toggle-notify-email",
  "toggle-notify-follow",
  "toggle-notify-likes",
  "toggle-notify-comments"
].forEach(id => {
  $(id)?.addEventListener("change", saveUserSettings);
});

// =================================================================
// LOAD LEGAL TEXT (ALREADY IN YOUR JS)
// =================================================================
// (Your HTML already handles this)

console.log("%cINTAKEE FIREBASE VERSION READY", "color:#0f0; font-size:16px;");

