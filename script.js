 /* ---------- GLOBAL STATE ---------- */
let isLoggedIn = false;
let uploads = JSON.parse(localStorage.getItem('uploads') || '[]');

/* ---------- TAB NAVIGATION ---------- */
document.querySelectorAll('.tab-btn').forEach(button => {
  button.addEventListener('click', () => {
    const target = button.getAttribute('data-tab');
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.getElementById(target).classList.add('active');

    if (target === 'upload' && !isLoggedIn) showAuthModal();
    if (target === 'videos') renderUploads('video');
    if (target === 'podcast') renderUploads('podcast');
    if (target === 'clips') renderUploads('clip');
    if (target === 'profile') renderProfileContent();
    if (target === 'home') renderTrending();
  });
});

/* ---------- AUTH LOGIC ---------- */
function showAuthModal() {
  document.getElementById('auth-modal').classList.remove('hidden');
}
document.querySelector('.close-auth').addEventListener('click', () => {
  document.getElementById('auth-modal').classList.add('hidden');
});

document.getElementById('auth-action').addEventListener('click', () => {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value.trim();
  if (!email || !password) return alert('Fill in all fields');

  isLoggedIn = true;
  localStorage.setItem('intakeeUserEmail', email);
  localStorage.setItem('intakeeLoggedIn', 'true');
  updateUI();
  document.getElementById('auth-modal').classList.add('hidden');
});

document.getElementById('toggle-auth').addEventListener('click', () => {
  const isLogin = document.getElementById('auth-action').textContent === 'Login';
  document.getElementById('auth-title').textContent = isLogin ? 'Sign Up for INTAKEE' : 'Login to INTAKEE';
  document.getElementById('auth-action').textContent = isLogin ? 'Sign Up' : 'Login';
  document.getElementById('toggle-auth').textContent = isLogin ? 'Login' : 'Sign Up';
});

window.onload = () => {
  isLoggedIn = localStorage.getItem('intakeeLoggedIn') === 'true';
  updateUI();
};

function updateUI() {
  const email = localStorage.getItem('intakeeUserEmail');
  document.getElementById('home-login-btn').style.display = isLoggedIn ? 'none' : 'block';
  document.getElementById('home-user-email').textContent = email || '';
  document.getElementById('home-user-email').style.display = isLoggedIn ? 'block' : 'none';
  document.getElementById('logged-in-panel')?.classList.toggle('hidden', !isLoggedIn);
  document.getElementById('logged-out-message')?.classList.toggle('hidden', isLoggedIn);
  document.querySelectorAll('#upload input, #upload textarea, #upload select').forEach(el => el.disabled = !isLoggedIn);
}

/* ---------- LOGOUT ---------- */
function handleLogout() {
  isLoggedIn = false;
  localStorage.removeItem('intakeeLoggedIn');
  localStorage.removeItem('intakeeUserEmail');
  updateUI();
}

function handleDeleteAccount() {
  if (confirm('Are you sure? This will remove all data.')) {
    localStorage.clear();
    isLoggedIn = false;
    updateUI();
    alert('Account deleted');
  }
}

window.handleLogout = handleLogout;
window.handleDeleteAccount = handleDeleteAccount;

/* ---------- UPLOAD ---------- */
document.getElementById('upload-trigger').addEventListener('click', () => {
  if (!isLoggedIn) return alert('Login to upload');

  const type = document.querySelector('#upload select').value.toLowerCase();
  const title = document.getElementById('title').value.trim();
  const description = document.getElementById('description').value.trim();
  const fileInput = document.getElementById('thumbnail');
  const file = fileInput.files[0];

  if (!title || !file) return alert('Title and thumbnail required');

  const reader = new FileReader();
  reader.onload = () => {
    const newPost = {
      id: Date.now(),
      title,
      description,
      image: reader.result,
      type,
      email: localStorage.getItem('intakeeUserEmail') || 'User',
      comments: [],
      likes: 0,
      saves: 0
    };
    uploads.push(newPost);
    localStorage.setItem('uploads', JSON.stringify(uploads));
    alert('Uploaded!');
    clearUploadForm();
    renderUploads(type);
    renderProfileContent();
  };
  reader.readAsDataURL(file);
});

function clearUploadForm() {
  ['title', 'description', 'thumbnail'].forEach(id => document.getElementById(id).value = '');
}

