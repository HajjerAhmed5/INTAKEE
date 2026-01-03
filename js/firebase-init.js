console.log("🔥 FIREBASE INIT LOADED — REAL KEY");

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  getFirestore,
  enableIndexedDbPersistence,
  enableNetwork
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
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
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

/* ================= FIRESTORE FIXES ================= */

// Enable persistence (prevents random disconnects)
enableIndexedDbPersistence(db).catch(err => {
  console.warn("⚠️ Firestore persistence unavailable:", err.code);
});

// 🔥 FORCE FIRESTORE ONLINE (FIXES 'client is offline')
enableNetwork(db).catch(() => {
  console.warn("⚠️ Firestore network already enabled");
});
