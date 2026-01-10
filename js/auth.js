/* ===============================
   INTAKEE — AUTH (FAST + POLISHED)
   - Welcome messages
   - Faster perceived login
   - Firestore username support
================================ */

import { auth, db } from "./firebase-init.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
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

/* ================= GLOBAL FLAGS ================= */
window.__AUTH_READY__ = false;
window.__AUTH_IN__ = false;

/* ================= DOM ================= */
const body = document.body;

const authDialog = document.getElementById("authDialog");
const openAuthBtn = document.getElementById("openAuth");
const headerUsername = document.getElementById("headerUsername");

const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");

const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");
const signupUsername = document.getElementById("signupUsername");
const signupAgeConfirm = document.getElementById("signupAgeConfirm");

const loginIdentifier = document.getElementById("loginIdentifier");
const loginPassword = document.getElementById("loginPassword");

/* ================= OPEN AUTH MODAL ================= */
openAuthBtn?.addEventListener("click", () => {
  if (authDialog && !authDialog.open) authDialog.showModal();
});

/* ================= SIGN UP ================= */
signupBtn?.addEventListener("click", async () => {
  try {
    const email = signupEmail.value.trim().toLowerCase();
    const password = signupPassword.value.trim();
    const username = signupUsername.value.trim().toLowerCase();

    if (!email || !password || !username)
      throw new Error("Fill all fields");

    if (!signupAgeConfirm.checked)
      throw new Error("You must be 13 or older");

    // Username check (only unavoidable delay)
    const q = query(collection(db, "users"), where("username", "==", username));
    if (!(await getDocs(q)).empty)
      throw new Error("Username already taken");

    const cred = await createUserWithEmailAndPassword(auth, email, password);

    // Fire & forget profile updates (do NOT block UI)
    updateProfile(cred.user, { displayName: username });
    setDoc(doc(db, "users", cred.user.uid), {
      username,
      email,
      createdAt: Date.now()
    });

    authDialog?.close();
    setTimeout(() => alert("Welcome to INTAKEE 👋"), 200);
  } catch (err) {
    alert(err.message);
  }
});

/* ================= LOGIN ================= */
loginBtn?.addEventListener("click", async () => {
  try {
    const identifier = loginIdentifier.value.trim().toLowerCase();
    const password = loginPassword.value.trim();

    if (!identifier || !password)
      throw new Error("Missing login fields");

    let email = identifier;

    if (!identifier.includes("@")) {
      const q = query(
        collection(db, "users"),
        where("username", "==", identifier)
      );
      const snap = await getDocs(q);
      if (snap.empty) throw new Error("Invalid credentials");
      email = snap.docs[0].data().email;
    }

    await signInWithEmailAndPassword(auth, email, password);

    authDialog?.close();
    setTimeout(() => alert("Welcome back 👋"), 150);
  } catch (err) {
    alert(err.message);
  }
});

/* ================= PASSWORD RESET ================= */
forgotPasswordBtn?.addEventListener("click", async () => {
  try {
    const email = loginIdentifier.value.trim().toLowerCase();
    if (!email.includes("@"))
      throw new Error("Enter your email address");

    await sendPasswordResetEmail(auth, email);
    alert("Password reset email sent");
  } catch (err) {
    alert(err.message);
  }
});

/* ================= SIGN OUT ================= */
window.logout = async () => {
  await signOut(auth);
};

/* ================= AUTH STATE ================= */
onAuthStateChanged(auth, async (user) => {
  window.__AUTH_READY__ = true;
  window.__AUTH_IN__ = !!user;

  if (!user) {
    body.classList.add("logged-out");
    body.classList.remove("logged-in");

    if (headerUsername) headerUsername.style.display = "none";
    if (openAuthBtn) openAuthBtn.style.display = "inline-block";

    window.dispatchEvent(
      new CustomEvent("auth-ready", { detail: { user: null } })
    );
    return;
  }

  body.classList.remove("logged-out");
  body.classList.add("logged-in");

  const snap = await getDoc(doc(db, "users", user.uid));
  const username = snap.exists()
    ? snap.data().username
    : user.displayName;

  if (headerUsername) {
    headerUsername.textContent = "@" + username;
    headerUsername.style.display = "inline-block";
  }

  if (openAuthBtn) openAuthBtn.style.display = "none";

  window.dispatchEvent(
    new CustomEvent("auth-ready", { detail: { user, username } })
  );
});
