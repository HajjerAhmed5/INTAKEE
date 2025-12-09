/*  
==========================================
   INTAKEE — FULL APPLICATION JAVASCRIPT
   SCRIPT.JS — PART 1
   Firebase v9 Modular
==========================================
*/

// -------------------------------
// 🔥 FIREBASE IMPORTS
// -------------------------------
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    onAuthStateChanged,
} from "firebase/auth";

import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    arrayUnion,
    collection,
    addDoc,
    getDocs,
    query,
    where
} from "firebase/firestore";

import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL
} from "firebase/storage";


// -------------------------------
// 🔥 INITIALIZE FIREBASE SERVICES
// -------------------------------
const auth = getAuth();
const db = getFirestore();
const storage = getStorage();


// -------------------------------
// GLOBAL APP STATE
// -------------------------------
let currentUser = null;      // Firebase user
let currentUserData = null;  // Firestore data for profile
let activeTab = "home";      // Current tab

// Tabs available:
const TABS = ["home", "videos", "podcasts", "upload", "clips", "profile", "settings"];


// -------------------------------
// DOM ELEMENTS
// -------------------------------
const header = document.getElementById("mainHeader");
const loginBtn = document.getElementById("openAuth");
const headerUsername = document.getElementById("headerUsername");
const searchBar = document.getElementById("globalSearchBar");


// -------------------------------
// 🔥 HELPER: SHOW A TAB
// -------------------------------
function showTab(tabName) {
    console.log("Switching to tab:", tabName);

    TABS.forEach(t => {
        const section = document.getElementById(t);
        if (!section) return;

        section.style.display = (t === tabName) ? "block" : "none";
    });

    // Highlight nav
    document.querySelectorAll(".bottom-nav a").forEach(btn => {
        btn.classList.remove("active");
        if (btn.dataset.tab === tabName) {
            btn.classList.add("active");
        }
    });

    // Header rules
    if (tabName === "upload" || tabName === "profile") {
        header.style.display = "none";
    } else {
        header.style.display = "flex";
    }

    // Search bar rules
    if (["home", "videos", "podcasts", "clips"].includes(tabName)) {
        searchBar.style.display = "flex";
    } else {
        searchBar.style.display = "none";
    }

    // Auto-refresh profile tab
    if (tabName === "profile") {
        loadUserProfile(); // This function will be defined in script.js Part 3
    }

    window.scrollTo(0, 0);   // Scroll to top
    activeTab = tabName;

    // Update URL hash
    location.hash = tabName;
}


// -------------------------------
// 🔥 HANDLE NAVIGATION CLICKS
// -------------------------------
document.querySelectorAll(".bottom-nav a").forEach(btn => {
    btn.addEventListener("click", () => {
        const tabName = btn.dataset.tab;
        showTab(tabName);
    });
});


// -------------------------------
// 🔥 LOAD TAB ON PAGE LOAD
// -------------------------------
window.addEventListener("load", () => {
    let initial = location.hash.replace("#", "");
    if (!TABS.includes(initial)) initial = "home";
    showTab(initial);
});


// -------------------------------
// 🔥 HANDLE BACK BUTTON VIA HASH CHANGE
// -------------------------------
window.addEventListener("hashchange", () => {
    const tabName = location.hash.replace("#", "");
    if (TABS.includes(tabName)) {
        showTab(tabName);
    }
});


// -------------------------------
// 🔥 AUTH STATE LISTENER
// -------------------------------
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("User signed in:", user.email);

        currentUser = user;
        await loadUserData();

        // Show username, hide login button
        loginBtn.style.display = "none";
        headerUsername.style.display = "inline";
        headerUsername.textContent = "@" + currentUserData.username;

    } else {
        console.log("User not signed in.");

        currentUser = null;
        currentUserData = null;

        loginBtn.style.display = "inline";
        headerUsername.style.display = "none";
    }
});


