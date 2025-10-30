// script.js  — INTAKEE core app logic
// --------------------------------------------------
// Firebase (Auth, Firestore, Storage) + UI behaviors
// --------------------------------------------------

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, updateProfile, signOut
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc,
  query, where, orderBy, limit, startAfter, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import {
  getStorage, ref, uploadBytesResumable, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

// -------------------- Firebase Init --------------------
const firebaseConfig = {
  // TODO: paste your real config here (public web keys OK)
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  appId: "YOUR_APP_ID"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// -------------------- Short Helpers --------------------
const qs  = (s,sc=document)=>sc.querySelector(s);
const qsa = (s,sc=document)=>Array.from(sc.querySelectorAll(s));
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
const escapeHtml = (s)=>String(s||"").replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));

// Global search state (Home)
let GLOBAL_TEXT = "";
let HOME_FILTER = "all";

// -------------------- Auth Modal Wiring --------------------
const dlg = qs('#authDialog');
const openAuthBtn = qs('#openAuth');

openAuthBtn?.addEventListener('click', ()=> dlg?.showModal());
dlg?.addEventListener('close', ()=> {
  // clear forms on close
  qs('#authSignUpForm')?.reset();
  qs('#authSignInForm')?.reset();
});

// Sign Up
qs('#authSignUpForm')?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email = qs('#signUpEmail').value.trim();
  const pass  = qs('#signUpPassword').value.trim();
  const name  = qs('#signUpName').value.trim();

  try{
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (name) { await updateProfile(cred.user, { displayName: name }); }
    // Create basic profile doc
    await setDoc(doc(db, 'profiles', cred.user.uid), {
      displayName: name || "",
      bio: "",
      photoURL: "",
      bannerURL: "",
      createdAt: serverTimestamp()
    }, { merge:true });

    dlg.close();
  }catch(err){
    alert(`Sign up failed: ${err.message}`);
  }
});

// Sign In
qs('#authSignInForm')?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email = qs('#signInEmail').value.trim();
  const pass  = qs('#signInPassword').value.trim();
  try{
    await signInWithEmailAndPassword(auth, email, pass);
    dlg.close();
  }catch(err){
    alert(`Sign in failed: ${err.message}`);
  }
});

// Settings → Logout
qs('#settings-logout')?.addEventListener('click', async ()=>{
  try{
    await signOut(auth);
    location.hash = '#home';
  }catch(err){
    alert(`Logout failed: ${err.message}`);
  }
});

// Header visibility + avatar “＋” owner-only buttons
onAuthStateChanged(auth, async (user)=>{
  // Notify header (index.html listens and hides Login/Sign Up)
  document.dispatchEvent(new CustomEvent('intakee:auth', { detail:{ user } }));

  // Owner-only UI (profile image/banner edit, edit profile button)
  const ownerEls = qsa('.owner-only');
  ownerEls.forEach(el => el.style.display = user ? '' : 'none');

  // Home empty text depends on auth
  updateHomeEmptyMessage(user);

  // Refresh all active feeds when auth changes
  renderCurrentTab();
});

