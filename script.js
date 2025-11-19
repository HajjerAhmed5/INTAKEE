// =======================================================
// INTAKEE — AUTHENTICATION + USERNAME + PASSWORD RESET
// Project: intakee-5785e
// =======================================================
'use strict';

// ---------- Firebase Imports ----------
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

// ---------- Firebase App Refs (from index.html) ----------
const { app, auth, db, storage } = window.firebaseRefs || {};
if (!app || !auth || !db) {
  console.error("❌ Firebase not initialized properly. Check index.html config.");
}

// ---------- UI Shortcuts ----------
const qs  = (s, sc = document) => sc.querySelector(s);
const qsa = (s, sc = document) => Array.from(sc.querySelectorAll(s));
const $on = (el, ev, fn) => el && el.addEventListener(ev, fn);

// ---------- Elements ----------
const dlgAuth   = qs('#authDialog');
const signupBtn = qs('#signupBtn');
const loginBtn  = qs('#loginBtn');
const logoutBtn = qs('#settings-logout');
const forgotBtn = qs('#forgotBtn');  // (to be added in HTML later)

// =======================================================
// SIGN UP — with Unique Username and Age Check
// =======================================================
$on(signupBtn, 'click', async () => {
  const email    = qs('#signupEmail').value.trim();
  const password = qs('#signupPassword').value.trim();
  const ageOK    = qs('#signupAgeConfirm').checked;
  const username = prompt("Choose a unique username (no spaces):")?.trim().toLowerCase();

  if (!ageOK) return alert("⚠️ You must confirm you are 13 or older.");
  if (!email || !password || !username) return alert("Please fill all fields.");

  try {
    // Check if username already exists
    const unameRef = query(collection(db, "users"), where("username", "==", username));
    const existing = await getDocs(unameRef);
    if (!existing.empty) return alert("❌ Username already taken. Please try another.");

    // Create account
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    // Save in Firestore
    await setDoc(doc(db, "users", cred.user.uid), {
      email,
      username,
      createdAt: serverTimestamp(),
      private: false,
      showUploads: true,
      showSaved: true,
      followers: [],
      following: [],
      blocked: [],
      bio: "",
      name: username
    });

    // Update profile
    await updateProfile(cred.user, { displayName: username });

    alert(`✅ Account created! Welcome @${username}`);
    dlgAuth.close();

  } catch (err) {
    console.error(err);
    alert("❌ " + err.message);
  }
});

// =======================================================
// LOGIN
// =======================================================
$on(loginBtn, 'click', async () => {
  const email = qs('#loginEmail').value.trim();
  const pass  = qs('#loginPassword').value.trim();
  if (!email || !pass) return alert("Please enter both email and password.");

  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    alert(`✅ Welcome back, ${cred.user.displayName || cred.user.email}!`);
    dlgAuth.close();
  } catch (err) {
    console.error(err);
    alert("❌ " + err.message);
  }
});

// =======================================================
// FORGOT PASSWORD / USERNAME — via Email Verification Code
// =======================================================
$on(forgotBtn, 'click', async () => {
  const email = prompt("Enter your registered email address:");
  if (!email) return;

  try {
    // Send Firebase reset email
    await sendPasswordResetEmail(auth, email);
    alert("📩 A password reset link has been sent to your email.");
  } catch (err) {
    console.error(err);
    alert("❌ " + err.message);
  }
});

// =======================================================
// LOGOUT
// =======================================================
$on(logoutBtn, 'click', async () => {
  try {
    await signOut(auth);
    alert("👋 You’ve been logged out.");
  } catch (err) {
    alert("❌ Logout failed: " + err.message);
  }
});

// =======================================================
// AUTH STATE MONITOR
// =======================================================
onAuthStateChanged(auth, (user) => {
  console.log("👤 Auth state:", user ? user.email : "(signed out)");
  document.dispatchEvent(new CustomEvent('intakee:auth', { detail: { user } }));

  const openAuthBtn = qs('#openAuth');
  if (openAuthBtn) openAuthBtn.style.display = user ? 'none' : 'block';
});
// =======================================================
// INTAKEE — UPLOADS + FEED + LIKES / DISLIKES / COMMENTS
// =======================================================

// ---------- Shortcuts ----------
const upType    = qs('#uploadTypeSelect');
const upTitle   = qs('#uploadTitleInput');
const upDesc    = qs('#uploadDescInput');
const upThumb   = qs('#uploadThumbInput');
const upFile    = qs('#uploadFileInput');
const btnUpload = qs('#btnUpload');
const goLiveBtn = qs('#goLiveBtn');

