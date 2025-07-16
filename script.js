// Handle tab switching
const tabButtons = document.querySelectorAll('.tab-btn');
const tabs = document.querySelectorAll('.tab');

tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    const target = button.getAttribute('data-tab');

    tabs.forEach(tab => {
      tab.style.display = tab.id === target ? 'block' : 'none';
    });
  });
});

// Optional: Search bar interaction (just clears on Enter key)
const searchInputs = document.querySelectorAll('.search-bar input');

searchInputs.forEach(input => {
  input.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      alert(`Searching for: ${input.value}`);
      input.value = '';
    }
  });
});
