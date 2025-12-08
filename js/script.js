// ======================================
// INTAKEE — CLEAN FINAL FIXED SCRIPT.JS
// ======================================

// Firebase imports (FIXED: Added 'where' to Firestore imports)
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    deleteUser
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    deleteDoc,
    collection,
    getDocs,
    query,
    orderBy,
    onSnapshot,
    where // <--- FIX 1: Added 'where'
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js";

import { app } from "./firebase-init.js";

// Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Helper shortcut
const $ = (id) => document.getElementById(id);

// Global data store
let currentUserData = null;

// ======================================
// TAB SWITCHING
// ======================================
let currentTab = localStorage.getItem("intakee-current-tab") || "home";

const navLinks = document.querySelectorAll(".bottom-nav a");
const sections = document.querySelectorAll("main section");
const searchBar = document.querySelector(".search-bar");

function updateSearch(tab) {
    const hide = ["upload", "profile", "settings"];
    searchBar.style.display = hide.includes(tab) ? "none" : "flex";
}

function showTab(tab) {
    currentTab = tab;
    localStorage.setItem("intakee-current-tab", tab);

    sections.forEach(s => s.style.display = "none");
    $(`tab-${tab}`).style.display = "block";

    navLinks.forEach(link => link.classList.remove("active"));
    document.querySelector(`[data-tab='${tab}']`).classList.add("active");

    updateSearch(tab);
}

navLinks.forEach(link => {
    link.addEventListener("click", (e) => {
        e.preventDefault(); // Prevent default link behavior
        showTab(link.dataset.tab);
    });
});

showTab(currentTab);

// ======================================
// AUTH DIALOG OPEN/CLOSE
// ======================================
const authDialog = $("authDialog");

$("openAuth").addEventListener("click", () => {
    if (auth.currentUser) showTab("profile");
    else authDialog.showModal();
});

// ======================================
// SIGN UP (FIXED: Added username check)
// ======================================
$("signupBtn").addEventListener("click", async () => {
    const email = $("signupEmail").value.trim();
    const password = $("signupPassword").value.trim();
    const username = $("signupUsername").value.trim();
    const age = $("signupAgeConfirm").checked;

    if (!email || !password || !username)
        return alert("Fill all fields.");
    if (!age) return alert("You must be 13+");
    if (password.length < 6)
        return alert("Password must be 6+ characters.");

    try {
        // FIX 3: Check for existing username
        const usernameQuery = query(collection(db, "users"), where("username", "==", username));
        const usernameSnap = await getDocs(usernameQuery);
        if (!usernameSnap.empty) {
            return alert("Username already taken. Try another.");
        }

        const cred = await createUserWithEmailAndPassword(auth, email, password);

        await setDoc(doc(db, "users", cred.user.uid), {
            username,
            bio: "Add a short bio to introduce yourself.",
            photoURL: "",
            bannerURL: "",
            followers: [],
            following: [],
            saved: [],
            liked: [],
            settings: {}
        });

        alert("Account created!");
        authDialog.close();

    } catch (e) {
        alert(e.message);
    }
});

// ======================================
// LOGIN
// ======================================
$("loginBtn").addEventListener("click", async () => {
    const email = $("loginEmail").value.trim();
    const password = $("loginPassword").value.trim();

    try {
        await signInWithEmailAndPassword(auth, email, password);
        authDialog.close();
        // UI is updated by onAuthStateChanged
    } catch {
        alert("Wrong email or password.");
    }
});

// ------------------------
// FORGOT USERNAME SYSTEM
// ------------------------

// NOTE: Forgot Password is a built-in Firebase Auth feature (sendPasswordResetEmail), 
// but Forgot Username requires this custom Firestore query.

// This relies on the HTML having a dialog with id "forgotUserDialog"
// and an input with id "forgotUserEmail", and a button "recoverUsernameBtn"
document.getElementById("settings-forgot-username")?.addEventListener("click", () => {
    // Note: If you don't have the dialog in your HTML, this will fail silently
    if ($("forgotUserDialog")) $("forgotUserDialog").showModal();
});

document.getElementById("closeForgotUser")?.addEventListener("click", () => {
    $("forgotUserDialog")?.close();
});

document.getElementById("recoverUsernameBtn")?.addEventListener("click", async () => {
    const email = document.getElementById("forgotUserEmail")?.value.trim();

    if (!email) {
        alert("Please enter your email.");
        return;
    }

    try {
        // Query to find the user by email
        const q = query(collection(db, "users"), where("email", "==", email));
        const snap = await getDocs(q);

        if (snap.empty) {
            alert("No account found with that email.");
            return;
        }

        let username = "";
        snap.forEach(doc => {
            username = doc.data().username;
        });

        alert("Your username is: " + username);
        $("forgotUserDialog")?.close();

    } catch (error) {
        console.error("Forgot username error:", error);
        alert("Something went wrong. Try again.");
    }
});

