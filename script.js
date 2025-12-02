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
