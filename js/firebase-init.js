console.log("🔥 FIREBASE INIT LOADED — CLEAN");

/* ================= FIREBASE CORE ================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  getFirestore,
  enableNetwork
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js";

/* ================= FIREBASE CONFIG ================= */
export const firebaseConfig = {
  apiKey: "AIzaSyA0TOAWxcxCZ37a8BsV1Cjg0dCJl1DxW3A",
  authDomain: "intakee-upload.firebaseapp.com",
  projectId: "intakee-upload",
  storageBucket: "intakee-upload.appspot.com",
  messagingSenderId: "27015360730",
  appId: "1:27015360730:web:4e3df9db3ad85cf2db35e3"
};

/* ================= INIT APP ================= */
export const app = initializeApp(firebaseConfig);

/* ================= AUTH ================= */
export const auth = getAuth(app);
await setPersistence(auth, browserLocalPersistence);
console.log("✅ Auth persistence: LOCAL");

/* ================= FIRESTORE ================= */
export const db = getFirestore(app);
await enableNetwork(db);
console.log("🌐 Firestore forced ONLINE");

/* ================= STORAGE ================= */
export const storage = getStorage(app);

console.log("✅ Firebase ready (STABLE MODE)");
