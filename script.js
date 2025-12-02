// =========================================================
// 7B. FOLLOW SYSTEM 🔥
// =========================================================

// Follow/unfollow button (on viewer page later)
document.addEventListener("click", async (e) => {
  if (!e.target.matches(".follow-btn")) return;

  const user = auth.currentUser;
  if (!user) return alert("Sign in to follow creators.");

  const targetUid = e.target.dataset.uid;
  if (!targetUid) return;

  const userRef = doc(db, "users", user.uid);
  const targetRef = doc(db, "users", targetUid);

  const userSnap = await getDoc(userRef);
  const targetSnap = await getDoc(targetRef);

  if (!targetSnap.exists()) return alert("User not found.");

  const userData = userSnap.data();
  const targetData = targetSnap.data();

  const isFollowing = userData.following?.includes(targetUid);

  if (isFollowing) {
    // Unfollow
    await updateDoc(userRef, {
      following: userData.following.filter(id => id !== targetUid)
    });
    await updateDoc(targetRef, {
      followers: targetData.followers.filter(id => id !== user.uid)
    });

    e.target.textContent = "Follow";
    e.target.classList.remove("following");

  } else {
    // Follow
    await updateDoc(userRef, {
      following: [...(userData.following || []), targetUid]
    });
    await updateDoc(targetRef, {
      followers: [...(targetData.followers || []), user.uid]
    });

    e.target.textContent = "Following";
    e.target.classList.add("following");
  }

  loadUserStats(targetUid);
});

// Update stats visually
async function loadUserStats(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  const data = snap.data();

  qs("#stat-followers").textContent = data.followers?.length || 0;
  qs("#stat-following").textContent = data.following?.length || 0;
}
// =========================================================
// 7C. LIKE / DISLIKE SYSTEM ❤️👎
// =========================================================

// Like/dislike click handler (works for feed & viewer page)
document.addEventListener("click", async (e) => {
  if (!e.target.matches(".like-btn") && !e.target.matches(".dislike-btn")) return;

  const user = auth.currentUser;
  if (!user) return alert("Sign in to react.");

  const postId = e.target.dataset.post;
  const isLike = e.target.matches(".like-btn");
  const isDislike = e.target.matches(".dislike-btn");

  const postRef = doc(db, "posts", postId);
  const postSnap = await getDoc(postRef);
  if (!postSnap.exists()) return alert("Post not found.");

  const post = postSnap.data();

  // Initialize arrays if missing
  post.likes = post.likes || [];
  post.dislikes = post.dislikes || [];

  const hasLiked = post.likes.includes(user.uid);
  const hasDisliked = post.dislikes.includes(user.uid);

  if (isLike) {
    if (hasLiked) {
      // Remove like
      await updateDoc(postRef, {
        likes: post.likes.filter(uid => uid !== user.uid)
      });
    } else {
      // Add like & remove dislike
      await updateDoc(postRef, {
        likes: [...post.likes, user.uid],
        dislikes: post.dislikes.filter(uid => uid !== user.uid)
      });
    }
  }

  if (isDislike) {
    if (hasDisliked) {
      await updateDoc(postRef, {
        dislikes: post.dislikes.filter(uid => uid !== user.uid)
      });
    } else {
      // Add dislike & remove like
      await updateDoc(postRef, {
        dislikes: [...post.dislikes, user.uid],
        likes: post.likes.filter(uid => uid !== user.uid)
      });
    }
  }

  // Refresh UI
  document.dispatchEvent(new CustomEvent("intakee:feedRefresh"));
});

// Helper function to render like/dislike counts in viewer later
export async function getPostReactions(postId) {
  const snap = await getDoc(doc(db, "posts", postId));
  const post = snap.data();

  return {
    likes: post.likes?.length || 0,
    dislikes: post.dislikes?.length || 0
  };
}
// =========================================================
// 7C. LIKE / DISLIKE SYSTEM ❤️👎
// =========================================================

