// Assume logged-out until proven otherwise
document.body.classList.add("auth-checking");
import { auth, db } from "./firebase-init.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
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

/* ================= HELPERS ================= */
const showSpinner = () => spinner?.classList.remove("hidden");
const hideSpinner = () => spinner?.classList.add("hidden");

const showToast = (msg) => {
  toast.textContent = msg;
  toast.classList.add("show");
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.remove("show"), 2500);
};

/* ================= PERSISTENCE ================= */
setPersistence(auth, browserLocalPersistence);

/* ================= SIGN UP ================= */
signupBtn?.addEventListener("click", async () => {
  const email = signupEmail.value.trim();
  const password = signupPassword.value.trim();
  const username = signupUsername.value.trim().toLowerCase();

  if (!email || !password || !username) return alert("Fill all fields.");
  if (!signupAgeConfirm.checked) return alert("Must be 13+.");

  showSpinner();

  try {
    const q = query(collection(db, "users"), where("username", "==", username));
    const snap = await getDocs(q);
    if (!snap.empty) throw new Error("Username taken.");

    const cred = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "users", cred.user.uid), {
      email,
      username,
      createdAt: Date.now(),
      followers: [],
      following: [],
      likedPosts: []
    });
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
  } catch (err) {
    hideSpinner();
    alert(err.message);
  }
});

/* ================= FORGOT PASSWORD ================= */
forgotPasswordBtn?.addEventListener("click", async () => {
  const email = loginIdentifier.value.trim();
  if (!email.includes("@")) return alert("Enter email.");
  await sendPasswordResetEmail(auth, email);
  showToast("Password reset sent 📧");
});

/* ================= AUTH STATE ================= */
onAuthStateChanged(auth, async (user) => {
  document.body.classList.remove("auth-checking");
  hideSpinner();

  if (user) {
    const snap = await getDoc(doc(db, "users", user.uid));
    const data = snap.data();

    openAuthBtn.style.display = "none";
    headerUsername.textContent = "@" + data.username;
    headerUsername.style.display = "inline-block";

    authDialog?.close();
    showToast(`Logged in as @${data.username}`);
  } else {
    openAuthBtn.style.display = "inline-block";
    headerUsername.style.display = "none";
  }
});
