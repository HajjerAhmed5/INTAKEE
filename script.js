// ========= INTAKEE Frontend Logic =========
// Use the single Firebase initialization from firebaseInit.js
import { app, auth, db, storage } from "./firebaseInit.js";

// --- Firebase helper imports (CDN v10.12.4) ---
// Auth
import {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

// Storage
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

// Firestore
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  orderBy,
  limit,
  where
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// ========= Tiny DOM helpers =========
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const show = (el) => el && el.classList.remove("hidden");
const hide = (el) => el && el.classList.add("hidden");

// ========= Tabs + Hash routing =========
function setActiveTab(tabId) {
  const tabs = $$(".tab");
  const btns = $$(".tab-btn");
  if (!$("#" + tabId)) tabId = "home";
  tabs.forEach((t) => t.classList.toggle("active", t.id === tabId));
  btns.forEach((b) =>
    b.classList.toggle("active", b.getAttribute("data-tab") === tabId)
  );
  const searchBar = $("#global-search");
  const loginBtn = $("#home-login-btn");
  if (["upload", "settings"].includes(tabId)) {
    hide(searchBar);
    hide(loginBtn);
  } else {
    show(searchBar);
    show(loginBtn);
  }
  if (location.hash !== "#" + tabId) history.replaceState(null, "", "#" + tabId);
}
function initTabs() {
  $$(".tab-btn").forEach((btn) =>
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      setActiveTab(btn.getAttribute("data-tab"));
    })
  );
  setActiveTab((location.hash || "#home").slice(1));
  window.addEventListener("hashchange", () =>
    setActiveTab((location.hash || "#home").slice(1))
  );
}

// ========= Settings accordion =========
function initSettingsAccordion() {
  $$(".settings-label").forEach((label) => {
    label.addEventListener("click", () =>
      label.closest(".settings-section")?.classList.toggle("open")
    );
  });
}

// ========= Auth modal (email/password) =========
function showAuthModal() {
  show($("#auth-modal"));
  const title = $("#auth-title");
  const actionBtn = $("#auth-action");
  const toggle = $("#toggle-auth");
  title.textContent = "Login to INTAKEE";
  actionBtn.textContent = "Login";

  toggle.onclick = () => {
    const isLogin = title.textContent.includes("Login");
    title.textContent = isLogin
      ? "Create your INTAKEE account"
      : "Login to INTAKEE";
    actionBtn.textContent = isLogin ? "Sign Up" : "Login";
  };

  actionBtn.onclick = async () => {
    const email = $("#auth-email")?.value.trim();
    const pwd = $("#auth-password")?.value.trim();
    if (!email || !pwd) {
      alert("Please enter email and password.");
      return;
    }
    try {
      if (actionBtn.textContent.includes("Sign Up")) {
        await createUserWithEmailAndPassword(auth, email, pwd);
      } else {
        await signInWithEmailAndPassword(auth, email, pwd);
      }
      closeAuthModal();
    } catch (e) {
      alert(e?.message || "Authentication error");
    }
  };
}
function closeAuthModal() {
  hide($("#auth-modal"));
}
window.showAuthModal = showAuthModal;
window.closeAuthModal = closeAuthModal;

// Update UI when auth changes
onAuthStateChanged(auth, (user) => {
  const nameEl = $("#user-email-display");
  const bio = $("#profile-bio");
  const upWarn = $("#upload-warning");

  if (user) {
    if (nameEl) nameEl.textContent = user.email || "User";
    if (bio) bio.disabled = false;
    if (upWarn) upWarn.textContent = "You are logged in. You can upload.";
    $("#home-login-btn")?.classList.add("hidden");
  } else {
    if (nameEl) nameEl.textContent = "Guest";
    if (bio) bio.disabled = true;
    if (upWarn) upWarn.textContent = "You must be logged in to upload content.";
    $("#home-login-btn")?.classList.remove("hidden");
  }
});

async function handleLogout() {
  try {
    await signOut(auth);
    alert("Logged out.");
  } catch (e) {
    alert(e?.message || "Error");
  }
}
function promptLoginIfNeeded() {
  if (!auth.currentUser) showAuthModal();
}
function handleLogoutOrPrompt() {
  if (!auth.currentUser) return showAuthModal();
  handleLogout();
}
function handleDeleteAccountOrPrompt() {
  if (!auth.currentUser) return showAuthModal();
  alert("Account deletion flow not implemented yet.");
}
function handlePrivacyToggleOrPrompt() {
  if (!auth.currentUser) return showAuthModal();
  alert("Account made private (demo).");
}
Object.assign(window, {
  promptLoginIfNeeded,
  handleLogoutOrPrompt,
  handleDeleteAccountOrPrompt,
  handlePrivacyToggleOrPrompt,
});