// Like/dislike click handler (works for feed & viewer page)
document.addEventListener("click", async (e) => {
  if (!e.target.matches(".like-btn") && !e.target.matches(".dislike-btn")) return;

  const user = auth.currentUser;
  if (!user) return alert("Sign in to react.");

  const postId = e.target.dataset.post;
  const isLike = e.target.matches(".like-btn");
  const isDislike = e.target.matches(".dislike-btn");

  const postRef = doc(db, "posts", postId);
  const postSnap = await getDoc(postRef);
  if (!postSnap.exists()) return alert("Post not found.");

  const post = postSnap.data();

  // Initialize arrays if missing
  post.likes = post.likes || [];
  post.dislikes = post.dislikes || [];

  const hasLiked = post.likes.includes(user.uid);
  const hasDisliked = post.dislikes.includes(user.uid);

  if (isLike) {
    if (hasLiked) {
      // Remove like
      await updateDoc(postRef, {
        likes: post.likes.filter(uid => uid !== user.uid)
      });
    } else {
      // Add like & remove dislike
      await updateDoc(postRef, {
        likes: [...post.likes, user.uid],
        dislikes: post.dislikes.filter(uid => uid !== user.uid)
      });
    }
  }

  if (isDislike) {
    if (hasDisliked) {
      await updateDoc(postRef, {
        dislikes: post.dislikes.filter(uid => uid !== user.uid)
      });
    } else {
      // Add dislike & remove like
      await updateDoc(postRef, {
        dislikes: [...post.dislikes, user.uid],
        likes: post.likes.filter(uid => uid !== user.uid)
      });
    }
  }

  // Refresh UI
  document.dispatchEvent(new CustomEvent("intakee:feedRefresh"));
});

// Helper function to render like/dislike counts in viewer later
export async function getPostReactions(postId) {
  const snap = await getDoc(doc(db, "posts", postId));
  const post = snap.data();

  return {
    likes: post.likes?.length || 0,
    dislikes: post.dislikes?.length || 0
  };
}
// =========================================================
// PROFILE TAB SWITCHING (Uploads / Saved / Likes / Playlists)
// =========================================================

// Tab buttons
const profTabUploads   = qs('#profTabUploads');
const profTabSaved     = qs('#profTabSaved');
const profTabLikes     = qs('#profTabLikes');
const profTabPlaylists = qs('#profTabPlaylists');

// Containers
const profileGridUploads   = qs('#profile-grid');       // already exists
const profileGridSaved     = document.createElement('div');
const profileGridLikes     = document.createElement('div');
const profileGridPlaylists = document.createElement('div');

// Style grids
profileGridSaved.className     =
profileGridLikes.className     =
profileGridPlaylists.className = "grid";

// Insert grids AFTER uploads grid
profileGridUploads.parentNode.appendChild(profileGridSaved);
profileGridUploads.parentNode.appendChild(profileGridLikes);
profileGridUploads.parentNode.appendChild(profileGridPlaylists);

// Hide non-default
profileGridSaved.style.display     = "none";
profileGridLikes.style.display     = "none";
profileGridPlaylists.style.display = "none";

// Function to switch profile tabs
function switchProfileTab(tab) {
  // Remove active button state
  profTabUploads.classList.remove("active");
  profTabSaved.classList.remove("active");
  profTabLikes.classList.remove("active");
  profTabPlaylists.classList.remove("active");

  // Hide all sections
  profileGridUploads.style.display   = "none";
  profileGridSaved.style.display     = "none";
  profileGridLikes.style.display     = "none";
  profileGridPlaylists.style.display = "none";

  // Show the correct tab
  if (tab === "uploads") {
    profTabUploads.classList.add("active");
    profileGridUploads.style.display = "grid";
  }
  if (tab === "saved") {
    profTabSaved.classList.add("active");
    profileGridSaved.style.display = "grid";
  }
  if (tab === "likes") {
    profTabLikes.classList.add("active");
    profileGridLikes.style.display = "grid";
  }
  if (tab === "playlists") {
    profTabPlaylists.classList.add("active");
    profileGridPlaylists.style.display = "grid";
  }
}

