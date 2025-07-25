// INTAKEE App JavaScript Functionality

let isLoggedIn = false;
let isLogin = true;

const tabButtons = document.querySelectorAll('.tab-btn');
const tabs = document.querySelectorAll('.tab');
const authModal = document.getElementById('auth-modal');
const authTitle = document.getElementById('auth-title');
const authAction = document.getElementById('auth-action');
const toggleAuth = document.getElementById('toggle-auth');
const closeAuth = document.querySelector('.close-auth');
const passwordInput = document.getElementById('auth-password');
const togglePassword = document.getElementById('toggle-password');

// Switch tabs
tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    const target = button.getAttribute('data-tab');
    tabs.forEach(tab => tab.classList.toggle('active', tab.id === target));
  });
});

// Show Auth Modal
function showAuthModal() {
  authModal.classList.remove('hidden');
}
window.showAuthModal = showAuthModal;

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
window.handleLogout = handleLogout;
window.handleDeleteAccount = handleDeleteAccount;

function updateUI() {
  const email = localStorage.getItem('intakeeUserEmail') || 'User';
  const userEmailSpan = document.getElementById('display-user-email');
  const bio = document.getElementById('user-bio');
  const profilePic = document.getElementById('profile-pic');
  const uploadNote = document.getElementById('upload-note');
  const uploadInputs = document.querySelectorAll('#upload input, #upload textarea, #upload select');

  if (isLoggedIn) {
    document.getElementById('home-login-btn').style.display = 'none';
    document.getElementById('home-user-email').style.display = 'inline-block';
    document.getElementById('home-user-email').textContent = email;
    userEmailSpan.textContent = email;
    document.getElementById('logged-in-panel').style.display = 'block';

    bio.disabled = false;
    bio.value = localStorage.getItem('userBio') || '';
    bio.addEventListener('input', () => {
      localStorage.setItem('userBio', bio.value);
    });

    const storedPic = localStorage.getItem('profilePic');
    profilePic.src = storedPic || '';
    profilePic.addEventListener('click', () => {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          localStorage.setItem('profilePic', reader.result);
          updateUI();
        };
        reader.readAsDataURL(file);
      };
      fileInput.click();
    });
  }

  uploadInputs.forEach(el => el.disabled = !isLoggedIn);
  uploadNote.textContent = isLoggedIn ? 'You can now upload content.' : 'You must be logged in to upload content.';
}

function createPostCard({ title, description, type, thumbnailURL, mediaURL }) {
  const div = document.createElement('div');
  div.className = 'video-card';

  let mediaElement = '';
  if (type.includes('podcast') || type === 'clip') {
    mediaElement = `<audio controls src="${mediaURL}"></audio>`;
  } else {
    mediaElement = `<video controls src="${mediaURL}" poster="${thumbnailURL}" style="width:100%"></video>`;
  }

  div.innerHTML = `
    ${mediaElement}
    <h3>${title}</h3>
    <p>${description}</p>
    <span>${type}</span>
  `;
  return div;
}

document.getElementById('upload-trigger').addEventListener('click', () => {
  if (!isLoggedIn) return alert('You must be logged in to upload.');

  const title = document.getElementById('title').value.trim();
  const description = document.getElementById('description').value.trim();
  const type = document.getElementById('upload-type').value;
  const thumbnailInput = document.getElementById('thumbnail');
  const mediaInput = document.getElementById('media');
  const thumbnailFile = thumbnailInput.files[0];
  const mediaFile = mediaInput.files[0];

  if (!title || !description || !thumbnailFile || !mediaFile) {
    return alert('Please fill in all fields and choose both a thumbnail and media file.');
  }

  const reader = new FileReader();
  reader.onload = () => {
    const mediaReader = new FileReader();
    mediaReader.onload = () => {
      const post = {
        title,
        description,
        type,
        thumbnailURL: reader.result,
        mediaURL: mediaReader.result
      };

      const feeds = {
        'video': document.getElementById('video-feed'),
        'clip': document.getElementById('clip-feed'),
        'podcast-audio': document.getElementById('podcast-feed'),
        'podcast-video': document.getElementById('podcast-feed')
      };
      const profileFeed = document.getElementById('profile-uploads');

      const postCard = createPostCard(post);
      feeds[type].appendChild(postCard);
      profileFeed.appendChild(postCard.cloneNode(true));
      alert('Upload successful!');
    };
    mediaReader.readAsDataURL(mediaFile);
  };
  reader.readAsDataURL(thumbnailFile);
});

window.addEventListener('load', () => {
  if (localStorage.getItem('intakeeLoggedIn') === 'true') {
    isLoggedIn = true;
  }
  updateUI();
});