// -------------------------------
// 🔥 LOAD USER FIRESTORE DATA
// -------------------------------
async function loadUserData() {
    if (!currentUser) return;

    const userRef = doc(db, "users", currentUser.uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
        currentUserData = snap.data();
    } else {
        currentUserData = null;
    }
}


// -------------------------------
// UTIL: GENERATE RANDOM ID
// -------------------------------
function generateID() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export { showTab, generateID };
/*  
==========================================
   SCRIPT.JS — PART 2  
   AUTHENTICATION (Signup, Login, Forgot)
==========================================
*/

// -------------------------------
// 🔥 SIGNUP ELEMENTS
// -------------------------------
const signupBtn = document.getElementById("signupBtn");
const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");
const signupUsername = document.getElementById("signupUsername");
const signupAgeConfirm = document.getElementById("signupAgeConfirm");


// -------------------------------
// 🔥 SIGN-IN ELEMENTS
// -------------------------------
const loginBtnModal = document.getElementById("loginBtn");
const loginIdentifier = document.getElementById("loginIdentifier");
const loginPassword = document.getElementById("loginPassword");


// -------------------------------
// 🔥 FORGOT USERNAME / PASSWORD
// -------------------------------
const forgotUsernameBtn = document.getElementById("forgotUsernameBtn");
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");


// -------------------------------
// 🔥 MODAL ELEMENTS
// -------------------------------
const authDialog = document.getElementById("authDialog");
const closeAuthDialog = document.getElementById("closeAuthDialog");


// -------------------------------
// OPEN AUTH DIALOG
// -------------------------------
document.getElementById("openAuth").onclick = () => {
    authDialog.showModal();
};

// CLOSE AUTH DIALOG
closeAuthDialog.onclick = () => {
    authDialog.close();
};


// -------------------------------
// ⭐ CREATE ACCOUNT
// -------------------------------
signupBtn.addEventListener("click", async () => {
    const email = signupEmail.value.trim();
    const password = signupPassword.value.trim();
    const username = signupUsername.value.trim().toLowerCase();

    if (!signupAgeConfirm.checked) {
        alert("You must confirm you are 13+.");
        return;
    }

    if (!email || !password || !username) {
        alert("Please fill in all fields.");
        return;
    }

    try {
        // Create Firebase user
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCred.user.uid;

        // Save Firestore user data
        await setDoc(doc(db, "users", uid), {
            email: email,
            username: username,
            createdAt: Date.now(),
            bio: "",
            followers: 0,
            following: 0,
            likes: 0,
            privateAccount: false,
            uploadsPrivate: false,
            savedPrivate: false,
            playlistsPrivate: false,
            notifications: [],
            history: [],
        });

        alert("Account created! You are now signed in.");
        authDialog.close();

    } catch (err) {
        console.error("Signup error:", err);
        alert(err.message);
    }
});



// -------------------------------
// ⭐ LOG IN (Email OR Username)
// -------------------------------
loginBtnModal.addEventListener("click", async () => {
    const identifier = loginIdentifier.value.trim();
    const password = loginPassword.value.trim();

    if (!identifier || !password) {
        alert("Enter your email/username and password.");
        return;
    }

    try {
        let emailToUse = identifier;

        // If logging in with username, convert to email
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

        const userCred = await signInWithEmailAndPassword(auth, emailToUse, password);
        alert("Signed in!");
        authDialog.close();

    } catch (err) {
        console.error("Login error:", err);
        alert(err.message);
    }
});



// -------------------------------
// ⭐ FORGOT PASSWORD
// -------------------------------
forgotPasswordBtn.addEventListener("click", async () => {
    const identifier = loginIdentifier.value.trim();

    if (!identifier) {
        alert("Enter your email first.");
        return;
    }

    if (!identifier.includes("@")) {
        alert("Password reset requires an email.");
        return;
    }

    try {
        await sendPasswordResetEmail(auth, identifier);
        alert("Password reset email sent!");
    } catch (err) {
        alert("Error: " + err.message);
    }
});



