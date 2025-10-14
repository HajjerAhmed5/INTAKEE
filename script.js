/*
INTAKEE — Drop-in JS to enable:
1) Create accounts (Firebase Auth — Email/Password)
2) Make/edit profiles (Firestore + Storage)
3) Post content (videos, clips, podcasts) with thumbnail (Storage + Firestore)

How to use fast:
- Paste your Firebase web config into FIREBASE_CONFIG below.
- Ensure Email/Password sign-in is enabled in Firebase Console.
- Add the minimal HTML IDs/classes from the "HTML SNIPPETS" section into your existing UI (keeps your design).
- Include this file at the bottom of your HTML: <script type="module" src="/script.js"></script>
- Optional: rename this file to match your project path.

This script:
- Never crashes if an element is missing (safe lookups)
- Adds ".is-logged-in" to <body> when a user is signed in
- Dispatches CustomEvents you can hook into for your UI: 'intakee:auth', 'intakee:profileSaved', 'intakee:uploadComplete'
- Shows simple toast() messages (non-intrusive). Replace the toast() impl to integrate with your UI

NOTE: This file uses Firebase v10 CDN ESM imports.
*/

// ---------- Firebase ESM imports (v10 CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, addDoc, query, where, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref as sRef, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// ---------- CONFIG — REPLACE WITH YOURS (client-side web config is safe to expose)
const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// ---------- Init
const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ---------- Tiny helpers
const $ = (sel) => document.querySelector(sel);
const $id = (id) => document.getElementById(id);
const on = (el, ev, fn) => el && el.addEventListener(ev, fn);

function toast(msg) {
  console.log("[INTAKEE]", msg);
  // Implement your UI toast here if desired
}

async function uploadFileToStorage(file, path) {
  if (!file) return null;
  const storageRef = sRef(storage, path);
  const task = uploadBytesResumable(storageRef, file);
  await new Promise((res, rej) => {
    task.on("state_changed", () => {}, rej, res);
  });
  return await getDownloadURL(task.snapshot.ref);
}

function dispatch(name, detail = {}) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

// ---------- Auth: Sign Up / Sign In / Sign Out
on($id('authSignUpForm'), 'submit', async (e) => {
  e.preventDefault();
  const email = $id('signUpEmail')?.value?.trim();
  const password = $id('signUpPassword')?.value;
  const displayName = $id('signUpName')?.value?.trim() || '';
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }
    // Create user doc
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid,
      displayName: cred.user.displayName || displayName || 'Creator',
      bio: '',
      photoURL: cred.user.photoURL || '',
      bannerURL: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      likes: 0, followers: 0, following: 0
    });
    toast('Account created. You are signed in.');
  } catch (err) {
    toast(err.message);
  }
});

on($id('authSignInForm'), 'submit', async (e) => {
  e.preventDefault();
  const email = $id('signInEmail')?.value?.trim();
  const password = $id('signInPassword')?.value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    toast('Signed in.');
  } catch (err) {
    toast(err.message);
  }
});

on($id('btnSignOut'), 'click', async () => {
  try {
    await signOut(auth);
    toast('Signed out.');
  } catch (err) {
    toast(err.message);
  }
});

onAuthStateChanged(auth, async (user) => {
  const body = document.body;
  if (user) {
    body.classList.add('is-logged-in');
    // Fetch user profile
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (!snap.exists()) {
      // Make sure a doc exists (in case of legacy users)
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        displayName: user.displayName || 'Creator',
        bio: '',
        photoURL: user.photoURL || '',
        bannerURL: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
    dispatch('intakee:auth', { user });
  } else {
    body.classList.remove('is-logged-in');
    dispatch('intakee:auth', { user: null });
  }
});

// ---------- Profile: Save (name, bio, photo, banner)
on($id('btnSaveProfile'), 'click', async () => {
  const user = auth.currentUser;
  if (!user) return toast('Please sign in first.');
  try {
    const displayName = $id('profileNameInput')?.value?.trim() || user.displayName || 'Creator';
    const bio = $id('profileBioInput')?.value?.trim() || '';
    const photoFile = $id('profilePhotoInput')?.files?.[0] || null;
    const bannerFile = $id('profileBannerInput')?.files?.[0] || null;

    let photoURL = null, bannerURL = null;
    if (photoFile) {
      photoURL = await uploadFileToStorage(photoFile, `users/${user.uid}/profile/photo_${Date.now()}`);
      await updateProfile(user, { displayName, photoURL });
    } else {
      await updateProfile(user, { displayName });
    }
    if (bannerFile) {
      bannerURL = await uploadFileToStorage(bannerFile, `users/${user.uid}/profile/banner_${Date.now()}`);
    }

    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      displayName,
      bio,
      photoURL: photoURL ?? auth.currentUser.photoURL ?? '',
      bannerURL: bannerURL ?? (await getDoc(userRef)).data()?.bannerURL ?? '',
      updatedAt: serverTimestamp()
    }, { merge: true });

    toast('Profile saved.');
    dispatch('intakee:profileSaved', { uid: user.uid });
  } catch (err) {
    toast(err.message);
  }
});

