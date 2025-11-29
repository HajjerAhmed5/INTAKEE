// =========================================================
// INTAKEE — script.js (MAIN APP FILE)
// Clean, production-ready, no duplicates.
// =========================================================

// ---------------------------------------------------------
// 1. IMPORT FIREBASE MODULES
// ---------------------------------------------------------
import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  addDoc,
  deleteDoc,
  increment,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

// ---------------------------------------------------------
// 2. FIREBASE CONFIG + INIT
// ---------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyDp_tLBxUPvlvG7JqCBj3ItuL7sKjpL56g",
  authDomain: "intakee-5785e.firebaseapp.com",
  projectId: "intakee-5785e",
  storageBucket: "intakee-5785e.appspot.com",
  messagingSenderId: "140666230072",
  appId: "1:140666230072:web:49dd5e7db91c8a38b56c5d",
  measurementId: "G-3C2YDV6TG6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);
const storage = getStorage(app);

// Helper shortcuts
const qs  = (s, sc=document) => sc.querySelector(s);
const qsa = (s, sc=document) => [...sc.querySelectorAll(s)];

console.log("🔥 Firebase initialized");

// =========================================================
// 3. TAB SWITCHING
// =========================================================
const tabs = {
  home: qs("#tab-home"),
  videos: qs("#tab-videos"),
  podcast: qs("#tab-podcast"),
  upload: qs("#tab-upload"),
  clips: qs("#tab-clips"),
  profile: qs("#tab-profile"),
  settings: qs("#tab-settings"),
};

const navLinks = qsa(".bottom-nav a");
const searchBar = qs(".search-bar");

function switchTab(name) {
  Object.keys(tabs).forEach(tab => {
    tabs[tab].style.display = tab === name ? "block" : "none";
  });

  navLinks.forEach(link => {
    link.classList.toggle("active", link.dataset.tab === name);
  });

  // Hide search on upload + settings
  if (name === "upload" || name === "settings") {
    searchBar.style.display = "none";
  } else {
    searchBar.style.display = "flex";
  }
}

navLinks.forEach(link =>
  link.addEventListener("click", () => switchTab(link.dataset.tab))
);

switchTab("home");

// =========================================================
// 4. AUTH SYSTEM (SIGN UP, LOGIN, LOGOUT, FORGOT PASS)
// =========================================================
const dlgAuth = qs("#authDialog");

qs("#openAuth")?.addEventListener("click", () => dlgAuth.showModal());

dlgAuth.addEventListener("click", e => {
  if (e.target.tagName === "BUTTON" && e.target.textContent === "✕") {
    dlgAuth.close();
  }
});

// SIGN UP
qs("#signupBtn")?.addEventListener("click", async () => {
  const email = qs("#signupEmail").value.trim();
  const pass  = qs("#signupPassword").value.trim();
  const username = qs("#signupUsername").value.trim().toLowerCase();
  const ageOK = qs("#signupAgeConfirm").checked;

  if (!email || !pass || !username || !ageOK)
    return alert("Fill all fields and confirm age.");

  try {
    // check username unique
    const qRef = query(collection(db, "users"), where("username", "==", username));
    const snap = await getDocs(qRef);
    if (!snap.empty) return alert("Username taken.");

    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: username });

    await setDoc(doc(db, "users", cred.user.uid), {
      email,
      username,
      name: username,
      bio: "",
      photoURL: "",
      bannerURL: "",
      private: false,
      showUploads: true,
      showSaved: true,
      followers: [],
      following: [],
      createdAt: serverTimestamp()
    });

    alert("Account created!");
    dlgAuth.close();

  } catch (err) {
    alert("Error: " + err.message);
  }
});

// LOGIN
qs("#loginBtn")?.addEventListener("click", async () => {
  const email = qs("#loginEmail").value.trim();
  const pass  = qs("#loginPassword").value.trim();

  if (!email || !pass) return alert("Enter email and password.");

  try {
    await signInWithEmailAndPassword(auth, email, pass);
    dlgAuth.close();
  } catch (err) {
    alert("Login error: " + err.message);
  }
});

// FORGOT PASSWORD
qs("#forgotBtn")?.addEventListener("click", async () => {
  const email = prompt("Enter your email:");
  if (!email) return;

  try {
    await sendPasswordResetEmail(auth, email);
    alert("Reset link sent.");
  } catch (err) {
    alert(err.message);
  }
});

// LOGOUT
qs("#settings-logout")?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    alert("Logged out.");
  } catch (err) {
    alert(err.message);
  }
});

// AUTH STATE
onAuthStateChanged(auth, user => {
  qs("#openAuth").style.display = user ? "none" : "block";
  document.dispatchEvent(new CustomEvent("intakee:auth", { detail: { user } }));
});

// =========================================================
// 5. FEED SYSTEM — LOAD POSTS
// =========================================================
const homeFeed    = qs("#home-feed");
const videosFeed  = qs("#videos-feed");
const podcastFeed = qs("#podcast-feed");
const clipsFeed   = qs("#clips-feed");

