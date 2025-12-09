/* 
=====================================
INTAKEE — AUTHENTICATION SYSTEM
Handles:
- Signup
- Login (email or username)
- Logout
- Forgot password
- Forgot username
=====================================
*/

// -------------------------------
// IMPORT FIREBASE FROM CDN
// -------------------------------
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";


// -------------------------------
// INIT
// -------------------------------
const auth = getAuth();
const db = getFirestore();


// -------------------------------
// DOM ELEMENTS
// -------------------------------
const authDialog = document.getElementById("authDialog");
const openAuthBtn = document.getElementById("openAuth");
const closeAuthDialog = document.getElementById("closeAuthDialog");

const signupBtn = document.getElementById("signupBtn");
const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");
const signupUsername = document.getElementById("signupUsername");
const signupAgeConfirm = document.getElementById("signupAgeConfirm");

const loginBtn = document.getElementById("loginBtn");
const loginIdentifier = document.getElementById("loginIdentifier");
const loginPassword = document.getElementById("loginPassword");

const forgotUsernameBtn = document.getElementById("forgotUsernameBtn");
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");

const loginHeaderBtn = document.getElementById("openAuth");
const headerUsername = document.getElementById("headerUsername");


// -------------------------------
// OPEN/CLOSE AUTH MODAL
// -------------------------------
openAuthBtn.addEventListener("click", () => {
    authDialog.showModal();
});

closeAuthDialog.addEventListener("click", () => {
    authDialog.close();
});


// -------------------------------
// CREATE ACCOUNT
// -------------------------------
signupBtn.addEventListener("click", async () => {
    const email = signupEmail.value.trim();
    const password = signupPassword.value.trim();
    const username = signupUsername.value.trim().toLowerCase();

    if (!signupAgeConfirm.checked) {
        alert("You must be 13+ to create an account.");
        return;
    }

    if (!email || !password || !username) {
        alert("Please fill in all fields.");
        return;
    }

    try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const uid = cred.user.uid;

        await setDoc(doc(db, "users", uid), {
            email,
            username,
            createdAt: Date.now(),
            bio: "",
            followers: 0,
            following: 0,
            posts: 0,
            likes: 0,
            saved: [],
            history: [],
            notifications: [],
            privateAccount: false,
            uploadsPrivate: false,
            savedPrivate: false,
            playlistsPrivate: false,
        });

        alert("Account created!");
        authDialog.close();

    } catch (err) {
        alert(err.message);
    }
});


// -------------------------------
// LOG IN (EMAIL OR USERNAME)
// -------------------------------
loginBtn.addEventListener("click", async () => {
    const identifier = loginIdentifier.value.trim();
    const password = loginPassword.value.trim();

    if (!identifier || !password) {
        alert("Enter your email/username and password.");
        return;
    }

    try {
        let emailToUse = identifier;

        // If logging in with username
        if (!identifier.includes("@")) {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("username", "==", identifier.toLowerCase()));
            const snap = await getDocs(q);

            if (snap.empty) {
                alert("No account found with that username.");
                return;
            }

            emailToUse = snap.docs[0].data().email;
        }

        await signInWithEmailAndPassword(auth, emailToUse, password);
        authDialog.close();

    } catch (err) {
        alert(err.message);
    }
});


// -------------------------------
// FORGOT PASSWORD
// -------------------------------
forgotPasswordBtn.addEventListener("click", async () => {
    const identifier = loginIdentifier.value.trim();

    if (!identifier.includes("@")) {
        alert("Enter your email first.");
        return;
    }

    try {
        await sendPasswordResetEmail(auth, identifier);
        alert("Password reset email sent!");
    } catch (err) {
        alert(err.message);
    }
});


// -------------------------------
// FORGOT USERNAME
// -------------------------------
forgotUsernameBtn.addEventListener("click", async () => {
    const email = loginIdentifier.value.trim();

    if (!email.includes("@")) {
        alert("Enter your email to recover your username.");
        return;
    }

    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email));
    const snap = await getDocs(q);

    if (snap.empty) {
        alert("No account found with that email.");
        return;
    }

    const username = snap.docs[0].data().username;
    alert("Your username is: @" + username);
});


// -------------------------------
// AUTH STATE CHANGE → SHOW USERNAME
// -------------------------------
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        const data = snap.data();

        loginHeaderBtn.style.display = "none";
        headerUsername.style.display = "inline";
        headerUsername.textContent = "@" + data.username;
    } else {
        loginHeaderBtn.style.display = "inline";
        headerUsername.style.display = "none";
    }
});
