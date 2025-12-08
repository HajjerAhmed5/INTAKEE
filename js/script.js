// ======================================
// INTAKEE — CLEAN FINAL FIXED SCRIPT.JS
// Fully working tabs, auth, signup, login,
// profile, uploads, feeds, viewer, search.
// ======================================

// Firebase imports
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  deleteUser
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
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

// Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Helper shortcut
const $ = (id) => document.getElementById(id);

// ======================================
// TAB SWITCHING (FIXED 100%)
// ======================================
let currentTab = localStorage.getItem("intakee-current-tab") || "home";

const navLinks = document.querySelectorAll(".bottom-nav a");
const sections = document.querySelectorAll("main section");
const searchBar = document.querySelector(".search-bar");

function updateSearch(tab) {
  const hide = ["upload", "profile", "settings"];
  searchBar.style.display = hide.includes(tab) ? "none" : "flex";
}

function showTab(tab) {
  currentTab = tab;
  localStorage.setItem("intakee-current-tab", tab);

  sections.forEach(s => s.style.display = "none");
  $(`tab-${tab}`).style.display = "block";

  navLinks.forEach(link => link.classList.remove("active"));
  document.querySelector(`[data-tab='${tab}']`).classList.add("active");

  updateSearch(tab);
}

navLinks.forEach(link => {
  link.addEventListener("click", () => showTab(link.dataset.tab));
});

showTab(currentTab);

// ======================================
// AUTH DIALOG OPEN/CLOSE
// ======================================
const authDialog = $("authDialog");

$("openAuth").addEventListener("click", () => {
  if (auth.currentUser) showTab("profile");
  else authDialog.showModal();
});

// ======================================
// SIGN UP
// ======================================
$("signupBtn").addEventListener("click", async () => {
  const email = $("signupEmail").value.trim();
  const password = $("signupPassword").value.trim();
  const username = $("signupUsername").value.trim();
  const age = $("signupAgeConfirm").checked;

  if (!email || !password || !username)
    return alert("Fill all fields.");
  if (!age) return alert("You must be 13+");
  if (password.length < 6)
    return alert("Password must be 6+ characters.");

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
      settings: {}
    });

    alert("Account created!");
  } catch (e) {
    alert(e.message);
  }
});

// ======================================
// LOGIN
// ======================================
$("loginBtn").addEventListener("click", async () => {
  const email = $("loginEmail").value.trim();
  const password = $("loginPassword").value.trim();

  try {
    await signInWithEmailAndPassword(auth, email, password);
    authDialog.close();
    showTab("home");
  } catch {
    alert("Wrong email or password.");
  }
});

// ======================================
// LOGOUT
// ======================================
$("settings-logout").addEventListener("click", async () => {
  await signOut(auth);
  alert("Logged out");
  showTab("home");
});

// ======================================
// DELETE ACCOUNT
// ======================================
$("settings-delete-account").addEventListener("click", async () => {
  if (!confirm("Delete your account permanently?")) return;

  const user = auth.currentUser;
  await deleteDoc(doc(db, "users", user.uid));
  await deleteUser(user);

  alert("Account deleted.");
  showTab("home");
});

// ======================================
// AUTH STATE LISTENER
// ======================================
let currentUserData = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    currentUserData = null;
    refreshUI();
    return;
  }

  const snap = await getDoc(doc(db, "users", user.uid));
  currentUserData = snap.data();

  refreshUI();
});

// ======================================
// UPDATE BUTTON + PROFILE UI
// ======================================
function refreshUI() {
  refreshLoginButton();
  refreshProfileUI();
}

function refreshLoginButton() {
  $("openAuth").textContent = auth.currentUser?.email
    ? currentUserData?.username || "Profile"
    : "Login";
}

function refreshProfileUI() {
  if (!auth.currentUser || !currentUserData) {
    $("profile-name").textContent = "Your Name";
    $("profile-handle").textContent = "@username";
    $("profile-photo").src = "";
    $("bio-view").textContent = "Add a short bio to introduce yourself.";
    $("btn-edit-profile").style.display = "none";
    return;
  }

  $("profile-name").textContent = currentUserData.username;
  $("profile-handle").textContent = "@" + currentUserData.username.toLowerCase();
  $("bio-view").textContent = currentUserData.bio;

  if (currentUserData.photoURL)
    $("profile-photo").src = currentUserData.photoURL;

  if (currentUserData.bannerURL)
    $("profileBanner").style.backgroundImage = `url(${currentUserData.bannerURL})`;

  $("btn-edit-profile").style.display = "block";
}

// ======================================
// EDIT PROFILE
// ======================================
$("btn-edit-profile").addEventListener("click", () => {
  $("profileNameInput").value = currentUserData.username;
  $("profileBioInput").value = currentUserData.bio;
  $("bio-edit-wrap").style.display = "block";
});

$("bio-cancel").addEventListener("click", () => {
  $("bio-edit-wrap").style.display = "none";
});

