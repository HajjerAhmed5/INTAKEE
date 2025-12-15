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

