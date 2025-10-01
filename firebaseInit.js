// firebaseInit.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth }        from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getFirestore }   from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getStorage }     from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyA7QkHJhdGju0-EEAzDqpe64dqZsPou9bs",
  authDomain: "intakee-24fb7.firebaseapp.com",
  projectId: "intakee-24fb7",
  storageBucket: "intakee-24fb7.appspot.com",
  messagingSenderId: "156485573091",
  appId: "1:156485573091:web:99e0a28f5a1425f40fe8d6",
  measurementId: "G-PN4ZF9V347"
};

export const app     = initializeApp(firebaseConfig);
export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);
import { getApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
console.log("Firebase connected →", getApp().options.projectId);
