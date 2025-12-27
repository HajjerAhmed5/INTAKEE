/****************************************************
 * VIEWER.JS — FULL FINAL VERSION
 * Works with your main script.js
 * Includes:
 * - Load post
 * - Video / Audio player
 * - Like / Dislike
 * - Save / Unsave
 * - Comments
 * - Comment count
 * - Creator info
 * - Follow / Unfollow
 * - View counter
 ****************************************************/
const params = new URLSearchParams(window.location.search);
const postId = params.get("id");

if (!postId) {
  document.body.innerHTML = "<p style='color:white'>Post not found</p>";
}

import {
  getFirestore, doc, getDoc, updateDoc, increment
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  getAuth, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getApp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
  collection, query, where, orderBy, addDoc, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  arrayUnion, arrayRemove
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getStorage, ref, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// Init
const app = getApp();
const db = getFirestore(app);
const auth = getAuth(app);

// Shortcuts
const qs  = (x) => document.querySelector(x);

// Page Elements
const vVideo        = qs("#viewer-video");
const vAudio        = qs("#viewer-audio");
const titleEl       = qs("#viewer-title");
const descEl        = qs("#viewer-description");
const usernameEl    = qs("#viewer-creator-username");
const nameEl        = qs("#viewer-creator-name");
const photoEl       = qs("#viewer-creator-photo");

const likeBtn       = qs("#viewer-like-btn");
const dislikeBtn    = qs("#viewer-dislike-btn");
const saveBtn       = qs("#viewer-save-btn");
const likeCountEl   = qs("#viewer-like-count");

const commentsWrap  = qs("#viewer-comments");
const commentInput  = qs("#viewer-comment-input");
const commentBtn    = qs("#viewer-comment-btn");

const followBtn     = qs("#viewer-follow-btn");

let currentUser = null;
let currentPost = null;
let currentPostId = null;


/****************************************************
 * AUTH LISTENER — get logged in user
 ****************************************************/
onAuthStateChanged(auth, (user) => {
  currentUser = user || null;
});


/****************************************************
 * INIT VIEWER
 ****************************************************/
document.addEventListener("DOMContentLoaded", () => {
  initViewer();
});


async function initViewer() {
  const params = new URLSearchParams(window.location.search);
  currentPostId = params.get("id");

  if (!currentPostId) {
    alert("Missing post ID.");
    return;
  }

  const snap = await getDoc(doc(db, "posts", currentPostId));
  if (!snap.exists()) {
    alert("Post not found.");
    return;
  }

  currentPost = snap.data();

  renderPost();
  loadCreatorInfo(currentPost.uid);
  loadComments();
  increaseViewCount();
  loadReactions();
  loadSaveState();
  loadFollowState();
}


/****************************************************
 * RENDER POST
 ****************************************************/
function renderPost() {
  titleEl.textContent = currentPost.title || "";
  descEl.textContent  = currentPost.desc || "";

  if (currentPost.type === "podcast-audio") {
    qs("#video-container").style.display = "none";
    qs("#audio-container").style.display = "block";
    vAudio.src = currentPost.fileUrl;
  } else {
    qs("#video-container").style.display = "block";
    qs("#audio-container").style.display = "none";
    vVideo.src = currentPost.fileUrl;
  }
}


/****************************************************
 * LOAD CREATOR INFO
 ****************************************************/
async function loadCreatorInfo(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return;

  const u = snap.data();

  usernameEl.textContent = "@" + (u.username || "user");
  nameEl.textContent     = u.username || "User";

  if (u.profilePhotoUrl) {
    photoEl.src = u.profilePhotoUrl;
  } else {
    photoEl.src = "https://via.placeholder.com/100/222/fff?text=User";
  }
}


/****************************************************
 * LIKE / DISLIKE
 ****************************************************/
async function loadReactions() {
  const snap = await getDoc(doc(db, "posts", currentPostId));
  const post = snap.data();
  const uid  = currentUser?.uid;

  likeCountEl.textContent = `${post.likes?.length || 0} likes`;

  if (uid) {
    likeBtn.classList.toggle("active", post.likes?.includes(uid));
    dislikeBtn.classList.toggle("active", post.dislikes?.includes(uid));
  }

  likeBtn.onclick = async () => {
    if (!currentUser) return alert("Login to like.");

    const snap = await getDoc(doc(db, "posts", currentPostId));
    const p = snap.data();

    let likes    = p.likes || [];
    let dislikes = p.dislikes || [];

    const hasLike    = likes.includes(currentUser.uid);
    const hasDislike = dislikes.includes(currentUser.uid);

    if (hasLike) {
      likes = likes.filter(id => id !== currentUser.uid);
    } else {
      likes.push(currentUser.uid);
      if (hasDislike) {
        dislikes = dislikes.filter(id => id !== currentUser.uid);
      }
    }

    await updateDoc(doc(db, "posts", currentPostId), { likes, dislikes });

    loadReactions();
  };

  dislikeBtn.onclick = async () => {
    if (!currentUser) return alert("Login to dislike.");

    const snap = await getDoc(doc(db, "posts", currentPostId));
    const p = snap.data();

    let likes    = p.likes || [];
    let dislikes = p.dislikes || [];

    const hasLike    = likes.includes(currentUser.uid);
    const hasDislike = dislikes.includes(currentUser.uid);

    if (hasDislike) {
      dislikes = dislikes.filter(id => id !== currentUser.uid);
    } else {
      dislikes.push(currentUser.uid);
      if (hasLike) {
        likes = likes.filter(id => id !== currentUser.uid);
      }
    }

    await updateDoc(doc(db, "posts", currentPostId), { likes, dislikes });

    loadReactions();
  };
}


/****************************************************
 * SAVE / UNSAVE
 ****************************************************/
async function loadSaveState() {
  if (!currentUser) {
    saveBtn.textContent = "💾 Save";
    return;
  }

  const snap = await getDoc(doc(db, "users", currentUser.uid));
  const saved = snap.data().saved || [];

  saveBtn.textContent = saved.includes(currentPostId)
    ? "✔ Saved"
    : "💾 Save";

  saveBtn.onclick = () => toggleSave();
}

async function toggleSave() {
  const userRef = doc(db, "users", currentUser.uid);
  const snap = await getDoc(userRef);

  const saved = snap.data().saved || [];

  let updated;

  if (saved.includes(currentPostId)) {
    updated = saved.filter(id => id !== currentPostId);
    saveBtn.textContent = "💾 Save";
  } else {
    updated = [...saved, currentPostId];
    saveBtn.textContent = "✔ Saved";
  }

  await updateDoc(userRef, { saved: updated });
}


/****************************************************
 * FOLLOW / UNFOLLOW CREATOR
 ****************************************************/
async function loadFollowState() {
  if (!currentUser) {
    followBtn.style.display = "block";
    followBtn.textContent = "Follow";
    return;
  }

  if (currentUser.uid === currentPost.uid) {
    followBtn.style.display = "none";
    return;
  }

  const mySnap = await getDoc(doc(db, "users", currentUser.uid));
  const me = mySnap.data();

  const isFollowing = me.following?.includes(currentPost.uid);

  followBtn.textContent = isFollowing ? "Unfollow" : "Follow";

  followBtn.onclick = async () => {
    const myRef = doc(db, "users", currentUser.uid);
    const creatorRef = doc(db, "users", currentPost.uid);

    if (isFollowing) {
      await updateDoc(myRef, {
        following: me.following.filter(x => x !== currentPost.uid)
      });
      await updateDoc(creatorRef, {
        followers: arrayRemove(currentUser.uid)
      });
    } else {
      await updateDoc(myRef, {
        following: [...(me.following || []), currentPost.uid]
      });
      await updateDoc(creatorRef, {
        followers: arrayUnion(currentUser.uid)
      });
    }

    loadFollowState();
  };
}


/****************************************************
 * INCREASE VIEWS
 ****************************************************/
async function increaseViewCount() {
  await updateDoc(doc(db, "posts", currentPostId), {
    views: increment(1)
  });

  qs("#viewer-views").textContent = `${(currentPost.views || 0) + 1} Views`;
}


/****************************************************
 * COMMENTS
 ****************************************************/
async function loadComments() {
  commentsWrap.innerHTML = "<p class='muted'>Loading comments...</p>";

  const qRef = query(
    collection(db, "comments"),
    where("postId", "==", currentPostId),
    orderBy("createdAt", "asc")
  );

  const snap = await getDocs(qRef);

  commentsWrap.innerHTML = "";
  qs("#viewer-comments-count").textContent = `${snap.size} Comments`;

  if (snap.empty) {
    commentsWrap.innerHTML = "<p class='muted'>No comments yet.</p>";
    return;
  }

  snap.forEach((docSnap) => {
    const c = docSnap.data();
    const div = document.createElement("div");
    div.className = "comment-item";
    div.innerHTML = `<strong>@${c.username}</strong><br>${c.text}`;
    commentsWrap.appendChild(div);
  });
}

commentBtn.onclick = async () => {
  if (!currentUser) return alert("Login to comment.");

  const text = commentInput.value.trim();
  if (!text) return;

  await addDoc(collection(db, "comments"), {
    postId: currentPostId,
    uid: currentUser.uid,
    username: currentUser.displayName || currentUser.email.split("@")[0],
    text,
    createdAt: new Date()
  });

  commentInput.value = "";
  loadComments();
};
