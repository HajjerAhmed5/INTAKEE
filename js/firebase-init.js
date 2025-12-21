// js/firebase-init.js

// Firebase SDK v10.13.2 (LOCKED VERSION)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence 
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js";

import { firebaseConfig } from "./firebase-config.js";

// 1️⃣ Initialize Firebase ONCE
const app = initializeApp(firebaseConfig);

// 2️⃣ Create services ONCE
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// 3️⃣ Persist login
await setPersistence(auth, browserLocalPersistence);
