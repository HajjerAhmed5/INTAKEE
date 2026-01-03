/* ===============================
   INTAKEE — AUTH (RESET & STABLE)
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

  if (!email || !password || !username) return alert("Fill all fields");
  if (!signupAgeConfirm.checked) return alert("Must be 13+");

  try {
    const q = query(collection(db, "users"), where("username", "==", username));
    const snap = await getDocs(q);
    if (!snap.empty) throw new Error("Username taken");

    const cred = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "users", cred.user.uid), {
      email,
      username,
      createdAt: Date.now()
    });
  } catch (err) {
    alert(err.message);
  }
});

/* ================= LOGIN ================= */
loginBtn?.addEventListener("click", async () => {
  const identifier = loginIdentifier.value.trim();
  const password = loginPassword.value.trim();
  if (!identifier || !password) return alert("Missing fields");

  try {
    let email = identifier;

    if (!identifier.includes("@")) {
      const q = query(collection(db, "users"), where("username", "==", identifier.toLowerCase()));
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
  if (!email.includes("@")) return alert("Enter email");
  await sendPasswordResetEmail(auth, email);
  alert("Password reset sent");
});

/* ================= AUTH STATE ================= */
onAuthStateChanged(auth, async (user) => {
  window.__AUTH_READY__ = true;
  hideSpinner();

  if (!user) {
    headerUsername.style.display = "none";
    openAuthBtn.style.display = "inline-block";
    return;
  }

  // AUTH UI FIRST
  headerUsername.textContent = "@user";
  headerUsername.style.display = "inline-block";
  openAuthBtn.style.display = "none";
  authDialog?.close();

  // Firestore optional
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      headerUsername.textContent = "@" + snap.data().username;
    }
  } catch {
    console.warn("Firestore unavailable — auth still valid");
  }
});
