// Simulate login status (change to true to simulate being logged in)
let isLoggedIn = false;

// Tab logic
const tabButtons = document.querySelectorAll('.tab-btn');
const tabs = document.querySelectorAll('.tab');

// Set initial active tab
document.getElementById('home').classList.add('active');

// Tab switch handler
tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    const target = button.getAttribute('data-tab');

    if (target === 'upload' && !isLoggedIn) {
      alert("You must be logged in to upload content.");
      return;
    }

    tabs.forEach(tab => {
      tab.classList.remove('active');
      if (tab.id === target) {
        tab.classList.add('active');
      }
    });
  });
});

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
