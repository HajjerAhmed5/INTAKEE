document.addEventListener("DOMContentLoaded", function () {
  const tabs = document.querySelectorAll(".tab");
  const navButtons = document.querySelectorAll("footer nav button");

  function activateTab(tabId) {
    tabs.forEach((tab) => tab.classList.remove("active"));
    document.getElementById(tabId).classList.add("active");

    navButtons.forEach((btn) => btn.classList.remove("active"));
    document
      .querySelector(`footer nav button[data-tab="${tabId}"]`)
      .classList.add("active");
  }

  // Switch tabs on nav click
  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabId = btn.getAttribute("data-tab");
      activateTab(tabId);
    });
  });

  // Default to home tab
  activateTab("home");

  // Profile Privacy Toggles (for Uploads, Likes, Saved, Playlists)
  const privacyToggles = document.querySelectorAll(".privacy-toggle");
  privacyToggles.forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const section = toggle.closest(".profile-section");
      const isPrivate = section.classList.toggle("private");
      toggle.textContent = isPrivate ? "Make Public" : "Make Private";
    });
  });

  // Placeholder: Upload Tab "Go Live" button
  const goLiveBtn = document.getElementById("go-live-btn");
  if (goLiveBtn) {
    goLiveBtn.addEventListener("click", () => {
      alert("Go Live feature coming soon!");
    });
  }

  // Restrict likes/comments if not logged in
  const likeButtons = document.querySelectorAll(".like-btn");
  const commentFields = document.querySelectorAll(".comment-field");
  const isLoggedIn = false; // Replace with auth logic

  likeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!isLoggedIn) {
        alert("Please log in to like or dislike content.");
      } else {
        // Like/dislike logic
      }
    });
  });

  commentFields.forEach((field) => {
    field.addEventListener("focus", () => {
      if (!isLoggedIn) {
        alert("You must be signed in to comment.");
        field.blur();
      }
    });
  });
});