// Attach event listeners
profTabUploads?.addEventListener("click", () => switchProfileTab("uploads"));
profTabSaved?.addEventListener("click",   () => switchProfileTab("saved"));
profTabLikes?.addEventListener("click",   () => switchProfileTab("likes"));
profTabPlaylists?.addEventListener("click", () => switchProfileTab("playlists"));

// Default tab
switchProfileTab("uploads");
// =========================================================
// 7B. PROFILE TABS (Uploads / Saved / Likes / Playlists)
// =========================================================

// Tab buttons
const pfTabs = qsa(".profile-tabs .pf-tab");

// Tab sections
const pfUploads   = qs("#pf-uploads");
const pfSaved     = qs("#pf-saved");
const pfLikes     = qs("#pf-likes");
const pfPlaylists = qs("#pf-playlists");

const pfSections = {
  uploads: pfUploads,
  saved: pfSaved,
  likes: pfLikes,
  playlists: pfPlaylists
};

// Switch tab UI
pfTabs.forEach(btn => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;

    // Set active UI button
    pfTabs.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    // Show the selected section
    Object.keys(pfSections).forEach(key => {
      pfSections[key].style.display = key === tab ? "block" : "none";
    });

    // Load the content for this tab
    loadProfileTab(tab);
  });
});

// Load tab content
async function loadProfileTab(tabName) {
  const user = auth.currentUser;
  if (!user) return;

  if (tabName === "uploads") {
    // Already loaded by loadUserPosts()
    loadUserPosts(user.uid);
    return;
  }

  if (tabName === "saved") loadSavedPosts();
  if (tabName === "likes") loadLikedPosts();
  if (tabName === "playlists") loadUserPlaylists();
}

// Load Saved posts
async function loadSavedPosts() {
  const user = auth.currentUser;
  const snap = await getDoc(doc(db, "users", user.uid));
  const saved = snap.data().saved || [];

  pfSaved.innerHTML = "";

  if (!saved.length) {
    pfSaved.innerHTML = `<p class="muted">Nothing saved yet.</p>`;
    return;
  }

  for (let postId of saved) {
    const pSnap = await getDoc(doc(db, "posts", postId));
    if (!pSnap.exists()) continue;
    const post = pSnap.data();

    const el = document.createElement("div");
    el.className = "tile";
    el.innerHTML = `
      <img class="thumb" src="${post.thumbnailUrl}">
      <div class="meta">${post.title}</div>
    `;
    el.onclick = () => (window.location.href = `viewer.html?id=${postId}`);
    pfSaved.appendChild(el);
  }
}

// Load Liked posts
async function loadLikedPosts() {
  const user = auth.currentUser;
  const snap = await getDoc(doc(db, "users", user.uid));
  const liked = snap.data().liked || [];

  pfLikes.innerHTML = "";

  if (!liked.length) {
    pfLikes.innerHTML = `<p class="muted">No liked posts yet.</p>`;
    return;
  }

  for (let postId of liked) {
    const pSnap = await getDoc(doc(db, "posts", postId));
    if (!pSnap.exists()) continue;
    const post = pSnap.data();

    const el = document.createElement("div");
    el.className = "tile";
    el.innerHTML = `
      <img class="thumb" src="${post.thumbnailUrl}">
      <div class="meta">${post.title}</div>
    `;
    el.onclick = () => (window.location.href = `viewer.html?id=${postId}`);
    pfLikes.appendChild(el);
  }
}

// Load Playlists (future feature; safe placeholder)
async function loadUserPlaylists() {
  pfPlaylists.innerHTML = `
    <p class="muted">Playlists coming soon.</p>
  `;
}
// =========================================================
//  FOLLOW SYSTEM
// =========================================================

// Add follow/unfollow button dynamically (for profile)
function renderFollowButton(profileUid) {
  const user = auth.currentUser;

  // Do not show follow button on your own profile
  if (user && user.uid === profileUid) return;

  const container = document.createElement("div");
  container.style.textAlign = "center";
  container.style.margin = "14px 0";

  const btn = document.createElement("button");
  btn.id = "followBtn";
  btn.className = "primary";
  btn.textContent = "Follow";

  container.appendChild(btn);
  qs("#tab-profile").prepend(container);

  btn.addEventListener("click", () => handleFollow(profileUid));
}

