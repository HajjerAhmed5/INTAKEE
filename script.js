// ========= INTAKEE Frontend Logic (script.js) =========
// Load from our actual init file (CDN modular SDK)
import { auth, db, storage } from "./js/firebase-init.js";

/* ---------------- Firebase CDN helpers (v10.12.4) ---------------- */
// Auth (only what we use here)
import {
  onAuthStateChanged,
  signOut,
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
  where,
  doc,
  getDoc,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

/* ---------------- Tiny DOM helpers ---------------- */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const show = (el) => el && el.classList.remove("hidden");
const hide = (el) => el && el.classList.add("hidden");

/* ---------------- Tabs + Hash routing ---------------- */
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
    hide(searchBar); hide(loginBtn);
  } else {
    show(searchBar); show(loginBtn);
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

/* ---------------- Settings accordion ---------------- */
function initSettingsAccordion() {
  $$(".settings-label").forEach((label) => {
    label.addEventListener("click", () =>
      label.closest(".settings-section")?.classList.toggle("open")
    );
  });
}

/* ---------------- Auth modal helpers ---------------- */
function showAuthModal() { show($("#auth-modal")); }
function closeAuthModal() { hide($("#auth-modal")); }
Object.assign(window, { showAuthModal, closeAuthModal });

/* ---------------- Auth state → UI sync + owner-only controls ---------------- */
const profileBanner   = $("#profileBanner");
const bannerInput     = $("#bannerInput");
const avatarInput     = $("#avatarInput");
const btnChangeBanner = $("#btn-change-banner");
const btnChangeAvatar = $("#btn-change-avatar");

const profilePhoto  = $("#profile-photo");
const profileName   = $("#profile-name");
const profileHandle = $("#profile-handle");
const profileBioEl  = $("#profile-bio");

onAuthStateChanged(auth, async (user) => {
  console.log("Auth state:", user);

  // make user available to any other script just in case
  window.currentUser = user;

  // auto-disable any buttons that require auth
  document.querySelectorAll("[data-require-auth]").forEach(btn => {
    btn.disabled = !user;
  });

  const nameEl = $("#user-email-display");
  const upWarn = $("#upload-warning");

  if (user) {
    // Ensure user doc exists
    const uref = doc(db, "users", user.uid);
    const usnap = await getDoc(uref);
    if (!usnap.exists()) {
      await setDoc(uref, {
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || "",
        photoURL: user.photoURL || "",
        createdAt: serverTimestamp()
      });
    }

    // Pull fresh user data for profile header
    const data = (await getDoc(uref)).data() || {};
    if (profileName)   profileName.textContent   = data.displayName || "Your Name";
    if (profileHandle) profileHandle.textContent = data.email ? "@"+data.email.split("@")[0] : "@username";
    if (profilePhoto && (data.photoURL || user.photoURL)) profilePhoto.src = data.photoURL || user.photoURL;
    if (profileBanner && data.bannerURL) profileBanner.style.backgroundImage = `url('${data.bannerURL}')`;

    if (nameEl) nameEl.textContent = user.email || "User";
    if (profileBioEl) profileBioEl.disabled = false;
    if (upWarn) upWarn.textContent = "You are logged in. You can upload.";
    $("#home-login-btn")?.classList.add("hidden");
    $("#logoutBtn")?.classList.remove("hidden");
    $$(".owner-only").forEach(el => el.style.display = "");
  } else {
    if (nameEl) nameEl.textContent = "Guest";
    if (profileBioEl) profileBioEl.disabled = true;
    if (upWarn) upWarn.textContent = "You must be logged in to upload content.";
    $("#home-login-btn")?.classList.remove("hidden");
    $("#logoutBtn")?.classList.add("hidden");
    $$(".owner-only").forEach(el => el.style.display = "none");
  }
});

/* ---------------- Profile image uploads ---------------- */
btnChangeBanner?.addEventListener("click", () => bannerInput?.click());
bannerInput?.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  if (!auth.currentUser) return showAuthModal();

  try {
    const uid = auth.currentUser.uid;
    const path = `users/${uid}/banner/${Date.now()}_${file.name}`;
    const ref  = storageRef(storage, path);
    await uploadBytes(ref, file);
    const url = await getDownloadURL(ref);

    await updateDoc(doc(db, "users", uid), { bannerURL: url });
    if (profileBanner) profileBanner.style.backgroundImage = `url('${url}')`;
  } catch (e) {
    console.error("Banner upload failed:", e);
    alert(e?.message || "Banner upload failed.");
  }
});

