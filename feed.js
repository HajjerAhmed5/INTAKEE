/*
==========================================
INTAKEE — FEED SYSTEM
Loads posts from Firestore and displays:
- Home
- Videos
- Clips
- Podcasts (audio & video)
==========================================
*/

import {
    getFirestore,
    collection,
    query,
    orderBy,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

import {
    getAuth,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

const db = getFirestore();
const auth = getAuth();

/* DOM Containers */
const homeFeed = document.getElementById("homeFeed");
const videosFeed = document.getElementById("videosFeed");
const clipsFeed = document.getElementById("clipsFeed");
const podcastsFeed = document.getElementById("podcastsFeed");

/* =============== LOAD ALL POSTS =============== */
async function loadAllPosts() {
    const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
    const snapshot = await getDocs(q);

    const posts = [];

    snapshot.forEach((doc) => {
        posts.push({ id: doc.id, ...doc.data() });
    });

    return posts;
}

/* =============== CHECK AGE ACCESS =============== */
function canViewPost(post, user) {
    if (!post?.isAdult) return true; // no restriction

    if (!user) return false; // logged out = no 18+ view

    return true; // logged in can view
}

/* =============== RENDER A POST CARD =============== */
function createPostCard(post) {
    const card = document.createElement("div");
    card.classList.add("post-card");

    // Thumbnail or video/audio preview
    let mediaHTML = "";

    if (post.type === "video" || post.type === "podcast-video") {
        mediaHTML = `
            <video class="post-media" controls poster="${post.thumbnail || ""}">
                <source src="${post.fileURL}" />
            </video>
        `;
    } else if (post.type === "clip") {
        mediaHTML = `
            <video class="post-media" controls poster="${post.thumbnail || ""}">
                <source src="${post.fileURL}" />
            </video>
        `;
    } else if (post.type === "podcast-audio") {
        mediaHTML = `
            <img class="post-audio-thumb" src="${post.thumbnail}" />
            <audio controls>
                <source src="${post.fileURL}" />
            </audio>
        `;
    }

    card.innerHTML = `
        <div class="post-header">
            <h3>${post.title || "Untitled Post"}</h3>
            <p class="post-user">@${post.username || "user"}</p>
            <p class="post-date">${new Date(post.timestamp).toLocaleString()}</p>
        </div>

        ${mediaHTML}

        <p class="post-description">${post.description || ""}</p>
    `;

    return card;
}

/* =============== RENDER FEEDS =============== */
function renderFeeds(posts, user) {
    homeFeed.innerHTML = "";
    videosFeed.innerHTML = "";
    clipsFeed.innerHTML = "";
    podcastsFeed.innerHTML = "";

    posts.forEach((post) => {
        if (!canViewPost(post, user)) return;

        const card = createPostCard(post);

        // HOME FEED → everything
        homeFeed.appendChild(card.cloneNode(true));

        // VIDEOS
        if (post.type === "video" || post.type === "podcast-video") {
            videosFeed.appendChild(card.cloneNode(true));
        }

        // CLIPS
        if (post.type === "clip") {
            clipsFeed.appendChild(card.cloneNode(true));
        }

        // PODCASTS
        if (post.type === "podcast-audio" || post.type === "podcast-video") {
            podcastsFeed.appendChild(card.cloneNode(true));
        }
    });
}

/* =============== MAIN LOAD FUNCTION =============== */
async function loadFeed() {
    const posts = await loadAllPosts();

    onAuthStateChanged(auth, (user) => {
        renderFeeds(posts, user);
    });
}

/* =============== INITIALIZE =============== */
window.addEventListener("DOMContentLoaded", loadFeed);