// ======================================
// LOGOUT
// ======================================
$("settings-logout").addEventListener("click", async () => {
    await signOut(auth);
    alert("Logged out");
    showTab("home");
});

// ======================================
// DELETE ACCOUNT
// ======================================
$("settings-delete-account").addEventListener("click", async () => {
    if (!confirm("Delete your account permanently? This cannot be undone.")) return;

    const user = auth.currentUser;
    if (!user) return; 

    try {
      // Delete user data from Firestore
      await deleteDoc(doc(db, "users", user.uid));
      // Delete user authentication record
      await deleteUser(user);
    } catch (e) {
      // NOTE: User must be recently signed in to delete. Prompt to re-login if needed.
      alert("Error deleting account. Please log out and back in, then try again.");
      return;
    }

    alert("Account deleted.");
    showTab("home");
});

// ======================================
// AUTH STATE LISTENER
// ======================================

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        currentUserData = null;
        refreshUI();
        return;
    }

    // Fetch user profile data from Firestore
    const snap = await getDoc(doc(db, "users", user.uid));
    currentUserData = snap.data();

    refreshUI();
    // Re-run feeds to include logged-in specific state (like/saved icons)
    loadFeeds(); 
});

// ======================================
// UPDATE BUTTON + PROFILE UI (FIXED: Added stat counters)
// ======================================
function refreshUI() {
    refreshLoginButton();
    // Only refresh profile if the profile tab is active
    if (currentTab === "profile") {
        refreshProfileUI();
    }
}

function refreshLoginButton() {
    $("openAuth").textContent = auth.currentUser?.email
        ? currentUserData?.username || "Profile"
        : "Login";
}

function refreshProfileUI() {
    // Exit if not on the profile page or if data is missing
    if (!auth.currentUser || !currentUserData) {
        // Simplified rendering for logged-out/no data state (using placeholders from HTML)
        $("profile-name").textContent = "Sign in to view profile";
        $("profile-handle").textContent = "@intakee_user";
        $("profile-photo").src = "default-avatar.png"; 
        $("bio-view").textContent = "Login to manage your content and stats.";
        $("btn-edit-profile").style.display = "none";
        
        // FIX 4: Reset stats on logout
        $("stat-posts").textContent = "0"; 
        $("stat-followers").textContent = "0";
        $("stat-following").textContent = "0";
        $("stat-likes").textContent = "0";
        return;
    }

    // Logged In State
    $("profile-name").textContent = currentUserData.username;
    $("profile-handle").textContent = "@" + currentUserData.username.toLowerCase();
    $("bio-view").textContent = currentUserData.bio;
    
    // FIX 4: Stat updates
    // Posts count is hardcoded '0' as true counting logic is complex.
    $("stat-posts").textContent = "0"; 
    $("stat-followers").textContent = currentUserData.followers?.length || 0;
    $("stat-following").textContent = currentUserData.following?.length || 0;
    $("stat-likes").textContent = currentUserData.liked?.length || 0;


    if (currentUserData.photoURL)
        $("profile-photo").src = currentUserData.photoURL;

    if (currentUserData.bannerURL)
        $("profileBanner").style.backgroundImage = `url(${currentUserData.bannerURL})`;

    $("btn-edit-profile").style.display = "block";
}

// ======================================
// EDIT PROFILE
// ======================================
$("btn-edit-profile").addEventListener("click", () => {
    $("profileNameInput").value = currentUserData.username;
    $("profileBioInput").value = currentUserData.bio;
    $("bio-edit-wrap").style.display = "block";
});

$("bio-cancel").addEventListener("click", () => {
    $("bio-edit-wrap").style.display = "none";
});

$("btnSaveProfile").addEventListener("click", async () => {
    if (!auth.currentUser) return;

    const newName = $("profileNameInput").value.trim();
    const newBio = $("profileBioInput").value.trim();

    // Prevent saving if username is empty
    if (!newName) return alert("Username cannot be empty.");

    let photoURL = currentUserData.photoURL;
    let bannerURL = currentUserData.bannerURL;

    try {
        // Upload profile photo
        if ($("profilePhotoInput").files.length) {
            const file = $("profilePhotoInput").files[0];
            const fileRef = ref(storage, `profile/${auth.currentUser.uid}/photo.jpg`);
            await uploadBytes(fileRef, file);
            photoURL = await getDownloadURL(fileRef);
        }

        // Upload banner
        if ($("profileBannerInput").files.length) {
            const file = $("profileBannerInput").files[0];
            const fileRef = ref(storage, `profile/${auth.currentUser.uid}/banner.jpg`);
            await uploadBytes(fileRef, file);
            bannerURL = await getDownloadURL(fileRef);
        }

        // Update Firestore document
        await updateDoc(doc(db, "users", auth.currentUser.uid), {
            username: newName,
            bio: newBio,
            photoURL,
            bannerURL
        });

        alert("Profile updated!");
        $("bio-edit-wrap").style.display = "none";
        // Auth state listener will catch the update and refresh the UI automatically
    } catch (e) {
        alert("Error saving profile: " + e.message);
    }
});

