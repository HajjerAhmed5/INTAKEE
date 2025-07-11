document.addEventListener("DOMContentLoaded", function () {
  const tabs = document.querySelectorAll(".tab");
  const navButtons = document.querySelectorAll("footer nav button");

  function activateTab(tabId) {
    tabs.forEach((tab) => tab.classList.remove("active"));
    document.getElementById(tabId).classList.add("active");

    navButtons.forEach((btn) => btn.classList.remove("active"));
    document.querySelector(`footer nav button[data-tab="${tabId}"]`).classList.add("active");
  }

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabId = btn.getAttribute("data-tab");
      activateTab(tabId);
    });
  });

  // Load the home tab by default
  activateTab("home");

  // Profile: Privacy toggle buttons
  const privacyButtons = document.querySelectorAll(".privacy-toggle");
  privacyButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const section = button.closest(".profile-section");
      section.classList.toggle("private");
      button.textContent = section.classList.contains("private")
        ? "Make Public"
        : "Make Private";
    });
  });

  // Optional: Handle Go Live button (placeholder)
  const goLiveButton = document.getElementById("go-live-btn");
  if (goLiveButton) {
    goLiveButton.addEventListener("click", () => {
      alert("Go Live feature coming soon.");
    });
  }
});