// Check follow state + update button text
async function updateFollowButton(profileUid) {
  const user = auth.currentUser;
  if (!user) return;

  const meRef = await getDoc(doc(db, "users", user.uid));

  if (!meRef.exists()) return;

  const myData = meRef.data();
  const isFollowing = (myData.following || []).includes(profileUid);

  const btn = qs("#followBtn");
  if (!btn) return;

  btn.textContent = isFollowing ? "Following" : "Follow";
  btn.style.background = isFollowing ? "#444" : "#fff";
  btn.style.color = isFollowing ? "#fff" : "#000";
}

// Follow/unfollow logic using Firestore arrays
async function handleFollow(profileUid) {
  const user = auth.currentUser;
  if (!user) return alert("Sign in to follow.");

  const meRef = doc(db, "users", user.uid);
  const themRef = doc(db, "users", profileUid);

  const meSnap = await getDoc(meRef);
  const meData = meSnap.data();

  const isFollowing = (meData.following || []).includes(profileUid);

  if (isFollowing) {
    // UNFOLLOW
    await updateDoc(meRef, {
      following: meData.following.filter(id => id !== profileUid)
    });

    const themSnap = await getDoc(themRef);
    const themData = themSnap.data();
    await updateDoc(themRef, {
      followers: (themData.followers || []).filter(id => id !== user.uid)
    });

  } else {
    // FOLLOW
    await updateDoc(meRef, {
      following: [...(meData.following || []), profileUid]
    });

    const themSnap = await getDoc(themRef);
    const themData = themSnap.data();
    await updateDoc(themRef, {
      followers: [...(themData.followers || []), user.uid]
    });
  }

  updateFollowButton(profileUid);
  loadUserProfile(user); // Update counts
}

// Add follow button when viewing *someone else's* profile
document.addEventListener("intakee:auth", async (e) => {
  const user = e.detail.user;
  if (!user) return;

  // Only run when on profile tab
  if (!tabs.profile.style.display === "block") return;

  const profileUsername = profileHandle?.textContent.replace("@", "");
  if (!profileUsername) return;

  const qRef = query(collection(db, "users"), where("username", "==", profileUsername));
  const snap = await getDocs(qRef);

  if (snap.empty) return;
  const profileUid = snap.docs[0].id;

  // Prevent duplicate button
  if (!qs("#followBtn")) {
    renderFollowButton(profileUid);
  }

  updateFollowButton(profileUid);
});
// =========================================================
//  LIKE / DISLIKE SYSTEM
// =========================================================

// Like a post
async function likePost(postId) {
  const user = auth.currentUser;
  if (!user) return alert("Sign in to like.");

  const postRef = doc(db, "posts", postId);
  const postSnap = await getDoc(postRef);

  if (!postSnap.exists()) return;

  const data = postSnap.data();

  const likes = data.likes || [];
  const dislikes = data.dislikes || [];

  const hasLiked = likes.includes(user.uid);
  const hasDisliked = dislikes.includes(user.uid);

  // If user already LIKED → remove like
  if (hasLiked) {
    await updateDoc(postRef, {
      likes: likes.filter(id => id !== user.uid)
    });
  } else {
    // Add like
    await updateDoc(postRef, {
      likes: [...likes.filter(id => id !== user.uid), user.uid],
      dislikes: dislikes.filter(id => id !== user.uid) // remove dislike if existed
    });
  }

  document.dispatchEvent(new CustomEvent("intakee:feedRefresh"));
}

// Dislike a post
async function dislikePost(postId) {
  const user = auth.currentUser;
  if (!user) return alert("Sign in to dislike.");

  const postRef = doc(db, "posts", postId);
  const postSnap = await getDoc(postRef);

  if (!postSnap.exists()) return;

  const data = postSnap.data();

  const likes = data.likes || [];
  const dislikes = data.dislikes || [];

  const hasLiked = likes.includes(user.uid);
  const hasDisliked = dislikes.includes(user.uid);

  // If already disliked → remove dislike
  if (hasDisliked) {
    await updateDoc(postRef, {
      dislikes: dislikes.filter(id => id !== user.uid)
    });
  } else {
    // Add dislike
    await updateDoc(postRef, {
      dislikes: [...dislikes.filter(id => id !== user.uid), user.uid],
      likes: likes.filter(id => id !== user.uid) // remove like if existed
    });
  }

  document.dispatchEvent(new CustomEvent("intakee:feedRefresh"));
}

