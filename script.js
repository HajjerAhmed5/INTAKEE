// ============================================================================
// INTAKEE — Main Logic (Auth, Uploads, Feeds, Profile, Settings)
// Works with Firebase initialized in index.html  (window.firebaseRefs)
// ============================================================================

'use strict';

// ---------- Firebase Refs from index.html ----------
const { app, auth, db, storage, onAuthStateChanged } = window.firebaseRefs || {};
if (!app || !auth || !db || !storage) {
  console.error("❌ Firebase not ready. Check init block in index.html");
}

// ---------- Tiny DOM helpers ----------
const qs  = (s, sc=document) => sc.querySelector(s);
const qsa = (s, sc=document) => Array.from(sc.querySelectorAll(s));
const $on = (el, ev, fn) => el && el.addEventListener(ev, fn);
const sleep = (ms) => new Promise(r=>setTimeout(r,ms));

// ---------- Elements ----------
const dlgAuth = qs('#authDialog');
const signUpForm = qs('#authSignUpForm');
const signInForm = qs('#authSignInForm');
const logoutBtn  = qs('#settings-logout');

// Upload
const upType  = qs('#uploadTypeSelect');
const upTitle = qs('#uploadTitleInput');
const upDesc  = qs('#uploadDescInput');
const upThumb = qs('#uploadThumbInput');
const upFile  = qs('#uploadFileInput');
const btnUpload = qs('#btnUpload');

// Feeds
const homeFeed   = qs('#home-feed');
const videosFeed = qs('#videos-feed');
const podcastFeed= qs('#podcast-feed');
const clipsFeed  = qs('#clips-feed');

const searchGlobal  = qs('#globalSearch');
const searchVideos  = qs('#videosSearch');
const searchPodcast = qs('#podcastSearch');
const searchClips   = qs('#clipsSearch');

const homePills = qsa('#tab-home .pills .pill');

// ---------- STATE ----------
let _postsCache = [];
let _isLoadingFeed = false;

// ============================================================================
// AUTHENTICATION
// ============================================================================

$on(signUpForm, 'submit', async (e)=>{
  e.preventDefault();
  const displayName = qs('#signUpName').value.trim();
  const email = qs('#signUpEmail').value.trim();
  const pass  = qs('#signUpPassword').value.trim();
  const ageOK = qs('#signUpAge').checked;
  if(!ageOK) return alert("You must confirm you are 13 or older.");
  if(!email || !pass) return alert("Enter email and password.");

  try {
    const { createUserWithEmailAndPassword, updateProfile } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js");
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (displayName) await updateProfile(cred.user, { displayName });

    const { doc, setDoc, serverTimestamp } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");
    await setDoc(doc(db,'users',cred.user.uid),{
      name: displayName || '',
      bio: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },{merge:true});

    dlgAuth.close();
    alert('✅ Account created successfully!');
  } catch(err){
    console.error(err);
    alert(err.message);
  }
});

$on(signInForm, 'submit', async (e)=>{
  e.preventDefault();
  const email = qs('#signInEmail').value.trim();
  const pass  = qs('#signInPassword').value.trim();
  if(!email || !pass) return alert("Enter both fields.");
  try{
    const { signInWithEmailAndPassword } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js");
    await signInWithEmailAndPassword(auth,email,pass);
    dlgAuth.close();
    alert('✅ Signed in!');
  }catch(err){
    console.error(err);
    alert(err.message);
  }
});

$on(logoutBtn,'click', async ()=>{
  try{
    const { signOut } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js");
    await signOut(auth);
    alert('Logged out.');
  }catch(e){
    alert('Logout failed: '+e.message);
  }
});

// Reflect auth in header + feeds
onAuthStateChanged(auth, async (user)=>{
  console.log('Auth state:', user ? user.email : '(none)');
  document.dispatchEvent(new CustomEvent('intakee:auth',{detail:{user}}));
  if(user) await loadHomeFeed();
  else clearFeedsForGuests();
});

// ============================================================================
// UPLOAD SYSTEM
// ============================================================================

