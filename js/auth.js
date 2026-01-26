/* ===============================
   INTAKEE — AUTH (FAST + STABLE)
   - INSTANT UI on login
   - Firestore runs in background
   - Offline-safe
   - Cached username
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

/* ================= LOCAL CACHE ================= */
const cacheUser = (user, username, email) => {
  localStorage.setItem(
    "intakee_user",
    JSON.stringify({ uid: user.uid, email, username })
  );
};

const getCachedUser = () => {
  try {
    return JSON.parse(localStorage.getItem("intakee_user"));
  } catch {
    return null;
  }
};

const clearCachedUser = () => {
  localStorage.removeItem("intakee_user");
};

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

/* ================= OPEN AUTH ================= */
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

    const q = query(collection(db, "users"), where("username", "==", username));
    if (!(await getDocs(q)).empty)
      throw new Error("Username already taken");

    const cred = await createUserWithEmailAndPassword(auth, email, password);

    updateProfile(cred.user, { displayName: username });

    setDoc(doc(db, "users", cred.user.uid), {
      username,
      email,
      createdAt: Date.now()
    });

    cacheUser(cred.user, username, email);

    authDialog?.close();
    alert("Welcome to INTAKEE 👋");
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

    const cached = getCachedUser();
    if (cached && cached.username === identifier) {
      email = cached.email;
    }

    if (!identifier.includes("@") && email === identifier) {
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
  } catch (err) {
    alert(err.message);
  }
});

/* ================= PASSWORD RESET ================= */
forgotPasswordBtn?.addEventListener("click", async () => {
  try {
    const email = loginIdentifier.value.trim().toLowerCase();
    if (!email.includes("@"))
      throw new Error("Enter your email");

    await sendPasswordResetEmail(auth, email);
    alert("Password reset email sent");
  } catch (err) {
    alert(err.message);
  }
});

/* ================= LOG OUT ================= */
window.logout = async () => {
  clearCachedUser();
  await signOut(auth);
};

/* ================= AUTH STATE (FAST) ================= */
onAuthStateChanged(auth, (user) => {
  window.__AUTH_READY__ = true;
  window.__AUTH_IN__ = !!user;

  /* ===== LOGGED OUT ===== */
  if (!user) {
    body.classList.add("logged-out");
    body.classList.remove("logged-in");

    clearCachedUser();

    if (headerUsername) headerUsername.style.display = "none";
    if (openAuthBtn) openAuthBtn.style.display = "inline-block";

    window.dispatchEvent(
      new CustomEvent("auth-ready", { detail: { user: null } })
    );
    return;
  }

  /* ===== LOGGED IN (INSTANT) ===== */
  body.classList.remove("logged-out");
  body.classList.add("logged-in");

  const cached = getCachedUser();
  let username =
    cached?.username ||
    user.displayName ||
    "user";

  cacheUser(user, username, user.email);

  if (headerUsername) {
    headerUsername.textContent = "@" + username;
    headerUsername.style.display = "inline-block";
  }

  if (openAuthBtn) openAuthBtn.style.display = "none";

  window.dispatchEvent(
    new CustomEvent("auth-ready", { detail: { user, username } })
  );

  /* ===== BACKGROUND FIRESTORE SYNC ===== */
  getDoc(doc(db, "users", user.uid))
    .then((snap) => {
      if (snap.exists() && snap.data().username) {
        const fresh = snap.data().username;
        cacheUser(user, fresh, user.email);
        if (headerUsername) headerUsername.textContent = "@" + fresh;

        window.dispatchEvent(
          new CustomEvent("auth-ready", {
            detail: { user, username: fresh }
          })
        );
      }
    })
    .catch(() => {});
});