// Render like/dislike buttons on posts inside feeds
function renderEngagementUI(post, container) {
  const user = auth.currentUser;
  const uid = user?.uid;

  const likesCount = (post.likes || []).length;
  const dislikesCount = (post.dislikes || []).length;

  const userLiked = uid && post.likes?.includes(uid);
  const userDisliked = uid && post.dislikes?.includes(uid);

  const likeColor = userLiked ? "#fff" : "#888";
  const dislikeColor = userDisliked ? "#fff" : "#888";

  return `
    <div style="display:flex; gap:12px; margin-top:8px; align-items:center;">
      <button class="like-btn" data-id="${post.id}" 
        style="background:none; border:none; color:${likeColor}; font-size:1.1rem; cursor:pointer;">
        👍 ${likesCount}
      </button>

      <button class="dislike-btn" data-id="${post.id}"
        style="background:none; border:none; color:${dislikeColor}; font-size:1.1rem; cursor:pointer;">
        👎 ${dislikesCount}
      </button>
    </div>
  `;
}

// Attach like/dislike events to the feed
document.addEventListener("click", (e) => {
  if (e.target.closest(".like-btn")) {
    const id = e.target.closest(".like-btn").dataset.id;
    likePost(id);
  }
  if (e.target.closest(".dislike-btn")) {
    const id = e.target.closest(".dislike-btn").dataset.id;
    dislikePost(id);
  }
});
// =========================================================
//  COMMENT SYSTEM — ADD, DISPLAY, DELETE
// =========================================================

// Add a comment to a post
async function addComment(postId, text) {
  const user = auth.currentUser;
  if (!user) return alert("Sign in to comment.");

  text = text.trim();
  if (!text) return;

  await addDoc(collection(db, "comments"), {
    postId,
    uid: user.uid,
    username: user.displayName,
    text,
    createdAt: serverTimestamp()
  });

  document.dispatchEvent(new CustomEvent("intakee:commentsRefresh", { detail: { postId } }));
}

// Load all comments for a post
async function loadComments(postId, container) {
  const qRef = query(
    collection(db, "comments"),
    where("postId", "==", postId),
    orderBy("createdAt", "asc")
  );

  const snap = await getDocs(qRef);

  container.innerHTML = "";

  if (snap.empty) {
    container.innerHTML = `<p class="muted">No comments yet.</p>`;
    return;
  }

  snap.forEach(docu => {
    const c = docu.data();
    const id = docu.id;

    const isOwner = auth.currentUser?.uid === c.uid;

    const div = document.createElement("div");
    div.className = "comment-item";
    div.style = `
      padding:10px 0;
      border-bottom:1px solid #222;
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
      gap:12px;
    `;

    div.innerHTML = `
      <div>
        <strong>@${c.username}</strong><br>
        <span>${c.text}</span>
      </div>

      ${isOwner ? `
        <button 
          class="delete-comment" 
          data-id="${id}" 
          style="background:none; border:none; color:#f55; cursor:pointer;">
          Delete
        </button>
      ` : ""}
    `;

    container.appendChild(div);
  });
}

// Delete comment
document.addEventListener("click", async (e) => {
  if (e.target.closest(".delete-comment")) {
    const id = e.target.closest(".delete-comment").dataset.id;

    if (!confirm("Delete comment?")) return;

    await deleteDoc(doc(db, "comments", id));

    document.dispatchEvent(new CustomEvent("intakee:commentsRefresh"));
  }
});

// RELOAD COMMENTS LIVE
document.addEventListener("intakee:commentsRefresh", (e) => {
  if (!window.currentPostId || !window.commentsContainer) return;
  loadComments(window.currentPostId, window.commentsContainer);
});
// =========================================================
//  SAVE / WATCH LATER SYSTEM
// =========================================================