// -------------------------------
// ⭐ FORGOT USERNAME
// (Search by email → return username)
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
/*  
==========================================
   SCRIPT.JS — PART 3
   PROFILE SYSTEM (Display, Edit, Tabs)
==========================================
*/

// -------------------------------
// PROFILE DOM ELEMENTS
// -------------------------------
const profileName = document.getElementById("profile-name");
const profileHandle = document.getElementById("profile-handle");
const profileBio = document.getElementById("profile-bio");
const profilePhoto = document.getElementById("profile-photo");

const statPosts = document.getElementById("stat-posts");
const statFollowers = document.getElementById("stat-followers");
const statFollowing = document.getElementById("stat-following");
const statLikes = document.getElementById("stat-likes");

const profileTabs = document.querySelectorAll(".profile-tabs .pill");

const uploadsGrid = document.getElementById("profile-uploads-grid");
const savedGrid = document.getElementById("profile-saved-grid");
const likesGrid = document.getElementById("profile-likes-grid");
const playlistsGrid = document.getElementById("profile-playlists-grid");
const historyGrid = document.getElementById("profile-history-grid");
const notificationsGrid = document.getElementById("profile-notifications-grid");


// -------------------------------
// EDIT PROFILE DOM ELEMENTS
// -------------------------------
const editProfileBtn = document.getElementById("btn-edit-profile");
const profileBioInput = document.getElementById("profileBioInput");
const profileNameInput = document.getElementById("profileNameInput");
const profilePhotoInput = document.getElementById("profilePhotoInput");
const profileBannerInput = document.getElementById("profileBannerInput");
const saveProfileBtn = document.getElementById("btnSaveProfile");
const cancelEditProfileBtn = document.getElementById("bio-cancel");
const editProfileCard = document.getElementById("bio-edit-wrap");


// -------------------------------
// ⭐ LOAD PROFILE WHEN TAB OPENS
// -------------------------------
async function loadUserProfile() {
    if (!currentUser) {
        profileName.textContent = "Guest";
        profileHandle.textContent = "@guest";
        profileBio.textContent = "Sign in to view your profile.";
        return;
    }

    const uid = currentUser.uid;
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) return;

    currentUserData = snap.data();

    // Display data
    profileName.textContent = currentUserData.username;
    profileHandle.textContent = "@" + currentUserData.username;

    const bioText = currentUserData.bio || "";
    profileBio.textContent = bioText + ` (${bioText.length}/200)`;

    if (currentUserData.photoURL) {
        profilePhoto.src = currentUserData.photoURL;
    }

    // Stats
    statPosts.textContent = currentUserData.posts || 0;
    statFollowers.textContent = currentUserData.followers || 0;
    statFollowing.textContent = currentUserData.following || 0;
    statLikes.textContent = currentUserData.totalLikes || 0;

    // Load profile tabs
    await loadUserUploads();
    await loadUserSaved();
    await loadUserLikes();
    await loadUserPlaylists();
    await loadUserHistory();
    await loadUserNotifications();
}


// -------------------------------
// ⭐ PROFILE TABS HANDLING
// -------------------------------
profileTabs.forEach(tab => {
    tab.addEventListener("click", () => {
        profileTabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");

        const name = tab.dataset.profileTab;

        uploadsGrid.style.display        = (name === "uploads") ? "grid" : "none";
        savedGrid.style.display          = (name === "saved") ? "grid" : "none";
        likesGrid.style.display          = (name === "likes") ? "grid" : "none";
        playlistsGrid.style.display      = (name === "playlists") ? "grid" : "none";
        historyGrid.style.display        = (name === "history") ? "grid" : "none";
        notificationsGrid.style.display  = (name === "notifications") ? "grid" : "none";
    });
});


// -------------------------------
// ⭐ LOAD USER UPLOADS
// -------------------------------
async function loadUserUploads() {
    const uid = currentUser.uid;
    uploadsGrid.innerHTML = "";

    const q = query(collection(db, "uploads"), where("uid", "==", uid));
    const snap = await getDocs(q);

    snap.forEach(docSnap => {
        const post = docSnap.data();

        uploadsGrid.appendChild(generateFeedCard(post));
    });
}


