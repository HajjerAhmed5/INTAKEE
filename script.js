// ========= INTAKEE Frontend Logic (script.js) =========
// Use the ONE Firebase app from ./js/firebase-init.js
import { auth, db, storage } from "./js/firebase-init.js";

/* ---------------- Firebase CDN helpers (v10.12.4) ---------------- */
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  collection, addDoc, serverTimestamp, getDocs, query, orderBy, limit, where,
  doc, getDoc, setDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

/* ---------------- Tiny DOM helpers ---------------- */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const show = (el) => el && (el.style.display = "");
const hide = (el) => el && (el.style.display = "none");

/* ---------------- Elements that exist in your HTML ---------------- */
// Header
const searchWrap = $("#searchWrap");
const loginBtn   = $("#loginBtn");
const logoutBtn  = $("#logoutBtn");

// Upload section (IDs from your HTML)
const uploadType   = $("#uploadType");
const postTitle    = $("#postTitle");
const postDesc     = $("#postDesc");
const mediaFile    = $("#mediaFile");
const thumbFile    = $("#thumbFile");
const uploadSubmit = $("#uploadSubmit");
const goLiveBtn    = $("#goLiveBtn");

// Feeds search inputs (optional in your markup)
const videosSearch  = $("#videosSearch");
const podcastSearch = $("#podcastSearch");
const clipsSearch   = $("#clipsSearch");

// Profile bits
const profileBanner = $("#profileBanner");
const btnAddBanner  = $("#btnAddBanner");
const btnAddAvatar  = $("#btnAddAvatar");
const bannerInput   = $("#bannerInput");
const avatarInput   = $("#avatarInput");
const profilePhoto  = $("#profile-photo");
const profileName   = $("#profile-name");
const profileHandle = $("#profile-handle");

/* ---------------- Auth state → UI sync ---------------- */
logoutBtn?.addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  // header buttons
  loginBtn && (loginBtn.style.display  = "none");
  logoutBtn && (logoutBtn.style.display = user ? "inline-block" : "none");

  if (user) {
    // ensure user doc
    const uref = doc(db, "users", user.uid);
    const snap = await getDoc(uref);
    if (!snap.exists()) {
      await setDoc(uref, {
        uid: user.uid,
        displayName: user.displayName ?? "",
        email: user.email ?? "",
        photoURL: user.photoURL ?? "",
        createdAt: serverTimestamp(),
      });
    }
    const fresh = (await getDoc(uref)).data() || {};
    if (fresh.displayName) profileName.textContent = fresh.displayName;
    if (fresh.email)       profileHandle.textContent = "@" + fresh.email.split("@")[0];
    if (fresh.photoURL)    profilePhoto.src = fresh.photoURL;
    if (fresh.bannerURL)   profileBanner.style.backgroundImage = `url('${fresh.bannerURL}')`;
  }
});

/* ---------------- Profile image uploads ---------------- */
btnAddBanner?.addEventListener("click", () => bannerInput?.click());
bannerInput?.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  if (!auth.currentUser) return alert("Sign in to change banner.");

  const uid = auth.currentUser.uid;
  const path = `users/${uid}/banner/${Date.now()}_${file.name}`;
  const ref  = storageRef(storage, path);
  await uploadBytes(ref, file);
  const url = await getDownloadURL(ref);
  await updateDoc(doc(db, "users", uid), { bannerURL: url });
  profileBanner.style.backgroundImage = `url('${url}')`;
});

btnAddAvatar?.addEventListener("click", () => avatarInput?.click());
avatarInput?.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  if (!auth.currentUser) return alert("Sign in to change photo.");

  const uid = auth.currentUser.uid;
  const path = `users/${uid}/avatar/${Date.now()}_${file.name}`;
  const ref  = storageRef(storage, path);
  await uploadBytes(ref, file);
  const url = await getDownloadURL(ref);
  await updateDoc(doc(db, "users", uid), { photoURL: url });
  profilePhoto.src = url;
});

