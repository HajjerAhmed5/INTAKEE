/* 
INTAKEE — Fully Connected JS (Accounts + Profiles + Uploads)
Replace your script.js file with this one.
*/

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getStorage,
  ref as sRef,
  uploadBytesResumable,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

/* ---------- FIREBASE CONFIG ---------- */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD0_tL8pXuVG7JpCBj3tuL7s3KipL5E6g",
  authDomain: "intakee-5785e.firebaseapp.com",
  projectId: "intakee-5785e",
  storageBucket: "intakee-5785e.firebasestorage.app",
  messagingSenderId: "406062380272",
  appId: "1:406062380272:web:49dd5e7db91c6a38b56c5d",
  measurementId: "G-3C2YDVGTEG"
};

/* ---------- INIT ---------- */
const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

/* ---------- HELPERS ---------- */
const $ = (sel) => document.querySelector(sel);
const $id = (id) => document.getElementById(id);
const on = (el, ev, fn) => el && el.addEventListener(ev, fn);
function toast(msg) {
  console.log("[INTAKEE]", msg);
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

/* ---------- AUTH ---------- */
on($id("authSignUpForm"), "submit", async (e) => {
  e.preventDefault();
  const email = $id("signUpEmail")?.value?.trim();
  const password = $id("signUpPassword")?.value;
  const displayName = $id("signUpName")?.value?.trim() || "";
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) await updateProfile(cred.user, { displayName });
    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid,
      displayName: cred.user.displayName || displayName || "Creator",
      bio: "",
      photoURL: cred.user.photoURL || "",
      bannerURL: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      likes: 0,
      followers: 0,
      following: 0
    });
    toast("Account created. You are signed in.");
  } catch (err) {
    toast(err.message);
  }
});

on($id("authSignInForm"), "submit", async (e) => {
  e.preventDefault();
  const email = $id("signInEmail")?.value?.trim();
  const password = $id("signInPassword")?.value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    toast("Signed in.");
  } catch (err) {
    toast(err.message);
  }
});

on($id("btnSignOut"), "click", async () => {
  try {
    await signOut(auth);
    toast("Signed out.");
  } catch (err) {
    toast(err.message);
  }
});

onAuthStateChanged(auth, async (user) => {
  const body = document.body;
  if (user) {
    body.classList.add("is-logged-in");
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists()) {
      await setDoc(doc(db, "users", user.uid), {
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

/* ---------- PROFILE ---------- */
on($id("btnSaveProfile"), "click", async () => {
  const user = auth.currentUser;
  if (!user) return toast("Please sign in first.");
  try {
    const displayName =
      $id("profileNameInput")?.value?.trim() || user.displayName || "Creator";
    const bio = $id("profileBioInput")?.value?.trim() || "";
    const photoFile = $id("profilePhotoInput")?.files?.[0] || null;
    const bannerFile = $id("profileBannerInput")?.files?.[0] || null;

    let photoURL = null,
      bannerURL = null;
    if (photoFile) {
      photoURL = await uploadFileToStorage(
        photoFile,
        `users/${user.uid}/profile/photo_${Date.now()}`
      );
      await updateProfile(user, { displayName, photoURL });
    } else {
      await updateProfile(user, { displayName });
    }
    if (bannerFile) {
      bannerURL = await uploadFileToStorage(
        bannerFile,
        `users/${user.uid}/profile/banner_${Date.now()}`
      );
    }

    const userRef = doc(db, "users", user.uid);
    await setDoc(
      userRef,
      {
        uid: user.uid,
        displayName,
        bio,
        photoURL: photoURL ?? auth.currentUser.photoURL ?? "",
        bannerURL:
          bannerURL ?? (await getDoc(userRef)).data()?.bannerURL ?? "",
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    toast("Profile saved.");
    dispatch("intakee:profileSaved", { uid: user.uid });
  } catch (err) {
    toast(err.message);
  }
});

/* ---------- UPLOAD ---------- */
on($id("btnUpload"), "click", async () => {
  const user = auth.currentUser;
  if (!user) return toast("Please sign in to upload.");
  const type = $id("uploadTypeSelect")?.value || "video";
  const title = $id("uploadTitleInput")?.value?.trim();
  const mediaFile = $id("uploadFileInput")?.files?.[0];
  const thumbFile = $id("uploadThumbInput")?.files?.[0] || null;
  if (!title || !mediaFile) return toast("Title and media file are required.");

  try {
    const mediaPath = `posts/${user.uid}/${Date.now()}_${mediaFile.name}`;
    const mediaURL = await uploadFileToStorage(mediaFile, mediaPath);

    let thumbURL = "";
    if (thumbFile) {
      const thumbPath = `posts/${user.uid}/thumb_${Date.now()}_${thumbFile.name}`;
      thumbURL = await uploadFileToStorage(thumbFile, thumbPath);
    }

    const postRef = await addDoc(collection(db, "posts"), {
      ownerUid: user.uid,
      ownerName: auth.currentUser.displayName || "Creator",
      type,
      title,
      mediaURL,
      thumbURL,
      likes: 0,
      commentsCount: 0,
      createdAt: serverTimestamp(),
      visibility: "public"
    });

    toast("Upload complete.");
    dispatch("intakee:uploadComplete", { postId: postRef.id });
  } catch (err) {
    toast(err.message);
  }
});

/* ---------- LOAD FEED (OPTIONAL) ---------- */
export async function loadRecentPosts(limitCount = 12) {
  const q = query(
    collection(db, "posts"),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