// -------------------- Legal Pages Content --------------------
const LEGAL = {
  guidelines: `
  <p><strong>Welcome to INTAKEE.</strong> We support free speech and creative expression, but do not allow nudity or pornographic content. The following is not allowed: illegal activity, sexual exploitation, doxxing, credible threats, incitement to violence, or spam/scams. Repeated reports may result in review and removal. Creators are responsible for their own uploads.</p>
  <ul>
    <li>No nudity or pornographic content.</li>
    <li>No illegal content or instructions to commit crimes.</li>
    <li>No harassment, threats, or hate aimed at protected classes.</li>
    <li>No child endangerment or sexualization of minors.</li>
    <li>No spam, deceptive practices, or malware.</li>
  </ul>
  <p>Report issues to <a href="mailto:intakee2025@gmail.com">intakee2025@gmail.com</a>.</p>
  `,
  terms: `
  <p>By using INTAKEE, you agree to these Terms. You must be at least 13. You own the content you upload but grant INTAKEE a worldwide, non-exclusive license to host, display, and distribute it on our services. You represent you have rights to everything you upload.</p>
  <ul>
    <li>We may remove content that violates laws or our Guidelines.</li>
    <li>Creators are solely responsible for their content; INTAKEE is not liable for user-generated content.</li>
    <li>We may suspend or terminate accounts that repeatedly violate policies.</li>
    <li>DMCA/Reports: email <a href="mailto:intakee2025@gmail.com">intakee2025@gmail.com</a>.</li>
  </ul>
  <p>These Terms may update from time to time. Continued use means acceptance.</p>
  `,
  privacy: `
  <p>We collect account info (email, display name), usage data, and uploads. We use cookies/localStorage to keep you signed in and remember preferences (e.g., Continue Listening). We do not sell your personal data. We share data with service providers to operate the app (e.g., Firebase). You can request deletion by contacting <a href="mailto:intakee2025@gmail.com">intakee2025@gmail.com</a>.</p>
  <ul>
    <li>Data we collect: account details, uploads, interactions.</li>
    <li>Why: operate platform, secure accounts, improve product.</li>
    <li>Retention: as long as needed for the service or legal obligations.</li>
  </ul>
  <p>Contact: <a href="mailto:intakee2025@gmail.com">intakee2025@gmail.com</a></p>
  `
};
function mountLegalPages(){
  const g = qs('#guidelines-content'); if (g) g.innerHTML = LEGAL.guidelines;
  const t = qs('#terms-content');      if (t) t.innerHTML = LEGAL.terms;
  const p = qs('#privacy-content');    if (p) p.innerHTML = LEGAL.privacy;
}
mountLegalPages();

// -------------------- Upload Flow --------------------
const uploadBtn = qs('#btnUpload');
uploadBtn?.addEventListener('click', handleUpload);

async function handleUpload(){
  if(!auth.currentUser){ alert('Please sign in to upload.'); return; }

  const typeSel = qs('#uploadTypeSelect').value;     // video | clip | podcast-audio | podcast-video
  const title   = qs('#uploadTitleInput').value.trim();
  const desc    = qs('#uploadDescInput').value.trim();
  const file    = qs('#uploadFileInput').files[0] || null;
  const thumb   = qs('#uploadThumbInput').files[0] || null;

  if(!title){ alert('Please add a title.'); return; }
  if(!file){  alert('Please select a media file.'); return; }

  try{
    const uid = auth.currentUser.uid;
    // Upload media
    const mediaPath = `uploads/${uid}/${Date.now()}_${file.name}`;
    const mediaUrl  = await uploadAndGetURL(mediaPath, file);

    // Upload thumbnail (optional)
    let thumbUrl = "";
    if (thumb){
      const thumbPath = `thumbnails/${uid}/${Date.now()}_${thumb.name}`;
      thumbUrl = await uploadAndGetURL(thumbPath, thumb);
    }

    // Normalize type/subtype
    let type = 'video', subtype = '';
    if (typeSel === 'video') type = 'video';
    if (typeSel === 'clip') type = 'clip';
    if (typeSel === 'podcast-audio') { type = 'podcast'; subtype = 'audio'; }
    if (typeSel === 'podcast-video') { type = 'podcast'; subtype = 'video'; }

    // Create Firestore doc
    await addDoc(collection(db, 'posts'), {
      title, description: desc,
      type, subtype, mediaUrl,
      thumbnailUrl: thumbUrl,
      uid,
      likes: 0,
      tags: [],
      ageRestricted: false,
      createdAt: serverTimestamp()
    });

    alert('Uploaded! Your post is live.');
    location.hash = '#home';
    await renderHome(); // refresh Home to show new post
  }catch(err){
    console.error(err);
    alert('Upload failed: ' + err.message);
  }
}

function uploadAndGetURL(path, file){
  return new Promise((resolve, reject)=>{
    const task = uploadBytesResumable(ref(storage, path), file);
    task.on('state_changed', ()=>{}, reject, async ()=>{
      try{
        const url = await getDownloadURL(task.snapshot.ref);
        resolve(url);
      }catch(e){ reject(e); }
    });
  });
}

// -------------------- Home Feed (global) --------------------
const homeFeed = qs('#home-feed');
const globalSearch = qs('#globalSearch');