// ---------- Reset Upload Form ----------
function resetUploadForm() {
  upTitle.value = '';
  upDesc.value = '';
  upThumb.value = '';
  upFile.value = '';
  upType.value = 'video';
  btnUpload.textContent = 'Upload';
  btnUpload.disabled = false;
}

// =======================================================
// UPLOAD HANDLER
// =======================================================
$on(btnUpload, 'click', async () => {
  const user = auth.currentUser;
  if (!user) return alert('Please log in to upload.');

  const type  = upType.value;
  const title = upTitle.value.trim();
  const desc  = upDesc.value.trim();
  const file  = upFile.files[0];
  const thumb = upThumb.files[0];
  if (!file || !title) return alert('Please select a file and title.');

  btnUpload.disabled = true;
  btnUpload.textContent = 'Uploading... 0%';

  try {
    const { ref, uploadBytesResumable, getDownloadURL, uploadBytes } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js");
    const { addDoc, collection, serverTimestamp } =
      await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");

    const ext = file.name.split('.').pop();
    const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filePath = `uploads/${user.uid}/${Date.now()}_${safeTitle}.${ext}`;
    const storageRef = ref(storage, filePath);
    const task = uploadBytesResumable(storageRef, file);

    task.on('state_changed', s => {
      const pct = Math.round((s.bytesTransferred / s.totalBytes) * 100);
      btnUpload.textContent = `Uploading... ${pct}%`;
    });

    await task;
    const fileUrl = await getDownloadURL(storageRef);

    let thumbUrl = '';
    if (thumb) {
      const thumbPath = `thumbnails/${user.uid}/${Date.now()}_${thumb.name}`;
      const tRef = ref(storage, thumbPath);
      await uploadBytes(tRef, thumb);
      thumbUrl = await getDownloadURL(tRef);
    }

    await addDoc(collection(db, 'posts'), {
      uid: user.uid,
      type,
      title,
      desc,
      mediaUrl: fileUrl,
      thumbnailUrl: thumbUrl,
      createdAt: serverTimestamp(),
      private: false,
      likeCount: 0,
      viewCount: 0,
      commentCount: 0
    });

    alert('✅ Upload complete!');
    resetUploadForm();
    document.dispatchEvent(new CustomEvent('intakee:feedRefresh'));
  } catch (err) {
    console.error(err);
    alert('❌ Upload failed: ' + err.message);
  } finally {
    btnUpload.disabled = false;
    btnUpload.textContent = 'Upload';
  }
});

// ---------- “Go Live” Placeholder ----------
$on(goLiveBtn, 'click', () => alert('🎥 Live streaming — coming soon!'));

// =======================================================
// FEED LOADING
// =======================================================
const homeFeed    = qs('#home-feed');
const videosFeed  = qs('#videos-feed');
const podcastFeed = qs('#podcast-feed');
const clipsFeed   = qs('#clips-feed');
const searchGlobal = qs('#globalSearch');
let _allPosts = [];

async function fetchAllPosts() {
  const { collection, getDocs, orderBy, query, limit } =
    await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");
  const qRef = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(200));
  const snap = await getDocs(qRef);
  _allPosts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function renderFeed(container, list, type='all') {
  container.innerHTML = '';
  if (!list?.length) {
    container.innerHTML = '<div class="muted">No posts yet.</div>';
    return;
  }

  list.forEach(post => {
    if (type!=='all' && post.type!==type) return;
    const card = document.createElement('div');
    card.className = 'feed-card';
    const thumb = post.thumbnailUrl || '/placeholder.png';
    const icon  = post.type==='video' ? 'fa-video' : post.type==='clip' ? 'fa-bolt' : 'fa-podcast';
    card.innerHTML = `
      <div class="thumb"><img src="${thumb}" alt="">
        <button class="play-btn" data-url="${post.mediaUrl}" data-type="${post.type}">
          <i class="fa ${icon}"></i>
        </button>
      </div>
      <div class="feed-meta">
        <h4>${post.title}</h4>
        <p>${post.desc||''}</p>
        <span class="muted small">${post.type.toUpperCase()}</span>
        <div class="small muted">❤️ ${post.likeCount||0} • 💬 ${post.commentCount||0}</div>
      </div>
    `;
    const playBtn = card.querySelector('.play-btn');
    playBtn.addEventListener('click',()=> {
      if (post.type.startsWith('podcast')) playPodcast(post.mediaUrl, post.title);
      else window.open(post.mediaUrl,'_blank');
    });

    attachLikeButtons(card, post.id, post.type);
    if (post.type!=='clip') attachCommentInput(card, post.id);
    container.appendChild(card);
  });
}

