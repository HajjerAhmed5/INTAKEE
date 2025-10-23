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
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
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