// ---------- Upload: Videos / Clips / Podcasts
on($id('btnUpload'), 'click', async () => {
  const user = auth.currentUser;
  if (!user) return toast('Please sign in to upload.');

  const type = $id('uploadTypeSelect')?.value || 'video'; // video | clip | podcast-audio | podcast-video
  const title = $id('uploadTitleInput')?.value?.trim();
  const mediaFile = $id('uploadFileInput')?.files?.[0];
  const thumbFile = $id('uploadThumbInput')?.files?.[0] || null;
  if (!title || !mediaFile) return toast('Title and media file are required.');

  try {
    // 1) Upload media
    const mediaPath = `posts/${user.uid}/${Date.now()}_${mediaFile.name}`;
    const mediaURL = await uploadFileToStorage(mediaFile, mediaPath);

    // 2) Upload optional thumbnail
    let thumbURL = '';
    if (thumbFile) {
      const thumbPath = `posts/${user.uid}/thumb_${Date.now()}_${thumbFile.name}`;
      thumbURL = await uploadFileToStorage(thumbFile, thumbPath);
    }

    // 3) Save doc
    const postRef = await addDoc(collection(db, 'posts'), {
      ownerUid: user.uid,
      ownerName: auth.currentUser.displayName || 'Creator',
      type, // 'video' | 'clip' | 'podcast-audio' | 'podcast-video'
      title,
      mediaURL,
      thumbURL,
      likes: 0,
      commentsCount: 0,
      createdAt: serverTimestamp(),
      visibility: 'public'
    });

    toast('Upload complete.');
    dispatch('intakee:uploadComplete', { postId: postRef.id });
  } catch (err) {
    toast(err.message);
  }
});

// ---------- Utility: Example feed loader (optional, does not alter your layout)
// Call loadRecentPosts() where you render your feed. It returns an array of docs.
export async function loadRecentPosts(limitCount = 12) {
  const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ---------- HTML SNIPPETS (copy the parts you need into your existing HTML) ----------
/*
[Auth Modal]
<form id="authSignUpForm" class="hide-if-you-have-own-ui">
  <input id="signUpName" placeholder="Display name" />
  <input id="signUpEmail" type="email" placeholder="Email" required />
  <input id="signUpPassword" type="password" placeholder="Password" required />
  <button type="submit">Create account</button>
</form>
<form id="authSignInForm" class="hide-if-you-have-own-ui">
  <input id="signInEmail" type="email" placeholder="Email" required />
  <input id="signInPassword" type="password" placeholder="Password" required />
  <button type="submit">Sign in</button>
</form>
<button id="btnSignOut" class="hide-if-you-have-own-ui">Sign out</button>

[Profile Editor]
<div class="profile-editor hide-if-you-have-own-ui">
  <input id="profileNameInput" placeholder="Your name" />
  <textarea id="profileBioInput" placeholder="Bio..."></textarea>
  <label>Profile Photo <input id="profilePhotoInput" type="file" accept="image/*"></label>
  <label>Banner <input id="profileBannerInput" type="file" accept="image/*"></label>
  <button id="btnSaveProfile">Save Profile</button>
</div>

[Upload]
<div class="upload-panel hide-if-you-have-own-ui">
  <select id="uploadTypeSelect">
    <option value="video">Video</option>
    <option value="clip">Clip</option>
    <option value="podcast-audio">Podcast (Audio)</option>
    <option value="podcast-video">Podcast (Video)</option>
  </select>
  <input id="uploadTitleInput" placeholder="Title" />
  <label>Media File <input id="uploadFileInput" type="file" accept="video/*,audio/*" required></label>
  <label>Thumbnail (optional) <input id="uploadThumbInput" type="file" accept="image/*"></label>
  <button id="btnUpload">Upload</button>
</div>

[CSS hook]
// When signed in, <body> gets .is-logged-in. Example to show a "+" badge on profile picture:
// .profile-plus-indicator { display:none; }
// body.is-logged-in .profile-plus-indicator { display:inline-flex; }
*/

// ---------- FIREBASE SECURITY RULES (copy into Console > Firestore Rules) ----------
/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() { return request.auth != null; }
    function isOwner(uid) { return isSignedIn() && request.auth.uid == uid; }

    match /users/{uid} {
      allow read: if true; // public profiles
      allow create: if isOwner(uid);
      allow update: if isOwner(uid);
      allow delete: if false;
    }

    match /posts/{postId} {
      allow read: if true; // public posts
      allow create: if isSignedIn();
      allow update, delete: if isSignedIn() && request.resource.data.ownerUid == request.auth.uid;
    }
  }
}
*/

// ---------- STORAGE RULES (Console > Storage > Rules) ----------
/*
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{uid}/profile/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == uid;
    }
    match /posts/{uid}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
*/

// ---------- CHECKLIST ----------
/*
1) Firebase Console
   - Enable Authentication > Sign-in method > Email/Password = ON
   - Firestore: create database in production mode, paste the RULES above
   - Storage: paste the RULES above

2) Code
   - Replace FIREBASE_CONFIG
   - Ensure your HTML contains the element IDs used here (or keep this file and use the provided snippets)
   - Add <script type="module" src="/script.js"></script> before </body>

3) UI
   - Add a "+" indicator on profile pic visible only when body.has(.is-logged-in)
   - Hook into CustomEvents if you want:
       document.addEventListener('intakee:uploadComplete', (e)=>{ console.log(e.detail.postId) })

4) Deploy (Vercel)
   - No server needed. Pure client-side
*/