$on(btnUpload, 'click', async ()=>{
  const user = auth.currentUser;
  if(!user) return alert('Please sign in first.');

  const type  = upType.value;
  const title = upTitle.value.trim();
  const desc  = upDesc.value.trim();
  const file  = upFile.files?.[0];
  const thumb = upThumb.files?.[0];

  if(!file)  return alert('Choose a file.');
  if(!title) return alert('Enter a title.');

  btnUpload.disabled=true;
  btnUpload.textContent='Uploading...';

  try{
    const { ref, uploadBytesResumable, uploadBytes, getDownloadURL } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js");
    const { collection, addDoc, serverTimestamp } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

    const mediaRef = ref(storage,`uploads/${user.uid}/${Date.now()}_${file.name}`);
    const task = uploadBytesResumable(mediaRef,file);
    task.on('state_changed', snap=>{
      const pct = Math.round((snap.bytesTransferred/snap.totalBytes)*100);
      btnUpload.textContent=`Uploading... ${pct}%`;
    });

    await task;
    const mediaUrl = await getDownloadURL(mediaRef);
    let thumbnailUrl='';
    if(thumb){
      const tRef = ref(storage,`thumbnails/${user.uid}/${Date.now()}_${thumb.name}`);
      await uploadBytes(tRef,thumb);
      thumbnailUrl = await getDownloadURL(tRef);
    }

    await addDoc(collection(db,'posts'),{
      uid:user.uid, type, title, desc, mediaUrl, thumbnailUrl,
      views:0, likeCount:0, commentCount:0,
      createdAt: serverTimestamp()
    });

    alert('✅ Upload complete!');
    upTitle.value=''; upDesc.value=''; upFile.value=''; upThumb.value='';
    await loadHomeFeed();
  }catch(e){
    console.error(e);
    alert('Upload failed: '+e.message);
  }finally{
    btnUpload.disabled=false;
    btnUpload.textContent='Upload';
  }
});

// ============================================================================
// FEEDS (Home, Videos, Podcasts, Clips)
// ============================================================================

async function fetchPosts(){
  const { collection, getDocs, query, orderBy, limit } =
    await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");
  const qRef = query(collection(db,'posts'), orderBy('createdAt','desc'), limit(50));
  const snap = await getDocs(qRef);
  return snap.docs.map(d=>({id:d.id,...d.data()}));
}

function clearFeedsForGuests(){
  const msg='<div class="muted">Sign in to like or upload — browsing is open to everyone.</div>';
  homeFeed.innerHTML = msg;
  videosFeed.innerHTML = msg;
  podcastFeed.innerHTML = msg;
  clipsFeed.innerHTML = msg;
}

async function loadHomeFeed(){
  if(_isLoadingFeed) return;
  _isLoadingFeed=true;
  try{
    _postsCache = await fetchPosts();
  }catch(e){
    console.warn(e);
    _postsCache=[];
  }finally{_isLoadingFeed=false;}
  renderAllFeeds();
}

function renderAllFeeds(){
  renderFeed(homeFeed, _postsCache);
  renderFeed(videosFeed, _postsCache.filter(p=>p.type==='video'));
  renderFeed(podcastFeed, _postsCache.filter(p=>p.type?.startsWith('podcast')));
  renderFeed(clipsFeed, _postsCache.filter(p=>p.type==='clip'));
}

function renderFeed(container,list){
  container.innerHTML='';
  if(!list.length){
    container.innerHTML='<div class="muted">No posts yet.</div>';
    return;
  }
  list.forEach(p=>{
    let el;
    if(p.type==='video') el = window.renderVideoCard?.(p);
    else if(p.type==='clip') el = window.renderClipFullScreen?.(p);
    else if(p.type?.startsWith('podcast')) el = window.renderPodcastRow?.(p);
    if(el) container.appendChild(el);
  });
}

// Search
function doSearch(term){
  const t = term.trim().toLowerCase();
  if(!t) return renderAllFeeds();
  const list = _postsCache.filter(p=>
    (p.title||'').toLowerCase().includes(t) ||
    (p.desc||'').toLowerCase().includes(t)
  );
  renderFeed(homeFeed,list);
}

$on(searchGlobal,'input', e=>doSearch(e.target.value));
$on(searchVideos,'input', e=>{
  const t=e.target.value.toLowerCase();
  renderFeed(videosFeed,_postsCache.filter(p=>p.type==='video'&&(p.title||'').toLowerCase().includes(t)));
});
$on(searchPodcast,'input', e=>{
  const t=e.target.value.toLowerCase();
  renderFeed(podcastFeed,_postsCache.filter(p=>p.type?.startsWith('podcast')&&(p.title||'').toLowerCase().includes(t)));
});
$on(searchClips,'input', e=>{
  const t=e.target.value.toLowerCase();
  renderFeed(clipsFeed,_postsCache.filter(p=>p.type==='clip'&&(p.title||'').toLowerCase().includes(t)));
});
// ============================================================================
// PROFILE MANAGEMENT
// ============================================================================

