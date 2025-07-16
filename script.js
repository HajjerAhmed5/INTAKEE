// Simulated login status (change this to true to simulate being logged in)
let isLoggedIn = false;

// Handle tab switching
const tabButtons = document.querySelectorAll('.tab-btn');
const tabs = document.querySelectorAll('.tab');

tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    const target = button.getAttribute('data-tab');

    // Block access to Upload tab if not logged in
    if (target === 'upload' && !isLoggedIn) {
      alert("You must be logged in to upload content.");
      return;
    }

    // Show the selected tab, hide others
    tabs.forEach(tab => {
      tab.style.display = tab.id === target ? 'block' : 'none';
    });
  });
});

// Optional: Basic search bar behavior
const searchInputs = document.querySelectorAll('.search-bar input');

searchInputs.forEach(input => {
  input.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      alert(`Searching for: ${input.value}`);
      input.value = '';
    }
  });
});
