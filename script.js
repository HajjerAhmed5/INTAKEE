// Simulate login status (change this to true to simulate being logged in)
let isLoggedIn = false;

// Handle tab switching
const tabButtons = document.querySelectorAll('.tab-btn');
const tabs = document.querySelectorAll('.tab');

// Set initial tab
document.getElementById('home').classList.add('active');

tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    const target = button.getAttribute('data-tab');

    // Block access to Upload tab if not logged in
    if (target === 'upload' && !isLoggedIn) {
      alert("You must be logged in to upload content.");
      return;
    }

    // Show selected tab and hide others
    tabs.forEach(tab => {
      tab.classList.remove('active');
      if (tab.id === target) {
        tab.classList.add('active');
      }
    });
  });
});

// Search input behavior (basic alert)
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
