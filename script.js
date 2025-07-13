function showTab(id) {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  document.getElementById(id).classList.add('active');
  localStorage.setItem('activeTab', id);
}

document.addEventListener('DOMContentLoaded', () => {
  const savedTab = localStorage.getItem('activeTab');
  if (savedTab) showTab(savedTab);

  document.getElementById('loginBtn').addEventListener('click', () => {
    document.getElementById('loginModal').classList.remove('hidden');
  });

  document.querySelector('.close').addEventListener('click', () => {
    document.getElementById('loginModal').classList.add('hidden');
  });

  document.getElementById('darkModeToggle').addEventListener('click', () => {
    document.body.classList.toggle('dark');
  });
});