btnChangeAvatar?.addEventListener("click", () => avatarInput?.click());
avatarInput?.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  if (!auth.currentUser) return showAuthModal();

  try {
    const uid = auth.currentUser.uid;
    const path = `users/${uid}/avatar/${Date.now()}_${file.name}`;
    const ref  = storageRef(storage, path);
    await uploadBytes(ref, file);
    const url = await getDownloadURL(ref);

    await updateDoc(doc(db, "users", uid), { photoURL: url });
    if (profilePhoto) profilePhoto.src = url;
  } catch (e) {
    console.error("Avatar upload failed:", e);
    alert(e?.message || "Avatar upload failed.");
  }
});

/* ---------------- Global handlers exposed to HTML ---------------- */
async function handleLogout() {
  try {
    await signOut(auth);
    alert("Logged out.");
  } catch (e) {
    console.error("Sign out error:", e);
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

/* ---------------- Upload: type-aware labels + upload ---------------- */
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
  // ✅ Wait until Firebase confirms user is signed in
  let user = auth.currentUser;
  if (!user) {
    await new Promise((resolve) => {
      const unsub = onAuthStateChanged(auth, (u) => {
        if (u) {
          user = u;
          unsub();
          resolve();
        }
      });
      // fallback so we don't hang forever
      setTimeout(() => resolve(), 1500);
    });
  }

  if (!user) {
    showAuthModal();
    return;
  }

  const type  = $("#upload-type")?.value || "video";
  const title = $("#upload-title")?.value.trim();
  const desc  = $("#upload-description")?.value.trim();
  const file  = $("#upload-file")?.files?.[0];
  const thumb = $("#upload-thumbnail")?.files?.[0];

  if (!file)  return alert("Please choose a file.");
  if (!title) return alert("Please add a title.");

  try {
    const uid = user.uid;
    const now = Date.now();

    // Upload main file
    const mainPath = `uploads/${uid}/${now}_${file.name}`;
    const mainRef  = storageRef(storage, mainPath);
    await uploadBytes(mainRef, file);
    const fileUrl = await getDownloadURL(mainRef);

    // Upload thumbnail if present
    let thumbUrl = "";
    if (thumb) {
      const thumbPath = `thumbnails/${uid}/${now}_${thumb.name}`;
      const thumbRef  = storageRef(storage, thumbPath);
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

    // Reset form
    $("#upload-title").value = "";
    $("#upload-description").value = "";
    $("#upload-file").value = "";
    $("#upload-thumbnail").value = "";

    // Refresh feeds
    await loadFeeds();
  } catch (e) {
    console.error("Upload failed:", e);
    alert(e?.message || "Upload failed.");
  }
}

function goLive() {
  if (!auth.currentUser) return showAuthModal();
  alert("Starting live stream (not implemented yet).");
}

Object.assign(window, { handleUpload, goLive });

/* ---------------- Feeds (basic read) ---------------- */
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

  // Podcasts
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
    snap.forEach((docSnap) => {
      const d = docSnap.data();
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
    console.error("Feed load error:", e);
    el.textContent = "Failed to load.";
  }
}

/* ---------------- Boot ---------------- */
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

  // Optional: extra logout wire via button ID
  $("#logoutBtn")?.addEventListener("click", handleLogoutOrPrompt);

  // Upload button gate by live auth state (extra defense)
  const uploadBtn = $("#upload-btn");
  uploadBtn?.addEventListener("click", (e) => {
    if (!auth.currentUser) {
      e.preventDefault?.();
      showAuthModal();
    }
  });
});