// Filter chips
qsa('#tab-home .pills .pill').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    qsa('#tab-home .pills .pill').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    HOME_FILTER = btn.dataset.filter; // all|video|podcast|clip|following|new
    renderHome();
  });
});

// Global search (search all content)
globalSearch?.addEventListener('input', debounce(()=>{
  GLOBAL_TEXT = globalSearch.value.trim().toLowerCase();
  renderHome();
}, 250));

function updateHomeEmptyMessage(user){
  if (!homeFeed) return;
  if (!homeFeed.dataset.loaded) {
    homeFeed.innerHTML = `<div class="muted">Loading posts…</div>`;
  } else if (!homeFeed.childElementCount) {
    homeFeed.innerHTML = `<div class="muted">${user ? 'No posts yet. Go to Upload to post your first video/clip/podcast.' : 'No posts yet. Sign in and be the first to upload.'}</div>`;
  }
}

async function renderHome(){
  if(!homeFeed) return;
  homeFeed.dataset.loaded = "";
  homeFeed.innerHTML = `<div class="muted">Loading posts…</div>`;

  try{
    // Trending spec: “most liked today” (fallback to newest if no likes)
    // For launch, we’ll just order by createdAt desc (simple and stable)
    let qBase = query(collection(db, 'posts'), orderBy('createdAt','desc'), limit(24));
    const snap = await getDocs(qBase);
    let items = snap.docs.map(d=>({ id:d.id, ...d.data() }));

    // filter chips
    if (HOME_FILTER === 'video' || HOME_FILTER === 'podcast' || HOME_FILTER === 'clip'){
      items = items.filter(i => i.type === HOME_FILTER);
    } else if (HOME_FILTER === 'new') {
      // already newest
    } else if (HOME_FILTER === 'following') {
      // Placeholder: until follow graph exists, show empty
      items = [];
    }

    // global search (title + tags)
    if (GLOBAL_TEXT) {
      items = items.filter(i =>
        (i.title||'').toLowerCase().includes(GLOBAL_TEXT) ||
        (i.tags||[]).join(',').toLowerCase().includes(GLOBAL_TEXT)
      );
    }

    // render
    homeFeed.innerHTML = '';
    items.forEach(p=>{
      let node;
      if (p.type === 'podcast'){
        node = window.renderPodcastRow({
          title: p.title, mediaUrl: p.mediaUrl,
          coverUrl: p.thumbnailUrl, showName: '', creatorName: ''
        });
      } else if (p.type === 'clip'){
        node = window.renderClipFullScreen({
          title: p.title, mediaUrl: p.mediaUrl,
          likeCount: p.likes||0, commentCount: 0, creatorHandle: 'user'
        });
      } else {
        node = window.renderVideoCard({
          title: p.title, thumbnailUrl: p.thumbnailUrl, mediaUrl: p.mediaUrl,
          creatorName: '', views: 0
        });
        node.addEventListener('click', ()=> {
          // dedicated watch view (future): for now stay on feed
          // location.href = `#/watch?id=${p.id}`;
        });
      }
      homeFeed.appendChild(node);
    });

    homeFeed.dataset.loaded = "1";
    updateHomeEmptyMessage(auth.currentUser);
  }catch(err){
    console.error(err);
    homeFeed.innerHTML = `<div class="muted">Could not load posts.</div>`;
  }
}

// -------------------- Videos Tab (most recent) --------------------
const videosFeed = qs('#videos-feed');
const videosSearch = qs('#videosSearch');
let VIDEOS_TEXT = "";

videosSearch?.addEventListener('input', debounce(()=>{
  VIDEOS_TEXT = videosSearch.value.trim().toLowerCase();
  renderVideos();
}, 250));

