// INTAKEE FINAL SCRIPT.JS - FULLY FUNCTIONAL WITH PREVIEW, DELETE, LIKE/SAVE, VIEWER, COMMENTS, RECOMMENDED

let isLoggedIn = false;

// ---------- TAB NAVIGATION ----------
const tabButtons = document.querySelectorAll('.tab-btn');
const tabs = document.querySelectorAll('.tab');

function switchTab(target) {
  tabs.forEach(tab => tab.classList.toggle('active', tab.id === target));
}

tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    const target = button.getAttribute('data-tab');
    if (target === 'upload' && !isLoggedIn) {
      showAuthModal();
      return;
    }
    switchTab(target);
  });
});

// ---------- SEARCH FUNCTION ----------
document.querySelectorAll('.search-bar input').forEach(input => {
  input.addEventListener('keypress', e => {
    if (e.key === 'Enter') alert(`Searching for: ${input.value}`);
  });
});

document.querySelectorAll('.search-bar .icon').forEach(icon => {
  icon.addEventListener('click', () => {
    const input = icon.parentElement.querySelector('input');
    alert(`Searching for: ${input.value}`);
  });
});

// ---------- AUTH MODAL ----------
const authModal = document.getElementById('auth-modal');
const authTitle = document.getElementById('auth-title');
const authAction = document.getElementById('auth-action');
const toggleAuth = document.getElementById('toggle-auth');
const closeAuth = document.querySelector('.close-auth');
const passwordInput = document.getElementById('auth-password');
const togglePassword = document.getElementById('toggle-password');
let isLogin = true;

function showAuthModal() {
  authModal.classList.remove('hidden');
}

closeAuth.addEventListener('click', () => authModal.classList.add('hidden'));

toggleAuth.addEventListener('click', () => {
  isLogin = !isLogin;
  authTitle.textContent = isLogin ? 'Login to INTAKEE' : 'Sign Up for INTAKEE';
  authAction.textContent = isLogin ? 'Login' : 'Sign Up';
  toggleAuth.textContent = isLogin ? 'Sign Up' : 'Login';
});

togglePassword.addEventListener('click', () => {
  passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
  togglePassword.classList.toggle('fa-eye-slash');
});

document.getElementById('forgot-password').addEventListener('click', () => {
  const email = document.getElementById('auth-email').value.trim();
  alert(email ? `Reset link sent to ${email}` : 'Enter your email first.');
});

// ---------- LOGIN HANDLER ----------
authAction.addEventListener('click', () => {
  const email = document.getElementById('auth-email').value.trim();
  const password = passwordInput.value.trim();
  if (!email || !password) return alert('Please fill in all fields.');

  isLoggedIn = true;
  localStorage.setItem('intakeeLoggedIn', 'true');
  localStorage.setItem('intakeeUserEmail', email);
  updateUI();
  authModal.classList.add('hidden');
  alert(`Welcome, ${email}`);
});

// ---------- ON PAGE LOAD ----------
window.addEventListener('load', () => {
  isLoggedIn = localStorage.getItem('intakeeLoggedIn') === 'true';
  updateUI();
});

// ---------- UPDATE UI FUNCTION ----------
function updateUI() {
  const email = localStorage.getItem('intakeeUserEmail') || 'User';

  const homeLoginBtn = document.getElementById('home-login-btn');
  const homeUserEmail = document.getElementById('home-user-email');
  if (homeLoginBtn && homeUserEmail) {
    homeLoginBtn.style.display = isLoggedIn ? 'none' : 'inline-block';
    homeUserEmail.style.display = isLoggedIn ? 'block' : 'none';
    homeUserEmail.textContent = email;
  }

  const bio = document.querySelector('#profile textarea');
  const profilePic = document.querySelector('.profile-pic-placeholder');
  const uploadsContainer = document.getElementById('profile-uploads');
  const loggedOutMsg = document.getElementById('logged-out-message');
  const loggedInPanel = document.getElementById('logged-in-panel');

  if (isLoggedIn) {
    bio.disabled = false;
    bio.style.opacity = '1';
    bio.value = localStorage.getItem('userBio') || '';

    const savedImage = localStorage.getItem('profilePic');
    profilePic.innerHTML = `
      <label for="profile-img-input" style="cursor:pointer;position:relative;">
        <span style="position:absolute;top:0;right:0;background:#fff;border-radius:50%;padding:2px 6px;color:#000;font-weight:bold;font-size:12px;">+</span>
        <input type="file" id="profile-img-input" accept="image/*" style="display:none;" />
        ${savedImage ? `<img src="${savedImage}" style="width:100%;border-radius:50%;transition:transform 0.3s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"/>` : ''}
      </label>
    `;

    document.getElementById('profile-img-input').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        localStorage.setItem('profilePic', reader.result);
        updateUI();
      };
      reader.readAsDataURL(file);
    });

    const posts = JSON.parse(localStorage.getItem('userPosts') || '[]');
    uploadsContainer.innerHTML = posts.length
      ? posts.map((p, i) => generatePostHTML(p, i)).join('')
      : 'No uploads';

    populateTabs(posts);

    loggedOutMsg.style.display = 'none';
    loggedInPanel.style.display = 'block';
  } else {
    bio.value = '';
    bio.disabled = true;
    bio.style.opacity = '0.7';
    profilePic.textContent = 'No image';
    uploadsContainer.innerHTML = '';
    loggedOutMsg.style.display = 'block';
    loggedInPanel.style.display = 'none';
  }

  bio?.addEventListener('input', () => {
    if (isLoggedIn) localStorage.setItem('userBio', bio.value);
  });

  document.querySelectorAll('#upload input, #upload textarea, #upload select')
    .forEach(el => el.disabled = !isLoggedIn);

  const note = document.getElementById('upload-note');
  if (note) note.textContent = isLoggedIn ? 'You can now upload content.' : 'You must be logged in to upload content.';
}

