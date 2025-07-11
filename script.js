// script.js

// Handle tab switching
function showTab(tabId) {
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach(tab => tab.classList.remove("active"));

  const activeTab = document.getElementById(tabId);
  if (activeTab) activeTab.classList.add("active");

  const buttons = document.querySelectorAll("footer nav button");
  buttons.forEach(button => button.classList.remove("active"));
  const targetButton = Array.from(buttons).find(btn => btn.innerText.toLowerCase() === tabId.toLowerCase());
  if (targetButton) targetButton.classList.add("active");
}

// Highlight default tab
window.onload = () => {
  showTab('home');
};

// Toggle privacy view per profile section
const privacyToggles = document.querySelectorAll(".profile-privacy-toggle input[type='checkbox']");
privacyToggles.forEach(toggle => {
  toggle.addEventListener("change", () => {
    const section = toggle.closest(".profile-section");
    const list = section.querySelector("ul");
    list.style.display = toggle.checked ? "none" : "block";
  });
});

// Upload form functionality
const uploadForm = document.querySelector("#upload form");
uploadForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  alert("Upload submitted (demo only).");
});

// Go Live button functionality
const goLiveButton = uploadForm?.querySelector("button[type='button']");
goLiveButton?.addEventListener("click", () => {
  alert("Go Live feature coming soon.");
});