async function loadFeeds() {
  await fetchAllPosts();
  renderFeed(homeFeed, _allPosts);
  renderFeed(videosFeed, _allPosts.filter(p=>p.type==='video'));
  renderFeed(podcastFeed, _allPosts.filter(p=>p.type.startsWith('podcast')));
  renderFeed(clipsFeed, _allPosts.filter(p=>p.type==='clip'));
}
document.addEventListener('intakee:feedRefresh', loadFeeds);

// =======================================================
// LIKES / DISLIKES (always visible on videos/podcasts)
// =======================================================
async function toggleLike(postId,isLike=true){
  const user = auth.currentUser;
  if(!user) return alert('Sign in to react.');
  const { doc, updateDoc, increment } =
    await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");
  const postRef = doc(db,'posts',postId);
  await updateDoc(postRef,{likeCount:increment(isLike?1:-1)});
  document.dispatchEvent(new CustomEvent('intakee:feedRefresh'));
}

function attachLikeButtons(card,postId,type){
  if(type==='clip') return; // no likes for clips
  const likeBtn=document.createElement('button');
  const dislikeBtn=document.createElement('button');
  likeBtn.className='icon-btn'; dislikeBtn.className='icon-btn';
  likeBtn.innerHTML='<i class="fa fa-thumbs-up"></i>';
  dislikeBtn.innerHTML='<i class="fa fa-thumbs-down"></i>';
  likeBtn.onclick=()=>toggleLike(postId,true);
  dislikeBtn.onclick=()=>toggleLike(postId,false);
  const wrap=document.createElement('div');
  wrap.className='like-row';
  wrap.append(likeBtn,dislikeBtn);
  card.appendChild(wrap);
}

// =======================================================
// COMMENTS (videos & podcasts only)
// =======================================================
async function postComment(postId,text){
  const user=auth.currentUser;
  if(!user) return alert('Sign in to comment.');
  if(!text.trim()) return;
  const { collection, addDoc, serverTimestamp } =
    await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");
  await addDoc(collection(db,'posts',postId,'comments'),{
    uid:user.uid,text:text.trim(),createdAt:serverTimestamp()
  });
  loadComments(postId);
}

async function loadComments(postId){
  const { collection,getDocs,orderBy,query }=
    await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");
  const qRef=query(collection(db,'posts',postId,'comments'),orderBy('createdAt','asc'));
  const snap=await getDocs(qRef);
  const box=document.querySelector(`#comments-${postId}`);
  if(!box)return;
  box.innerHTML=snap.docs.map(d=>`<div class="comment"><span class="muted small">${d.data().uid.slice(0,6)}:</span> ${d.data().text}</div>`).join('')||'<div class="muted small">No comments yet.</div>';
}

function attachCommentInput(card,postId){
  const wrap=document.createElement('div');
  wrap.className='comment-wrap';
  wrap.innerHTML=`<input type="text" id="commentInput-${postId}" placeholder="Add a comment..."/>
  <button class="ghost" id="commentBtn-${postId}">Post</button>
  <div id="comments-${postId}" class="comments"></div>`;
  card.appendChild(wrap);
  wrap.querySelector(`#commentBtn-${postId}`).addEventListener('click',()=>{
    const val=wrap.querySelector(`#commentInput-${postId}`).value;
    postComment(postId,val);
    wrap.querySelector(`#commentInput-${postId}`).value='';
  });
  loadComments(postId);
}

// initial load
loadFeeds();
// =======================================================
// INTAKEE — PROFILE + FOLLOW / BLOCK + SETTINGS SYSTEM
// =======================================================
'use strict';

// ---------- Elements ----------
const profileName      = qs('#profile-name');
const profileHandle    = qs('#profile-handle');
const profilePhotoImg  = qs('#profile-photo');
const profileBanner    = qs('#profileBanner');
const bioView          = qs('#bio-view');
const bioEditWrap      = qs('#bio-edit-wrap');
const nameInput        = qs('#profileNameInput');
const bioInput         = qs('#profileBioInput');
const photoInput       = qs('#profilePhotoInput');
const bannerInput      = qs('#profileBannerInput');
const btnEditProfile   = qs('#btn-edit-profile');
const btnSaveProfile   = qs('#btnSaveProfile');
const btnCancelEdit    = qs('#bio-cancel');
const statPosts        = qs('#stat-posts');
const statFollowers    = qs('#stat-followers');
const statFollowing    = qs('#stat-following');
const statLikes        = qs('#stat-likes');
const profileGrid      = qs('#profile-grid');
const profileEmpty     = qs('#profile-empty');
const followBtn        = qs('#btn-follow');

