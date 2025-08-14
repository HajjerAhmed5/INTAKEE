// ---------------- GLOBAL STATE ----------------
window.isLoggedIn = false;
let currentUserEmail = null;

// ---------------- HELPERS ----------------
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const show = (el) => el && el.classList.remove('hidden');
const hide = (el) => el && el.classList.add('hidden');

// ---------------- TABS + HASH ROUTING ----------------
function setActiveTab(tabId) {
  const tabs = $$('.tab');
  const btns = $$('.tab-btn');

  if (!$('#' + tabId)) tabId = 'home'; // fallback

  // Toggle sections & nav buttons
  tabs.forEach(t => t.classList.toggle('active', t.id === tabId));
  btns.forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === tabId));

  // Header visibility rules (hide on Upload/Settings)
  const searchBar = $('#global-search');
  const loginBtn  = $('#home-login-btn');
  if (['upload', 'settings'].includes(tabId)) {
    hide(searchBar); hide(loginBtn);
  } else {
    show(searchBar); show(loginBtn);
  }

  // Keep URL hash synced without jump
  if (location.hash !== '#' + tabId) history.replaceState(null, '', '#' + tabId);
}

function initTabs() {
  // Click to switch
  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      setActiveTab(btn.getAttribute('data-tab'));
    });
  });

  // Initial from hash or default
  const initial = (location.hash || '#home').slice(1);
  setActiveTab(initial);

  // Back/forward support
  window.addEventListener('hashchange', () => {
    const name = (location.hash || '#home').slice(1);
    setActiveTab(name);
  });
}

// ---------------- SETTINGS ACCORDION ----------------
function initSettingsAccordion() {
  $$('.settings-label').forEach(label => {
    label.addEventListener('click', () => {
      const section = label.closest('.settings-section');
      if (section) section.classList.toggle('open');
    });
  });
}

// ---------------- AUTH MODAL ----------------
function showAuthModal() {
  show($('#auth-modal'));
  const title = $('#auth-title');
  const actionBtn = $('#auth-action');
  const toggle = $('#toggle-auth');

  // Default to Login
  if (title) title.textContent = 'Login to INTAKEE';
  if (actionBtn) actionBtn.textContent = 'Login';

  if (toggle) {
    toggle.onclick = () => {
      const isLogin = title.textContent.includes('Login');
      title.textContent = isLogin ? 'Create your INTAKEE account' : 'Login to INTAKEE';
      actionBtn.textContent = isLogin ? 'Sign Up' : 'Login';
    };
  }

  if (actionBtn) {
    actionBtn.onclick = () => {
      const email = $('#auth-email')?.value.trim();
      const pwd   = $('#auth-password')?.value.trim();
      if (!email || !pwd) { alert('Please enter email and password.'); return; }

      // Demo "auth"
      window.isLoggedIn = true;
      currentUserEmail = email;
      applyLoginState();
      closeAuthModal();
      alert('Welcome to INTAKEE, ' + email + '!');
    };
  }
}
function closeAuthModal() { hide($('#auth-modal')); }

function applyLoginState() {
  // Update Profile name
  const nameEl = $('#user-email-display');
  if (nameEl) nameEl.textContent = window.isLoggedIn ? (currentUserEmail || 'User') : 'Guest';

  // Bio enable/disable
  const bio = $('#profile-bio');
  if (bio) bio.disabled = !window.isLoggedIn;

  // Upload gate text
  const upWarn = $('#upload-warning');
  if (upWarn) upWarn.textContent = window.isLoggedIn
    ? 'You are logged in. You can upload.'
    : 'You must be logged in to upload content.';
}

// Exposed handlers used by HTML
function promptLoginIfNeeded() {
  if (!window.isLoggedIn) showAuthModal();
}
function handleLogoutOrPrompt() {
  if (!window.isLoggedIn) return showAuthModal();
  handleLogout();
}
function handleDeleteAccountOrPrompt() {
  if (!window.isLoggedIn) return showAuthModal();
  handleDeleteAccount();
}
function handlePrivacyToggleOrPrompt() {
  if (!window.isLoggedIn) return showAuthModal();
  alert('Account made private (demo).');
}

// Auth action stubs
function handleLogout() {
  window.isLoggedIn = false;
  currentUserEmail = null;
  applyLoginState();
  alert('You have been logged out.');
}
function handleDeleteAccount() {
  const ok = confirm('Delete your account and all data? This cannot be undone.');
  if (!ok) return;
  window.isLoggedIn = false;
  currentUserEmail = null;
  applyLoginState();
  alert('Account deleted (demo).');
}

// ---------------- UPLOAD STUBS ----------------
function handleUpload() {
  if (!window.isLoggedIn) { showAuthModal(); return; }
  const type  = $('#upload-type')?.value || 'video';
  const title = $('#upload-title')?.value.trim() || '(Untitled)';
  alert(`Uploaded ${type}: ${title} (demo)`);
}
function goLive() {
  if (!window.isLoggedIn) { showAuthModal(); return; }
  alert('Starting live stream (demo)');
}

// Make functions global for inline handlers
Object.assign(window, {
  showAuthModal, closeAuthModal,
  promptLoginIfNeeded, handleLogoutOrPrompt, handleDeleteAccountOrPrompt, handlePrivacyToggleOrPrompt,
  handleUpload, goLive
});

// ---------------- BOOT ----------------
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initSettingsAccordion();
  applyLoginState();
});