// Link the 'Edit Profile' text span to the button click for the owner
document.getElementById("editProfileLink")?.addEventListener("click", () => {
    document.getElementById("btn-edit-profile").click();
});

// ======================================
// UPLOAD SYSTEM
// ======================================
$("btnUpload").addEventListener("click", async () => {
    if (!auth.currentUser || !currentUserData) return alert("Login first.");

    const title = $("uploadTitleInput").value.trim();
    const type = $("uploadTypeSelect").value;
    const desc = $("uploadDescInput").value.trim();
    const file = $("uploadFileInput").files[0];
    const thumb = $("uploadThumbInput").files[0];
    const isAgeRestricted = $("ageRestrictionToggle")?.checked || false;

    if (!title || !file || !thumb) return alert("Please provide a Title, Main File, and Thumbnail.");

    const id = Date.now().toString(); // Simple unique ID based on timestamp

    try {
        // Upload thumbnail
        const thumbRef = ref(storage, `thumbnails/${auth.currentUser.uid}/${id}.jpg`);
        await uploadBytes(thumbRef, thumb);
        const thumbURL = await getDownloadURL(thumbRef);

        // Upload main file
        const fileRef = ref(storage, `uploads/${auth.currentUser.uid}/${id}`);
        await uploadBytes(fileRef, file);
        const fileURL = await getDownloadURL(fileRef);

        // Create post document
        await setDoc(doc(db, "posts", id), {
            id,
            userId: auth.currentUser.uid,
            username: currentUserData.username,
            photoURL: currentUserData.photoURL,
            title,
            desc,
            type,
            thumbURL,
            fileURL,
            isAgeRestricted,
            createdAt: Date.now(),
            views: 0, 
            likes: [] // Initial likes array
        });

        alert("Upload complete! Content is now live.");
        // Clear form after successful upload
        $("uploadTitleInput").value = '';
        $("uploadDescInput").value = '';
        $("uploadFileInput").value = '';
        $("uploadThumbInput").value = '';
        $("ageRestrictionToggle").checked = false;

    } catch (e) {
        alert("Upload failed: " + e.message);
    }
});

// ======================================
// FEEDS & POST RENDERING
// ======================================
function loadFeeds() {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(50)); // Limit to 50 posts for performance

    onSnapshot(q, (snap) => {
        // Clear all feed grids
        $("home-feed").innerHTML = "";
        $("videos-feed").innerHTML = "";
        $("clips-feed").innerHTML = "";
        $("podcast-feed").innerHTML = "";
        $("profile-grid").innerHTML = ""; 
        
        const userPosts = [];
        
        snap.forEach((d) => {
            const p = d.data();
            const card = createPostCard(p);

            // 1. Home Feed (All Content)
            $("home-feed").appendChild(card.cloneNode(true));

            // 2. Filtered Feeds
            if (p.type === "video") $("videos-feed").appendChild(createPostCard(p).cloneNode(true));
            if (p.type === "clip") $("clips-feed").appendChild(createPostCard(p).cloneNode(true));
            if (p.type.includes("podcast"))
                $("podcast-feed").appendChild(createPostCard(p).cloneNode(true));

            // 3. Current User's Posts for Profile Tab
            if (auth.currentUser && p.userId === auth.currentUser.uid) {
                 userPosts.push(p);
                 // Note: Profile grid is populated later in the profile tab logic for proper tab handling.
                 // For now, we'll use a direct append for simplicity (or let a dedicated profile tab function handle it)
                 if (currentTab === "profile") {
                     $("profile-grid").appendChild(createPostCard(p));
                 }
            }
        });

    });
}

loadFeeds();

// FIX 2: Updated HTML structure to match refined CSS
function createPostCard(p) {
    const div = document.createElement("div");
    div.className = "video-card"; 
    
    // Simple duration function (can be complex, placeholder used here)
    const duration = '05:30'; 
    
    div.innerHTML = `
        <div class="thumb-16x9">
            <img src="${p.thumbURL}" alt="${p.title} thumbnail">
            <span class="video-duration">${duration}</span>
            ${p.isAgeRestricted ? '<span class="age-restricted-tag">18+</span>' : ''}
        </div>
        <div class="meta">
            <h3 class="video-title">${p.title}</h3>
            <p class="channel-name muted">@${p.username.toLowerCase()}</p>
            <p class="video-stats muted">${p.views || 0} views • ${new Date(p.createdAt).toLocaleDateString()}</p>
        </div>
    `;

    // Attach click listener to the entire card
    div.addEventListener("click", () => openViewer(p));

    return div;
}