$("btnSaveProfile").addEventListener("click", async () => {
  const newName = $("profileNameInput").value.trim();
  const newBio = $("profileBioInput").value.trim();

  let photoURL = currentUserData.photoURL;
  let bannerURL = currentUserData.bannerURL;

  // Upload profile photo
  if ($("profilePhotoInput").files.length) {
    const fileRef = ref(storage, `profile/${auth.currentUser.uid}/photo.jpg`);
    await uploadBytes(fileRef, $("profilePhotoInput").files[0]);
    photoURL = await getDownloadURL(fileRef);
  }

  // Upload banner
  if ($("profileBannerInput").files.length) {
    const fileRef = ref(storage, `profile/${auth.currentUser.uid}/banner.jpg`);
    await uploadBytes(fileRef, $("profileBannerInput").files[0]);
    bannerURL = await getDownloadURL(fileRef);
  }

  await updateDoc(doc(db, "users", auth.currentUser.uid), {
    username: newName,
    bio: newBio,
    photoURL,
    bannerURL
  });

  alert("Profile updated!");
  $("bio-edit-wrap").style.display = "none";
});

// ======================================
// UPLOAD SYSTEM
// ======================================
$("btnUpload").addEventListener("click", async () => {
  if (!auth.currentUser) return alert("Login first.");

  const title = $("uploadTitleInput").value.trim();
  const type = $("uploadTypeSelect").value;
  const desc = $("uploadDescInput").value.trim();
  const file = $("uploadFileInput").files[0];
  const thumb = $("uploadThumbInput").files[0];

  if (!title || !file || !thumb) return alert("All fields required.");

  const id = Date.now().toString();

  const thumbRef = ref(storage, `thumbnails/${auth.currentUser.uid}/${id}.jpg`);
  await uploadBytes(thumbRef, thumb);
  const thumbURL = await getDownloadURL(thumbRef);

  const fileRef = ref(storage, `uploads/${auth.currentUser.uid}/${id}`);
  await uploadBytes(fileRef, file);
  const fileURL = await getDownloadURL(fileRef);

  await setDoc(doc(db, "posts", id), {
    id,
    userId: auth.currentUser.uid,
    username: currentUserData.username,
    title,
    desc,
    type,
    thumbURL,
    fileURL,
    createdAt: Date.now()
  });

  alert("Upload complete!");
});

// ======================================
// FEEDS
// ======================================
function loadFeeds() {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));

  onSnapshot(q, (snap) => {
    $("home-feed").innerHTML = "";
    $("videos-feed").innerHTML = "";
    $("clips-feed").innerHTML = "";
    $("podcast-feed").innerHTML = "";

    snap.forEach((d) => {
      const p = d.data();
      const card = createPostCard(p);

      $("home-feed").appendChild(card.cloneNode(true));

      if (p.type === "video") $("videos-feed").appendChild(createPostCard(p));
      if (p.type === "clip") $("clips-feed").appendChild(createPostCard(p));
      if (p.type.includes("podcast"))
        $("podcast-feed").appendChild(createPostCard(p));
    });
  });
}

loadFeeds();

function createPostCard(p) {
  const div = document.createElement("div");
  div.className = "card";
  div.innerHTML = `
    <img src="${p.thumbURL}" style="width:100%;border-radius:12px;">
    <h3>${p.title}</h3>
    <p class="muted">${p.username}</p>
    <button class="play-btn">Play</button>
  `;

  div.querySelector(".play-btn").addEventListener("click", () => openViewer(p));

  return div;
}

// ======================================
// VIEWER
// ======================================
let overlay = null;

function openViewer(p) {
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.style.cssText = `
      position:fixed; inset:0; background:#000d;
      padding:20px; z-index:5000; overflow:auto;
    `;
    document.body.appendChild(overlay);
  }

  overlay.innerHTML = `
    <button id="closeView" style="float:right;font-size:30px;color:white;background:none;border:none;">✕</button>
    <h2>${p.title}</h2>
    <p class="muted">${p.username}</p>
    <div style="margin-top:15px"></div>
  `;

  const container = overlay.querySelector("div");

  if (p.type === "video" || p.type === "clip" || p.type === "podcast-video") {
    container.innerHTML = `<video controls style="width:100%;border-radius:12px;"><source src="${p.fileURL}"></video>`;
  } else {
    container.innerHTML = `<audio controls style="width:100%;"><source src="${p.fileURL}"></audio>`;
  }

  overlay.querySelector("#closeView").onclick = () => {
    overlay.style.display = "none";
  };

  overlay.style.display = "block";
}

// ======================================
// SEARCH
// ======================================
$("globalSearch").addEventListener("input", async (e) => {
  const q = e.target.value.toLowerCase().trim();

  if (!q) return loadFeeds();

  $("home-feed").innerHTML = "";

  const snap = await getDocs(collection(db, "posts"));
  snap.forEach((d) => {
    const p = d.data();
    if (
      p.title.toLowerCase().includes(q) ||
      p.username.toLowerCase().includes(q)
    ) {
      $("home-feed").appendChild(createPostCard(p));
    }
  });
});

console.log("💚 INTAKEE script.js loaded successfully.");
