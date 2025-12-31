/* ===============================
   INTAKEE — AUTH SYSTEM (FINAL FIXED)
   Simple • Instant UI • Stable
================================ */

import { auth, db } from "./firebase-init.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
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

const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");

const loginIdentifier = document.getElementById("loginIdentifier");
const loginPassword = document.getElementById("loginPassword");

const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");
const signupUsername = document.getElementById("signupUsername");
const signupAgeConfirm = document.getElementById("signupAgeConfirm");

const headerUsername = document.getElementById("headerUsername");
const spinner = document.getElementById("authSpinner");
const toast = document.getElementById("toast");

/* ================= UI HELPERS ================= */
const showSpinner = () => spinner?.classList.remove("hidden");
const hideSpinner = () => spinner?.classList.add("hidden");

const showToast = (msg) => {
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.remove("hidden");
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
};

/* ================= MODAL ================= */
openAuthBtn?.addEventListener("click", () => authDialog?.showModal());
closeAuthBtn?.addEventListener("click", () => authDialog?.close());

/* ================= PERSISTENCE ================= */
setPersistence(auth, browserLocalPersistence);

/* ================= SIGN UP ================= */
signupBtn?.addEventListener("click", async () => {
  const email = signupEmail.value.trim();
  const password = signupPassword.value.trim();
  const username = signupUsername.value.trim().toLowerCase();

  if (!email || !password || !username) return alert("Fill all fields.");
  if (!signupAgeConfirm?.checked) return alert("You must be 13+.");

  showSpinner();

  try {
    const q = query(collection(db, "users"), where("username", "==", username));
    const snap = await getDocs(q);
    if (!snap.empty) throw new Error("Username already taken.");

    const cred = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "users", cred.user.uid), {
      email,
      username,
      createdAt: Date.now(),
      followers: [],
      following: [],
      likedPosts: []
    });

    hideSpinner();
    authDialog?.close();
    showToast("Account created 🎉");
  } catch (err) {
    hideSpinner();
    alert(err.message);
  }
});

/* ================= LOGIN ================= */
loginBtn?.addEventListener("click", async () => {
  const identifier = loginIdentifier.value.trim();
  const password = loginPassword.value.trim();
  if (!identifier || !password) return alert("Enter credentials.");

  showSpinner();

  try {
    let email = identifier;

    if (!identifier.includes("@")) {
      const q = query(
        collection(db, "users"),
        where("username", "==", identifier.toLowerCase())
      );
      const snap = await getDocs(q);
      if (snap.empty) throw new Error("User not found.");
      email = snap.docs[0].data().email;
    }

    await signInWithEmailAndPassword(auth, email, password);
    hideSpinner();
  } catch (err) {
    hideSpinner();
    alert(err.message);
  }
});

/* ================= FORGOT PASSWORD ================= */
forgotPasswordBtn?.addEventListener("click", async () => {
  const email = loginIdentifier.value.trim();
  if (!email.includes("@")) return alert("Enter your email.");
  await sendPasswordResetEmail(auth, email);
  showToast("Password reset email sent 📧");
});

/* ================= AUTH STATE ================= */
onAuthStateChanged(auth, async (user) => {
   window.__AUTH_READY__ = true;
  hideSpinner();

  if (user) {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists()) return;

    const data = snap.data();

    headerUsername.textContent = "@" + data.username;
    headerUsername.style.display = "inline-block";

    openAuthBtn && (openAuthBtn.style.display = "none");
    authDialog?.close();
  } else {
    headerUsername.style.display = "none";
    openAuthBtn && (openAuthBtn.style.display = "inline-block");
    if (user && !auth.currentUser) return; 
  }
});
