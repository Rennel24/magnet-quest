// 🎵 Load background music
const bgMusic = new Audio('music.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.4;

// Buttons
const startBtn = document.getElementById('startBtn');
const aboutBtn = document.getElementById('aboutBtn');

// Toggle switch
const musicSwitch = document.getElementById('musicSwitch');

// Default state = OFF
musicSwitch.checked = false;


function unlockAudio() {
  bgMusic.play().then(() => {
      bgMusic.pause();          // unlock but stay OFF
      bgMusic.currentTime = 0;
      console.log("Audio unlocked");
  }).catch(() => {});

  window.removeEventListener("click", unlockAudio);
}

window.addEventListener("click", unlockAudio);

/* 
--------------------------
 🎚 Toggle Music ON / OFF
--------------------------
*/
musicSwitch.addEventListener('change', () => {
  if (musicSwitch.checked) {
    bgMusic.play().catch(() => {});
  } else {
    bgMusic.pause();
    bgMusic.currentTime = 0;
  }
});

/* 
--------------------------
 ▶ Start / About Buttons
--------------------------
*/
startBtn.addEventListener('click', () => {
  bgMusic.pause();
  bgMusic.currentTime = 0;
  window.location.href = "game.html";
});

aboutBtn.addEventListener('click', () => {
  bgMusic.pause();
  bgMusic.currentTime = 0;
  window.location.href = "about.html";
});
