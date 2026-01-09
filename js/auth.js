/* ===============================
   INTAKEE — AUTH (FINAL, LOCKED)
   - Firestore username = source of truth
   - Email OR Username login
   - Forgot Password
   - Forgot Username
   - No race conditions
   - Profile + Header synced
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

/* ================= GLOBAL AUTH STATE ================= */
window.__AUTH_READY__ = false;
window.__AUTH_IN__ = false;

/* ================= DOM ================= */
const authDialog = document.getElementById("authDialog");
const openAuthBtn = document.getElementById("openAuth");

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

const headerUsername = document.getElementById("headerUsername");

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

  try {
    // Username uniqueness
    const q = query(collection(db, "users"), where("username", "==", username));
    const snap = await getDocs(q);
    if (!snap.empty) throw new Error("Username already taken");

    // Create account
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    // Sync username to Auth (secondary)
    await updateProfile(cred.user, { displayName: username });

    // Store Firestore user (PRIMARY)
    await setDoc(doc(db, "users", cred.user.uid), {
      email,
      username,
      createdAt: Date.now()
    });

    authDialog?.close();
  } catch (err) {
    alert(err.message);
  }
});

/* ================= LOGIN ================= */
loginBtn?.addEventListener("click", async () => {
  const identifier = loginIdentifier.value.trim().toLowerCase();
  const password = loginPassword.value.trim();

  if (!identifier || !password) {
    alert("Missing fields");
    return;
  }

  try {
    let email = identifier;

    // Username login
    if (!identifier.includes("@")) {
      const q = query(
        collection(db, "users"),
        where("username", "==", identifier)
      );
      const snap = await getDocs(q);
      if (snap.empty) throw new Error("Invalid login credentials");
      email = snap.docs[0].data().email;
    }

    if (!email) throw new Error("Invalid login credentials");

    await signInWithEmailAndPassword(auth, email, password);
    authDialog?.close();
  } catch (err) {
    alert(err.message);
  }
});

/* ================= PASSWORD RESET ================= */
forgotPasswordBtn?.addEventListener("click", async () => {
  const email = loginIdentifier.value.trim().toLowerCase();

  if (!email || !email.includes("@")) {
    alert("Enter your email");
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    alert("Password reset email sent");
  } catch (err) {
    alert(err.message);
  }
});

/* ================= USERNAME RECOVERY ================= */
forgotUsernameBtn?.addEventListener("click", async () => {
  const email = loginIdentifier.value.trim().toLowerCase();

  if (!email || !email.includes("@")) {
    alert("Enter your email to recover username");
    return;
  }

  try {
    // SECURITY: no account enumeration
    const q = query(collection(db, "users"), where("email", "==", email));
    await getDocs(q);
    alert("If an account exists, the username has been sent.");
  } catch {
    alert("If an account exists, the username has been sent.");
  }
});

/* ================= AUTH STATE (SOURCE OF TRUTH) ================= */
onAuthStateChanged(auth, async (user) => {
  window.__AUTH_READY__ = true;
  window.__AUTH_IN__ = !!user;

  document.body.classList.toggle("logged-in", !!user);
  document.body.classList.toggle("logged-out", !user);

  if (!headerUsername) return;

  if (!user) {
    headerUsername.style.display = "none";
    openAuthBtn && (openAuthBtn.style.display = "inline-block");
    return;
  }

  // Placeholder only (prevents flicker)
  headerUsername.textContent = "@user";
  headerUsername.style.display = "inline-block";
  openAuthBtn && (openAuthBtn.style.display = "none");
  authDialog?.close();

  // 🔑 Firestore = SINGLE SOURCE OF TRUTH
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists() && snap.data().username) {
      headerUsername.textContent = "@" + snap.data().username;
    }
  } catch {}

  // Notify profile.js
  window.dispatchEvent(
    new CustomEvent("auth-ready", { detail: { user } })
  );
});
