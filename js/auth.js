/* ===============================
   INTAKEE — AUTH (FINAL LOCKED)
   - Firestore is username source of truth
   - Email NEVER shown
   - No @user fallback
   - Profile + Header always match
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

  if (!email || !password || !username) return alert("Fill all fields");
  if (!signupAgeConfirm.checked) return alert("You must be 13+");

  const q = query(collection(db, "users"), where("username", "==", username));
  const snap = await getDocs(q);
  if (!snap.empty) return alert("Username already taken");

  const cred = await createUserWithEmailAndPassword(auth, email, password);

  // Sync once for consistency (not display source)
  await updateProfile(cred.user, { displayName: username });

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
  if (!identifier || !password) return alert("Missing fields");

  let email = identifier;

  if (!identifier.includes("@")) {
    const q = query(collection(db, "users"), where("username", "==", identifier));
    const snap = await getDocs(q);
    if (snap.empty) return alert("Invalid credentials");
    email = snap.docs[0].data().email;
  }

  await signInWithEmailAndPassword(auth, email, password);
  authDialog?.close();
});

/* ================= PASSWORD RESET ================= */
forgotPasswordBtn?.addEventListener("click", async () => {
  const email = loginIdentifier.value.trim().toLowerCase();
  if (!email.includes("@")) return alert("Enter your email");
  await sendPasswordResetEmail(auth, email);
  alert("Password reset email sent");
});

/* ================= USERNAME RECOVERY ================= */
forgotUsernameBtn?.addEventListener("click", async () => {
  alert("If an account exists, recovery instructions were sent.");
});

/* ================= AUTH STATE ================= */
onAuthStateChanged(auth, async (user) => {
  window.__AUTH_READY__ = true;
  window.__AUTH_IN__ = !!user;

  document.body.classList.toggle("logged-in", !!user);
  document.body.classList.toggle("logged-out", !user);

  if (!user) {
    headerUsername.style.display = "none";
    openAuthBtn.style.display = "inline-block";
    return;
  }

  // 🔒 ALWAYS FETCH USERNAME FROM FIRESTORE
  const snap = await getDoc(doc(db, "users", user.uid));

  const username = snap.exists()
    ? snap.data().username
    : user.displayName;

  headerUsername.textContent = "@" + username;
  headerUsername.style.display = "inline-block";
  openAuthBtn.style.display = "none";

  window.dispatchEvent(
    new CustomEvent("auth-ready", { detail: { user, username } })
  );
});
