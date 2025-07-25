let isLoggedIn = false;

/* ---------- TAB NAVIGATION ---------- */
const tabButtons = document.querySelectorAll('.tab-btn');
const tabs = document.querySelectorAll('.tab');

function showTab(target) {
  tabs.forEach(tab => tab.classList.toggle('active', tab.id === target));
}

tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    const target = button.getAttribute('data-tab');
    if (target === 'upload' && !isLoggedIn) {
      showAuthModal();
    } else {
      showTab(target);
    }
  });
});

/* ---------- SEARCH FUNCTION ---------- */
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

/* ---------- AUTH ---------- */
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

/* ---------- LOGIN ---------- */
authAction.addEventListener('click', () => {
  const email = document.getElementById('auth-email').value.trim();
  const password = passwordInput.value.trim();
  const remember = document.getElementById('remember-me').checked;
  if (!email || !password) return alert('Please fill in all fields.');

  isLoggedIn = true;
  if (remember) {
    localStorage.setItem('intakeeLoggedIn', 'true');
    localStorage.setItem('intakeeUserEmail', email);
  }
  updateUI();
  authModal.classList.add('hidden');
  alert(`Welcome, ${email}`);
});

/* ---------- INIT ---------- */
window.addEventListener('load', () => {
  if (localStorage.getItem('intakeeLoggedIn') === 'true') {
    isLoggedIn = true;
  }
  updateUI();
  loadContent();
});

/* ---------- MAIN UI REFRESH ---------- */
function updateUI() {
  const homeLoginBtn = document.getElementById('home-login-btn');
  const homeUserEmail = document.getElementById('home-user-email');
  const displayUserEmail = document.getElementById('display-user-email');
  const loggedInPanel = document.getElementById('logged-in-panel');
  const loggedOutMsg = document.getElementById('logged-out-message');
  const profilePic = document.querySelector('.profile-pic-placeholder');
  const bio = document.querySelector('#profile textarea');

  const savedEmail = localStorage.getItem('intakeeUserEmail') || 'User';

  if (homeLoginBtn && homeUserEmail) {
    homeLoginBtn.style.display = isLoggedIn ? 'none' : 'inline-block';
    homeUserEmail.style.display = isLoggedIn ? 'block' : 'none';
    homeUserEmail.textContent = savedEmail;
  }

  if (displayUserEmail) displayUserEmail.textContent = savedEmail;
  if (loggedInPanel) loggedInPanel.style.display = isLoggedIn ? 'block' : 'none';
  if (loggedOutMsg) loggedOutMsg.style.display = isLoggedIn ? 'none' : 'block';

  if (bio) {
    bio.disabled = !isLoggedIn;
    bio.style.opacity = isLoggedIn ? '1' : '0.7';
    if (isLoggedIn) bio.value = localStorage.getItem('userBio') || '';
  }

  if (profilePic && isLoggedIn) {
    const savedImage = localStorage.getItem('profilePic');
    profilePic.innerHTML = `
      <label for="profile-img-input" style="cursor:pointer;">
        <span style="font-size:12px;">Upload</span>
        <input type="file" id="profile-img-input" accept="image/*" style="display:none;" />
      </label>
      ${savedImage ? `<img src="${savedImage}" style="width:100%;border-radius:50%;" />` : ''}
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
  }

  bio?.addEventListener('input', () => {
    if (isLoggedIn) localStorage.setItem('userBio', bio.value);
  });
}

/* ---------- CONTENT POSTING ---------- */
const uploadButton = document.getElementById('upload-trigger');
if (uploadButton) {
  uploadButton.addEventListener('click', () => {
    if (!isLoggedIn) return alert('You must be logged in.');
    const type = document.getElementById('upload-type')?.value || 'video';
    const title = document.getElementById('title')?.value.trim();
    if (!title) return alert('Please enter a title.');
    const post = { type, title, id: Date.now() };
    const existing = JSON.parse(localStorage.getItem('intakeePosts') || '[]');
    existing.push(post);
    localStorage.setItem('intakeePosts', JSON.stringify(existing));
    alert('Post uploaded!');
    loadContent();
  });
}

function loadContent() {
  const posts = JSON.parse(localStorage.getItem('intakeePosts') || '[]');
  const videoGrid = document.querySelector('#videos .video-grid');
  const clipsGrid = document.querySelector('#clips .video-grid');
  const podcastGrid = document.querySelector('#podcast .video-grid');

  videoGrid.innerHTML = '';
  clipsGrid.innerHTML = '';
  podcastGrid.innerHTML = '';

  posts.forEach(post => {
    const div = document.createElement('div');
    div.className = 'video-card';
    div.textContent = post.title;
    if (post.type === 'clip') clipsGrid.appendChild(div);
    else if (post.type.includes('podcast')) podcastGrid.appendChild(div);
    else videoGrid.appendChild(div);
  });
}

/* ---------- GLOBAL ---------- */
window.showAuthModal = showAuthModal;