const profileName     = qs('#profile-name');
const profileHandle   = qs('#profile-handle');
const profilePhotoImg = qs('#profile-photo');
const profileBanner   = qs('#profileBanner');
const bioView         = qs('#bio-view');
const bioEditWrap     = qs('#bio-edit-wrap');
const nameInput       = qs('#profileNameInput');
const bioInput        = qs('#profileBioInput');
const photoInput      = qs('#profilePhotoInput');
const bannerInput     = qs('#profileBannerInput');
const btnEditProfile  = qs('#btn-edit-profile');
const btnSaveProfile  = qs('#btnSaveProfile');
const btnCancelEdit   = qs('#bio-cancel');
const statPosts       = qs('#stat-posts');
const statFollowers   = qs('#stat-followers');
const statFollowing   = qs('#stat-following');
const statLikes       = qs('#stat-likes');
const profileGrid     = qs('#profile-grid');
const profileEmpty    = qs('#profile-empty');

function applyOwnerVisibility(user) {
  const isOwner = !!user;
  qsa('.owner-only').forEach(el => el.style.display = isOwner ? '' : 'none');
}

$on(btnEditProfile, 'click', () => {
  if (!auth.currentUser) return alert('Sign in to edit profile.');
  bioEditWrap.style.display = '';
});

$on(btnCancelEdit, 'click', () => {
  bioEditWrap.style.display = 'none';
});

$on(btnSaveProfile, 'click', async () => {
  const user = auth.currentUser;
  if (!user) return alert('Sign in first.');

  const name = nameInput.value.trim();
  const bio  = bioInput.value.trim();

  try {
    const { ref, uploadBytes, getDownloadURL } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js");
    const { doc, setDoc, serverTimestamp } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");
    const { updateProfile } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js");

    if (photoInput.files?.[0]) {
      const r = ref(storage, `avatars/${user.uid}.jpg`);
      await uploadBytes(r, photoInput.files[0]);
      const url = await getDownloadURL(r);
      await updateProfile(user, { photoURL: url });
      profilePhotoImg.src = url;
    }

    if (bannerInput.files?.[0]) {
      const r = ref(storage, `banners/${user.uid}.jpg`);
      await uploadBytes(r, bannerInput.files[0]);
      const url = await getDownloadURL(r);
      profileBanner.style.backgroundImage = `url(${url})`;
    }

    if (name) {
      await updateProfile(user, { displayName: name });
      profileName.textContent = name;
    }

    await setDoc(doc(db, 'users', user.uid), {
      name: name || user.displayName || '',
      bio,
      updatedAt: serverTimestamp()
    }, { merge: true });

    bioView.textContent = bio || 'Add a short bio to introduce yourself.';
    bioEditWrap.style.display = 'none';
    alert('Profile updated!');
  } catch (e) {
    alert('Update failed: ' + e.message);
  }
});

// Load profile and user posts
async function loadProfilePane(user) {
  if (!user) {
    profileName.textContent = 'Your Name';
    profileHandle.textContent = '@username';
    profilePhotoImg.removeAttribute('src');
    bioView.textContent = 'Add a short bio to introduce yourself.';
    profileBanner.style.backgroundImage = 'none';
    profileGrid.innerHTML = '';
    profileEmpty.style.display = '';
    statPosts.textContent = '0';
    statFollowers.textContent = '0';
    statFollowing.textContent = '0';
    statLikes.textContent = '0';
    return;
  }

  try {
    const { doc, getDoc } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");
    const uDoc = await getDoc(doc(db, 'users', user.uid));
    const u = uDoc.exists() ? uDoc.data() : {};
    profileName.textContent = user.displayName || u.name || 'Your Name';
    profileHandle.textContent = '@' + (user.email?.split('@')[0] || 'username');
    bioView.textContent = (u.bio || '').trim() || 'Add a short bio to introduce yourself.';
    if (user.photoURL) profilePhotoImg.src = user.photoURL;
  } catch {}

  await loadProfileGrid(user.uid);
}

