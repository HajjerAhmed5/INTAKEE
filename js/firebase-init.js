// /js/firebase-init.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js";

import { firebaseConfig } from "./firebase-config.js";

// 🔥 Initialize ONCE
const app = initializeApp(firebaseConfig);

// 🔥 Export singletons
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