// =======================================================
// TOGGLE OWNER VISIBILITY
// =======================================================
function applyOwnerVisibility(user) {
  const isOwner = !!user;
  qsa('.owner-only').forEach(el => el.style.display = isOwner ? '' : 'none');
}

// =======================================================
// EDIT PROFILE
// =======================================================
$on(btnEditProfile,'click',()=>{
  if(!auth.currentUser) return alert('Sign in to edit your profile.');
  bioEditWrap.style.display='';
  nameInput.value=profileName.textContent.trim();
  bioInput.value=bioView.textContent==='Add a short bio to introduce yourself.'?'':bioView.textContent.trim();
});
$on(btnCancelEdit,'click',()=> bioEditWrap.style.display='none');

// =======================================================
// SAVE PROFILE
// =======================================================
$on(btnSaveProfile,'click',async()=>{
  const user=auth.currentUser;
  if(!user) return alert('You must be signed in.');
  const name=nameInput.value.trim();
  const bio=bioInput.value.trim();
  try{
    const {ref,uploadBytes,getDownloadURL}=await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js");
    const {doc,setDoc,serverTimestamp}=await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");
    const {updateProfile}=await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js");
    // avatar
    if(photoInput.files[0]){
      const avatarRef=ref(storage,`avatars/${user.uid}_${Date.now()}.jpg`);
      await uploadBytes(avatarRef,photoInput.files[0]);
      const photoURL=await getDownloadURL(avatarRef);
      await updateProfile(user,{photoURL});
      profilePhotoImg.src=photoURL;
    }
    // banner
    if(bannerInput.files[0]){
      const bannerRef=ref(storage,`banners/${user.uid}_${Date.now()}.jpg`);
      await uploadBytes(bannerRef,bannerInput.files[0]);
      const bannerURL=await getDownloadURL(bannerRef);
      profileBanner.style.backgroundImage=`url(${bannerURL})`;
    }
    // update
    if(name) await updateProfile(user,{displayName:name});
    await setDoc(doc(db,'users',user.uid),{
      name:name||user.displayName||'',
      bio:bio||'',
      updatedAt:serverTimestamp()
    },{merge:true});
    profileName.textContent=name||user.displayName||'Your Name';
    bioView.textContent=bio||'Add a short bio to introduce yourself.';
    bioEditWrap.style.display='none';
    alert('✅ Profile updated!');
  }catch(err){console.error(err);alert('Update failed: '+err.message);}
});

// =======================================================
// LOAD PROFILE + POSTS
// =======================================================
async function loadProfilePane(user){
  if(!user){
    profileName.textContent='Your Name';
    profileHandle.textContent='@username';
    profilePhotoImg.removeAttribute('src');
    bioView.textContent='Add a short bio to introduce yourself.';
    profileBanner.style.backgroundImage='none';
    profileGrid.innerHTML='';
    profileEmpty.style.display='';
    statPosts.textContent='0';
    statFollowers.textContent='0';
    statFollowing.textContent='0';
    statLikes.textContent='0';
    return;
  }
  try{
    const {doc,getDoc}=await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");
    const uDoc=await getDoc(doc(db,'users',user.uid));
    const u=uDoc.exists()?uDoc.data():{};
    profileName.textContent=user.displayName||u.name||'Your Name';
    profileHandle.textContent='@'+(u.username||user.email.split('@')[0]);
    bioView.textContent=(u.bio||'').trim()||'Add a short bio to introduce yourself.';
    if(user.photoURL) profilePhotoImg.src=user.photoURL;
    await loadUserPosts(user.uid);
  }catch(err){console.error('Profile load error',err);}
}

