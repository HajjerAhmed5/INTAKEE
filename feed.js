/* ==========================================
   INTAKEE — HOME FEED (STEP 2: FILTERS WORK)
========================================== */

/* DOM */
const feedGrid = document.querySelector("#home .feed-grid");
const filterButtons = document.querySelectorAll(".home-filters .filter-btn");

/* DEMO POSTS (PLACEHOLDER DATA) */
const demoPosts = [
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

  // Placeholder click (real viewer later)
  card.addEventListener("click", () => {
    console.log("Clicked post:", post.id);
  });

  return card;
}

/* RENDER FEED */
function renderHomeFeed(filter = "all") {
  if (!feedGrid) return;

  feedGrid.innerHTML = "";

  const filteredPosts =
    filter === "all"
      ? demoPosts
      : demoPosts.filter(post => post.type === filter);

  filteredPosts.forEach(post => {
    feedGrid.appendChild(createFeedCard(post));
  });
}

/* FILTER BUTTON HANDLERS */
filterButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    // Active state
    filterButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const label = btn.textContent.toLowerCase();

    if (label === "all") renderHomeFeed("all");
    if (label === "videos") renderHomeFeed("video");
    if (label === "podcasts") renderHomeFeed("podcast");
    if (label === "clips") renderHomeFeed("clip");
    if (label === "following") renderHomeFeed("all"); // placeholder
    if (label === "newest") renderHomeFeed("all"); // already newest
  });
});

/* INIT */
document.addEventListener("DOMContentLoaded", () => {
  renderHomeFeed("all");
});

