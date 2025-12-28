/* ==========================================
   INTAKEE — HOME FEED (STEP 1: STATIC → DYNAMIC)
========================================== */

/* DOM */
const feedGrid = document.querySelector("#home .feed-grid");

/* FAKE POSTS (PLACEHOLDER DATA) */
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

  // DO NOTHING ON CLICK (for now)
  card.addEventListener("click", () => {
    console.log("Clicked post:", post.id);
  });

  return card;
}

/* RENDER FEED */
function renderHomeFeed() {
  if (!feedGrid) return;

  feedGrid.innerHTML = "";
  demoPosts.forEach(post => {
    feedGrid.appendChild(createFeedCard(post));
  });
}

/* INIT */
document.addEventListener("DOMContentLoaded", renderHomeFeed);
