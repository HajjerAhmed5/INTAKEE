// ============================================
// INTAKEE — MINI AUDIO PLAYER
// Plays podcasts/audio across the app.
// ============================================

const miniPlayer = document.getElementById("mini-player");
const mpAudio    = document.getElementById("mp-audio");
const mpPlayBtn  = document.getElementById("mp-play");
const mpCloseBtn = document.getElementById("mp-close");

let mpIsPlaying = false;

// ============================================
// OPEN / PLAY PODCAST
// Called from feed, viewer, etc.
// ============================================
export function playPodcast(url, title = "Now Playing") {

  // Load & show player
  miniPlayer.hidden = false;
  miniPlayer.classList.add("active");

  mpAudio.src = url;
  mpAudio.play();

  mpIsPlaying = true;
  mpPlayBtn.innerHTML = `<i class="fa fa-pause"></i>`;

  // Optional: display title
  const titleEl = document.getElementById("mp-title");
  if (titleEl) titleEl.textContent = title;
}

// ============================================
// TOGGLE PLAY / PAUSE
// ============================================
mpPlayBtn?.addEventListener("click", () => {
  if (!mpAudio.src) return;

  if (mpIsPlaying) {
    mpAudio.pause();
    mpPlayBtn.innerHTML = `<i class="fa fa-play"></i>`;
    mpIsPlaying = false;
  } else {
    mpAudio.play();
    mpPlayBtn.innerHTML = `<i class="fa fa-pause"></i>`;
    mpIsPlaying = true;
  }
});

// ============================================
// CLOSE PLAYER
// ============================================
mpCloseBtn?.addEventListener("click", () => {
  try { mpAudio.pause(); } catch {}
  mpAudio.src = "";
  miniPlayer.classList.remove("active");
  miniPlayer.hidden = true;
  mpIsPlaying = false;
});
