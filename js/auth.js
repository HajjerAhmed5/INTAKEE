/* 
=====================================
INTAKEE — AUTH SYSTEM (STABLE & SAFE)
- No auto-open
- Guards all DOM access
- Email OR Username login
- Header username support
=====================================
*/

import { auth, db } from "./firebase-init.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

/* ================= STATE ================= */
export let currentUser = null;
export let currentUserData = null;

/* ================= DOM (SAFE) ================= */
const authDialog = document.getElementById("authDialog");
const openAuthBtn = document.getElementById("openAuth");
const closeAuthBtn = document.getElementById("closeAuthDialog");

const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");

const loginIdentifier = document.getElementById("loginIdentifier");
const loginPassword = document.getElementById("loginPassword");

const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");
const signupUsername = document.getElementById("signupUsername");
const signupAgeConfirm = document.getElementById("signupAgeConfirm");

const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
const headerUsername = document.getElementById("headerUsername");

/* ================= MODAL ================= */
openAuthBtn?.addEventListener("click", () => {
  authDialog?.showModal();
});

closeAuthBtn?.addEventListener("click", () => {
  authDialog?.close();
});

/* ================= SIGN UP ================= */
signupBtn?.addEventListener("click", async () => {
  if (!signupEmail || !signupPassword || !signupUsername) return;

  const email = signupEmail.value.trim();
  const password = signupPassword.value.trim();
  const username = signupUsername.value.trim().toLowerCase();

  if (!email || !password || !username) {
    alert("Fill in all fields.");
    return;
  }

  if (signupAgeConfirm && !signupAgeConfirm.checked) {
    alert("You must be 13 or older.");
    return;
  }

  const q = query(collection(db, "users"), where("username", "==", username));
  const snap = await getDocs(q);
  if (!snap.empty) {
    alert("Username already taken.");
    return;
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "users", cred.user.uid), {
      email,
      username,
      createdAt: Date.now(),
      followers: [],
      following: [],
      posts: 0,
      likes: 0
    });

    authDialog?.close();
  } catch (err) {
    alert(err.message);
  }
});

/* ================= LOGIN ================= */
loginBtn?.addEventListener("click", async () => {
  if (!loginIdentifier || !loginPassword) return;

  const identifier = loginIdentifier.value.trim();
  const password = loginPassword.value.trim();

  if (!identifier || !password) {
    alert("Enter credentials.");
    return;
  }

  try {
    let email = identifier;

    if (!identifier.includes("@")) {
      const q = query(
        collection(db, "users"),
        where("username", "==", identifier.toLowerCase())
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        alert("User not found.");
        return;
      }
      email = snap.docs[0].data().email;
    }

    await signInWithEmailAndPassword(auth, email, password);
    authDialog?.close();
  } catch (err) {
    alert(err.message);
  }
});

/* ================= FORGOT PASSWORD ================= */
forgotPasswordBtn?.addEventListener("click", async () => {
  if (!loginIdentifier) return;

  const email = loginIdentifier.value.trim();
  if (!email.includes("@")) {
    alert("Enter your email.");
    return;
  }

  await sendPasswordResetEmail(auth, email);
  alert("Password reset email sent.");
});

/* ================= AUTH STATE ================= */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;

    const snap = await getDoc(doc(db, "users", user.uid));
    currentUserData = snap.exists() ? snap.data() : null;

    openAuthBtn && (openAuthBtn.style.display = "none");

    if (headerUsername && currentUserData?.username) {
      headerUsername.textContent = "@" + currentUserData.username;
      headerUsername.style.display = "inline-block";
    }

    document.body.classList.add("logged-in");
  } else {
    currentUser = null;
    currentUserData = null;

    openAuthBtn && (openAuthBtn.style.display = "inline-block");

    if (headerUsername) {
      headerUsername.textContent = "";
      headerUsername.style.display = "none";
    }

    document.body.classList.remove("logged-in");
  }
});