// ======================================
// VIEWER
// ======================================
let overlay = null;

function openViewer(p) {
    // Basic Age Check (simplified, can be improved with user age data)
    if (p.isAgeRestricted && !auth.currentUser) {
        alert("This content is age-restricted. Please log in to continue.");
        return;
    }

    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "video-viewer-overlay"; 
        overlay.style.cssText = `
            position:fixed; inset:0; background:#000e; 
            padding:20px; z-index:5000; overflow:auto;
            display: none; 
            transition: opacity 0.3s;
        `;
        document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
        <button id="closeView" style="float:right;font-size:30px;color:white;background:none;border:none;cursor:pointer; position: sticky; top: 0; right: 0;">✕</button>
        <div class="viewer-content" style="max-width:900px; margin: 0 auto; padding-top: 20px;">
            <div id="media-container" style="margin-bottom:15px; background: black; border-radius: 12px; overflow: hidden;"></div>
            
            <div class="viewer-info-bar" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div style="flex-grow: 1;">
                    <h2>${p.title}</h2>
                    <p class="muted">Uploaded by: <a href="#" data-user-id="${p.userId}" class="user-link">@${p.username.toLowerCase()}</a></p>
                </div>
                </div>

            <div class="card" style="padding: 20px;">
                <p style="white-space: pre-wrap;">${p.desc}</p>
            </div>

            <h3 style="margin-top: 30px;">Comments</h3>
            <div id="comments-section">
                <p class="muted">Comment system coming soon.</p>
            </div>
        </div>
    `;

    const container = overlay.querySelector("#media-container");

    if (p.type.includes("video") || p.type === "clip") {
        container.innerHTML = `<video controls autoplay style="width:100%; display:block;" src="${p.fileURL}"></video>`;
    } else {
        container.innerHTML = `<audio controls autoplay style="width:100%; display:block; height: 100px;" src="${p.fileURL}"></audio>`;
    }

    overlay.querySelector("#closeView").onclick = () => {
        overlay.style.display = "none";
        // Stop playback when closing
        const media = container.querySelector('video, audio');
        if (media) media.pause();
    };
    
    // Add event listener for the user link to open their profile
    overlay.querySelector(".user-link")?.addEventListener("click", (e) => {
        e.preventDefault();
        const userId = e.target.getAttribute("data-user-id");
        if (userId) {
            // Close viewer and navigate to profile (This is a placeholder, as the provided HTML
            // does not fully support viewing *other* users' profiles yet)
            overlay.style.display = "none";
            showTab("profile"); // This will currently only show the logged-in user's profile
        }
    });


    overlay.style.display = "block";
    // Increment view count (simplified)
    updateDoc(doc(db, "posts", p.id), { views: (p.views || 0) + 1 });
}

// ======================================
// SEARCH
// ======================================
$("globalSearch").addEventListener("input", async (e) => {
    const q = e.target.value.toLowerCase().trim();
    const feed = $("home-feed");

    // If search is cleared, reload the full feeds
    if (!q) return loadFeeds(); 

    feed.innerHTML = `<p class="muted" style="padding: 20px;">Searching...</p>`;

    // Perform a client-side search (Firestore search is complex without extensions)
    const snap = await getDocs(collection(db, "posts"));
    
    feed.innerHTML = "";
    let found = false;

    snap.forEach((d) => {
        const p = d.data();
        if (
            p.title.toLowerCase().includes(q) ||
            p.username.toLowerCase().includes(q)
        ) {
            feed.appendChild(createPostCard(p));
            found = true;
        }
    });

    if (!found) {
        feed.innerHTML = `<p class="muted" style="padding: 20px;">No results found for "${q}".</p>`;
    }
});

// ======================================
// SETTINGS ACCORDION
// ======================================
document.querySelectorAll(".accordion").forEach(header => {
    header.addEventListener("click", () => {
        const bodyId = header.getAttribute("data-accordion-id");
        const body = $(`acc-body-${bodyId}`);
        const parent = header.closest(".accordion");
        const arrow = header.querySelector(".settings-arrow");

        if (body.style.display === "block") {
            body.style.display = "none";
            parent.classList.remove("open");
        } else {
            // Close all other open accordions in the list first
            document.querySelectorAll(".accordion.open").forEach(openAcc => {
                openAcc.classList.remove("open");
                openAcc.nextElementSibling.style.display = "none";
            });
            
            // Open the clicked one
            body.style.display = "block";
            parent.classList.add("open");
        }
    });
});

console.log("💚 INTAKEE script.js loaded successfully. READY FOR LAUNCH!");