function renderUploads(type) {
  const grid = document.querySelector(`#${type}s .video-grid`);
  grid.innerHTML = '';
  const filtered = uploads.filter(u => u.type === type);
  if (!filtered.length) return grid.innerHTML = '<p>No posts yet</p>';

  filtered.forEach(post => {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.innerHTML = `
      <img src="${post.image}" alt="Thumbnail" style="width:100%; border-radius:6px; cursor:pointer" onclick='openPostModal(${JSON.stringify(post)})' />
      <h3>${post.title}</h3>
      <p>${post.description}</p>
      <small>By ${post.email}</small><br/>
      <button onclick="deletePost(${post.id})">Delete</button>
      <button onclick="likePost(${post.id})">❤️ ${post.likes}</button>
      <button onclick="savePost(${post.id})">💾 ${post.saves}</button>
    `;
    grid.appendChild(card);
  });
}

function renderProfileContent() {
  const grid = document.querySelector('#profile .video-grid');
  grid.innerHTML = '';
  const email = localStorage.getItem('intakeeUserEmail');
  const userPosts = uploads.filter(p => p.email === email);
  if (!userPosts.length) return grid.innerHTML = '<p>No uploads yet</p>';

  userPosts.forEach(post => {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.innerHTML = `
      <img src="${post.image}" alt="Preview" style="width:100%; border-radius:6px; cursor:pointer" onclick='openPostModal(${JSON.stringify(post)})'>
      <h3 contenteditable="true" onblur="editTitle(${post.id}, this.textContent)">${post.title}</h3>
      <p contenteditable="true" onblur="editDescription(${post.id}, this.textContent)">${post.description}</p>
      <small>${post.type}</small>
    `;
    grid.appendChild(card);
  });
}

function deletePost(id) {
  if (!confirm('Delete this post?')) return;
  uploads = uploads.filter(p => p.id !== id);
  localStorage.setItem('uploads', JSON.stringify(uploads));
  renderUploads('video');
  renderUploads('clip');
  renderUploads('podcast');
  renderTrending();
  renderProfileContent();
}

function likePost(id) {
  uploads = uploads.map(p => p.id === id ? { ...p, likes: (p.likes || 0) + 1 } : p);
  localStorage.setItem('uploads', JSON.stringify(uploads));
  renderTrending();
  renderProfileContent();
  renderUploads('video');
  renderUploads('clip');
  renderUploads('podcast');
}

function savePost(id) {
  uploads = uploads.map(p => p.id === id ? { ...p, saves: (p.saves || 0) + 1 } : p);
  localStorage.setItem('uploads', JSON.stringify(uploads));
  renderTrending();
  renderProfileContent();
  renderUploads('video');
  renderUploads('clip');
  renderUploads('podcast');
}

function editTitle(id, newTitle) {
  uploads = uploads.map(p => p.id === id ? { ...p, title: newTitle } : p);
  localStorage.setItem('uploads', JSON.stringify(uploads));
}

function editDescription(id, newDesc) {
  uploads = uploads.map(p => p.id === id ? { ...p, description: newDesc } : p);
  localStorage.setItem('uploads', JSON.stringify(uploads));
}

/* ---------- POST VIEW MODAL ---------- */
function openPostModal(post) {
  const modal = document.createElement('div');
  modal.className = 'post-modal';
  modal.innerHTML = `
    <div class="post-view">
      <img src="${post.image}" alt="preview" style="width:100%" />
      <h2>${post.title}</h2>
      <p>${post.description}</p>
      <p><strong>Posted by:</strong> ${post.email}</p>
      <textarea placeholder="Leave a comment..."></textarea>
      <button onclick="closeModal()">Close</button>
    </div>
  `;
  document.body.appendChild(modal);
}

function closeModal() {
  document.querySelector('.post-modal')?.remove();
}

/* ---------- TRENDING (HOME) ---------- */
function renderTrending() {
  const grid = document.querySelector('#home .video-grid');
  grid.innerHTML = '';
  const recent = uploads.slice(-6).reverse();
  if (!recent.length) return grid.innerHTML = '<p>No trending posts</p>';

  recent.forEach(post => {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.innerHTML = `
      <img src="${post.image}" alt="Thumbnail" style="width:100%; border-radius:6px; cursor:pointer" onclick='openPostModal(${JSON.stringify(post)})' />
      <h3>${post.title}</h3>
      <p>${post.description}</p>
      <small>${post.type.toUpperCase()}</small>
    `;
    grid.appendChild(card);
  });
}

/* ---------- GO LIVE ---------- */
document.getElementById('go-live-trigger')?.addEventListener('click', () => {
  if (!isLoggedIn) return alert("Login to Go Live.");
  alert("🔴 You're live! (Simulated)");
});
