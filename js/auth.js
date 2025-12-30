/* 
=====================================
INTAKEE — AUTH SYSTEM (FIXED UX)
- Instant login feedback
- No delay confusion
- Modal closes ONLY when auth confirmed
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
let authReady = false;
export let currentUser = null;
export let currentUserData = null;

/* ================= DOM ================= */
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
openAuthBtn?.addEventListener("click", () => authDialog?.showModal());
closeAuthBtn?.addEventListener("click", () => authDialog?.close());

/* ================= SIGN UP ================= */
signupBtn?.addEventListener("click", async () => {
  const email = signupEmail?.value.trim();
  const password = signupPassword?.value.trim();
  const username = signupUsername?.value.trim().toLowerCase();

  if (!email || !password || !username) return alert("Fill all fields.");
  if (!signupAgeConfirm?.checked) return alert("You must be 13+.");

  const q = query(collection(db, "users"), where("username", "==", username));
  const snap = await getDocs(q);
  if (!snap.empty) return alert("Username taken.");

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "users", cred.user.uid), {
      email,
      username,
      createdAt: Date.now(),
      followers: [],
      following: [],
      likedPosts: []
    });
  } catch (err) {
    alert(err.message);
  }
});

/* ================= LOGIN ================= */
loginBtn?.addEventListener("click", async () => {
  const identifier = loginIdentifier?.value.trim();
  const password = loginPassword?.value.trim();

  if (!identifier || !password) return alert("Enter credentials.");

  try {
    let email = identifier;

    if (!identifier.includes("@")) {
      const q = query(
        collection(db, "users"),
        where("username", "==", identifier.toLowerCase())
      );
      const snap = await getDocs(q);
      if (snap.empty) return alert("User not found.");
      email = snap.docs[0].data().email;
    }

    await signInWithEmailAndPassword(auth, email, password);
    // DO NOT close modal here — wait for auth state
  } catch (err) {
    alert(err.message);
  }
});

/* ================= FORGOT PASSWORD ================= */
forgotPasswordBtn?.addEventListener("click", async () => {
  const email = loginIdentifier?.value.trim();
  if (!email?.includes("@")) return alert("Enter email.");
  await sendPasswordResetEmail(auth, email);
  alert("Password reset sent.");
});

/* ================= AUTH STATE (THE FIX) ================= */
onAuthStateChanged(auth, async (user) => {
  authReady = true;

  if (user) {
    currentUser = user;

    const snap = await getDoc(doc(db, "users", user.uid));
    currentUserData = snap.exists() ? snap.data() : null;

    // UI updates
    openAuthBtn && (openAuthBtn.style.display = "none");

    if (headerUsername && currentUserData?.username) {
      headerUsername.textContent = "@" + currentUserData.username;
      headerUsername.style.display = "inline-block";
    }

    document.body.classList.add("logged-in");

    // ✅ CLOSE MODAL ONLY NOW
    authDialog?.close();
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