// Save a post
async function savePost(postId) {
  const user = auth.currentUser;
  if (!user) return alert("Sign in to save posts.");

  const userRef = doc(db, "users", user.uid);

  await updateDoc(userRef, {
    saved: arrayUnion(postId)
  });

  document.dispatchEvent(new CustomEvent("intakee:savedRefresh"));
}

// Unsave a post
async function unsavePost(postId) {
  const user = auth.currentUser;
  if (!user) return alert("Sign in.");

  const userRef = doc(db, "users", user.uid);

  await updateDoc(userRef, {
    saved: arrayRemove(postId)
  });

  document.dispatchEvent(new CustomEvent("intakee:savedRefresh"));
}

// Toggle save / unsave
async function toggleSave(postId, btn) {
  const user = auth.currentUser;
  if (!user) return alert("Sign in.");

  const snap = await getDoc(doc(db, "users", user.uid));
  const saved = snap.data().saved || [];

  if (saved.includes(postId)) {
    await unsavePost(postId);
    if (btn) btn.classList.remove("saved");
  } else {
    await savePost(postId);
    if (btn) btn.classList.add("saved");
  }
}

// Show saved posts in profile
async function loadSavedPosts(uid, container) {
  const snap = await getDoc(doc(db, "users", uid));
  const saved = snap.data().saved || [];

  container.innerHTML = "";

  if (!saved.length) {
    container.innerHTML = `<p class="muted">No saved posts.</p>`;
    return;
  }

  // Get each post
  for (let id of saved) {
    const docSnap = await getDoc(doc(db, "posts", id));
    if (!docSnap.exists()) continue;

    const post = docSnap.data();

    const el = document.createElement("div");
    el.className = "tile";

    el.innerHTML = `
      <img class="thumb" src="${post.thumbnailUrl || 'placeholder.png'}">
      <div class="meta">${post.title}</div>
    `;

    el.addEventListener("click", () =>
      window.location.href = `viewer.html?id=${id}`
    );

    container.appendChild(el);
  }
}

// Refresh saved grid on update
document.addEventListener("intakee:savedRefresh", () => {
  if (window.currentProfileTab === "saved" && window.currentProfileUid) {
    loadSavedPosts(window.currentProfileUid, qs("#profile-grid"));
  }
});
// =========================================================
// 7B. PROFILE TABS SYSTEM (Uploads / Saved / Likes / Playlists)
// =========================================================

// HTML references
const tabButtons = qsa(".profile-tab");
const uploadsTab = qs("#profile-uploads");
const savedTab   = qs("#profile-saved");
const likesTab   = qs("#profile-likes");
const playlistsTab = qs("#profile-playlists");

// Hide all tab content
function hideAllProfileTabs() {
  uploadsTab.style.display = "none";
  savedTab.style.display = "none";
  likesTab.style.display = "none";
  playlistsTab.style.display = "none";
}

// Activate selected tab button
function setActiveProfileButton(name) {
  tabButtons.forEach(btn =>
    btn.classList.toggle("active", btn.dataset.tab === name)
  );
}

// Switch tab UI
tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;

    hideAllProfileTabs();
    setActiveProfileButton(tab);

    if (tab === "uploads") uploadsTab.style.display = "grid";
    if (tab === "saved")   savedTab.style.display = "grid";
    if (tab === "likes")   likesTab.style.display = "grid";
    if (tab === "playlists") playlistsTab.style.display = "block";
  });
});

// =========================================================
// LOAD PROFILE DATA (Uploads, Saved, Likes)
// This runs automatically when user logs in.
// =========================================================

document.addEventListener("intakee:auth", async (e) => {
  const user = e.detail.user;
  if (!user) return;

  loadProfileUploads(user.uid);
  loadProfileSaved(user.uid);
  loadProfileLikes(user.uid);
});

