// Tab navigation logic
function showTab(tabId) {
  const contents = document.querySelectorAll('.tab-content');
  contents.forEach(content => content.classList.remove('active'));
  const target = document.getElementById(tabId.replace('#', ''));
  if (target) {
    target.classList.add('active');
  }

  // Show/hide search bar
  const searchBar = document.getElementById('search-bar');
  if (["#upload", "#settings"].includes(tabId)) {
    searchBar.style.display = 'none';
  } else {
    searchBar.style.display = 'flex';
  }
}

// Listen for tab click events
document.querySelectorAll('.tab-bar a').forEach(link => {
  link.addEventListener('click', function (e) {
    e.preventDefault();
    const tabId = this.getAttribute('href');
    showTab(tabId);
  });
});

// Default to Home tab on load
document.addEventListener('DOMContentLoaded', () => {
  showTab('#home');
});

// Profile Picture Preview
function previewProfilePic(event) {
  const reader = new FileReader();
  reader.onload = function () {
    const preview = document.getElementById('profilePreview');
    preview.src = reader.result;
  };
  reader.readAsDataURL(event.target.files[0]);
}
