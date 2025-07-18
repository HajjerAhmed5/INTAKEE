let isLoggedIn = false; // simulate login state

const tabButtons = document.querySelectorAll('.tab-btn');
const tabs = document.querySelectorAll('.tab');

// Always show Upload tab, just restrict actions
document.getElementById('home').classList.add('active');

tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    const target = button.getAttribute('data-tab');

    // Show tab content
    tabs.forEach(tab => {
      tab.classList.remove('active');
      if (tab.id === target) tab.classList.add('active');
    });
  });
});

// Action buttons inside Upload tab
const uploadTrigger = document.getElementById('upload-trigger');
const goLiveTrigger = document.getElementById('go-live-trigger');

if (uploadTrigger) {
  uploadTrigger.addEventListener('click', () => {
    if (!isLoggedIn) {
      alert("You must be logged in to upload.");
    } else {
      alert("Upload function would go here.");
    }
  });
}

if (goLiveTrigger) {
  goLiveTrigger.addEventListener('click', () => {
    if (!isLoggedIn) {
      alert("You must be logged in to go live.");
    } else {
      alert("Go Live function would go here.");
    }
  });
}

// Search bar behavior
const searchInputs = document.querySelectorAll('.search-bar input');
const searchIcons = document.querySelectorAll('.search-bar .icon');

searchInputs.forEach(input => {
  input.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      alert(`Searching for: ${input.value}`);
    }
  });
});

searchIcons.forEach(icon => {
  icon.addEventListener('click', function () {
    const input = this.parentElement.querySelector('input');
    alert(`Searching for: ${input.value}`);
  });
});
