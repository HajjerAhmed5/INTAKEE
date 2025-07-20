/* ---------- GLOBAL STATE ---------- */
let isLoggedIn = false;

/* ---------- TAB NAVIGATION ---------- */
const tabButtons = document.querySelectorAll('.tab-btn');
const tabs       = document.querySelectorAll('.tab');

tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    const target = button.getAttribute('data-tab');

    // switch visible tab
    tabs.forEach(tab => {
      tab.classList.toggle('active', tab.id === target);
    });

    // block Upload tab when logged-out
    if (target === 'upload' && !isLoggedIn) {
      showAuthModal();
    }
  });
});

/* ---------- UPLOAD + GO LIVE BUTTONS ---------- */
['upload-trigger', 'go-live-trigger'].forEach(id => {
  const btn = document.getElementById(id);
  if (btn) {
    btn.addEventListener('click', () => {
      if (!isLoggedIn) {
        alert('You must be logged in first.');
      } else {
        alert(`${id === 'upload-trigger' ? 'Upload' : 'Go-Live'} feature coming soon.`);
      }
    });
  }
});

/* ---------- SEARCH BAR ---------- */
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

/* ---------- AUTH MODAL ---------- */
const authModal      = document.getElementById('auth-modal');
const authTitle      = document.getElementById('auth-title');
const authAction     = document.getElementById('auth-action');
const toggleAuth     = document.getElementById('toggle-auth');
const closeAuth      = document.querySelector('.close-auth');
const passwordInput  = document.getElementById('auth-password');
const togglePassword = document.getElementById('toggle-password');
let   isLogin        = true;

function showAuthModal() { authModal.classList.remove('hidden'); }
closeAuth.addEventListener('click', () => authModal.classList.add('hidden'));

toggleAuth.addEventListener('click', () => {
  isLogin = !isLogin;
  authTitle.textContent  = isLogin ? 'Login to INTAKEE' : 'Sign Up for INTAKEE';
  authAction.textContent = isLogin ? 'Login'           : 'Sign Up';
  toggleAuth.textContent = isLogin ? 'Sign Up'         : 'Login';
});

togglePassword.addEventListener('click', () => {
  passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
  togglePassword.classList.toggle('fa-eye-slash');
});

document.getElementById('forgot-password').addEventListener('click', () => {
  const email = document.getElementById('auth-email').value.trim();
  alert(email ? `Reset link sent to ${email}` : 'Enter your email first.');
});

/* ---------- LOGIN / SIGN-UP FLOW ---------- */
authAction.addEventListener('click', () => {
  const email    = document.getElementById('auth-email').value.trim();
  const password = passwordInput.value.trim();
  const remember = document.getElementById('remember-me').checked;

  if (!email || !password) {
    alert('Please fill in all fields.');
    return;
  }

  isLoggedIn = true;
  if (remember) {
    localStorage.setItem('intakeeUserEmail', email);
    localStorage.setItem('intakeeLoggedIn', 'true');
  } else {
    localStorage.removeItem('intakeeUserEmail');
    localStorage.removeItem('intakeeLoggedIn');
  }

  updateUI();
  authModal.classList.add('hidden');
  alert(`Welcome, ${email}`);
});

/* ---------- INITIALISE ON LOAD ---------- */
window.addEventListener('load', () => {
  if (localStorage.getItem('intakeeLoggedIn') === 'true') {
    isLoggedIn = true;
  }
  if (localStorage.getItem('intakeeUserEmail')) {
    document.getElementById('auth-email').value = localStorage.getItem('intakeeUserEmail');
    document.getElementById('remember-me').checked = true;
  }
  updateUI();
});

/* ---------- GLOBAL UI REFRESH ---------- */
function updateUI() {
  /*   HOME HEADER LOGIN CONTROLS   */
  const homeLoginBtn  = document.getElementById('home-login-btn');
  const homeUserEmail = document.getElementById('home-user-email');

  if (homeLoginBtn && homeUserEmail) {
    homeLoginBtn.style.display  = isLoggedIn ? 'none'  : 'inline-block';
    homeUserEmail.style.display = isLoggedIn ? 'block' : 'none';
    homeUserEmail.textContent   = localStorage.getItem('intakeeUserEmail') || 'User';
  }

  /*   PROFILE TAB ELEMENTS   */
  document.getElementById('logged-in-panel').style.display  = isLoggedIn ? 'block' : 'none';
  document.getElementById('logged-out-message').style.display = isLoggedIn ? 'none'  : 'block';
  document.querySelector('#profile textarea').disabled = !isLoggedIn;

  /*   ENABLE / DISABLE UPLOAD FIELDS   */
  document.querySelectorAll('#upload input, #upload textarea, #upload select')
    .forEach(el => el.disabled = !isLoggedIn);

  /*   Upload tab note text   */
  const note = document.getElementById('upload-note');
  if (note) note.textContent = isLoggedIn ? 'You can now upload content.' : 'You must be logged in to upload content.';
}

/* ---------- ACCOUNT ACTIONS (SETTINGS) ---------- */
function handleLogout() {
  isLoggedIn = false;
  localStorage.removeItem('intakeeLoggedIn');
  localStorage.removeItem('intakeeUserEmail');
  updateUI();
  alert('You have been logged out.');
}

function handleDeleteAccount() {
  if (confirm('Are you sure you want to delete your account? This cannot be undone.')) {
    localStorage.clear();
    isLoggedIn = false;
    updateUI();
    alert('Your account has been deleted.');
  }
}

/* ---------- EXPOSE GLOBALLY (for inline buttons) ---------- */
window.showAuthModal      = showAuthModal;
window.handleLogout       = handleLogout;
window.handleDeleteAccount = handleDeleteAccount;
