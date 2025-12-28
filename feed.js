/* ==========================================
   INTAKEE — HOME FEED (FILTER-READY)
   (Demo now → Firebase later)
========================================== */

/* DOM */
const feedGrid = document.querySelector("#home .feed-grid");
const filterButtons = document.querySelectorAll(".home-filters .filter-btn");

/* SOURCE OF TRUTH (will be Firebase later) */
let allPosts = [
  {
    id: 1,
    type: "video",
    title: "Sample Video Title",
    creator: "@creator",
    views: "12.4K views"
  },
  {
    id: 2,
    type: "podcast",
    title: "Podcast Episode Preview",
    creator: "@podcaster",
    views: "8.1K listens"
  },
  {
    id: 3,
    type: "clip",
    title: "Clip Highlight",
    creator: "@user",
    views: "3.9K views"
  }
];

/* CREATE CARD */
function createFeedCard(post) {
  const card = document.createElement("div");
  card.className = "feed-card";

  card.innerHTML = `
    <div class="feed-thumb"></div>
    <div class="feed-info">
      <h4>${post.title}</h4>
      <p>${post.creator} • ${post.views}</p>
    </div>
  `;

  card.addEventListener("click", () => {
    console.log("Clicked post:", post.id);
    // viewer comes later
  });

  return card;
}

/* RENDER */
function renderFeed(posts) {
  if (!feedGrid) return;

  feedGrid.innerHTML = "";
  posts.forEach(post => {
    feedGrid.appendChild(createFeedCard(post));
  });
}

/* FILTER LOGIC */
function applyFilter(filter) {
  let filteredPosts = allPosts;

  if (filter === "videos") {
    filteredPosts = allPosts.filter(p => p.type === "video");
  }

  if (filter === "podcasts") {
    filteredPosts = allPosts.filter(p => p.type === "podcast");
  }

  if (filter === "clips") {
    filteredPosts = allPosts.filter(p => p.type === "clip");
  }

  // following & newest are placeholders for Firebase later

  renderFeed(filteredPosts);
}

/* FILTER BUTTON EVENTS */
filterButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    filterButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const filter = btn.textContent.toLowerCase();
    applyFilter(filter);
  });
});

/* INIT */
document.addEventListener("DOMContentLoaded", () => {
  renderFeed(allPosts);
});