async function loadUserPosts(uid){
  const {collection,getDocs,query,where,orderBy}=await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");
  const qRef=query(collection(db,'posts'),where('uid','==',uid),orderBy('createdAt','desc'));
  const snap=await getDocs(qRef);
  const posts=snap.docs.map(d=>({id:d.id,...d.data()}));
  profileGrid.innerHTML='';
  if(!posts.length){profileEmpty.style.display='';}else{
    profileEmpty.style.display='none';
    posts.forEach(p=>{
      const card=document.createElement('div');
      card.className='profile-post-card';
      const thumb=p.thumbnailUrl||'/placeholder.png';
      card.innerHTML=`
        <div class="thumb">
          <img src="${thumb}" alt="">
          <div class="overlay"><span>${p.type.toUpperCase()}</span>
            <button class="danger delete-post" data-id="${p.id}"><i class="fa fa-trash"></i></button>
          </div>
        </div><h4>${p.title||'Untitled'}</h4>`;
      profileGrid.appendChild(card);
    });
  }
  statPosts.textContent=posts.length;
}

// =======================================================
// DELETE POST
// =======================================================
$on(profileGrid,'click',async e=>{
  const btn=e.target.closest('.delete-post');if(!btn)return;
  if(!confirm('Delete this post permanently?'))return;
  try{
    const {doc,deleteDoc}=await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");
    await deleteDoc(doc(db,'posts',btn.dataset.id));
    btn.closest('.profile-post-card').remove();
    alert('🗑️ Post deleted.');
  }catch(err){alert('Delete failed: '+err.message);}
});

// =======================================================
// FOLLOW / UNFOLLOW
// =======================================================
$on(followBtn,'click',async()=>{
  const viewer=auth.currentUser;if(!viewer)return alert('Sign in to follow.');
  const viewedUid=viewer.uid; // placeholder until multi-user profiles
  await toggleFollow(viewedUid);
});

async function toggleFollow(targetUid){
  const user=auth.currentUser;
  if(!user||user.uid===targetUid) return alert('Invalid follow action.');
  const {doc,getDoc,updateDoc,arrayUnion,arrayRemove}=await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");
  const userRef=doc(db,'users',user.uid);
  const targetRef=doc(db,'users',targetUid);
  const uSnap=await getDoc(userRef);
  const following=uSnap.exists()?(uSnap.data().following||[]):[];
  const already=following.includes(targetUid);
  await updateDoc(userRef,{following:already?arrayRemove(targetUid):arrayUnion(targetUid)});
  await updateDoc(targetRef,{followers:already?arrayRemove(user.uid):arrayUnion(user.uid)});
  alert(already?'Unfollowed.':'Now following!');
}

// =======================================================
// BLOCK / UNBLOCK USERS
// =======================================================
async function blockUser(targetUid){
  const user=auth.currentUser;if(!user)return;
  const {doc,updateDoc,arrayUnion}=await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");
  await updateDoc(doc(db,'users',user.uid),{blocked:arrayUnion(targetUid)});
  alert('🚫 User blocked.');
}
async function unblockUser(targetUid){
  const user=auth.currentUser;if(!user)return;
  const {doc,updateDoc,arrayRemove}=await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");
  await updateDoc(doc(db,'users',user.uid),{blocked:arrayRemove(targetUid)});
  alert('✅ User unblocked.');
}

// =======================================================
// SETTINGS — PRIVACY, TOGGLES
// =======================================================
const togglePrivate = qs('#toggle-private');
const toggleUploads = qs('#toggle-uploads');
const toggleSaved   = qs('#toggle-saved');

function applyToggleState(tog,on){tog.dataset.on=on.toString();tog.classList.toggle('active',on);}
async function loadUserSettings(uid){
  const {doc,getDoc}=await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");
  const uDoc=await getDoc(doc(db,'users',uid));
  if(!uDoc.exists())return;
  const s=uDoc.data();
  applyToggleState(togglePrivate,s.private||false);
  applyToggleState(toggleUploads,s.showUploads??true);
  applyToggleState(toggleSaved,s.showSaved??true);
}
async function saveUserSetting(field,value){
  const user=auth.currentUser;if(!user)return;
  const {doc,updateDoc}=await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");
  await updateDoc(doc(db,'users',user.uid),{[field]:value});
}
[ togglePrivate,toggleUploads,toggleSaved ].forEach(tog=>{
  $on(tog,'click',()=>{
    const state=!(tog.dataset.on==='true');
    applyToggleState(tog,state);
    if(tog.id==='toggle-private') saveUserSetting('private',state);
    if(tog.id==='toggle-uploads') saveUserSetting('showUploads',state);
    if(tog.id==='toggle-saved')   saveUserSetting('showSaved',state);
    alert(`Setting updated: ${tog.id.replace('toggle-','')} → ${state}`);
  });
});

