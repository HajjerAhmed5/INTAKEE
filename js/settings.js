// ===============================
// INTAKEE – Settings Controller
// ===============================

// Default settings (used on first load)
const defaultSettings = {
  // Privacy
  privateAccount: false,
  uploadsPrivate: false,
  savedPrivate: false,
  playlistsPrivate: false,

  // Notifications
  notifyFollowers: true,
  notifyLikes: true,
  notifyComments: true,
  notifyUploads: true,

  // Playback
  autoplay: true,
  loopClips: true,
  pictureInPicture: true,
  backgroundPlay: true,
};

// Load saved settings or defaults
const settings = JSON.parse(localStorage.getItem("intakee_settings")) || {
  ...defaultSettings,
};

// Save settings to localStorage
function saveSettings() {
  localStorage.setItem("intakee_settings", JSON.stringify(settings));
}

// Make settings available globally
window.appSettings = settings;

// Utility to safely bind a toggle
function bindToggle(id, key) {
  const toggle = document.getElementById(id);
  if (!toggle) return;

  toggle.checked = settings[key];

  toggle.addEventListener("change", (e) => {
    settings[key] = e.target.checked;
    saveSettings();
  });
}

// ===============================
// Bind Toggles (match HTML IDs)
// ===============================

// Privacy
bindToggle("privateAccountToggle", "privateAccount");
bindToggle("uploadsPrivateToggle", "uploadsPrivate");
bindToggle("savedPrivateToggle", "savedPrivate");
bindToggle("playlistsPrivateToggle", "playlistsPrivate");

// Notifications
bindToggle("notifyFollowersToggle", "notifyFollowers");
bindToggle("notifyLikesToggle", "notifyLikes");
bindToggle("notifyCommentsToggle", "notifyComments");
bindToggle("notifyUploadsToggle", "notifyUploads");

// Playback
bindToggle("autoplayToggle", "autoplay");
bindToggle("loopClipsToggle", "loopClips");
bindToggle("pipToggle", "pictureInPicture");
bindToggle("backgroundPlayToggle", "backgroundPlay");

// ===============================
// Debug (optional – remove later)
// ===============================
console.log("INTAKEE settings loaded:", settings);

function openLegal(type) {
  const modal = document.getElementById("legalModal");
  const title = document.getElementById("legalTitle");
  const body = document.getElementById("legalBody");

  if (type === "privacy") {
    title.textContent = "Privacy Policy";
    body.innerHTML = `
      <p>INTAKEE collects limited personal information such as account details, uploaded content, engagement activity (likes, comments), and basic device or usage data.</p>
      <p>This information is used solely to operate, improve, and secure the platform. INTAKEE does not sell personal data to third parties.</p>
      <p>By using INTAKEE, you consent to the collection and use of information as described in this policy.</p>
    `;
  }

  if (type === "terms") {
    title.textContent = "Terms of Service";
    body.innerHTML = `
      <p>INTAKEE is a user-generated content platform. All content posted on INTAKEE is the sole responsibility of the user who created it.</p>
      <p>INTAKEE does not endorse, verify, or guarantee the accuracy, legality, or safety of user-generated content.</p>
      <p>By using INTAKEE, users agree that INTAKEE LLC is not liable for damages, claims, losses, or disputes arising from user content or interactions.</p>
      <p>Users agree to comply with all applicable laws while using the platform.</p>
    `;
  }

  if (type === "guidelines") {
    title.textContent = "Community Guidelines";
    body.innerHTML = `
      <p>INTAKEE prohibits content involving nudity, sexual exploitation, violence, hate speech, harassment, scams, illegal activity, or the exploitation of minors.</p>
      <p>Users are responsible for ensuring their content complies with these guidelines and all applicable laws.</p>
      <p>INTAKEE reserves the right to remove content or restrict accounts at its sole discretion.</p>
    `;
  }

  modal.classList.remove("hidden");
}

function closeLegal() {
  document.getElementById("legalModal").classList.add("hidden");
}
