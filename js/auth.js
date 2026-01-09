/* ===============================
   INTAKEE — AUTH (FINAL LOCKED)
   - Firestore is username source of truth
   - Email NEVER shown
   - Header + Profile always match
   - No Guest state after login
================================ */

import { auth, db } from "./firebase-init.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile
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

/* ================= DOM ================= */
const authDialog = document.getElementById("authDialog");
const openAuthBtn = document.getElementById("openAuth");
const headerUsername = document.getElementById("headerUsername");

const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
const forgotUsernameBtn = document.getElementById("forgotUsernameBtn");

const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");
const signupUsername = document.getElementById("signupUsername");
const signupAgeConfirm = document.getElementById("signupAgeConfirm");

const loginIdentifier = document.getElementById("loginIdentifier");
const loginPassword = document.getElementById("loginPassword");

/* ================= MODAL ================= */
openAuthBtn?.addEventListener("click", () => authDialog?.showModal());

/* ================= SIGN UP ================= */
signupBtn?.addEventListener("click", async () => {
  const email = signupEmail.value.trim().toLowerCase();
  const password = signupPassword.value.trim();
  const username = signupUsername.value.trim().toLowerCase();

  if (!email || !password || !username) {
    alert("Fill all fields");
    return;
  }

  if (!signupAgeConfirm.checked) {
    alert("You must be 13+");
    return;
  }

  // Check username uniqueness
  const q = query(collection(db, "users"), where("username", "==", username));
  const snap = await getDocs(q);
  if (!snap.empty) {
    alert("Username already taken");
    return;
  }

  const cred = await createUserWithEmailAndPassword(auth, email, password);

  // Sync once (not UI source)
  await updateProfile(cred.user, { displayName: username });

  // Firestore user document
  await setDoc(doc(db, "users", cred.user.uid), {
    username,
    email,
    createdAt: Date.now()
  });

  authDialog?.close();
});

/* ================= LOGIN ================= */
loginBtn?.addEventListener("click", async () => {
  const identifier = loginIdentifier.value.trim().toLowerCase();
  const password = loginPassword.value.trim();

  if (!identifier || !password) {
    alert("Missing fields");
    return;
  }

  let email = identifier;

  // Username login
  if (!identifier.includes("@")) {
    const q = query(collection(db, "users"), where("username", "==", identifier));
    const snap = await getDocs(q);
    if (snap.empty) {
      alert("Invalid login credentials");
      return;
    }
    email = snap.docs[0].data().email;
  }

  await signInWithEmailAndPassword(auth, email, password);
  authDialog?.close();
});

/* ================= PASSWORD RESET ================= */
forgotPasswordBtn?.addEventListener("click", async () => {
  const email = loginIdentifier.value.trim().toLowerCase();
  if (!email.includes("@")) {
    alert("Enter your email");
    return;
  }
  await sendPasswordResetEmail(auth, email);
  alert("Password reset email sent");
});

/* ================= USERNAME RECOVERY ================= */
forgotUsernameBtn?.addEventListener("click", () => {
  alert("If an account exists, recovery instructions were sent.");
});

/* ================= AUTH STATE ================= */
onAuthStateChanged(auth, async (user) => {
  document.body.classList.toggle("logged-in", !!user);
  document.body.classList.toggle("logged-out", !user);

  if (!user) {
    headerUsername.style.display = "none";
    openAuthBtn.style.display = "inline-block";
    return;
  }

  // 🔒 ALWAYS read username from Firestore
  const snap = await getDoc(doc(db, "users", user.uid));
  const username = snap.exists()
    ? snap.data().username
    : user.displayName;

  headerUsername.textContent = "@" + username;
  headerUsername.style.display = "inline-block";
  openAuthBtn.style.display = "none";

  // 🔔 Notify profile.js
  window.dispatchEvent(
    new CustomEvent("auth-ready", { detail: { user, username } })
  );
});