// -------------------------
// LOAD USER UPLOADS
// -------------------------
async function loadProfileUploads(uid) {
  const qRef = query(
    collection(db, "posts"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(qRef);
  uploadsTab.innerHTML = snap.empty ? 
    `<p class="muted" style="text-align:center;">No uploads yet.</p>` : "";

  snap.forEach(docSnap => {
    const p = docSnap.data();
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.innerHTML = `
      <img class="thumb" src="${p.thumbnailUrl || 'placeholder.png'}">
      <div class="meta">${p.title}</div>
    `;
    tile.addEventListener("click", () =>
      window.location.href = `viewer.html?id=${docSnap.id}`
    );
    uploadsTab.appendChild(tile);
  });
}

// -------------------------
// LOAD SAVED POSTS
// -------------------------
async function loadProfileSaved(uid) {
  const userRef = await getDoc(doc(db, "users", uid));
  const data = userRef.data();
  const savedList = data.saved || [];

  savedTab.innerHTML = savedList.length === 0 ?
    `<p class="muted" style="text-align:center;">Nothing saved yet.</p>` : "";

  for (let postId of savedList) {
    const postSnap = await getDoc(doc(db, "posts", postId));
    if (!postSnap.exists()) continue;
    const p = postSnap.data();

    const tile = document.createElement("div");
    tile.className = "tile";
    tile.innerHTML = `
      <img class="thumb" src="${p.thumbnailUrl || 'placeholder.png'}">
      <div class="meta">${p.title}</div>
    `;
    tile.addEventListener("click", () =>
      window.location.href = `viewer.html?id=${postSnap.id}`
    );
    savedTab.appendChild(tile);
  }
}

// -------------------------
// LOAD LIKED POSTS
// -------------------------
async function loadProfileLikes(uid) {
  const userRef = await getDoc(doc(db, "users", uid));
  const data = userRef.data();
  const likesList = data.likes || [];

  likesTab.innerHTML = likesList.length === 0 ?
    `<p class="muted" style="text-align:center;">No liked posts yet.</p>` : "";

  for (let postId of likesList) {
    const postSnap = await getDoc(doc(db, "posts", postId));
    if (!postSnap.exists()) continue;
    const p = postSnap.data();

    const tile = document.createElement("div");
    tile.className = "tile";
    tile.innerHTML = `
      <img class="thumb" src="${p.thumbnailUrl || 'placeholder.png'}">
      <div class="meta">${p.title}</div>
    `;
    tile.addEventListener("click", () =>
      window.location.href = `viewer.html?id=${postSnap.id}`
    );
    likesTab.appendChild(tile);
  }
}
// =========================================================
// 7C. FOLLOW SYSTEM — FOLLOW / UNFOLLOW / COUNTS
// =========================================================

// refs
const followBtn = qs("#follow-btn");          // button on profile page (for other users)
const statFollowers = qs("#stat-followers");
const statFollowing = qs("#stat-following");

let viewingUserId = null;  // which user profile is being viewed

// Detect if user is viewing *their own* profile or another person
document.addEventListener("intakee:auth", async (e) => {
  const loggedIn = e.detail.user;
  if (!loggedIn) return;

  // By default you're viewing YOUR profile inside tab-profile
  viewingUserId = loggedIn.uid;

  // Load followers/following counts
  loadFollowStats(viewingUserId);
});

// Load follower/following numbers
async function loadFollowStats(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return;

  const data = snap.data();

  statFollowers.textContent = data.followers?.length || 0;
  statFollowing.textContent = data.following?.length || 0;
}

// This is called when viewing another user's profile (future use on viewer page)
export async function setViewingUser(uid) {
  viewingUserId = uid;
  loadFollowStats(uid);
  updateFollowButton();
}

// Update button style
async function updateFollowButton() {
  const user = auth.currentUser;
  if (!user) {
    followBtn.style.display = "block";
    followBtn.textContent = "Follow";
    return;
  }

  if (user.uid === viewingUserId) {
    // Hide follow button on your own profile
    followBtn.style.display = "none";
    return;
  }

  followBtn.style.display = "block";

  const snap = await getDoc(doc(db, "users", user.uid));
  const me = snap.data();

  const isFollowing = me.following?.includes(viewingUserId);

  followBtn.textContent = isFollowing ? "Following" : "Follow";
  followBtn.classList.toggle("active", isFollowing);
}

// FOLLOW / UNFOLLOW
followBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Sign in first.");

  if (!viewingUserId) return;

  const myRef = doc(db, "users", user.uid);
  const theirRef = doc(db, "users", viewingUserId);

  const mySnap = await getDoc(myRef);
  const theirSnap = await getDoc(theirRef);

  const me = mySnap.data();
  const them = theirSnap.data();

  const isFollowing = me.following?.includes(viewingUserId);

  if (!isFollowing) {
    // FOLLOW
    await updateDoc(myRef, {
      following: [...me.following || [], viewingUserId]
    });

    await updateDoc(theirRef, {
      followers: [...them.followers || [], user.uid]
    });

  } else {
    // UNFOLLOW
    await updateDoc(myRef, {
      following: me.following.filter(id => id !== viewingUserId)
    });

    await updateDoc(theirRef, {
      followers: them.followers.filter(id => id !== user.uid)
    });
  }

  loadFollowStats(viewingUserId);
  updateFollowButton();
});
// =========================================================
// 7D. LIKE / DISLIKE SYSTEM
// =========================================================

