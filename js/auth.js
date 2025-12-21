/* 
=====================================
INTAKEE — AUTH SYSTEM (FINAL STABLE)
- Uses firebase-init.js
- Safe DOM guards
- Email OR Username login
- Dialog-based modal
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
export let currentUser = null;
export let currentUserData = null;

/* ================= DOM ================= */
const authDialog = document.getElementById("authDialog");
const openAuthBtn = document.getElementById("openAuth");
const closeAuthDialog = document.getElementById("closeAuthDialog");

const signupBtn = document.getElementById("signupBtn");
const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");
const signupUsername = document.getElementById("signupUsername");
const signupAgeConfirm = document.getElementById("signupAgeConfirm");

const loginBtn = document.getElementById("loginBtn");
const loginIdentifier = document.getElementById("loginIdentifier");
const loginPassword = document.getElementById("loginPassword");

const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
const forgotUsernameBtn = document.getElementById("forgotUsernameBtn");

const headerUsername = document.getElementById("headerUsername");
const logoutBtn = document.getElementById("settings-logout");

/* ================= MODAL ================= */
openAuthBtn?.addEventListener("click", () => {
  if (authDialog) authDialog.showModal();
});

closeAuthDialog?.addEventListener("click", () => {
  if (authDialog) authDialog.close();
});

/* ================= SIGN UP ================= */
signupBtn?.addEventListener("click", async () => {
  const email = signupEmail?.value.trim();
  const password = signupPassword?.value.trim();
  const username = signupUsername?.value.trim().toLowerCase();

  if (!signupAgeConfirm?.checked) {
    alert("You must be 13 or older.");
    return;
  }

  if (!email || !password || !username) {
    alert("Fill in all fields.");
    return;
  }

  try {
    // Check username uniqueness
    const q = query(collection(db, "users"), where("username", "==", username));
    const snap = await getDocs(q);
    if (!snap.empty) {
      alert("Username already taken.");
      return;
    }

    const cred = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "users", cred.user.uid), {
      email,
      username,
      bio: "",
      createdAt: Date.now(),
      followers: [],
      following: [],
      posts: 0,
      likes: 0,
      saved: [],
      history: [],
      notifications: []
    });

    authDialog?.close();
  } catch (err) {
    alert(err.message);
  }
});

/* ================= LOGIN ================= */
loginBtn?.addEventListener("click", async () => {
  const identifier = loginIdentifier?.value.trim();
  const password = loginPassword?.value.trim();

  if (!identifier || !password) {
    alert("Enter email/username and password.");
    return;
  }

  try {
    let email = identifier;

    // Username → email lookup
    if (!identifier.includes("@")) {
      const q = query(
        collection(db, "users"),
        where("username", "==", identifier.toLowerCase())
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        alert("No account found.");
        return;
      }

      email = snap.docs[0].data().email;
    }

    await signInWithEmailAndPassword(auth, email, password);
    authDialog?.close();
  } catch (err) {
    alert(err.message);
  }
});

/* ================= FORGOT PASSWORD ================= */
forgotPasswordBtn?.addEventListener("click", async () => {
  const email = loginIdentifier?.value.trim();
  if (!email || !email.includes("@")) {
    alert("Enter your email first.");
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    alert("Password reset email sent.");
  } catch (err) {
    alert(err.message);
  }
});

/* ================= FORGOT USERNAME ================= */
forgotUsernameBtn?.addEventListener("click", async () => {
  const email = loginIdentifier?.value.trim();
  if (!email || !email.includes("@")) {
    alert("Enter your email.");
    return;
  }

  const q = query(collection(db, "users"), where("email", "==", email));
  const snap = await getDocs(q);

  if (snap.empty) {
    alert("No account found.");
    return;
  }

  alert("Your username is @" + snap.docs[0].data().username);
});

/* ================= LOGOUT ================= */
logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  location.reload();
});

/* ================= AUTH STATE ================= */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;

    const snap = await getDoc(doc(db, "users", user.uid));
    currentUserData = snap.exists() ? snap.data() : null;

    if (openAuthBtn) openAuthBtn.style.display = "none";
    if (headerUsername && currentUserData) {
      headerUsername.style.display = "inline";
      headerUsername.textContent = "@" + currentUserData.username;
    }

    document.body.classList.add("logged-in");
  } else {
    currentUser = null;
    currentUserData = null;

    if (openAuthBtn) openAuthBtn.style.display = "inline";
    if (headerUsername) headerUsername.style.display = "none";

    document.body.classList.remove("logged-in");
  }
});
