/* ===============================
   INTAKEE — AUTH (FINAL STABLE)
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

/* ================= DEBUG ================= */
console.log("AUTH.JS LOADED");
console.log("HEADER USERNAME ELEMENT:", headerUsername);

/* ================= UI ================= */
const hideSpinner = () => {
  document.getElementById("authSpinner")?.classList.add("hidden");
};

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
    // Check username uniqueness
    const q = query(collection(db, "users"), where("username", "==", username));
    const snap = await getDocs(q);
    if (!snap.empty) throw new Error("Username already taken");

    // Create auth account
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    // Create Firestore user doc
    await setDoc(doc(db, "users", cred.user.uid), {
      email,
      username,
      createdAt: Date.now()
    });

    console.log("USER CREATED:", cred.user.uid);
  } catch (err) {
    alert(err.message);
  }
});

/* ================= LOGIN ================= */
loginBtn?.addEventListener("click", async () => {
  const identifier = loginIdentifier.value.trim();
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
        where("username", "==", identifier.toLowerCase())
      );

      const snap = await getDocs(q);
      if (snap.empty) throw new Error("User not found");

      email = snap.docs[0].data().email;
    }

    await signInWithEmailAndPassword(auth, email, password);
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
  alert("Password reset sent");
});

/* ================= AUTH STATE ================= */
onAuthStateChanged(auth, async (user) => {
  console.log("AUTH STATE CHANGED:", user);
  hideSpinner();

  if (!user) {
    headerUsername?.style && (headerUsername.style.display = "none");
    openAuthBtn?.style && (openAuthBtn.style.display = "inline-block");
    return;
  }

  // Logged in UI
  headerUsername.textContent = "@loading";
  headerUsername.style.display = "inline-block";
  openAuthBtn.style.display = "none";
  authDialog?.close();

  try {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    console.log("USER DOC:", snap.exists(), snap.data());

    if (snap.exists()) {
      headerUsername.textContent = "@" + snap.data().username;
    } else {
      headerUsername.textContent = "@nouserdoc";
    }
  } catch (err) {
    console.error("USERNAME LOAD FAILED:", err);
    headerUsername.textContent = "@error";
  }
});