// =======================================================
// AUTH + SETTINGS INITIALIZER
// =======================================================
document.addEventListener('intakee:auth',e=>{
  const user=e.detail.user;
  applyOwnerVisibility(user);
  if(user){loadProfilePane(user);loadUserSettings(user.uid);}
});
// =======================================================
// INTAKEE — MINI-PLAYER + NOTIFICATIONS + BOOT SYSTEM
// =======================================================
'use strict';

// ---------- Mini-Player Elements ----------
const miniPlayer = qs('#mini-player');
const miniAudio  = qs('#mp-audio');
const miniTitle  = qs('#mp-title');
const miniSub    = qs('#mp-sub');
const miniPlay   = qs('#mp-play');
const miniClose  = qs('#mp-close');

let isPlaying = false;

// ---------- Play Podcast / Audio ----------
function playPodcast(url, title='Now Playing', sub='') {
  if (!url) return alert('Invalid audio URL.');
  miniPlayer.hidden = false;
  miniTitle.textContent = title;
  miniSub.textContent   = sub;
  miniAudio.src = url;
  miniAudio.play()
    .then(() => { isPlaying = true; miniPlay.innerHTML='<i class="fa fa-pause"></i>'; })
    .catch(err => console.warn('Audio play failed:', err));
}

// ---------- Play / Pause Toggle ----------
$on(miniPlay,'click',()=>{
  if(!miniAudio.src)return;
  if(isPlaying){
    miniAudio.pause(); miniPlay.innerHTML='<i class="fa fa-play"></i>'; isPlaying=false;
  }else{
    miniAudio.play().catch(()=>{}); miniPlay.innerHTML='<i class="fa fa-pause"></i>'; isPlaying=true;
  }
});

// ---------- Close Player ----------
$on(miniClose,'click',()=>{
  try{miniAudio.pause();}catch{}
  miniAudio.src=''; miniPlayer.hidden=true; isPlaying=false;
});

// ---------- Auto-Pause on Navigation ----------
window.addEventListener('hashchange',()=>{
  if(!miniAudio.paused)miniAudio.pause();
  miniPlayer.hidden=true; isPlaying=false;
});

// =======================================================
// IN-APP NOTIFICATIONS (Popup Style like Instagram)
// =======================================================
function showNotification(msg, type='info') {
  let box=document.createElement('div');
  box.className=`notif-box ${type}`;
  box.textContent=msg;
  document.body.appendChild(box);
  setTimeout(()=>box.classList.add('visible'),50);
  setTimeout(()=>{
    box.classList.remove('visible');
    setTimeout(()=>box.remove(),300);
  },4000);
}

// Use showNotification('✅ Upload complete!','success') anywhere.

// Inject minimal CSS automatically if not present
if(!document.querySelector('#notif-style')){
  const style=document.createElement('style');
  style.id='notif-style';
  style.textContent=`
  .notif-box{
    position:fixed;left:50%;top:-60px;transform:translateX(-50%);
    background:#222;color:#fff;padding:10px 18px;border-radius:8px;
    box-shadow:0 2px 8px rgba(0,0,0,.3);opacity:0;transition:all .3s;
    z-index:9999;font-size:14px;
  }
  .notif-box.visible{top:40px;opacity:1;}
  .notif-box.success{background:#0a0;}
  .notif-box.error{background:#a00;}
  `;
  document.head.appendChild(style);
}

// =======================================================
// AUTO FEED / PROFILE REFRESH
// =======================================================
document.addEventListener('intakee:auth', e => {
  const user = e.detail.user;
  if (user) {
    loadFeeds();
    loadProfilePane(user);
    loadUserSettings(user.uid);
  } else {
    homeFeed.innerHTML = '<div class="muted">Welcome to INTAKEE — sign in to post.</div>';
    profileGrid.innerHTML = '';
  }
});
document.addEventListener('intakee:feedRefresh', loadFeeds);

// =======================================================
// BOOT INITIALIZATION
// =======================================================
(async function bootApp(){
  console.log('🚀 Booting INTAKEE...');
  try{
    const user=auth.currentUser;
    if(user){
      await Promise.all([
        loadFeeds(),
        loadProfilePane(user),
        loadUserSettings(user.uid)
      ]);
    }else{
      await loadFeeds();
    }
    showNotification('✅ App ready!','success');
    console.log('✅ INTAKEE initialized successfully.');
  }catch(err){
    console.error('❌ Boot error:',err);
    showNotification('⚠️ Startup failed. Check console.','error');
  }
})();
