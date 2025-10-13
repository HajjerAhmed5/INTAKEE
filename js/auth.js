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
  document.querySelectorAll("[data-authed-only]").forEach(el => el.style.display = authed ? "" : "none");
  document.querySelectorAll("[data-anon-only]").forEach(el => el.style.display = authed ? "none" : "");
  document.querySelectorAll("[data-user-name]").forEach(el => el.textContent = authed ? (user.displayName || user.email) : "");
}
onAuthStateChanged(auth, setAuthedUI);

// SIGN UP
document.getElementById("signup-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  const name = (fd.get("displayName") || "").toString().trim();
  const email = (fd.get("email") || "").toString().trim();
  const password = (fd.get("password") || "").toString();
  const btn = e.currentTarget.querySelector("button[type=submit]");
  try {
    btn.disabled = true;
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (name) await updateProfile(cred.user, { displayName: name });
    e.currentTarget.reset();
    document.getElementById("auth-modal")?.close?.();
    alert("Account created. You’re signed in.");
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
  }
});

// LOGIN
document.getElementById("login-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  const email = (fd.get("email") || "").toString().trim();
  const password = (fd.get("password") || "").toString();
  const btn = e.currentTarget.querySelector("button[type=submit]");
  try {
    btn.disabled = true;
    await signInWithEmailAndPassword(auth, email, password);
    e.currentTarget.reset();
    document.getElementById("auth-modal")?.close?.();
    alert("Welcome back!");
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
  }
});

// LOGOUT
document.getElementById("logout-btn")?.addEventListener("click", async () => {
  try { await signOut(auth); } catch (err) { alert(err.message); }
});
