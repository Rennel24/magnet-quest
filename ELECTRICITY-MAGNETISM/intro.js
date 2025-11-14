// 🎵 Load background music
const bgMusic = new Audio('assets/sounds/intro_music.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.4;

// Play music when page loads
window.addEventListener('DOMContentLoaded', () => {
  bgMusic.play().catch(() => {
    console.log("Autoplay prevented. Click a button to play music.");
  });
});

// Buttons
document.getElementById('startBtn').addEventListener('click', () => {
  stopMusic();
  window.location.href = "game.html";
});

document.getElementById('aboutBtn').addEventListener('click', () => {
  stopMusic();
  window.location.href = "about.html";
});

// Music button toggle
const musicBtn = document.getElementById('musicBtn');
const musicIcon = document.getElementById('musicIcon');
let musicPlaying = true;

musicBtn.addEventListener('click', () => {
  if (musicPlaying) {
    bgMusic.pause();
    musicIcon.src = 'assets/images/music_off.png';
  } else {
    bgMusic.play().catch(() => {});
    musicIcon.src = 'assets/images/music_on.png';
  }
  musicPlaying = !musicPlaying;

  // Add a small rotation animation
  musicIcon.style.transform = 'rotate(360deg)';
  setTimeout(() => { musicIcon.style.transform = 'rotate(0deg)'; }, 300);
});

// Stop music helper
function stopMusic() {
  if (!bgMusic.paused) {
    bgMusic.pause();
    bgMusic.currentTime = 0;
  }
}
