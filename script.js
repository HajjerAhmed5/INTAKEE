let isLoggedIn = false;

const tabButtons = document.querySelectorAll('.tab-btn');
const tabs = document.querySelectorAll('.tab');

// Show correct tab
tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    const target = button.getAttribute('data-tab');
    tabs.forEach(tab => {
      tab.classList.remove('active');
      if (tab.id === target) tab.classList.add('active');
    });

    // Upload tab check
    if (target === 'upload' && !isLoggedIn) {
      showAuthModal();
    }
  });
});

// Upload and Go Live actions
const uploadTrigger = document.getElementById('upload-trigger');
const goLiveTrigger = document.getElementById('go-live-trigger');

if (uploadTrigger) {
  uploadTrigger.addEventListener('click', () => {
    if (!isLoggedIn) {
      alert("You must be logged in to upload.");
    } else {
      alert("Upload function would go here.");
    }
  });
}

if (goLiveTrigger) {
  goLiveTrigger.addEventListener('click', () => {
    if (!isLoggedIn) {
      alert("You must be logged in to go live.");
    } else {
      alert("Go Live function would go here.");
    }
  });
}

// Search
document.querySelectorAll('.search-bar input').forEach(input => {
  input.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') alert(`Searching for: ${input.value}`);
  });
});

document.querySelectorAll('.search-bar .icon').forEach(icon => {
  icon.addEventListener('click', function () {
    const input = this.parentElement.querySelector('input');
    alert(`Searching for: ${input.value}`);
  });
});

// AUTH MODAL
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
  const type = passwordInput.type === 'password' ? 'text' : 'password';
  passwordInput.type = type;
  togglePassword.classList.toggle('fa-eye-slash');
});

document.getElementById('forgot-password').addEventListener('click', () => {
  const email = document.getElementById('auth-email').value;
  alert(email ? `Reset link sent to ${email}` : "Enter your email first.");
});

// Login/signup logic
authAction.addEventListener('click', () => {
  const email = document.getElementById('auth-email').value;
  const pass = passwordInput.value;
  const remember = document.getElementById('remember-me').checked;

  if (email && pass) {
    isLoggedIn = true;
    if (remember) {
      localStorage.setItem('intakeeUserEmail', email);
      localStorage.setItem('intakeeLoggedIn', 'true');
    } else {
      localStorage.removeItem('intakeeUserEmail');
      localStorage.removeItem('intakeeLoggedIn');
    }
    updateProfileUI();
    authModal.classList.add('hidden');
    alert(`Welcome, ${email}`);
  } else {
    alert("Please fill in all fields.");
  }
});

window.addEventListener('load', () => {
  if (localStorage.getItem('intakeeLoggedIn') === 'true') {
    isLoggedIn = true;
    updateProfileUI();
  }

  const savedEmail = localStorage.getItem('intakeeUserEmail');
  if (savedEmail) {
    document.getElementById('auth-email').value = savedEmail;
    document.getElementById('remember-me').checked = true;
  }
});

function updateProfileUI() {
  document.getElementById('logged-in-panel').style.display = isLoggedIn ? 'block' : 'none';
  document.getElementById('logged-out-message').style.display = isLoggedIn ? 'none' : 'block';
  document.getElementById('user-email').textContent = localStorage.getItem('intakeeUserEmail') || 'User';
  document.querySelector('#profile textarea').disabled = !isLoggedIn;
}

function handleLogout() {
  isLoggedIn = false;
  localStorage.removeItem('intakeeUserEmail');
  localStorage.removeItem('intakeeLoggedIn');
  updateProfileUI();
  alert("You have been logged out.");
}

function handleDeleteAccount() {
  if (confirm("Are you sure you want to delete your account?")) {
    localStorage.clear();
    isLoggedIn = false;
    updateProfileUI();
    alert("Your account has been deleted.");
  }
}
