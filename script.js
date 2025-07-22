let isLoggedIn = false;

/* ---------- TAB NAVIGATION ---------- */
const tabButtons = document.querySelectorAll('.tab-btn');
const tabs = document.querySelectorAll('.tab');

tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    const target = button.getAttribute('data-tab');
    tabs.forEach(tab => tab.classList.toggle('active', tab.id === target));
    if (target === 'upload' && !isLoggedIn) showAuthModal();
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
  if (localStorage.getItem('intakeeLoggedIn') === 'true') isLoggedIn = true;
  updateUI();
});

/* ---------- MAIN UI REFRESH ---------- */
function updateUI() {
  const homeLoginBtn = document.getElementById('home-login-btn');
  const homeUserEmail = document.getElementById('home-user-email');

  if (homeLoginBtn && homeUserEmail) {
    homeLoginBtn.style.display = isLoggedIn ? 'none' : 'inline-block';
    homeUserEmail.style.display = isLoggedIn ? 'block' : 'none';
    homeUserEmail.textContent = localStorage.getItem('intakeeUserEmail') || 'User';
  }

  // Profile Info
  const bio = document.querySelector('#profile textarea');
  const profilePic = document.querySelector('.profile-pic-placeholder');
  const loggedOutMsg = document.getElementById('logged-out-message');

  if (isLoggedIn) {
    bio.disabled = false;
    bio.style.opacity = '1';
    bio.value = localStorage.getItem('userBio') || '';

    if (profilePic) {
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

    if (loggedOutMsg) loggedOutMsg.style.display = 'none';
  } else {
    bio.value = '';
    bio.disabled = true;
    bio.style.opacity = '0.7';
    if (profilePic) profilePic.textContent = 'No image';
    if (loggedOutMsg) loggedOutMsg.style.display = 'block';
  }

  // Save bio
  bio?.addEventListener('input', () => {
    if (isLoggedIn) localStorage.setItem('userBio', bio.value);
  });

  // Upload tab
  document.querySelectorAll('#upload input, #upload textarea, #upload select')
    .forEach(el => el.disabled = !isLoggedIn);

  const note = document.getElementById('upload-note');
  if (note) note.textContent = isLoggedIn ? 'You can now upload content.' : 'You must be logged in to upload content.';
}

/* ---------- UPLOAD / GO LIVE ---------- */
['upload-trigger', 'go-live-trigger'].forEach(id => {
  const btn = document.getElementById(id);
  if (btn) {
    btn.addEventListener('click', () => {
      if (!isLoggedIn) {
        alert('You must be logged in.');
      } else {
        alert(`${id === 'upload-trigger' ? 'Upload' : 'Go-Live'} coming soon.`);
      }
    });
  }
});

/* ---------- SETTINGS ---------- */
function handleLogout() {
  isLoggedIn = false;
  localStorage.removeItem('intakeeLoggedIn');
  localStorage.removeItem('intakeeUserEmail');
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

/* ---------- GLOBAL ---------- */
window.showAuthModal = showAuthModal;
window.handleLogout = handleLogout;
window.handleDeleteAccount = handleDeleteAccount;
