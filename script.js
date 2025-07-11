// Handle tab switching
function openTab(tabId) {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => tab.classList.remove('active'));
  const target = document.getElementById(tabId);
  if (target) {
    target.classList.add('active');
  }
}

// Placeholder for future login status logic
function isLoggedIn() {
  // In future: use Firebase auth
  return false;
}