const likeBtn = qs("#like-btn");
const dislikeBtn = qs("#dislike-btn");
const likeCountSpan = qs("#like-count");
const dislikeCountSpan = qs("#dislike-count");

let currentPostId = null;

// Called from viewer.js (or when viewer loads)
export function setPostForReact(postId) {
  currentPostId = postId;
  loadReactions();
}

// Load likes & dislikes
async function loadReactions() {
  if (!currentPostId) return;

  const snap = await getDoc(doc(db, "posts", currentPostId));
  if (!snap.exists()) return;

  const post = snap.data();

  const likes = post.likes || [];
  const dislikes = post.dislikes || [];

  likeCountSpan.textContent = likes.length;
  dislikeCountSpan.textContent = dislikes.length;

  const user = auth.currentUser;
  if (!user) {
    // logged out users see counts only
    likeBtn.classList.remove("active");
    dislikeBtn.classList.remove("active");
    return;
  }

  const uid = user.uid;

  likeBtn.classList.toggle("active", likes.includes(uid));
  dislikeBtn.classList.toggle("active", dislikes.includes(uid));
}

// LIKE
likeBtn?.addEventListener("click", async () => {
  if (!auth.currentUser) return alert("Sign in to like posts.");
  if (!currentPostId) return;

  const userId = auth.currentUser.uid;
  const refPost = doc(db, "posts", currentPostId);
  const snap = await getDoc(refPost);
  const post = snap.data();

  let likes = post.likes || [];
  let dislikes = post.dislikes || [];

  const alreadyLiked = likes.includes(userId);
  const alreadyDisliked = dislikes.includes(userId);

  if (alreadyLiked) {
    // remove like
    likes = likes.filter(id => id !== userId);
  } else {
    likes.push(userId);
    if (alreadyDisliked) {
      // remove dislike if switching
      dislikes = dislikes.filter(id => id !== userId);
    }
  }

  await updateDoc(refPost, { likes, dislikes });

  loadReactions();
});

// DISLIKE
dislikeBtn?.addEventListener("click", async () => {
  if (!auth.currentUser) return alert("Sign in to dislike posts.");
  if (!currentPostId) return;

  const userId = auth.currentUser.uid;
  const refPost = doc(db, "posts", currentPostId);
  const snap = await getDoc(refPost);
  const post = snap.data();

  let likes = post.likes || [];
  let dislikes = post.dislikes || [];

  const alreadyLiked = likes.includes(userId);
  const alreadyDisliked = dislikes.includes(userId);

  if (alreadyDisliked) {
    // remove dislike
    dislikes = dislikes.filter(id => id !== userId);
  } else {
    dislikes.push(userId);
    if (alreadyLiked) {
      // remove like if switching
      likes = likes.filter(id => id !== userId);
    }
  }

  await updateDoc(refPost, { likes, dislikes });

  loadReactions();
});
