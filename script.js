// --- Firebase (modular CDN) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, collection, getDocs, query, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// TODO: replace these with your real Firebase web config (from Firebase Console → Project settings → General → Your apps → Web app → "CDN")
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD0_tL8PxUvGT7JqCBj3tuL7s3Kipl5E6g",
  authDomain: "intakee-5785e.firebaseapp.com",
  projectId: "intakee-5785e",
  storageBucket: "intakee-5785e.firebasestorage.app",
  messagingSenderId: "40666230072",
  appId: "1:40666230072:web:3e3875043b11d795b565cd",
  measurementId: "G-3319X7HL9G"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);
const st   = getStorage(app);

// (optional) expose for quick debugging
window.__fb = { auth, db, st };

/* ===============================
   INTAKEE — Core JS Scaffold
   =============================== */

// ---------- 0) Auth event ----------
onAuthStateChanged(auth, (user) => {
  document.dispatchEvent(new CustomEvent("intakee:auth", { detail: { user } }));
  console.log(user ? `Signed in as ${user.email}` : "Signed out");
});

// --- Logout button ---
document.getElementById("btnSignOut")?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    console.log("User signed out");
  } catch (err) {
    console.error("Logout error:", err);
  }
});

// ---------- 1) Tiny helpers ----------
const qs  = (s, sc) => (sc || document).querySelector(s);
const qsa = (s, sc) => Array.from((sc || document).querySelectorAll(s));
const append = (el, ...kids) => { kids.forEach(k => k && el.appendChild(k)); return el; };

// ---------- 2) Map Firestore 'type' → renderer from index.html ----------
const RENDERER = {
  "video":          window.renderVideoCard,
  "podcast-video":  window.renderVideoCard,
  "podcast-audio":  window.renderPodcastRow,
  "clip":           window.renderClipFullScreen
};

// ---------- 3) Load HOME from Firestore ----------
async function loadHomeFromFirestore() {
  const root = document.getElementById("home-feed");
  if (!root) return;

  root.innerHTML = `<p class="muted" style="text-align:center;">Loading posts…</p>`;

  try {
    const col = collection(db, "posts");
    const qy  = query(col, orderBy("createdAt", "desc"), limit(20));
    const snap = await getDocs(qy);

    root.innerHTML = ""; // clear

    if (snap.empty) {
      root.innerHTML = `<p class="muted" style="text-align:center;">No posts yet — add one in Firestore to test.</p>`;
      return;
    }

    snap.forEach(docSnap => {
      const p = { id: docSnap.id, ...docSnap.data() };
      const render = RENDERER[p.type] || RENDERER["video"];
      try {
        root.appendChild(render(p));
      } catch (e) {
        // Fallback simple card if a renderer is missing
        const card = document.createElement("article");
        card.className = "card ratio-16x9";
        card.innerHTML = `
          <img src="${p.thumbnailUrl || ""}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:12px;">
          <div class="clip-meta"><div class="text">${p.title || ""}</div></div>
        `;
        root.appendChild(card);
      }
    });
  } catch (e) {
    console.error("Home feed error:", e);
    root.innerHTML = `<p class="muted" style="text-align:center;">Error loading feed. Check console.</p>`;
  }
}

// Run once on load
window.addEventListener("load", loadHomeFromFirestore);

// ---------- 4) (Optional) Search/filters placeholders ----------
qsa(".pills .pill").forEach(btn => {
  btn.addEventListener("click", () => {
    qsa(".pills .pill").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    // TODO: future filter by type
  });
});

// ---------- 5) Upload / Profile / Settings placeholders (unchanged) ----------
qs("#btnUpload")?.addEventListener("click", () => {
  alert("TODO: Wire Firebase upload logic here.");
});

qs("#btn-edit-profile")?.addEventListener("click", () => {
  qs("#bio-view").style.display = "none";
  qs("#bio-edit-wrap").style.display = "";
  qs("#profileNameInput").value = qs("#profile-name").textContent || "";
  qs("#profileBioInput").value  = "Freedom to create. Simple to share.";
});
qs("#bio-cancel")?.addEventListener("click", () => {
  qs("#bio-view").style.display = "";
  qs("#bio-edit-wrap").style.display = "none";
});
qs("#btnSaveProfile")?.addEventListener("click", () => {
  const name = qs("#profileNameInput").value.trim();
  const bio  = qs("#profileBioInput").value.trim();
  if (name) qs("#profile-name").textContent = name;
  qs("#bio-view").textContent = bio || " ";
  qs("#bio-view").style.display = "";
  qs("#bio-edit-wrap").style.display = "none";
  alert("Saved (placeholder).");
});