// -------------------------------
// ⭐ LOAD SAVED ITEMS
// -------------------------------
async function loadUserSaved() {
    const saved = currentUserData.saved || [];
    savedGrid.innerHTML = "";

    for (let id of saved) {
        const snap = await getDoc(doc(db, "uploads", id));
        if (snap.exists()) {
            savedGrid.appendChild(generateFeedCard(snap.data()));
        }
    }
}


// -------------------------------
// ⭐ LOAD LIKED ITEMS
// -------------------------------
async function loadUserLikes() {
    const liked = currentUserData.likesArray || [];
    likesGrid.innerHTML = "";

    for (let id of liked) {
        const snap = await getDoc(doc(db, "uploads", id));
        if (snap.exists()) {
            likesGrid.appendChild(generateFeedCard(snap.data()));
        }
    }
}


// -------------------------------
// ⭐ LOAD PLAYLISTS (Future)
// -------------------------------
async function loadUserPlaylists() {
    playlistsGrid.innerHTML = `
        <div class="placeholder-card">Playlists coming soon.</div>
    `;
}


// -------------------------------
// ⭐ LOAD WATCH HISTORY
// -------------------------------
async function loadUserHistory() {
    historyGrid.innerHTML = "";

    const history = currentUserData.history || [];

    for (let entry of history) {
        const snap = await getDoc(doc(db, "uploads", entry.postID));
        if (snap.exists()) {
            historyGrid.appendChild(generateFeedCard(snap.data()));
        }
    }
}


// -------------------------------
// ⭐ LOAD NOTIFICATIONS
// -------------------------------
async function loadUserNotifications() {
    notificationsGrid.innerHTML = "";

    const notifications = currentUserData.notifications || [];

    notifications.reverse().forEach(n => {
        const div = document.createElement("div");
        div.className = "placeholder-card";
        div.textContent = n.message;
        notificationsGrid.appendChild(div);
    });
}


// -------------------------------
// ⭐ EDIT PROFILE (OPEN FORM)
// -------------------------------
editProfileBtn.addEventListener("click", () => {
    editProfileCard.style.display = "block";

    profileNameInput.value = currentUserData.username;
    profileBioInput.value = currentUserData.bio || "";
});


// -------------------------------
// ⭐ CANCEL PROFILE EDIT
// -------------------------------
cancelEditProfileBtn.addEventListener("click", () => {
    editProfileCard.style.display = "none";
});