// ========= Upload: type-aware labels + upload =========
function refreshUploadForm() {
  const type = $("#upload-type")?.value || "video";
  const fileInput = $("#upload-file");
  const fileLabel = $("#upload-file-label");
  const help = $("#upload-help");
  if (!fileInput || !fileLabel || !help) return;

  switch (type) {
    case "video":
      fileLabel.textContent = "Video File";
      fileInput.accept = "video/*";
      help.textContent =
        "Upload a standard video (MP4/WebM). Thumbnail shows in feed.";
      break;
    case "clip":
      fileLabel.textContent = "Clip File";
      fileInput.accept = "video/*";
      help.textContent =
        "Upload a short vertical clip (MP4/WebM). Recommended under 60s.";
      break;
    case "podcast-video":
      fileLabel.textContent = "Podcast Video File";
      fileInput.accept = "video/*";
      help.textContent = "Upload a video podcast. Thumbnail shows in the feed.";
      break;
    case "podcast-audio":
      fileLabel.textContent = "Podcast Audio File";
      fileInput.accept = "audio/*";
      help.textContent =
        "Upload an audio podcast (MP3/M4A/WAV). Thumbnail is a static cover.";
      break;
  }
}

async function handleUpload() {
  if (!auth.currentUser) {
    showAuthModal();
    return;
  }

  const type = $("#upload-type")?.value || "video";
  const title = $("#upload-title")?.value.trim();
  const desc = $("#upload-description")?.value.trim();
  const file = $("#upload-file")?.files?.[0];
  const thumb = $("#upload-thumbnail")?.files?.[0];

  if (!file) {
    alert("Please choose a file.");
    return;
  }
  if (!title) {
    alert("Please add a title.");
    return;
  }

  try {
    const uid = auth.currentUser.uid;
    const now = Date.now();

    // Upload main file
    const mainPath = `uploads/${uid}/${now}_${file.name}`;
    const mainRef = storageRef(storage, mainPath);
    await uploadBytes(mainRef, file);
    const fileUrl = await getDownloadURL(mainRef);

    // Upload thumbnail if present
    let thumbUrl = "";
    if (thumb) {
      const thumbPath = `thumbnails/${uid}/${now}_${thumb.name}`;
      const thumbRef = storageRef(storage, thumbPath);
      await uploadBytes(thumbRef, thumb);
      thumbUrl = await getDownloadURL(thumbRef);
    }

    // Save metadata to Firestore
    await addDoc(collection(db, "posts"), {
      uid,
      type,
      title,
      description: desc || "",
      fileUrl,
      thumbUrl,
      createdAt: serverTimestamp(),
    });

    alert("Upload complete!");

    // Simple UI reset
    $("#upload-title").value = "";
    $("#upload-description").value = "";
    $("#upload-file").value = "";
    $("#upload-thumbnail").value = "";

    // Refresh feeds
    await loadFeeds();
  } catch (e) {
    console.error(e);
    alert(e?.message || "Upload failed.");
  }
}
function goLive() {
  if (!auth.currentUser) {
    showAuthModal();
    return;
  }
  alert("Starting live stream (not implemented yet).");
}
Object.assign(window, { handleUpload, goLive });

// ========= Feeds (basic read) =========
async function loadFeeds() {
  // Trending = latest 12
  await fillGrid(
    "#trending-feed",
    query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(12))
  );

  // Videos
  await fillGrid(
    "#video-feed",
    query(
      collection(db, "posts"),
      where("type", "in", ["video"]),
      orderBy("createdAt", "desc"),
      limit(12)
    )
  );

  // Podcasts: both audio and video
  await fillGrid(
    "#podcast-feed",
    query(
      collection(db, "posts"),
      where("type", "in", ["podcast-audio", "podcast-video"]),
      orderBy("createdAt", "desc"),
      limit(12)
    )
  );

  // Clips
  await fillGrid(
    "#clips-feed",
    query(
      collection(db, "posts"),
      where("type", "in", ["clip"]),
      orderBy("createdAt", "desc"),
      limit(12)
    )
  );
}

async function fillGrid(sel, q) {
  const el = $(sel);
  if (!el) return;
  try {
    const snap = await getDocs(q);
    if (snap.empty) {
      el.textContent = el.id.includes("video")
        ? "No videos yet"
        : el.id.includes("podcast")
        ? "No podcasts yet"
        : el.id.includes("clips")
        ? "No clips yet"
        : "No trending posts";
      return;
    }
    el.innerHTML = "";
    snap.forEach((doc) => {
      const d = doc.data();
      const card = document.createElement("div");
      card.className = "video-card";
      const cover =
        d.thumbUrl || (d.type === "podcast-audio" ? "default-audio-cover.png" : "");
      const media = cover ? `<img src="${cover}" alt="${d.title} cover">` : "";
      card.innerHTML = `
        ${media}
        <h3>${d.title || "Untitled"}</h3>
        <p>${d.type.replace("-", " ")}</p>
        <p>${(d.description || "").slice(0, 120)}</p>
        <a class="button" href="${d.fileUrl}" target="_blank" rel="noopener">Open</a>
      `;
      el.appendChild(card);
    });
  } catch (e) {
    console.error(e);
    el.textContent = "Failed to load.";
  }
}

// ========= Boot =========
document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initSettingsAccordion();

  // Upload form type → accept/labels
  const typeSel = $("#upload-type");
  if (typeSel) {
    refreshUploadForm();
    typeSel.addEventListener("change", refreshUploadForm);
  }

  // Initial feed load
  loadFeeds();
});
// firebaseInit.js (CDN Modular SDK)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// 1) COPY these from Firebase Console → Project Settings → Your apps → Web app (Config)
const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_ID",
  appId: "YOUR_APPID",
};

// 2) Initialize once
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// 3) Tiny sanity log (shows up in browser console on load)
console.log("[Firebase] initialized on", location.host);
