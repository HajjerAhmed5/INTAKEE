// script.js - Full JavaScript Logic for INTAKEE

document.addEventListener("DOMContentLoaded", () => {
  showTab("#home");
});

function showTab(tabId) {
  const contents = document.querySelectorAll('.tab-content');
  contents.forEach(c => c.classList.remove('active'));
  document.getElementById(tabId.replace('#', '')).classList.add('active');

  const searchBar = document.getElementById('search-bar');
  if (["#upload", "#settings"].includes(tabId)) {
    searchBar.style.display = 'none';
  } else {
    searchBar.style.display = 'flex';
  }
}

document.querySelectorAll('.tab a').forEach(link => {
  link.addEventListener('click', function(e) {
    e.preventDefault();
    showTab(this.getAttribute('href'));
  });
});

function previewProfilePic(event) {
  const reader = new FileReader();
  reader.onload = function() {
    const preview = document.getElementById('profilePreview');
    preview.src = reader.result;
  };
  reader.readAsDataURL(event.target.files[0]);
}

document.querySelector("#profile button").addEventListener("click", () => {
  alert("Profile saved!");
});

// Upload form submission
const goLiveButton = document.getElementById("goLiveBtn");
if (goLiveButton) {
  goLiveButton.addEventListener("click", () => {
    const type = document.getElementById("contentType").value;
    const title = document.getElementById("title").value;
    const desc = document.getElementById("description").value;
    const file = document.getElementById("uploadFile").files[0];

    if (!type || !title || !desc || !file) {
      alert("Please fill out all fields and choose a file.");
      return;
    }

    alert(`Going live with a ${type}!\nTitle: ${title}\nDescription: ${desc}`);
    // Add actual upload logic here later
  });
}