/* ---------------- Upload handler ---------------- */
async function handleUpload() {
  // wait for a confirmed auth user (prevents “Sign in to upload” race)
  let user = auth.currentUser;
  if (!user) {
    await new Promise((resolve) => {
      const unsub = onAuthStateChanged(auth, (u) => {
        if (u) { user = u; unsub(); resolve(); }
      });
      setTimeout(resolve, 1500); // fallback so we don’t hang
    });
  }
  if (!user) return alert("Sign in to upload.");

  const type  = uploadType?.value || "video";
  const title = (postTitle?.value || "").trim();
  const desc  = (postDesc?.value || "").trim();
  const media = mediaFile?.files?.[0];
  const thumb = thumbFile?.files?.[0];

  if (!media) return alert("Choose a file to upload.");
  if (!title) return alert("Add a title.");

  uploadSubmit && (uploadSubmit.disabled = true);
  try {
    const ts = Date.now();

    // main file
    const mediaPath = `uploads/${user.uid}/${ts}_${media.name}`;
    const mRef = storageRef(storage, mediaPath);
    await uploadBytes(mRef, media);
    const mediaUrl = await getDownloadURL(mRef);

    // thumbnail (optional)
    let thumbUrl = "";
    if (thumb) {
      const tPath = `thumbnails/${user.uid}/${ts}_${thumb.name}`;
      const tRef = storageRef(storage, tPath);
      await uploadBytes(tRef, thumb);
      thumbUrl = await getDownloadURL(tRef);
    }

    // Firestore metadata
    await addDoc(collection(db, "posts"), {
      ownerId: user.uid,
      user: user.displayName || (user.email ? user.email.split("@")[0] : "User"),
      kind: type, type, title, text: title, description: desc,
      mediaUrl, thumbUrl,
      likeCount: 0, commentCount: 0,
      createdAt: serverTimestamp(),
    });

    alert("Upload complete.");
    if (postTitle) postTitle.value = "";
    if (postDesc)  postDesc.value  = "";
    if (mediaFile) mediaFile.value = "";
    if (thumbFile) thumbFile.value = "";
  } catch (err) {
    console.error(err);
    alert(err?.message || "Upload failed.");
  } finally {
    uploadSubmit && (uploadSubmit.disabled = false);
  }
}

uploadSubmit?.addEventListener("click", handleUpload);
goLiveBtn?.addEventListener("click", () => alert("Go Live will be added later."));

/* ---------------- Optional: Feeds (basic render stubs) ---------------- */
// These match your IDs; safe if sections are empty.
const homeFeed    = $("#home-feed");
const videosFeed  = $("#videos-feed");
const podcastFeed = $("#podcast-feed");
const clipsFeed   = $("#clips-feed");

function escapeHtml(s=""){ return s.replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }
function fmtTime(ts){ try{const t=ts?.toDate?ts.toDate():(ts instanceof Date?ts:null); if(!t)return""; return t.toLocaleString([], {month:"short", day:"numeric", hour:"2-digit", minute:"2-digit"});}catch{return"";} }
function match(p, term){ if(!term) return true; const t=term.toLowerCase(); return ((p.text||"").toLowerCase().includes(t) || (p.title||"").toLowerCase().includes(t)); }

function cardFromDoc(d){
  const p = d.data();
  const el = document.createElement("article"); el.className = "card";
  const kind = p.kind || p.type || "";
  const label = (kind==="video"||kind==="podcast_video") ? "VIDEO"
             : (kind==="podcast_audio"||kind==="audio") ? "PODCAST"
             : (kind==="clip") ? "CLIP" : "";
  const url = p.mediaUrl || p.fileUrl || "";
  let media = "";
  if (url) {
    if (kind==="video"||kind==="podcast_video") media = `<video src="${url}" controls playsinline style="width:100%;border-radius:10px;margin-top:8px;"></video>`;
    else if (kind==="podcast_audio"||kind==="audio") media = `<audio src="${url}" controls style="width:100%;margin-top:8px;"></audio>`;
    else if (kind==="image") media = `<img src="${url}" alt="" style="width:100%;border-radius:10px;margin-top:8px;">`;
    else media = `<a href="${url}" target="_blank" rel="noopener">Open file</a>`;
  }
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <div><strong>${escapeHtml(p.user||"Anon")}</strong> <span class="muted">· ${fmtTime(p.createdAt)}</span></div>
      ${label?`<span class="muted" style="border:1px solid #2a2a2a;padding:2px 8px;border-radius:999px;font-size:.75rem;">${label}</span>`:""}
    </div>
    ${p.title ? `<div style="margin-top:6px;">${escapeHtml(p.title)}</div>` : ""}
    ${media}
  `;
  return el;
}

// basic live trending feed
try {
  const PAGE_SIZE = 40;
  const qMain = query(collection(db,"posts"), orderBy("createdAt","desc"), limit(PAGE_SIZE));
  const unsub = (await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js")).onSnapshot;
  // dynamic import to get onSnapshot (keeps top import list shorter)
  unsub(qMain, (snap)=>{
    if (!homeFeed) return;
    const docs = snap.docs;
    homeFeed.innerHTML = docs.length ? "" : '<div class="muted" style="text-align:center;margin-top:40px;">No trending content yet.</div>';
    docs.forEach(d=> homeFeed.appendChild(cardFromDoc(d)));
  });
} catch { /* feeds are optional; ignore errors */ }
