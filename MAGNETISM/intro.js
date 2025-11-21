// 🎵 Load background music
const bgMusic = new Audio('assets/sounds/intro_music.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.4;

// Play music when page loads
window.addEventListener('DOMContentLoaded', () => {
  bgMusic.play().catch(() => {
    console.log("Autoplay blocked—user must interact first.");
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

// 🎵 Music Toggle Switch
const musicSwitch = document.getElementById('musicSwitch');

// Toggle ON/OFF
musicSwitch.addEventListener('change', () => {
  if (musicSwitch.checked) {
    bgMusic.play().catch(() => {});
  } else {
    bgMusic.pause();
  }
});

// Stop music helper
function stopMusic() {
  if (!bgMusic.paused) {
    bgMusic.pause();
    bgMusic.currentTime = 0;
  }
}