async function renderVideos(){
  if(!videosFeed) return;
  videosFeed.innerHTML = `<div class="muted">Loading…</div>`;
  try{
    const qBase = query(
      collection(db, 'posts'),
      where('type','==','video'),
      orderBy('createdAt','desc'),
      limit(24)
    );
    const snap = await getDocs(qBase);
    let items = snap.docs.map(d=>({id:d.id, ...d.data()}));
    if (VIDEOS_TEXT) {
      items = items.filter(i => (i.title||'').toLowerCase().includes(VIDEOS_TEXT));
    }
    videosFeed.innerHTML = '';
    items.forEach(p=>{
      const node = window.renderVideoCard({
        title: p.title, thumbnailUrl: p.thumbnailUrl, mediaUrl: p.mediaUrl,
        creatorName: '', views: 0
      });
      videosFeed.appendChild(node);
    });
    if (!items.length) videosFeed.innerHTML = `<div class="muted">No videos yet.</div>`;
  }catch(err){
    console.error(err);
    videosFeed.innerHTML = `<div class="muted">Could not load videos.</div>`;
  }
}

// -------------------- Podcasts Tab (most recent + mini-player) --------------------
const podcastFeed = qs('#podcast-feed');
const podcastSearch = qs('#podcastSearch');
let POD_TEXT = "";

podcastSearch?.addEventListener('input', debounce(()=>{
  POD_TEXT = podcastSearch.value.trim().toLowerCase();
  renderPodcasts();
}, 250));

async function renderPodcasts(){
  if(!podcastFeed) return;
  podcastFeed.innerHTML = `<div class="muted">Loading…</div>`;
  try{
    const qBase = query(
      collection(db, 'posts'),
      where('type','==','podcast'),
      orderBy('createdAt','desc'),
      limit(24)
    );
    const snap = await getDocs(qBase);
    let items = snap.docs.map(d=>({id:d.id, ...d.data()}));
    if (POD_TEXT) {
      items = items.filter(i => (i.title||'').toLowerCase().includes(POD_TEXT));
    }
    podcastFeed.innerHTML = '';
    items.forEach(p=>{
      const node = window.renderPodcastRow({
        title: p.title,
        mediaUrl: p.mediaUrl,
        coverUrl: p.thumbnailUrl,
        showName: p.subtype === 'audio' ? 'Audio Podcast' : 'Video Podcast',
        creatorName: ''
      });
      podcastFeed.appendChild(node);
    });
    if (!items.length) podcastFeed.innerHTML = `<div class="muted">No podcasts yet.</div>`;
  }catch(err){
    console.error(err);
    podcastFeed.innerHTML = `<div class="muted">Could not load podcasts.</div>`;
  }
}

// -------------------- Clips Tab (auto-play; infinite feed skeleton) --------------------
const clipsFeed = qs('#clips-feed');
const clipsSearch = qs('#clipsSearch');
let CLIPS_TEXT = "";
let clipsCursor = null;
let clipsLoading = false;

clipsSearch?.addEventListener('input', debounce(()=>{
  CLIPS_TEXT = clipsSearch.value.trim().toLowerCase();
  // simple re-render (no infinite paging for search yet)
  renderClips(true);
}, 250));

async function renderClips(reset=false){
  if(!clipsFeed) return;
  if (reset){ clipsFeed.innerHTML = ''; clipsCursor = null; }
  if (clipsLoading) return;
  clipsLoading = true;

  try{
    let qBase = query(
      collection(db, 'posts'),
      where('type','==','clip'),
      orderBy('createdAt','desc'),
      limit(10)
    );
    if (clipsCursor) {
      qBase = query(
        collection(db, 'posts'),
        where('type','==','clip'),
        orderBy('createdAt','desc'),
        startAfter(clipsCursor),
        limit(10)
      );
    }
    const snap = await getDocs(qBase);
    const docs = snap.docs;
    if (!docs.length && !clipsFeed.childElementCount){
      clipsFeed.innerHTML = `<div class="muted">No clips yet.</div>`;
      clipsLoading = false; return;
    }
    docs.forEach(d=>{
      const p = { id:d.id, ...d.data() };
      if (CLIPS_TEXT && !(p.title||'').toLowerCase().includes(CLIPS_TEXT)) return;
      const node = window.renderClipFullScreen({
        title: p.title, mediaUrl: p.mediaUrl,
        likeCount: p.likes||0, commentCount: 0, creatorHandle: 'user'
      });
      clipsFeed.appendChild(node);
    });
    clipsCursor = docs[docs.length-1];
  }catch(err){
    console.error(err);
  }
  clipsLoading = false;
}
// Infinite scroll sentinel (very lightweight)
window.addEventListener('scroll', ()=>{
  if (!clipsFeed || location.hash.slice(1) !== 'clips') return;
  const nearBottom = (window.innerHeight + window.scrollY) >= (document.body.offsetHeight - 600);
  if (nearBottom) renderClips(false);
});