async function loadProfileGrid(uid) {
  const { collection, getDocs, query, where, orderBy } =
    await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");
  const snap = await getDocs(query(collection(db,'posts'),
    where('uid','==',uid), orderBy('createdAt','desc')));
  const items = snap.docs.map(d=>({ id:d.id, ...d.data() }));

  profileGrid.innerHTML = '';
  if (!items.length) {
    profileEmpty.style.display = '';
  } else {
    profileEmpty.style.display = 'none';
    items.forEach(p => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="thumb-16x9">
          <img src="${p.thumbnailUrl || ''}" alt="">
          <video src="${p.mediaUrl || ''}" preload="metadata" muted playsinline></video>
        </div>
        <div class="meta">
          <h4>${p.title || 'Untitled'}</h4>
          <button class="danger delete-post" data-id="${p.id}">Delete</button>
        </div>`;
      profileGrid.appendChild(card);
    });
  }
  statPosts.textContent = items.length;
}

// Delete post (owner only)
$on(profileGrid, 'click', async (e)=>{
  const btn = e.target.closest('.delete-post');
  if(!btn) return;
  const id = btn.dataset.id;
  if(!confirm('Delete this post permanently?')) return;
  try{
    const { doc, deleteDoc } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");
    await deleteDoc(doc(db,'posts',id));
    btn.closest('.card').remove();
    alert('Post deleted.');
  }catch(err){ alert('Delete failed: '+err.message); }
});

// ============================================================================
// SETTINGS TOGGLES (Privacy, Uploads, Likes, etc.)
// ============================================================================

qsa('.settings-item .toggle').forEach(tog=>{
  $on(tog,'click',()=>{
    const on = tog.dataset.on === 'true';
    tog.dataset.on = (!on).toString();
    tog.classList.toggle('active',!on);
  });
});

// Account actions
qsa('.settings-item button.ghost').forEach(btn=>{
  $on(btn,'click',()=>{
    if(btn.textContent.includes('Delete')){
      if(confirm('Delete your account permanently?')) alert('Feature coming soon.');
    }else if(btn.textContent.includes('Password')){
      alert('Password change feature coming soon.');
    }else if(btn.textContent.includes('Edit')){
      alert('Edit name/email feature coming soon.');
    }
  });
});
// ============================================================================
// MINI-PLAYER FIX + GLOBAL BEHAVIOR
// ============================================================================

(function initMiniPlayerFix(){
  const wrap = qs('#mini-player');
  const audio = qs('#mp-audio');
  const closeBtn = qs('#mp-close');

  if(!wrap || !audio || !closeBtn) return;

  // When user clicks X → stop and hide
  $on(closeBtn,'click',()=>{
    try{ audio.pause(); }catch{}
    wrap.hidden = true;
  });

  // Pause mini-player whenever navigating away
  window.addEventListener('hashchange',()=>{
    try{ audio.pause(); }catch{}
  });
})();

// ============================================================================
// AUTH-DEPENDENT UI REFRESH
// ============================================================================

document.addEventListener('intakee:auth',(e)=>{
  const user = e.detail?.user;
  const openBtn = qs('#openAuth');
  if(openBtn) openBtn.style.display = user ? 'none' : '';
  applyOwnerVisibility(user);
  if(user) loadProfilePane(user);
});

// ============================================================================
// ROUTER (tab switching safety net)
// ============================================================================

(function ensureRouterIsStable(){
  const links = qsa('.bottom-nav a');
  const sections = {
    home:       qs('#tab-home'),
    videos:     qs('#tab-videos'),
    podcast:    qs('#tab-podcast'),
    upload:     qs('#tab-upload'),
    clips:      qs('#tab-clips'),
    profile:    qs('#tab-profile'),
    settings:   qs('#tab-settings'),
    guidelines: qs('#tab-guidelines'),
    terms:      qs('#tab-terms'),
    privacy:    qs('#tab-privacy')
  };
  const searchWrap = qs('#searchWrap');

  function setTab(key){
    Object.entries(sections).forEach(([k,el])=>{
      if(!el) return;
      el.style.display = (k===key)?'':'none';
    });
    links.forEach(a=>a.classList.toggle('active',a.dataset.tab===key));
    if(searchWrap) searchWrap.style.display = (key==='home')?'flex':'none';
    window.scrollTo({top:0,behavior:'instant'});
  }

  function applyHash(){
    const key=(location.hash||'#home').slice(1);
    setTab(sections[key]?key:'home');
  }

  links.forEach(a=>$on(a,'click',e=>{
    e.preventDefault();
    location.hash=a.getAttribute('href');
  }));
  window.addEventListener('hashchange',applyHash);
  applyHash();
})();

// ============================================================================
// STARTUP / SAFE-BOOT
// ============================================================================

(async function bootApp(){
  console.log('🚀 Booting INTAKEE...');
  try{
    if(auth.currentUser){
      await Promise.all([loadHomeFeed(), loadProfilePane(auth.currentUser)]);
    } else {
      clearFeedsForGuests();
    }
    console.log('✅ App boot complete');
  }catch(e){
    console.error('Boot failed:',e);
  }
})();
