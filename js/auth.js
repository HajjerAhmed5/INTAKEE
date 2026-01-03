/* ===============================
   INTAKEE — AUTH (FINAL FIX)
================================ */

import { auth, db } from "./firebase-init.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signOut
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
const closeAuthBtn = document.getElementById("closeAuthDialog");

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

/* ================= PERSISTENCE ================= */
setPersistence(auth, browserLocalPersistence);

/* ================= MODAL ================= */
openAuthBtn?.addEventListener("click", () => authDialog?.showModal());
closeAuthBtn?.addEventListener("click", () => authDialog?.close());

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
    // Ensure username is unique
    const q = query(collection(db, "users"), where("username", "==", username));
    const snap = await getDocs(q);
    if (!snap.empty) throw new Error("Username already taken");

    const cred = await createUserWithEmailAndPassword(auth, email, password);

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

    // Login via username
    if (!identifier.includes("@")) {
      const q = query(collection(db, "users"), where("username", "==", identifier));
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

  await sendPasswordResetEmail(auth, email);
  alert("Password reset email sent");
});

/* ================= AUTH STATE (FIXED) ================= */
onAuthStateChanged(auth, async (user) => {
  if (!headerUsername) return;

  if (!user) {
    headerUsername.style.display = "none";
    openAuthBtn && (openAuthBtn.style.display = "inline-block");
    return;
  }

  // Show placeholder immediately (prevents @error)
  headerUsername.textContent = "@user";
  headerUsername.style.display = "inline-block";
  openAuthBtn && (openAuthBtn.style.display = "none");

  try {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      const data = snap.data();
      if (data.username) {
        headerUsername.textContent = "@" + data.username;
      }
    }
  } catch (err) {
    console.warn("Username load failed:", err);
    headerUsername.textContent = "@user";
  }
});
