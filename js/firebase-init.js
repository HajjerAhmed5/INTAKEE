// js/firebase-init.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence } 
  from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getFirestore } 
  from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD0_tL8PxUvGT7JqCBj3tuL7s3Kipl5E6g",
  authDomain: "intakee-5785e.firebaseapp.com",
  projectId: "intakee-5785e",
  storageBucket: "intakee-5785e.firebasestorage.app",
  messagingSenderId: "40666230072",
  appId: "1:40666230072:web:49dd5e7db91c8a38b565cd",
  measurementId: "G-3C2YDV6T0G"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

await setPersistence(auth, browserLocalPersistence);
