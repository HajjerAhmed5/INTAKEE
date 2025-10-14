/* INTAKEE — Accounts + Profiles + Uploads (final) */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import {
  getStorage,
  ref as sRef,
  uploadBytesResumable,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-storage.js";

/* ---------- FIREBASE CONFIG ---------- */
const FIREBASE_CONFIG = {
  apiKey:apiKey: "AIzaSyCl_Gytnf5dpOE_AEKmRl7Dm1vlJVJLRlc",
  authDomain: "intakee-5785e.firebaseapp.com",
  projectId: "intakee-5785e",
  storageBucket: "intakee-5785e.appspot.com",   // ← important
  messagingSenderId: "406662380272",            // ← FIXED
  appId: "1:406662380272:web:49dd5e7db91c8a38b56c5d", // ← FIXED
  measurementId: "G-3C2YDVGTEG"
};

/* ---------- INIT ---------- */
const app = initializeApp(FIREBASE_CONFIG);
console.log("INTAKEE runtime Firebase config:", app.options);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
// keep users logged in
await setPersistence(auth, browserLocalPersistence);

/* ---------- HELPERS ---------- */
const $ = (sel) => document.querySelector(sel);
const $id = (id) => document.getElementById(id);
const on = (el, ev, fn) => el && el.addEventListener(ev, fn);
const authDialog = $id("authDialog");
const authError = document.createElement("div");
authError.id = "authError";
authError.style.cssText = "color:#ff7676;margin-top:6px;font-size:.9rem;";
$id("authSignUpForm")?.appendChild(authError); // shows errors under signup
$id("authSignInForm")?.appendChild(authError); // same element reused

function showError(msg) { if (authError) authError.textContent = msg || ""; }
function clearError() { showError(""); }
function toast(msg){ console.log("[INTAKEE]", msg); }
function closeAuth(){ try{ authDialog?.close?.(); }catch{} }

/* Upload to Storage */
async function uploadFileToStorage(file, path) {
  if (!file) return null;
  const storageRef = sRef(storage, path);
  const task = uploadBytesResumable(storageRef, file);
  await new Promise((res, rej) => { task.on("state_changed", () => {}, rej, res); });
  return await getDownloadURL(task.snapshot.ref);
}
function dispatch(name, detail = {}) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

/* ---------- AUTH ---------- */
// signup
on($id("authSignUpForm"), "submit", async (e) => {
  e.preventDefault(); clearError();
  const email = $id("signUpEmail")?.value?.trim();
  const password = $id("signUpPassword")?.value;
  const displayName = $id("signUpName")?.value?.trim() || "";
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) await updateProfile(cred.user, { displayName });
    // ensure profile doc
    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid,
      displayName: cred.user.displayName || displayName || "Creator",
      bio: "",
      photoURL: cred.user.photoURL || "",
      bannerURL: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      likes: 0, followers: 0, following: 0
    }, { merge: true });

    toast("Account created.");
    closeAuth();
  } catch (err) {
    showError(err?.message || "Sign up failed.");
  }
});

// signin
on($id("authSignInForm"), "submit", async (e) => {
  e.preventDefault(); clearError();
  const email = $id("signInEmail")?.value?.trim();
  const password = $id("signInPassword")?.value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    toast("Signed in.");
    closeAuth();
  } catch (err) {
    showError(err?.message || "Sign in failed.");
  }
});

// logout (header)
on($id("btnSignOut"), "click", async () => {
  try { await signOut(auth); toast("Signed out."); }
  catch (err) { alert(err?.message || "Logout failed."); }
});
// logout (settings page)
on($id("settings-logout"), "click", async () => {
  try { await signOut(auth); toast("Signed out."); }
  catch (err) { alert(err?.message || "Logout failed."); }
});

// reflect auth state in UI
onAuthStateChanged(auth, async (user) => {
  const body = document.body;
  if (user) {
    body.classList.add("is-logged-in");

    // create user doc if missing
    const uref = doc(db, "users", user.uid);
    const snap = await getDoc(uref);
    if (!snap.exists()) {
      await setDoc(uref, {
        uid: user.uid,
        displayName: user.displayName || "Creator",
        bio: "",
        photoURL: user.photoURL || "",
        bannerURL: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    dispatch("intakee:auth", { user });
  } else {
    body.classList.remove("is-logged-in");
    dispatch("intakee:auth", { user: null });
  }
});

/* ---------- PROFILE (name, bio, photo, banner) ---------- */
on($id("btnSaveProfile"), "click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Sign in to edit your profile.");

  try {
    const displayName = $id("profileNameInput")?.value?.trim() || user.displayName || "Creator";
    const bio = $id("profileBioInput")?.value?.trim() || "";
    const photoFile = $id("profilePhotoInput")?.files?.[0] || null;
    const bannerFile = $id("profileBannerInput")?.files?.[0] || null;

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

    const ref = doc(db, "users", user.uid);
    const old = (await getDoc(ref)).data() || {};
    await setDoc(ref, {
      uid: user.uid,
      displayName,
      bio,
      photoURL: photoURL ?? auth.currentUser.photoURL ?? old.photoURL ?? "",
      bannerURL: bannerURL ?? old.bannerURL ?? "",
      updatedAt: serverTimestamp()
    }, { merge: true });

    alert("Profile saved.");
    dispatch("intakee:profileSaved", { uid: user.uid });
  } catch (err) {
    alert(err?.message || "Failed to save profile.");
  }
});

/* ---------- UPLOAD (video/clip/podcast) ---------- */
on($id("btnUpload"), "click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Sign in to upload.");

  const type = $id("uploadTypeSelect")?.value || "video";
  const title = $id("uploadTitleInput")?.value?.trim();
  const mediaFile = $id("uploadFileInput")?.files?.[0];
  const thumbFile = $id("uploadThumbInput")?.files?.[0] || null;

  if (!title || !mediaFile) return alert("Title and media file are required.");

  try {
    const ts = Date.now();

    // upload media
    const mediaPath = `posts/${user.uid}/${ts}_${mediaFile.name}`;
    const mediaURL = await uploadFileToStorage(mediaFile, mediaPath);

    // optional thumbnail
    let thumbURL = "";
    if (thumbFile) {
      const thumbPath = `posts/${user.uid}/thumb_${ts}_${thumbFile.name}`;
      thumbURL = await uploadFileToStorage(thumbFile, thumbPath);
    }

    const postRef = await addDoc(collection(db, "posts"), {
      ownerUid: user.uid,
      ownerName: auth.currentUser.displayName || "Creator",
      type,                     // 'video' | 'clip' | 'podcast-audio' | 'podcast-video'
      title,
      mediaURL,
      thumbURL,
      likes: 0,
      commentsCount: 0,
      createdAt: serverTimestamp(),
      visibility: "public"
    });

    alert("Upload complete.");
    dispatch("intakee:uploadComplete", { postId: postRef.id });

    // reset inputs
    $id("uploadTitleInput").value = "";
    $id("uploadFileInput").value = "";
    $id("uploadThumbInput").value = "";
  } catch (err) {
    alert(err?.message || "Upload failed.");
  }
});

/* ---------- FEED HELPER (optional) ---------- */
export async function loadRecentPosts(limitCount = 12) {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