["private","uploads","likes","saved","playlists"].forEach(key => {
  const el = qs(`#toggle-${key}`);
  if (!el) return;
  const saved = localStorage.getItem(`privacy:${key}`);
  if (saved) el.setAttribute("data-on", saved === "true");
  el.addEventListener("click", () => {
    const on = el.getAttribute("data-on") !== "true";
    el.setAttribute("data-on", on ? "true" : "false");
    localStorage.setItem(`privacy:${key}`, String(on));
  });
});

// Tiny dev hook
window.__INTAKEE__ = { reloadHome: loadHomeFromFirestore };
console.log("INTAKEE ready — Firebase wired for Home feed.");
// --- Firebase (CDN modular) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, updateProfile, signOut
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// 1) Your Firebase config (fill these)
const firebaseConfig = {
  apiKey: "<API_KEY>",
  authDomain: "<PROJECT_ID>.firebaseapp.com",
  projectId: "<PROJECT_ID>",
  storageBucket: "<PROJECT_ID>.appspot.com",
  messagingSenderId: "<SENDER_ID>",
  appId: "<APP_ID>",
};
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// 2) Minimal helpers
async function isUsernameTaken(username) {
  const q = query(collection(db, "users"), where("usernameLower", "==", username.toLowerCase()));
  const s = await getDocs(q);
  return !s.empty;
}
function putProfile(profile) {
  localStorage.setItem("intakee:user", JSON.stringify(profile || {}));
  // optional: update UI spots if you already have them
  document.querySelectorAll("[data-profile-name]").forEach(el => el.textContent = profile?.displayName || profile?.username || "Guest");
  document.querySelectorAll("[data-username]").forEach(el => el.textContent = profile?.username ? `@${profile.username}` : "");
  document.querySelectorAll("[data-profile-avatar]").forEach(el => el.src = profile?.photoURL || "/img/avatar-default.png");
}

// 3) Sign Up handler
document.getElementById("signup-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("signup-name").value.trim();
  const user = document.getElementById("signup-username").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const pass = document.getElementById("signup-password").value;

  try {
    if (user.length < 3) throw new Error("Username must be at least 3 characters.");
    if (await isUsernameTaken(user)) throw new Error("Username is taken. Try another.");

    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (name) await updateProfile(cred.user, { displayName: name });

    const uref = doc(db, "users", cred.user.uid);
    await setDoc(uref, {
      uid: cred.user.uid,
      email,
      displayName: name || "",
      username: user,
      usernameLower: user.toLowerCase(),
      bio: "",
      photoURL: cred.user.photoURL || "",
      bannerURL: "",
      likes: 0,
      posts: 0,
      createdAt: serverTimestamp(),
    });

    // close your modal if you have one
    document.getElementById("signup-error")?.textContent = "";
  } catch (err) {
    document.getElementById("signup-error")?.textContent = err.message || "Sign up failed.";
  }
});

// 4) Sign In handler
document.getElementById("signin-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("signin-email").value.trim();
  const pass  = document.getElementById("signin-password").value;
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    document.getElementById("signin-error")?.textContent = "";
  } catch (err) {
    document.getElementById("signin-error")?.textContent = err.message || "Sign in failed.";
  }
});

// 5) Sign Out (optional button with id="signout-btn")
document.getElementById("signout-btn")?.addEventListener("click", () => signOut(auth));

// 6) Keep session & UI in sync
onAuthStateChanged(auth, async (u) => {
  const authed = !!u;
  document.body.classList.toggle("authed", authed);
  if (!u) { putProfile(null); return; }

  const snap = await getDoc(doc(db, "users", u.uid));
  const profile = snap.exists() ? snap.data() : {
    uid: u.uid, email: u.email || "", displayName: u.displayName || "", username: "", photoURL: u.photoURL || ""
  };
  putProfile(profile);

  // Toggle buttons if you have them
  const inBtn = document.getElementById("open-auth");
  const outBtn = document.getElementById("signout-btn");
  if (inBtn) inBtn.style.display = authed ? "none" : "inline-block";
  if (outBtn) outBtn.style.display = authed ? "inline-block" : "none";
});