// ---------- DELETE POST ----------
function deletePost(index) {
  const posts = JSON.parse(localStorage.getItem('userPosts') || '[]');
  posts.splice(index, 1);
  localStorage.setItem('userPosts', JSON.stringify(posts));
  updateUI();
}

// ---------- LIKE/SAVE POST ----------
function toggleLike(index) {
  const posts = JSON.parse(localStorage.getItem('userPosts') || '[]');
  posts[index].liked = !posts[index].liked;
  localStorage.setItem('userPosts', JSON.stringify(posts));
  updateUI();
}

function toggleSave(index) {
  const posts = JSON.parse(localStorage.getItem('userPosts') || '[]');
  posts[index].saved = !posts[index].saved;
  localStorage.setItem('userPosts', JSON.stringify(posts));
  updateUI();
}

// ---------- POST HTML ----------
function generatePostHTML(post, index) {
  return `
    <div class="post-card" onclick="viewPost(${index})">
      <strong>${post.type}</strong>: ${post.title}<br>
      ${post.preview ? `<video src="${post.preview}" muted autoplay loop style="max-width:100%"></video>` : ''}
    </div>
  `;
}

// ---------- VIEW POST ----------
function viewPost(index) {
  const posts = JSON.parse(localStorage.getItem('userPosts') || '[]');
  const post = posts[index];
  const viewer = document.createElement('div');
  viewer.className = 'viewer-modal';
  viewer.innerHTML = `
    <div class="viewer-box">
      <button onclick="this.parentElement.parentElement.remove()">❌</button>
      <h2>${post.title}</h2>
      ${post.preview ? `<video src="${post.preview}" controls autoplay style="width:100%"></video>` : ''}
      <div><strong>Type:</strong> ${post.type}</div>
      <div><strong>Uploader:</strong> ${localStorage.getItem('intakeeUserEmail')}</div>
      <textarea placeholder="Add a comment..."></textarea>
      <button onclick="addComment(${index})">Post Comment</button>
      <div id="comments-list">${(post.comments||[]).map(c => `<p>${c}</p>`).join('')}</div>
      <h3>Other Posts</h3>
      ${posts.filter((_,i) => i !== index).map((p, i) => generatePostHTML(p, i)).join('')}
    </div>
  `;
  document.body.appendChild(viewer);
}

function addComment(index) {
  const viewer = document.querySelector('.viewer-modal');
  const textarea = viewer.querySelector('textarea');
  const text = textarea.value.trim();
  if (!text) return;
  const posts = JSON.parse(localStorage.getItem('userPosts') || '[]');
  posts[index].comments = posts[index].comments || [];
  posts[index].comments.push(text);
  localStorage.setItem('userPosts', JSON.stringify(posts));
  textarea.value = '';
  viewPost(index);
}

// ---------- POPULATE TABS ----------
function populateTabs(posts) {
  const types = ['home', 'videos', 'podcast', 'clips'];
  types.forEach(type => {
    const container = document.getElementById(`${type}-feed`);
    if (!container) return;
    const filtered = posts.filter(p => type === 'home' || p.type.toLowerCase() === type);
    container.innerHTML = filtered.length
      ? filtered.map((p, i) => generatePostHTML(p, i)).join('')
      : 'No posts yet';
  });
}

// ---------- POST SIMULATION ----------
document.getElementById('upload-trigger').addEventListener('click', () => {
  if (!isLoggedIn) return alert('You must be logged in.');
  const title = document.getElementById('title').value;
  const type = document.querySelector('select').value;
  const fileInput = document.getElementById('upload-file');

  if (!title || !type || !fileInput.files[0]) return alert('Complete all fields.');

  const reader = new FileReader();
  reader.onload = () => {
    const posts = JSON.parse(localStorage.getItem('userPosts') || '[]');
    posts.push({ title, type, preview: reader.result, liked: false, saved: false });
    localStorage.setItem('userPosts', JSON.stringify(posts));
    updateUI();
    alert(`${type} uploaded: ${title}`);
  };
  reader.readAsDataURL(fileInput.files[0]);
});

document.getElementById('go-live-trigger').addEventListener('click', () => {
  if (!isLoggedIn) return alert('You must be logged in.');
  alert('You are now LIVE! (simulated stream)');
});

// ---------- SETTINGS ACTIONS ----------
function handleLogout() {
  isLoggedIn = false;
  localStorage.clear();
  updateUI();
  alert('Logged out.');
}

function handleDeleteAccount() {
  if (confirm('Delete your account permanently?')) {
    localStorage.clear();
    isLoggedIn = false;
    updateUI();
    alert('Account deleted.');
  }
}

window.showAuthModal = showAuthModal;
window.handleLogout = handleLogout;
window.handleDeleteAccount = handleDeleteAccount;
window.deletePost = deletePost;
window.toggleLike = toggleLike;
window.toggleSave = toggleSave;
window.viewPost = viewPost;
