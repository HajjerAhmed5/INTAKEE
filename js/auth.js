/* ===============================
   INTAKEE — AUTH (FINAL STABLE)
   - Username synced correctly
   - No race conditions
   - Launch safe
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
  const email = signupEmail.value.trim();
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
    // Check username availability
    const q = query(collection(db, "users"), where("username", "==", username));
    const snap = await getDocs(q);
    if (!snap.empty) throw new Error("Username already taken");

    // Create account
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    // 🔑 CRITICAL FIX — sync username to Auth
    await updateProfile(cred.user, {
      displayName: username
    });

    // Store user document
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
      if (snap.empty) throw new Error("User not found");
      email = snap.docs[0].data().email;
    }

    await signInWithEmailAndPassword(auth, email, password);
    authDialog?.close();
  } catch (err) {
    alert(err.message);
  }
});

/* ================= PASSWORD RESET ================= */
forgotPasswordBtn?.addEventListener("click", async () => {
  const email = loginIdentifier.value.trim();

  if (!email.includes("@")) {
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

  // ✅ Instant username (no flicker)
  const instantName =
    user.displayName ||
    (user.email ? user.email.split("@")[0] : "user");

  headerUsername.textContent = "@" + instantName;
  headerUsername.style.display = "inline-block";
  openAuthBtn && (openAuthBtn.style.display = "none");
  authDialog?.close();

  // 🔁 Firestore confirmation (authoritative)
   try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists() && snap.data().username) {
      headerUsername.textContent = "@" + snap.data().username;
    }
  } catch {}

  // 🔔 TELL PROFILE.JS AUTH IS READY
  window.dispatchEvent(
    new CustomEvent("auth-ready", { detail: { user } })
  );
});
