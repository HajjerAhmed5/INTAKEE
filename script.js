// ===============================
// INTAKEE — Clean Script (Fixed)
// ===============================

// --- Firebase (modular CDN) — single version ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  getFirestore, collection, getDocs, query, orderBy, limit,
  doc, setDoc, getDoc, where, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

// --- Your real Firebase web config (fixed storageBucket) ---
const firebaseConfig = {
  apiKey: "AIzaSyD0_tL8PxUvGT7JqCBj3tuL7s3Kipl5E6g",
  authDomain: "intakee-5785e.firebaseapp.com",
  projectId: "intakee-5785e",
  storageBucket: "intakee-5785e.appspot.com", // <-- FIXED
  messagingSenderId: "40666230072",
  appId: "1:40666230072:web:3e3875043b11d795b565cd",
  measurementId: "G-3319X7HL9G"
};

// --- Initialize ONCE ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);
const st   = getStorage(app);

// (optional) expose for quick debugging
window.__fb = { auth, db, st };

/* ===============================
   0) Auth session bridge
   =============================== */
onAuthStateChanged(auth, async (user) => {
  document.dispatchEvent(new CustomEvent("intakee:auth", { detail: { user } }));
  console.log(user ? `Signed in as ${user.email}` : "Signed out");

  const authed = !!user;
  document.body.classList.toggle("authed", authed);

  if (!user) {
    putProfile(null);
    toggleAuthButtons(false);
    return;
  }

  // load or create Firestore user profile
  const uref = doc(db, "users", user.uid);
  const snap = await getDoc(uref);
  let profile;
  if (snap.exists()) {
    profile = snap.data();
  } else {
    profile = {
      uid: user.uid,
      email: user.email || "",
      displayName: user.displayName || "",
      username: "",
      usernameLower: "",
      bio: "",
      photoURL: user.photoURL || "",
      bannerURL: "",
      likes: 0,
      posts: 0,
      createdAt: serverTimestamp(),
    };
    await setDoc(uref, profile);
  }
  putProfile(profile);
  toggleAuthButtons(true);
});

// Support either sign out button id
document.getElementById("btnSignOut")?.addEventListener("click", () => signOut(auth));
document.getElementById("signout-btn")?.addEventListener("click", () => signOut(auth));

function toggleAuthButtons(on) {
  const inBtn  = document.getElementById("open-auth");
  const outBtn = document.getElementById("signout-btn") || document.getElementById("btnSignOut");
  if (inBtn)  inBtn.style.display  = on ? "none" : "inline-block";
  if (outBtn) outBtn.style.display = on ? "inline-block" : "none";
}

function putProfile(profile) {
  localStorage.setItem("intakee:user", JSON.stringify(profile || {}));
  // Optional UI hooks
  document.querySelectorAll("[data-profile-name]").forEach(el => {
    el.textContent = profile?.displayName || profile?.username || "Guest";
  });
  document.querySelectorAll("[data-username]").forEach(el => {
    el.textContent = profile?.username ? `@${profile.username}` : "";
  });
  document.querySelectorAll("[data-profile-avatar]").forEach(el => {
    el.src = profile?.photoURL || "/img/avatar-default.png";
  });
}

/* ===============================
   1) Tiny DOM helpers
   =============================== */
const qs  = (s, sc) => (sc || document).querySelector(s);
const qsa = (s, sc) => Array.from((sc || document).querySelectorAll(s));

/* ===============================
   2) Card renderers map (from index.html)
   =============================== */
const RENDERER = {
  "video":          window.renderVideoCard,
  "podcast-video":  window.renderVideoCard,
  "podcast-audio":  window.renderPodcastRow,
  "clip":           window.renderClipFullScreen
};

/* ===============================
   3) Load HOME from Firestore
   =============================== */
async function loadHomeFromFirestore() {
  const root = document.getElementById("home-feed");
  if (!root) return;

  root.innerHTML = `<p class="muted" style="text-align:center;">Loading posts…</p>`;

  try {
    const col = collection(db, "posts");
    const qy  = query(col, orderBy("createdAt", "desc"), limit(20));
    const snap = await getDocs(qy);

    root.innerHTML = "";

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
window.addEventListener("load", loadHomeFromFirestore);

/* ===============================
   4) Pills (UI only for now)
   =============================== */
qsa(".pills .pill").forEach(btn => {
  btn.addEventListener("click", () => {
    qsa(".pills .pill").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    // TODO: optional filter by type later
  });
});

/* ===============================
   5) Upload / Profile / Settings placeholders
   =============================== */
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

/* ===============================
   6) AUTH: forms (unique username)
   =============================== */
async function isUsernameTaken(username) {
  const qy = query(collection(db, "users"), where("usernameLower", "==", username.toLowerCase()));
  const s = await getDocs(qy);
  return !s.empty;
}

// Sign Up
document.getElementById("signup-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name  = document.getElementById("signup-name")?.value.trim();
  const uname = document.getElementById("signup-username")?.value.trim();
  const email = document.getElementById("signup-email")?.value.trim();
  const pass  = document.getElementById("signup-password")?.value;
  const errEl = document.getElementById("signup-error");

  try {
    if (!uname || uname.length < 3) throw new Error("Username must be at least 3 characters.");
    if (await isUsernameTaken(uname)) throw new Error("Username is taken. Try another.");

    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (name) await updateProfile(cred.user, { displayName: name });

    const uref = doc(db, "users", cred.user.uid);
    await setDoc(uref, {
      uid: cred.user.uid,
      email,
      displayName: name || "",
      username: uname,
      usernameLower: uname.toLowerCase(),
      bio: "",
      photoURL: cred.user.photoURL || "",
      bannerURL: "",
      likes: 0,
      posts: 0,
      createdAt: serverTimestamp(),
    });

    if (errEl) errEl.textContent = "";
    // If you have a modal, close it here
    // closeAuthModal?.();
  } catch (err) {
    if (errEl) errEl.textContent = err.message || "Sign up failed.";
    console.error(err);
  }
});

// Sign In
document.getElementById("signin-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("signin-email")?.value.trim();
  const pass  = document.getElementById("signin-password")?.value;
  const errEl = document.getElementById("signin-error");

  try {
    await signInWithEmailAndPassword(auth, email, pass);
    if (errEl) errEl.textContent = "";
    // closeAuthModal?.();
  } catch (err) {
    if (errEl) errEl.textContent = err.message || "Sign in failed.";
    console.error(err);
  }
});

console.log("INTAKEE ready — Firebase wired for Auth + Home feed (single init).");