// -------------------- Profile Tab --------------------
const profileGrid = qs('#profile-grid');
const profileEmpty = qs('#profile-empty');
const btnEditProfile = qs('#btn-edit-profile');
const bioView = qs('#bio-view');
const bioEditWrap = qs('#bio-edit-wrap');
const profileNameEl = qs('#profile-name');
const profilePhoto = qs('#profile-photo');
const btnAddAvatar = qs('#btnAddAvatar');
const profilePhotoInput = qs('#profilePhotoInput');
const profileBannerInput = qs('#profileBannerInput');

btnEditProfile?.addEventListener('click', ()=>{
  bioEditWrap.style.display = '';
  bioView.style.display = 'none';
  qs('#profileNameInput').value = profileNameEl.textContent || '';
  qs('#profileBioInput').value = bioView.textContent === 'Add a short bio to introduce yourself.' ? '' : bioView.textContent;
});
qs('#bio-cancel')?.addEventListener('click', ()=>{
  bioEditWrap.style.display = 'none';
  bioView.style.display = '';
});

// Save profile (name, bio, optional photo/banner)
qs('#btnSaveProfile')?.addEventListener('click', async ()=>{
  if(!auth.currentUser){ alert('Sign in to edit profile.'); return; }
  try{
    const name = qs('#profileNameInput').value.trim().slice(0,80);
    const bio  = qs('#profileBioInput').value.trim().slice(0,300);
    const uid  = auth.currentUser.uid;

    // upload photo if provided
    const photoFile = profilePhotoInput?.files?.[0] || null;
    let photoURL = '';
    if (photoFile){
      photoURL = await uploadAndGetURL(`profile/${uid}/photo_${Date.now()}_${photoFile.name}`, photoFile);
      await updateProfile(auth.currentUser, { displayName: name || auth.currentUser.displayName || '' });
    }

    const bannerFile = profileBannerInput?.files?.[0] || null;
    let bannerURL = '';
    if (bannerFile){
      bannerURL = await uploadAndGetURL(`profile/${uid}/banner_${Date.now()}_${bannerFile.name}`, bannerFile);
    }

    await setDoc(doc(db,'profiles',uid), {
      displayName: name,
      bio,
      ...(photoURL? { photoURL } : {}),
      ...(bannerURL? { bannerURL } : {})
    }, { merge:true });

    // Update UI
    if (name) profileNameEl.textContent = name;
    bioView.textContent = bio || 'Add a short bio to introduce yourself.';
    if (photoURL) profilePhoto.src = photoURL;

    bioEditWrap.style.display = 'none';
    bioView.style.display = '';
    alert('Profile updated.');
  }catch(err){
    console.error(err);
    alert('Could not save profile: ' + err.message);
  }
});

// Avatar “＋” → open file input
btnAddAvatar?.addEventListener('click', ()=>{
  if(!auth.currentUser){ alert('Sign in first.'); return; }
  qs('#avatarInput')?.click();
});
qs('#avatarInput')?.addEventListener('change', async (e)=>{
  const f = e.target.files?.[0];
  if(!f){ return; }
  if(!auth.currentUser){ alert('Sign in first.'); return; }
  try{
    const url = await uploadAndGetURL(`profile/${auth.currentUser.uid}/avatar_${Date.now()}_${f.name}`, f);
    await setDoc(doc(db,'profiles',auth.currentUser.uid), { photoURL:url }, { merge:true });
    profilePhoto.src = url;
  }catch(err){
    alert('Avatar upload failed: ' + err.message);
  }
});

