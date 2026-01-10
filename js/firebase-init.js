console.log("🔥 FIREBASE INIT LOADED — CLEAN");

/* ================= FIREBASE CORE ================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js";

/* ================= FIREBASE CONFIG ================= */
export const firebaseConfig = {
  apiKey: "AIzaSyD0_tL8PxUvGT7JqCBj3tuL7s3Kipl5E6g",
  authDomain: "intakee-5785e.firebaseapp.com",
  projectId: "intakee-5785e",
  storageBucket: "intakee-5785e.appspot.com",
  messagingSenderId: "40666230072",
  appId: "1:40666230072:web:3e3875043b11d795b565cd"
};

/* ================= INIT APP ================= */
export const app = initializeApp(firebaseConfig);

/* ================= AUTH (PERSISTENCE FIRST) ================= */
export const auth = getAuth(app);
await setPersistence(auth, browserLocalPersistence);
console.log("✅ Auth persistence: LOCAL");

/* ================= SERVICES ================= */
export const db = getFirestore(app);
export const storage = getStorage(app);

console.log("✅ Firebase ready (STABLE MODE)");
