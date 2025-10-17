// script.js — INTAKEE Firebase Auth + Uploads + Feed
// -----------------------------------------------------------------------------
// Dependencies: modular Firebase SDK via CDN (no bundler required)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, serverTimestamp,
  query, orderBy, onSnapshot, doc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getStorage, ref, uploadBytesResumable, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// -----------------------------------------------------------------------------
// 1) Firebase Config (intakee-5785e) — UPDATED to correct project
// -----------------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyD0_tL8PxUvGT7JqCBj3tuL7s3Kipl5E6g",
  authDomain: "intakee-5785e.firebaseapp.com",
  projectId: "intakee-5785e",
  storageBucket: "intakee-5785e.firebasestorage.app",
  messagingSenderId: "40666230072",
  appId: "1:40666230072:web:49dd5e7db91c8a38b565cd",
  measurementId: "G-3C2YDV6T0G"
};

// Init
const app     = initializeApp(firebaseConfig);
const auth    = getAuth(app);
const db      = getFirestore(app);
const storage = getStorage(app);

// Utility: dispatch custom event so header reacts
function dispatchAuthEvent(user) {
  document.dispatchEvent(new CustomEvent("intakee:auth", { detail: { user } }));
}

// Utility: simple el()
const $ = (sel) => document.querySelector(sel);

// DOM refs (Auth)
const authDialog      = $("#authDialog");
const signUpForm      = $("#authSignUpForm");
const signInForm      = $("#authSignInForm");
const btnSignOut      = $("#btnSignOut");

// DOM refs (Upload)
const uploadTypeSel   = $("#uploadTypeSelect");
const uploadTitleIn   = $("#uploadTitleInput");
const uploadThumbIn   = $("#uploadThumbInput");
const uploadFileIn    = $("#uploadFileInput");
const btnUpload       = $("#btnUpload");

// DOM refs (Feeds)
const homeFeed        = $("#home-feed");
const videosFeed      = $("#videos-feed");
const podcastFeed     = $("#podcast-feed");
const clipsFeed       = $("#clips-feed");

// DOM refs (Profile)
const profileGrid     = $("#profile-grid");
const profileEmpty    = $("#profile-empty");

// -----------------------------------------------------------------------------
// 2) Auth: Sign Up / Sign In / Sign Out + auth state -> notify header
// -----------------------------------------------------------------------------
onAuthStateChanged(auth, (user) => {
  dispatchAuthEvent(user || null);
});

if (signUpForm) {
  signUpForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("#signUpEmail")?.value.trim();
    const pass  = $("#signUpPassword")?.value;
    const name  = $("#signUpName")?.value.trim();
    if (!email || !pass) return;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      if (name) await updateProfile(cred.user, { displayName: name });
      dispatchAuthEvent(cred.user);
      authDialog?.close();
    } catch (err) {
      alert(err?.message || "Sign up failed");
    }
  });
}

if (signInForm) {
  signInForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("#signInEmail")?.value.trim();
    const pass  = $("#signInPassword")?.value;
    if (!email || !pass) return;
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      dispatchAuthEvent(cred.user);
      authDialog?.close();
    } catch (err) {
      alert(err?.message || "Sign in failed");
    }
  });
}

if (btnSignOut) {
  btnSignOut.addEventListener("click", async () => {
    try {
      await signOut(auth);
      dispatchAuthEvent(null);
    } catch (err) {
      alert(err?.message || "Sign out failed");
    }
  });
}

// -----------------------------------------------------------------------------
// 3) Uploads: Videos / Clips / Podcasts + Thumbnail → Storage + Firestore
// -----------------------------------------------------------------------------
function resolveUploadPath(type) {
  switch (type) {
    case "video":          return { folder: "videos",   type: "video",   subtype: null };
    case "clip":           return { folder: "clips",    type: "clip",    subtype: null };
    case "podcast-audio":  return { folder: "podcasts", type: "podcast", subtype: "audio" };
    case "podcast-video":  return { folder: "podcasts", type: "podcast", subtype: "video" };
    default:               return { folder: "videos",   type: "video",   subtype: null };
  }
}

async function uploadFileWithProgress(file, destRef, progressCb) {
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(destRef, file);
    task.on("state_changed",
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        if (progressCb) progressCb(pct);
      },
      (err) => reject(err),
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve(url);
        } catch (e) { reject(e); }
      }
    );
  });
}