let allPosts = [];

async function fetchPosts() {
  const qRef = query(
    collection(db, "posts"),
    orderBy("createdAt", "desc"),
    limit(200)
  );
  const snap = await getDocs(qRef);

  allPosts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function renderFeed(container, posts) {
  container.innerHTML = "";

  if (!posts.length) {
    container.innerHTML = `<p class="muted">No posts yet.</p>`;
    return;
  }

  posts.forEach(post => {
    const el = document.createElement("div");
    el.className = "card video-card";

    el.innerHTML = `
      <div class="thumb-16x9">
        <img src="${post.thumbnailUrl || 'placeholder.png'}">
      </div>
      <div class="meta">
        <p class="title">${post.title}</p>
        <p class="muted small">${post.type.toUpperCase()}</p>
      </div>
    `;

    el.addEventListener("click", () =>
      window.location.href = `viewer.html?id=${post.id}`
    );

    container.appendChild(el);
  });
}

async function loadFeeds() {
  await fetchPosts();

  renderFeed(homeFeed, allPosts);
  renderFeed(videosFeed, allPosts.filter(p => p.type === "video"));
  renderFeed(clipsFeed, allPosts.filter(p => p.type === "clip"));
  renderFeed(podcastFeed, allPosts.filter(p => p.type.includes("podcast")));
}

loadFeeds();
document.addEventListener("intakee:feedRefresh", loadFeeds);

// =========================================================
// 6. UPLOAD SYSTEM
// =========================================================
const upType = qs("#uploadTypeSelect");
const upTitle = qs("#uploadTitleInput");
const upDesc  = qs("#uploadDescInput");
const upThumb = qs("#uploadThumbInput");
const upFile  = qs("#uploadFileInput");
const btnUpload = qs("#btnUpload");

btnUpload?.addEventListener("click", uploadPost);

async function uploadPost() {
  const user = auth.currentUser;
  if (!user) return alert("Sign in to upload.");

  const title = upTitle.value.trim();
  const desc  = upDesc.value.trim();
  const file  = upFile.files[0];
  const thumb = upThumb.files[0];
  const type  = upType.value;

  if (!title || !file) return alert("Add title and file.");

  btnUpload.disabled = true;
  btnUpload.textContent = "Uploading...";

  try {
    // upload main file
    const path = `uploads/${user.uid}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, file);

    task.on("state_changed", snap => {
      const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
      btnUpload.textContent = `Uploading ${pct}%`;
    });

    await task;

    const mediaUrl = await getDownloadURL(storageRef);

    // upload thumbnail
    let thumbUrl = "";
    if (thumb) {
      const tRef = ref(storage, `thumbs/${user.uid}/${Date.now()}_${thumb.name}`);
      await uploadBytes(tRef, thumb);
      thumbUrl = await getDownloadURL(tRef);
    }

    // save post
    await addDoc(collection(db, "posts"), {
      uid: user.uid,
      title,
      desc,
      type,
      mediaUrl,
      thumbnailUrl: thumbUrl,
      createdAt: serverTimestamp()
    });

    alert("Upload complete!");
    upTitle.value = "";
    upDesc.value = "";
    upFile.value = "";
    upThumb.value = "";

    document.dispatchEvent(new CustomEvent("intakee:feedRefresh"));

  } catch (err) {
    alert("Upload error: " + err.message);
  }

  btnUpload.disabled = false;
  btnUpload.textContent = "Upload";
}

// =========================================================
// 7. PROFILE SYSTEM
// =========================================================
const profileName = qs("#profile-name");
const profileHandle = qs("#profile-handle");
const profilePhoto = qs("#profile-photo");
const profileBanner = qs("#profileBanner");
const bioView = qs("#bio-view");

const btnEditProfile = qs("#btn-edit-profile");
const editWrap = qs("#bio-edit-wrap");
const nameInput = qs("#profileNameInput");
const bioInput = qs("#profileBioInput");
const photoInput = qs("#profilePhotoInput");
const bannerInput = qs("#profileBannerInput");
const btnSaveProfile = qs("#btnSaveProfile");
const btnCancelEdit = qs("#bio-cancel");

const profileGrid = qs("#profile-grid");
const profileEmpty = qs("#profile-empty");

// Load profile on login
document.addEventListener("intakee:auth", async (e) => {
  const user = e.detail.user;
  if (user) loadUserProfile(user);
  else {
    profileGrid.innerHTML = "";
    profileEmpty.style.display = "block";
  }
});

async function loadUserProfile(user) {
  const snap = await getDoc(doc(db, "users", user.uid));
  const data = snap.data();

  profileName.textContent = data.name || user.displayName;
  profileHandle.textContent = "@" + data.username;
  bioView.textContent = data.bio || "Add a short bio.";

  if (data.photoURL) profilePhoto.src = data.photoURL;
  if (data.bannerURL) profileBanner.style.backgroundImage = `url(${data.bannerURL})`;

  loadUserPosts(user.uid);
}

async function loadUserPosts(uid) {
  const qRef = query(
    collection(db, "posts"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(qRef);
  const posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  profileGrid.innerHTML = "";
  profileEmpty.style.display = posts.length ? "none" : "block";

  posts.forEach(post => {
    const el = document.createElement("div");
    el.className = "tile";

    el.innerHTML = `
      <img class="thumb" src="${post.thumbnailUrl || 'placeholder.png'}">
      <div class="meta">${post.title}</div>
    `;

    el.addEventListener("click", () =>
      window.location.href = `viewer.html?id=${post.id}`
    );

    profileGrid.appendChild(el);
  });
}

// Edit profile
btnEditProfile?.addEventListener("click", () => {
  if (!auth.currentUser) return alert("Sign in.");
  editWrap.style.display = "block";

  nameInput.value = profileName.textContent;
  bioInput.value = bioView.textContent;
});

btnCancelEdit?.addEventListener("click", () => {
  editWrap.style.display = "none";
});

btnSaveProfile?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;

  const updates = {
    name: nameInput.value.trim(),
    bio: bioInput.value.trim(),
  };

  // upload profile photo
  if (photoInput.files[0]) {
    const pRef = ref(storage, `avatars/${user.uid}_${Date.now()}.jpg`);
    await uploadBytes(pRef, photoInput.files[0]);
    updates.photoURL = await getDownloadURL(pRef);
    profilePhoto.src = updates.photoURL;
  }

  // upload banner
  if (bannerInput.files[0]) {
    const bRef = ref(storage, `banners/${user.uid}_${Date.now()}.jpg`);
    await uploadBytes(bRef, bannerInput.files[0]);
    updates.bannerURL = await getDownloadURL(bRef);
    profileBanner.style.backgroundImage = `url(${updates.bannerURL})`;
  }

  await updateDoc(doc(db, "users", user.uid), updates);

  profileName.textContent = updates.name;
  bioView.textContent = updates.bio;

  editWrap.style.display = "none";
  alert("Profile saved!");
});

// =========================================================
// 8. SETTINGS SYSTEM
// =========================================================
function setupToggle(id, field) {
  const el = qs(id);
  el?.addEventListener("change", async () => {
    const user = auth.currentUser;
    if (!user) return alert("Sign in.");

    await updateDoc(doc(db, "users", user.uid), { [field]: el.checked });
  });
}

setupToggle("#toggle-private", "private");
setupToggle("#toggle-show-uploads", "showUploads");
setupToggle("#toggle-show-saved", "showSaved");

// Forgot username
qs("#settings-forgot-username")?.addEventListener("click", async () => {
  const email = prompt("Enter your email:");
  if (!email) return;

  const qRef = query(collection(db, "users"), where("email", "==", email));
  const snap = await getDocs(qRef);

  if (snap.empty) return alert("No user found.");

  alert("Your username is: @" + snap.docs[0].data().username);
});

// Delete account
qs("#settings-delete-account")?.addEventListener("click", async () => {
  if (!confirm("Delete account permanently?")) return;

  const user = auth.currentUser;
  if (!user) return alert("Sign in.");

  await deleteDoc(doc(db, "users", user.uid));
  await user.delete();

  alert("Account deleted.");
});

// Legal accordion
qsa(".accordion-header").forEach(btn => {
  btn.addEventListener("click", () => {
    const body = btn.parentElement.querySelector(".accordion-body");
    body.style.display = body.style.display === "block" ? "none" : "block";
  });
});

// Fill legal content
qs("#legal-privacy").innerHTML = `
<p><strong>Privacy Policy</strong><br><br>
INTAKEE collects only the data needed for account creation and safety.
Creators are legally responsible for their content.</p>
`;

qs("#legal-terms").innerHTML = `
<p><strong>Terms of Service</strong><br><br>
You must be 13+ and agree not to upload illegal or adult content.
You own and take full responsibility for your uploads.</p>
`;

qs("#legal-guidelines").innerHTML = `
<p><strong>Community Guidelines</strong><br><br>
No nudity, hate, harassment, or harmful content.</p>
`;

// =========================================================
// 9. MINI AUDIO PLAYER
// =========================================================
const miniPlayer = qs("#mini-player");
const miniAudio  = qs("#mp-audio");
const miniPlay   = qs("#mp-play");
const miniClose  = qs("#mp-close");

miniPlay?.addEventListener("click", () => {
  if (!miniAudio.src) return;
  if (miniAudio.paused) {
    miniAudio.play();
    miniPlay.innerHTML = `<i class="fa fa-pause"></i>`;
  } else {
    miniAudio.pause();
    miniPlay.innerHTML = `<i class="fa fa-play"></i>`;
  }
});

miniClose?.addEventListener("click", () => {
  miniAudio.pause();
  miniAudio.src = "";
  miniPlayer.style.display = "none";
});

// =========================================================
// 10. BOOT
// =========================================================
console.log("🚀 INTAKEE app loaded");