// Load profile basics & user grid
async function renderProfile(){
  if (!profileGrid) return;
  profileGrid.innerHTML = `<div class="muted">Loading…</div>`;
  profileEmpty.style.display = 'none';

  const user = auth.currentUser;
  if (!user){
    profileGrid.innerHTML = `<div class="muted">Sign in to view your profile and manage uploads.</div>`;
    return;
  }
  // Load profile doc
  const profSnap = await getDoc(doc(db,'profiles', user.uid));
  const data = profSnap.exists() ? profSnap.data() : {};
  profileNameEl.textContent = data.displayName || user.displayName || 'Your Name';
  bioView.textContent = data.bio || 'Add a short bio to introduce yourself.';
  profilePhoto.src = data.photoURL || '';

  // Load posts by user
  const qBase = query(
    collection(db,'posts'),
    where('uid','==',user.uid),
    orderBy('createdAt','desc'),
    limit(50)
  );
  const snap = await getDocs(qBase);
  const items = snap.docs.map(d=>({id:d.id, ...d.data()}));

  profileGrid.innerHTML = '';
  items.forEach(p=>{
    // reuse video card for grid
    const node = window.renderVideoCard({
      title: p.title, thumbnailUrl: p.thumbnailUrl, mediaUrl: p.mediaUrl,
      creatorName: '', views: 0
    });
    profileGrid.appendChild(node);
  });
  qs('#stat-posts').textContent = String(items.length);

  if (!items.length){
    profileEmpty.style.display = '';
    profileGrid.innerHTML = '';
  }
}

// -------------------- Render on Route Change --------------------
function currentTab(){
  const k = (location.hash || '#home').slice(1);
  return k;
}
async function renderCurrentTab(){
  switch(currentTab()){
    case 'home':    await renderHome(); break;
    case 'videos':  await renderVideos(); break;
    case 'podcast': await renderPodcasts(); break;
    case 'clips':   await renderClips(true); break;
    case 'profile': await renderProfile(); break;
    case 'settings': /* nothing dynamic needed */ break;
    case 'guidelines':
    case 'terms':
    case 'privacy':
      // content already mounted
      break;
    default:
      await renderHome();
  }
}
window.addEventListener('hashchange', renderCurrentTab);
window.addEventListener('load', renderCurrentTab);
// (new MINI-PLAYER code block here)
// -------------------- MINI-PLAYER FIX --------------------
(function initMiniPlayer(){
  const wrap  = qs('#mini-player');
  const art   = qs('#mp-art');
  const tEl   = qs('#mp-title');
  const sEl   = qs('#mp-sub');
  const cur   = qs('#mp-cur');
  const dur   = qs('#mp-dur');
  const audio = qs('#mp-audio');
  const btnP  = qs('#mp-play');
  const btnX  = qs('#mp-close');

  let rafId = null;
  const fmt = s => !isFinite(s) ? '0:00' : `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;

  const tick = () => {
    cur.textContent = fmt(audio.currentTime);
    dur.textContent = fmt(audio.duration || 0);
    if (!audio.paused) rafId = requestAnimationFrame(tick);
  };

  function hideMiniPlayer() {
    try { audio.pause(); } catch {}
    audio.removeAttribute('src'); audio.load();
    cancelAnimationFrame(rafId);
    wrap.style.display = 'none';
  }

  btnP.addEventListener('click', ()=> audio.paused ? audio.play() : audio.pause());
  btnX.addEventListener('click', hideMiniPlayer);
  audio.addEventListener('ended', hideMiniPlayer);
  audio.addEventListener('play', ()=>{
    wrap.style.display = 'flex';
    btnP.innerHTML = '<i class="fa fa-pause"></i>';
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
  });
  audio.addEventListener('pause', ()=>{
    btnP.innerHTML = '<i class="fa fa-play"></i>';
    cancelAnimationFrame(rafId);
  });

  window.playMedia = ({ url, title, subtitle, cover })=>{
    qsa('video').forEach(v=>{ try{v.pause();}catch{} });
    tEl.textContent = title || 'Untitled';
    sEl.textContent = subtitle || '';
    art.style.backgroundImage = cover ? `url(${cover})` : 'none';
    audio.src = url || '';
    wrap.style.display = 'flex';
    audio.play().catch(()=>{});
  };
})();

// -------------------- Utilities --------------------
function debounce(fn, ms){ let t; return (...a)=>{ clearTimeout(t); t = setTimeout(()=>fn(...a), ms); }; }

// That’s it. Ship it. 🚀
