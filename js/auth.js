/* 
=====================================
INTAKEE — AUTHENTICATION SYSTEM
REAL APP VERSION
=====================================
*/

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// ================= INIT =================
export const auth = getAuth();
export const db = getFirestore();

// ================= GLOBAL USER STATE =================
export let currentUser = null;
export let currentUserData = null;

// ================= DOM =================
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

// ================= MODAL =================
openAuthBtn?.addEventListener("click", () => authDialog.showModal());
closeAuthDialog?.addEventListener("click", () => authDialog.close());

// ================= SIGN UP =================
signupBtn?.addEventListener("click", async () => {
  const email = signupEmail.value.trim();
  const password = signupPassword.value.trim();
  const username = signupUsername.value.trim().toLowerCase();

  if (!signupAgeConfirm.checked) {
    alert("You must be 13+ to create an account.");
    return;
  }

  if (!email || !password || !username) {
    alert("Fill in all fields.");
    return;
  }

  try {
    // Ensure username is unique
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
      followers: 0,
      following: 0,
      posts: 0,
      likes: 0,
      saved: [],
      history: [],
      notifications: [],
      privateAccount: false,
      uploadsPrivate: false,
      savedPrivate: false,
      playlistsPrivate: false
    });

    authDialog.close();
  } catch (err) {
    alert(err.message);
  }
});

// ================= LOGIN (EMAIL OR USERNAME) =================
loginBtn?.addEventListener("click", async () => {
  const identifier = loginIdentifier.value.trim();
  const password = loginPassword.value.trim();

  if (!identifier || !password) {
    alert("Enter email/username and password.");
    return;
  }

  try {
    let email = identifier;

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
    authDialog.close();
  } catch (err) {
    alert(err.message);
  }
});

// ================= FORGOT PASSWORD =================
forgotPasswordBtn?.addEventListener("click", async () => {
  const email = loginIdentifier.value.trim();
  if (!email.includes("@")) {
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

// ================= FORGOT USERNAME =================
forgotUsernameBtn?.addEventListener("click", async () => {
  const email = loginIdentifier.value.trim();
  if (!email.includes("@")) {
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

// ================= LOGOUT =================
const logoutBtn = document.getElementById("settings-logout");
logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  location.reload();
});

// ================= AUTH STATE =================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;

    const snap = await getDoc(doc(db, "users", user.uid));
    currentUserData = snap.data();

    openAuthBtn.style.display = "none";
    headerUsername.style.display = "inline";
    headerUsername.textContent = "@" + currentUserData.username;

    document.body.classList.add("logged-in");
  } else {
    currentUser = null;
    currentUserData = null;

    openAuthBtn.style.display = "inline";
    headerUsername.style.display = "none";

    document.body.classList.remove("logged-in");
  }
});