async function handleUpload() {
  const user = auth.currentUser;
  if (!user) { alert("Please sign in to upload."); return; }

  const chosen = uploadTypeSel?.value || "video";
  const title  = (uploadTitleIn?.value || "").trim();
  const file   = uploadFileIn?.files?.[0] || null;
  const thumb  = uploadThumbIn?.files?.[0] || null;

  if (!file)  { alert("Please choose a file."); return; }
  if (!title) { alert("Please add a title.");   return; }

  const { folder, type, subtype } = resolveUploadPath(chosen);

  const safeName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
  const fileRef  = ref(storage, `uploads/${folder}/${user.uid}/${safeName}`);

  let thumbURL = "";
  if (thumb) {
    const thumbName = `${Date.now()}_${thumb.name.replace(/\s+/g, "_")}`;
    const thumbRef  = ref(storage, `uploads/thumbnails/${user.uid}/${thumbName}`);
    thumbURL        = await uploadFileWithProgress(thumb, thumbRef, () => {});
  }

  const mediaURL = await uploadFileWithProgress(file, fileRef, (pct)=>{
    btnUpload.textContent = `Uploading… ${pct}%`;
    btnUpload.disabled = true;
  });

  const docRef = await addDoc(collection(db, "posts"), {
    title,
    type,
    subtype: subtype || "",
    mediaURL,
    thumbnailURL: thumbURL || "",
    createdAt: serverTimestamp(),
    userId: user.uid,
    userEmail: user.email || ""
  });

  btnUpload.textContent = "Upload";
  btnUpload.disabled = false;
  if (uploadFileIn) uploadFileIn.value = "";
  if (uploadThumbIn) uploadThumbIn.value = "";
  if (uploadTitleIn) uploadTitleIn.value = "";

  appendToProfileGrid({
    id: docRef.id,
    title, type, subtype,
    mediaURL, thumbnailURL: thumbURL
  });

  alert("Upload complete! Your post will appear in the feed shortly.");
}
if (btnUpload) btnUpload.addEventListener("click", handleUpload);

// -----------------------------------------------------------------------------
// 4) Live Feeds: stream 'posts' ordered by createdAt desc
// -----------------------------------------------------------------------------
function createCard(item) {
  const thumb = item.thumbnailURL || "";
  const isPodcast = item.type === "podcast";
  const mediaTag = isPodcast
    ? `<audio controls preload="metadata" style="width:100%; margin-top:8px;">
         <source src="${item.mediaURL}">
       </audio>`
    : `<video controls preload="metadata" style="width:100%; border-radius:10px; margin-top:8px; max-height:420px;">
         <source src="${item.mediaURL}">
       </video>`;

  return `
    <div class="card">
      <div class="row" style="justify-content:space-between;align-items:center;">
        <h4 style="margin:0;">${escapeHtml(item.title || "Untitled")}</h4>
        <span class="pill">${item.type}${item.subtype ? " · " + item.subtype : ""}</span>
      </div>
      ${thumb ? `<img src="${thumb}" alt="" style="width:100%; border-radius:10px; margin-top:8px;"/>` : ""}
      ${item.mediaURL ? mediaTag : ""}
    </div>
  `;
}

function escapeHtml(s = "") {
  return s.replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}

function mountFeedStream() {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snap) => {
    if (homeFeed)   homeFeed.innerHTML   = "";
    if (videosFeed) videosFeed.innerHTML = "";
    if (podcastFeed)podcastFeed.innerHTML= "";
    if (clipsFeed)  clipsFeed.innerHTML  = "";

    snap.forEach((docSnap) => {
      const d = { id: docSnap.id, ...docSnap.data() };
      const cardHtml = createCard(d);

      if (homeFeed) homeFeed.insertAdjacentHTML("beforeend", cardHtml);
      if (d.type === "video" && videosFeed)   videosFeed.insertAdjacentHTML("beforeend", cardHtml);
      if (d.type === "clip" && clipsFeed)     clipsFeed.insertAdjacentHTML("beforeend", cardHtml);
      if (d.type === "podcast" && podcastFeed)podcastFeed.insertAdjacentHTML("beforeend", cardHtml);
    });
  });
}
mountFeedStream();

// -----------------------------------------------------------------------------
// 5) Profile grid: append the uploaded item (simple visual confirmation)
// -----------------------------------------------------------------------------
function appendToProfileGrid(item) {
  if (!profileGrid) return;
  const thumb = item.thumbnailURL || "";
  const tile = `
    <div class="tile">
      ${thumb
        ? `<img class="thumb" src="${thumb}" alt="">`
        : `<div class="thumb" style="display:flex;align-items:center;justify-content:center;color:#aaa;">No thumbnail</div>`}
      <div class="meta">
        <div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          ${escapeHtml(item.title || "Untitled")}
        </div>
        <div class="muted">${item.type}${item.subtype ? " · " + item.subtype : ""}</div>
      </div>
    </div>`;
  profileGrid.insertAdjacentHTML("afterbegin", tile);
  if (profileEmpty) profileEmpty.style.display = "none";
}

// -----------------------------------------------------------------------------
// 6) Simple filter pills on Home (All, Videos, Podcasts, Clips, Following, Newest)
// -----------------------------------------------------------------------------
const homePills = Array.from(document.querySelectorAll('#tab-home .pill'));
homePills.forEach(p => p.addEventListener('click', () => {
  homePills.forEach(x => x.classList.toggle('active', x === p));
  const filter = p.dataset.filter;

  const cards = Array.from(homeFeed?.querySelectorAll('.card') || []);
  cards.forEach(card => {
    const label = card.querySelector('.pill')?.textContent || "";
    const isVideo   = label.startsWith('video');
    const isClip    = label.startsWith('clip');
    const isPodcast = label.startsWith('podcast');

    let show = true;
    if (filter === 'video')   show = isVideo;
    if (filter === 'clip')    show = isClip;
    if (filter === 'podcast') show = isPodcast;
    if (filter === 'following') show = true; // TODO: wire follow graph
    if (filter === 'new')       show = true; // already newest by stream

    card.style.display = show ? "" : "none";
  });
}));

// -----------------------------------------------------------------------------
// 7) Optional: expose for debugging (remove in production)
// -----------------------------------------------------------------------------
window.__INTAKEE__ = { app, auth, db, storage };
// -----------------------------------------------------------------------------