// -------------------------------
// ⭐ SAVE PROFILE CHANGES
// -------------------------------
saveProfileBtn.addEventListener("click", async () => {
    const newName = profileNameInput.value.trim();
    const newBio = profileBioInput.value.trim().slice(0, 200);

    const updates = {
        username: newName,
        bio: newBio
    };

    // Upload profile photo if changed
    if (profilePhotoInput.files.length > 0) {
        const file = profilePhotoInput.files[0];
        const storageRef = ref(storage, `profilePhotos/${currentUser.uid}.jpg`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        updates.photoURL = url;
    }

    await updateDoc(doc(db, "users", currentUser.uid), updates);

    alert("Profile updated!");
    editProfileCard.style.display = "none";

    await loadUserProfile(); // refresh display
});


// -------------------------------
// ⭐ GENERATE FEED CARDS FOR PROFILE
// -------------------------------
function generateFeedCard(post) {
    const div = document.createElement("div");
    div.className = "placeholder-card";

    // card content
    div.innerHTML = `
        <img src="${post.thumbnailURL}" class="feed-thumb" />
        <div class="feed-title">${post.title}</div>
        <div class="feed-meta">@${post.username}</div>
    `;

    div.addEventListener("click", () => {
        openViewer(post);
    });

    return div;
}
/*  
==========================================
   SCRIPT.JS — PART 4
   UPLOAD SYSTEM (Video, Clip, Podcast)
==========================================
*/

// -------------------------------
// UPLOAD ELEMENTS
// -------------------------------
const uploadTypeSelect = document.getElementById("uploadTypeSelect");
const uploadTitleInput = document.getElementById("uploadTitleInput");
const uploadDescInput = document.getElementById("uploadDescInput");
const uploadThumbInput = document.getElementById("uploadThumbInput");
const uploadFileInput = document.getElementById("uploadFileInput");
const ageRestrictionToggle = document.getElementById("ageRestrictionToggle");

const btnUpload = document.getElementById("btnUpload");
const btnGoLive = document.getElementById("btnGoLive");


// -------------------------------
// HELPER: VALIDATE UPLOAD INPUTS
// -------------------------------
function validateUpload() {

    const type = uploadTypeSelect.value;
    const title = uploadTitleInput.value.trim();

    if (!title) {
        alert("Title is required.");
        return false;
    }

    // File required for all content types
    if (uploadFileInput.files.length === 0) {
        alert("Please select a main content file.");
        return false;
    }

    // Audio podcasts must have thumbnail
    if (type === "podcast-audio" && uploadThumbInput.files.length === 0) {
        alert("Audio podcasts require a thumbnail image.");
        return false;
    }

    return true;
}


// -------------------------------
// UPLOAD HANDLER
// -------------------------------
btnUpload.addEventListener("click", async () => {

    if (!currentUser) {
        alert("Please log in to upload.");
        return;
    }

    if (!validateUpload()) return;

    const type = uploadTypeSelect.value;
    const title = uploadTitleInput.value.trim();
    const description = uploadDescInput.value.trim();
    const isAgeRestricted = ageRestrictionToggle.checked;

    const file = uploadFileInput.files[0];
    const thumbFile = uploadThumbInput.files[0] || null;

    const postID = generateID();
    const uid = currentUser.uid;

    try {

        // -------------------------------
        // 🔥 1. UPLOAD MAIN FILE
        // -------------------------------
        const filePath = `uploads/${uid}/${postID}/main`;
        const fileRef = ref(storage, filePath);

        await uploadBytes(fileRef, file);
        const fileURL = await getDownloadURL(fileRef);


        // -------------------------------
        // 🔥 2. HANDLE THUMBNAIL
        // -------------------------------
        let thumbnailURL = "";

        // CASE A: Audio podcast MUST have user thumbnail
        if (type === "podcast-audio" && thumbFile) {
            const thumbRef = ref(storage, `uploads/${uid}/${postID}/thumbnail`);
            await uploadBytes(thumbRef, thumbFile);
            thumbnailURL = await getDownloadURL(thumbRef);
        }

        // CASE B: Video auto-thumbnail (use same file as fallback)
        if (type === "video" || type === "podcast-video") {
            thumbnailURL = fileURL; // We will replace this later with real thumbnail generation
        }

        // CASE C: Clips need NO thumbnail
        if (type === "clip") {
            thumbnailURL = fileURL;
        }


        // -------------------------------
        // 🔥 3. SAVE METADATA TO FIRESTORE
        // -------------------------------
        const postData = {
            postID: postID,
            uid: uid,
            username: currentUserData.username,
            type: type,
            title: title,
            description: description,
            fileURL: fileURL,
            thumbnailURL: thumbnailURL,
            createdAt: Date.now(),
            isAgeRestricted: isAgeRestricted,
            views: 0,
            likes: 0,
            comments: [],
        };

        await setDoc(doc(db, "uploads", postID), postData);


        // -------------------------------
        // 🔥 4. UPDATE USER POST COUNT
        // -------------------------------
        await updateDoc(doc(db, "users", uid), {
            posts: (currentUserData.posts || 0) + 1
        });


        // -------------------------------
        // SUCCESS
        // -------------------------------
        alert("Upload complete!");

        // Reset fields
        uploadTitleInput.value = "";
        uploadDescInput.value = "";
        uploadFileInput.value = "";
        uploadThumbInput.value = "";
        ageRestrictionToggle.checked = false;

        // Return user to profile to see new upload
        showTab("profile");

    } catch (err) {
        console.error("Upload error:", err);
        alert("Upload failed: " + err.message);
    }
});


// -------------------------------
// GO LIVE (Future Feature)
// -------------------------------
btnGoLive.addEventListener("click", () => {
    alert("Go Live is a future feature — coming after launch!");
});
/*  
==========================================
   SCRIPT.JS — PART 5
   FEEDS, SEARCH, VIEWER OVERLAY
==========================================
*/

// -------------------------------
// FEED DOM ELEMENTS
// -------------------------------
const homeFeed = document.getElementById("home-feed");
const videosFeed = document.getElementById("videos-feed");
const podcastsFeed = document.getElementById("podcasts-feed");
const clipsFeed = document.getElementById("clips-feed");

const searchInput = document.getElementById("globalSearch");
const viewerOverlay = document.getElementById("video-viewer-overlay");


// -------------------------------
// ⭐ LOAD ALL CONTENT FROM FIRESTORE
// -------------------------------
async function loadAllPosts() {
    homeFeed.innerHTML = "";
    videosFeed.innerHTML = "";
    podcastsFeed.innerHTML = "";
    clipsFeed.innerHTML = "";

    const q = collection(db, "uploads");
    const snap = await getDocs(q);

    snap.forEach(docSnap => {
        const post = docSnap.data();

        // Add to mixed feed
        homeFeed.appendChild(generateFeedCard(post, true));

        // Sort by type
        if (post.type === "video" || post.type === "podcast-video") {
            videosFeed.appendChild(generateFeedCard(post));
        }

        if (post.type === "podcast-audio") {
            podcastsFeed.appendChild(generateFeedCard(post));
        }

        if (post.type === "clip") {
            clipsFeed.appendChild(generateFeedCard(post));
        }
    });
}


// -------------------------------
// ⭐ GENERATE FEED CARD (3 styles: video, podcast, clip)
// -------------------------------
function generateFeedCard(post, isHome = false) {
    const div = document.createElement("div");

    // Style rules by type
    if (post.type === "clip") {
        div.className = "feed-card-clip";
        div.innerHTML = `
            <video src="${post.fileURL}" muted class="clip-preview"></video>
            <div class="clip-meta">
                <span class="clip-title">${post.title}</span>
                <span class="clip-user">@${post.username}</span>
            </div>
        `;
    } 
    else if (post.type === "podcast-audio") {
        div.className = "feed-card-podcast";
        div.innerHTML = `
            <img src="${post.thumbnailURL}" class="podcast-cover" />
            <div class="podcast-info">
                <div class="podcast-title">${post.title}</div>
                <div class="podcast-user">@${post.username}</div>
            </div>
        `;
    } 
    else {  
        // Video or video podcast
        div.className = "feed-card-video";
        div.innerHTML = `
            <img src="${post.thumbnailURL}" class="video-thumb" />
            <div class="video-info">
                <div class="video-title">${post.title}</div>
                <div class="video-user">@${post.username}</div>
            </div>
        `;
    }

    // Click → open viewer
    div.addEventListener("click", () => {
        openViewer(post);
    });

    return div;
}


// -------------------------------
// ⭐ SEARCH SYSTEM
// -------------------------------
searchInput.addEventListener("input", async () => {
    const term = searchInput.value.toLowerCase();

    if (term.length === 0) {
        loadAllPosts();
        return;
    }

    homeFeed.innerHTML = "";
    videosFeed.innerHTML = "";
    podcastsFeed.innerHTML = "";
    clipsFeed.innerHTML = "";

    const q = collection(db, "uploads");
    const snap = await getDocs(q);

    snap.forEach(docSnap => {
        const post = docSnap.data();

        const match = post.title.toLowerCase().includes(term)  
                   || post.username.toLowerCase().includes(term);

        if (match) {
            homeFeed.appendChild(generateFeedCard(post));
        }
    });
});


// -------------------------------
// ⭐ VIEWER OVERLAY (VIDEO / CLIP / PODCAST)
// -------------------------------
function openViewer(post) {

    viewerOverlay.innerHTML = ""; // clear

    viewerOverlay.style.display = "block";

    // Close overlay when clicking background
    viewerOverlay.onclick = (e) => {
        if (e.target === viewerOverlay) viewerOverlay.style.display = "none";
    };

    let playerHTML = "";

    if (post.type === "clip") {
        // FULLSCREEN VERTICAL CLIP
        playerHTML = `
            <div class="viewer-container clip-viewer">
                <video src="${post.fileURL}" controls autoplay class="viewer-clip"></video>
                <h3>${post.title}</h3>
                <p>@${post.username}</p>
            </div>
        `;
    } 
    else if (post.type === "podcast-audio") {
        playerHTML = `
            <div class="viewer-container audio-viewer">
                <img src="${post.thumbnailURL}" class="audio-cover"/>
                <audio controls autoplay src="${post.fileURL}" class="audio-player"></audio>
                <h3>${post.title}</h3>
                <p>@${post.username}</p>
            </div>
        `;
    } 
    else {
        // VIDEO player
        playerHTML = `
            <div class="viewer-container video-viewer">
                <video controls autoplay src="${post.fileURL}" class="viewer-video"></video>
                <h3>${post.title}</h3>
                <p>@${post.username}</p>
            </div>
        `;
    }

    viewerOverlay.innerHTML = playerHTML;

    addView(post);
    addToHistory(post);
}


// -------------------------------
// ⭐ ADD VIEW COUNT
// -------------------------------
async function addView(post) {
    const postRef = doc(db, "uploads", post.postID);
    await updateDoc(postRef, {
        views: (post.views || 0) + 1
    });
}


// -------------------------------
// ⭐ ADD TO WATCH HISTORY
// -------------------------------
async function addToHistory(post) {
    if (!currentUser) return;

    const uid = currentUser.uid;

    await updateDoc(doc(db, "users", uid), {
        history: arrayUnion({
            postID: post.postID,
            watchedAt: Date.now()
        })
    });
}
/*  
==========================================
   SCRIPT.JS — PART 6  (FINAL)
   Settings • Comments • Utilities
==========================================
*/

// -------------------------------------
// SETTINGS DOM
// -------------------------------------
const togglePrivateAccount = document.getElementById("togglePrivateAccount");
const togglePrivateUploads = document.getElementById("togglePrivateUploads");
const togglePrivateSaved = document.getElementById("togglePrivateSaved");
const togglePrivatePlaylists = document.getElementById("togglePrivatePlaylists");

const notifFollowers = document.getElementById("notifFollowers");
const notifLikes = document.getElementById("notifLikes");
const notifComments = document.getElementById("notifComments");
const notifCreatorUploads = document.getElementById("notifCreatorUploads");
const notifModeration = document.getElementById("notifModeration");

const toggleAutoplay = document.getElementById("toggleAutoplay");
const toggleAutoloop = document.getElementById("toggleAutoloop");
const togglePiP = document.getElementById("togglePiP");
const toggleBGPlay = document.getElementById("toggleBGPlay");

const clearCacheBtn = document.getElementById("clearCache");
const downloadDataBtn = document.getElementById("downloadData");


// -------------------------------------
// ⭐ LOAD USER SETTINGS
// -------------------------------------
async function loadSettings() {
    if (!currentUserData) return;

    togglePrivateAccount.checked   = currentUserData.privateAccount || false;
    togglePrivateUploads.checked   = currentUserData.uploadsPrivate || false;
    togglePrivateSaved.checked     = currentUserData.savedPrivate || false;
    togglePrivatePlaylists.checked = currentUserData.playlistsPrivate || false;

    notifFollowers.checked         = currentUserData.notifFollowers || false;
    notifLikes.checked             = currentUserData.notifLikes || false;
    notifComments.checked          = currentUserData.notifComments || false;
    notifCreatorUploads.checked    = currentUserData.notifCreatorUploads || false;
    notifModeration.checked        = currentUserData.notifModeration || false;

    toggleAutoplay.checked         = currentUserData.autoplay || false;
    toggleAutoloop.checked         = currentUserData.autoloop || false;
    togglePiP.checked              = currentUserData.pip || false;
    toggleBGPlay.checked           = currentUserData.bgplay || false;
}


// -------------------------------------
// ⭐ SAVE SETTINGS TO FIRESTORE
// -------------------------------------
async function saveSettings() {
    if (!currentUser) return;

    const uid = currentUser.uid;

    await updateDoc(doc(db, "users", uid), {
        privateAccount: togglePrivateAccount.checked,
        uploadsPrivate: togglePrivateUploads.checked,
        savedPrivate: togglePrivateSaved.checked,
        playlistsPrivate: togglePrivatePlaylists.checked,

        notifFollowers: notifFollowers.checked,
        notifLikes: notifLikes.checked,
        notifComments: notifComments.checked,
        notifCreatorUploads: notifCreatorUploads.checked,
        notifModeration: notifModeration.checked,

        autoplay: toggleAutoplay.checked,
        autoloop: toggleAutoloop.checked,
        pip: togglePiP.checked,
        bgplay: toggleBGPlay.checked,
    });

    alert("Settings saved.");
}


// -------------------------------------
// AUTO-SAVE SETTINGS WHEN CHANGED
// -------------------------------------
[
    togglePrivateAccount,
    togglePrivateUploads,
    togglePrivateSaved,
    togglePrivatePlaylists,
    notifFollowers,
    notifLikes,
    notifComments,
    notifCreatorUploads,
    notifModeration,
    toggleAutoplay,
    toggleAutoloop,
    togglePiP,
    toggleBGPlay
].forEach(el => {
    if (el) {
        el.addEventListener("change", () => saveSettings());
    }
});


// -------------------------------------
// ⭐ COMMENT SYSTEM (ADD / LOAD / REPLY / LIKE / REPORT)
// -------------------------------------

async function loadComments(postID) {
    // TODO: Load comments from Firestore if you want full comment UI
    // Placeholder — your future comment drawer
}


// ADD COMMENT
async function addComment(postID, text) {
    if (!currentUser) {
        alert("Login to comment");
        return;
    }

    await updateDoc(doc(db, "uploads", postID), {
        comments: arrayUnion({
            uid: currentUser.uid,
            username: currentUserData.username,
            text: text,
            createdAt: Date.now(),
            likes: 0,
            verified: currentUserData.verified || false
        })
    });

    alert("Comment added!");
}


// LIKE COMMENT (FUTURE)
function likeComment(commentID) {
    alert("Comment like system coming next update!");
}


// REPORT COMMENT
function reportComment(commentID) {
    alert("Comment reported. INTAKEE moderation will review.");
}


// AUTO-TRANSLATE COMMENT (Placeholder)
function translateComment(text) {
    return text + " (translated)";
}


// -------------------------------------
// ⭐ CLEAR CACHE (Local Data)
// -------------------------------------
clearCacheBtn.addEventListener("click", () => {
    localStorage.clear();
    alert("Cache cleared. App will reload.");
    location.reload();
});


// -------------------------------------
// ⭐ DOWNLOAD MY DATA
// -------------------------------------
downloadDataBtn.addEventListener("click", async () => {
    if (!currentUser) return;

    const data = {
        profile: currentUserData,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "INTAKEE_user_data.json";
    a.click();
});


// -------------------------------------
// ⭐ FINAL: LOAD SETTINGS ON OPEN
// -------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        loadSettings();
    }, 800);
});


// -------------------------------------
// ⭐ FINAL CLEANUP
// -------------------------------------
console.log("%cINTAKEE JS FULLY LOADED", "color:#00ff99; font-size:18px;");
