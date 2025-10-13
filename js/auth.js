// js/auth.js
import { auth } from "./firebase-init.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

// helper to toggle UI
function setAuthedUI(user) {
  const authed = !!user;

  // toggle visibility for logged-in / logged-out UI elements
  document.querySelectorAll("[data-authed-only]").forEach(el => el.style.display = authed ? "" : "none");
  document.querySelectorAll("[data-anon-only]").forEach(el => el.style.display = authed ? "none" : "");
  document.querySelectorAll("[data-user-name]").forEach(el => el.textContent = authed ? (user.displayName || user.email) : "");

  // globally expose the Firebase user
  window.currentUser = user;

  // auto-disable any buttons that require auth
  document.querySelectorAll("[data-require-auth]").forEach(btn => {
    btn.disabled = !authed;
  });
}

// listen for user state changes
onAuthStateChanged(auth, (user) => {
  setAuthedUI(user);
});

// --------------------------- SIGN UP ---------------------------
document.getElementById("signup-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const fd = new FormData(form);
  const name = (fd.get("displayName") || "").toString().trim();
  const email = (fd.get("email") || "").toString().trim();
  const password = (fd.get("password") || "").toString();
  const btn = form.querySelector("button[type=submit]");

  try {
    if (btn) btn.disabled = true;
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (name) await updateProfile(cred.user, { displayName: name });

    form?.reset?.();
    document.getElementById("auth-modal")?.close?.();
    alert("Account created! You’re signed in.");
  } catch (err) {
    alert(err.message);
  } finally {
    if (btn) btn.disabled = false;
  }
});

// --------------------------- LOGIN ---------------------------
document.getElementById("login-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const fd = new FormData(form);
  const email = (fd.get("email") || "").toString().trim();
  const password = (fd.get("password") || "").toString();
  const btn = form.querySelector("button[type=submit]");

  try {
    if (btn) btn.disabled = true;
    await signInWithEmailAndPassword(auth, email, password);

    form?.reset?.();
    document.getElementById("auth-modal")?.close?.();
    alert("Welcome back!");
  } catch (err) {
    alert(err.message);
  } finally {
    if (btn) btn.disabled = false;
  }
});

// --------------------------- LOGOUT ---------------------------
document.getElementById("logout-btn")?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    alert("You’ve been signed out.");
  } catch (err) {
    alert(err.message);
  }
});
