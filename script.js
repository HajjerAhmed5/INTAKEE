function showTab(id) {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  document.getElementById(id).classList.add('active');

  const search = document.getElementById('searchContainer');
  if (id === 'upload' || id === 'settings') {
    search.style.display = 'none';
  } else {
    search.style.display = 'flex';
  }
}
