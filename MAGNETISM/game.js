const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let magnet, metal, goal, mouse, animationFrame;
let gameRunning = false;
let isPaused = false;
let isMouseDown = false;
const MAX_ATTRACTION_DISTANCE = 250;

// 🎵 Magnetic Pull Sound
const pullSound = new Audio("assets/sounds/pulling_magnet.mp3");
pullSound.loop = true;
pullSound.volume = 0.4;

// 🎵 Goal Reached Sound
const goalSound = new Audio("assets/sounds/goal.mp3");
goalSound.volume = 0.5;

let goalGlowPhase = 0;        // Tracks the glow animation
const goalGlowSpeed = 0.05;   // Speed of glow animation

// --- Persistent total score ---
let totalScore = 0;

// 🎆 Particles & waves
let particles = [];
let waves = [];

// ⏱️ Score system
let score = 0;
let timeLeft = 60;
let timerInterval = null;
let timeUp = false;
let timeUpShown = false;

// ✅ Default to "Small Magnet" correctly
const selectedMagnet = {
  strengthMultiplier: 0.5,
  radius: 25,
  displaySize: 25,
  image: "assets/images/magnet.png"
};


document.getElementById('backBtn').addEventListener('click', () => {
  // Optionally pause music or reset game
  const bgMusic = document.getElementById('bgMusic');
  if(bgMusic && !bgMusic.paused) {
    bgMusic.pause();
    bgMusic.currentTime = 0;
  }
  // Redirect to intro screen
  window.location.href = "intro.html";
});


// Also make sure magnetStrength matches the small magnet’s values
let magnetStrength = selectedMagnet.strengthMultiplier * 400;

// 🩵 Magnetic wave class
class MagneticWave {
  constructor(yOffset, amplitude, wavelength, speed, color) {
    this.yOffset = yOffset;
    this.amplitude = amplitude;
    this.wavelength = wavelength;
    this.speed = speed;
    this.phase = 0;
    this.color = color;
  }

  update() { this.phase += this.speed; }
  draw(ctx, width, height) {
    ctx.beginPath();
    for (let x = 0; x <= width; x += 10) {
      const y = height / 2 + this.yOffset + Math.sin((x / this.wavelength) + this.phase) * this.amplitude;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.25;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

// 🌊 Create waves
function createWaves() {
  waves = [];
  const colors = ["#81d4fa", "#4fc3f7", "#b3e5fc"];
  for (let i = 0; i < 6; i++) {
    waves.push(new MagneticWave(
      (i - 3) * 60,
      25 + Math.random() * 15,
      200 + Math.random() * 150,
      0.02 + Math.random() * 0.02,
      colors[i % colors.length]
    ));
  }
}

// 🧨 Particle class
class Particle {
  constructor(x, y, color, size, life) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 4;
    this.vy = (Math.random() - 0.5) * 4;
    this.size = size || 4;
    this.color = color || "#ffd700";
    this.life = life || 30;
  }
  update() { this.x += this.vx; this.y += this.vy; this.life--; }
  draw(ctx) { ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fillStyle = this.color; ctx.fill(); }
}

// Magnet image
let magnetImg = null;
function loadMagnetImage(src) {
  const img = new Image();
  img.src = src;
  img.onload = () => (magnetImg = img);
}
loadMagnetImage(selectedMagnet.image);

// Magnet selector
document.querySelectorAll(".magnet-choice").forEach(option => {
  if (option.classList.contains("small")) option.classList.add("active");
  option.addEventListener("click", () => {
    document.querySelectorAll(".magnet-choice").forEach(opt => opt.classList.remove("active"));
    option.classList.add("active");

    if (option.classList.contains("small")) {
      selectedMagnet.strengthMultiplier = 0.5;
      selectedMagnet.displaySize = 25;
      magnetStrength = 0.5 * 400;
    } else if (option.classList.contains("medium")) {
      selectedMagnet.strengthMultiplier = 0.8;
      selectedMagnet.displaySize = 35;
      magnetStrength = 0.8 * 500;
    } else if (option.classList.contains("large")) {
      selectedMagnet.strengthMultiplier = 1.2;
      selectedMagnet.displaySize = 50;
      magnetStrength = 1.2 * 600;
    }

    selectedMagnet.image = option.dataset.image;
    loadMagnetImage(selectedMagnet.image);

    if (magnet) {
      magnet.radius = selectedMagnet.displaySize;
    }
  });
});

// Resize & init
function resizeCanvas() {
  const hudHeight = document.querySelector(".hud")?.offsetHeight + 30 || 50;
  canvas.width = window.innerWidth - 50;
  canvas.height = window.innerHeight - hudHeight + 350;

  const metalRadius = canvas.height * 0.04;
  const goalRadius = canvas.height * 0.06;
  const magnetRadius = selectedMagnet.displaySize;

  if (!magnet) {
    magnet = {
      x: 120,
      y: canvas.height / 2,
      radius: magnetRadius,
      polarity: 1
    };
  } else {
    magnet.radius = magnetRadius;
  }

  if (!document.querySelector(".magnet-choice.active")) {
    document.querySelector(".magnet-choice.small").classList.add("active");
  }

  metal = {
    x: 300,
    y: canvas.height / 2,
    radius: metalRadius,
    vx: 0,
    vy: 0
  };
  goal = {
    x: canvas.width - 150,
    y: canvas.height / 2,
    radius: goalRadius
  };
  mouse = { x: magnet.x, y: magnet.y };

  createWaves();

  if (magnetImg && selectedMagnet.image) {
    loadMagnetImage(selectedMagnet.image);
  }

  const polarityIndicator = document.getElementById("polarity");
  if (polarityIndicator) polarityIndicator.textContent = "NORTH 🧲";
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// 🖱️ Mouse controls
document.addEventListener("mousemove", e => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
});
canvas.addEventListener("mousedown", e => { if (e.button === 0) isMouseDown = true; });
canvas.addEventListener("mouseup", () => { isMouseDown = false; });

// 🧲 Spacebar flips magnet polarity
document.addEventListener("keydown", e => {
  if (e.code === "Space" && gameRunning && !isPaused) {
    magnet.polarity *= -1;

    const polarityText = document.getElementById("polarity");
    if (magnet.polarity === 1) {
      polarityText.textContent = "NORTH 🧲";
      polarityText.style.color = "#ff5252";
      targetGlowColor = "rgba(255, 82, 82, 0.8)";
    } else {
      polarityText.textContent = "SOUTH 🧊";
      polarityText.style.color = "#42a5f5";
      targetGlowColor = "rgba(66, 165, 245, 0.8)";
    }
  }
});

// ✅ Smooth Transition Glow System
let currentGlowColor = "rgba(255, 82, 82, 0.7)";
let targetGlowColor = currentGlowColor;

function blendColors(color1, color2, factor) {
  const c1 = color1.match(/\d+/g).map(Number);
  const c2 = color2.match(/\d+/g).map(Number);
  const result = c1.map((v, i) => v + (c2[i] - v) * factor);
  return `rgba(${result[0]}, ${result[1]}, ${result[2]}, 0.8)`;
}

// Score history
const scoreContainer = document.querySelector(".score-container");
const scoreHistoryContainer = document.createElement("div");
scoreHistoryContainer.className = "score-history";
scoreContainer.appendChild(scoreHistoryContainer);

function addScoreToHistory(finalScore) {
  const p = document.createElement("p");
  const date = new Date();
  const timestamp = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  p.textContent = `${timestamp} — Total Score: ${finalScore}`;
  p.style.fontWeight = "bold";
  p.style.color = "#ef6c00";
  scoreHistoryContainer.prepend(p);
  if (scoreHistoryContainer.children.length > 10) scoreHistoryContainer.removeChild(scoreHistoryContainer.lastChild);
}

function updateScoreDisplay() { document.getElementById("score").textContent = score; }

// Buttons
document.getElementById("startBtn").addEventListener("click", () => {
  if (!gameRunning) startGame();
});

document.getElementById("restartBtn").addEventListener("click", () => {
  cancelAnimationFrame(animationFrame);
  clearInterval(timerInterval);
  gameRunning = false;
  isPaused = false;
  timeUp = false;
  timeUpShown = false;
  totalScore += score;
  score = 0;
  timeLeft = 60;
  updateScoreDisplay();
  resizeCanvas();
  resetPositions();
  startGame();
});

// Pause / Resume
document.getElementById("pauseBtn").addEventListener("click", () => {
  if (!gameRunning) return;
  if (!isPaused) pauseGame();
  else resumeGame();
});

function pauseGame() {
  isPaused = true;
  clearInterval(timerInterval);
  document.getElementById("pauseBtn").textContent = "Resume ▶️";

  // 🛑 Stop any magnetic pull sound while paused
  if (!pullSound.paused) {
    pullSound.pause();
    pullSound.currentTime = 0;
  }
}

function resumeGame() {
  isPaused = false;
  document.getElementById("pauseBtn").textContent = "Pause ⏸️";
  timerInterval = setInterval(() => {
    if (!timeUp && !isPaused) {
      timeLeft--;
      if (timeLeft <= 0) {
        timeLeft = 0;
        endGame();
        updateScoreDisplay();
      }
    }
  }, 1000);

  // 🎵 Resume game visuals — pull sound will auto-play only when in range
  animate();
}

// Core game functions
function startGame() {
  gameRunning = true;
  isPaused = false;
  timeUp = false;
  timeUpShown = false;
  particles = [];
  canvas.classList.add("hide-cursor");
  magnet.radius = selectedMagnet.displaySize;
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (!timeUp && !isPaused) {
      timeLeft--;
      if (timeLeft <= 0) {
        timeLeft = 0;
        endGame();
        updateScoreDisplay();
      }
    }
  }, 1000);
  animate();
}

function resetPositions() {
  magnet.x = 120;
  magnet.y = canvas.height / 2;
  magnet.polarity = 1;
  magnet.radius = selectedMagnet.displaySize;
  metal.x = 300;
  metal.y = canvas.height / 2;
  metal.vx = 0;
  metal.vy = 0;
  mouse.x = magnet.x;
  mouse.y = magnet.y;
}

function handleWin() {
  // Only award points and play sound if time is still ticking
  if (!timeUp) {
    score += 100;
    updateScoreDisplay();

    // 🎆 Particle effect
    for (let i = 0; i < 60; i++) {
      particles.push(new Particle(
        goal.x,
        goal.y,
        `hsl(${Math.random() * 360}, 80%, 60%)`,
        4,
        40
      ));
    }

    // 🎵 Play goal sound effect only if not already playing
    if (goalSound.paused) {
      goalSound.currentTime = 0;
      goalSound.play().catch(() => {});
    }

    resetPositions();
  }
}

   


function endGame() {
  timeUp = true;
  timeUpShown = true;
  totalScore += score;
  addScoreToHistory(totalScore);
  score = 0;
  setTimeout(() => { timeUpShown = false; }, 5000); 
}

// 🌀 Animate
function animate() {
  if (isPaused) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  waves.forEach(w => { w.update(); w.draw(ctx, canvas.width, canvas.height); });

  ctx.fillStyle = "#0277bd";
  ctx.font = "bold 24px Poppins";
  ctx.textAlign = "left";
  ctx.fillText(`Score: ${score}`, 20, 40);
  ctx.fillText(`Time: ${timeLeft}s`, 20, 70);

  if (timeUpShown) {
    ctx.fillStyle = "rgba(255,0,0,0.7)";
    ctx.font = "bold 60px Poppins";
    ctx.textAlign = "center";
    ctx.fillText("⏰ TIME'S UP!", canvas.width / 2, canvas.height / 2);
  }

  if (isMouseDown) {
    magnet.x += (mouse.x - magnet.x) * 0.2;
    magnet.y += (mouse.y - magnet.y) * 0.2;
  }

  const dx = metal.x - magnet.x;
  const dy = metal.y - magnet.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const withinRange = distance < MAX_ATTRACTION_DISTANCE;

  // 🧲 Attraction logic with pull sound
if (withinRange) {
  const forceStrength = magnetStrength / Math.max(distance, 50);
  const fx = (-dx / distance) * forceStrength * 0.06 * magnet.polarity;
  const fy = (-dy / distance) * forceStrength * 0.06 * magnet.polarity;
  metal.vx += fx;
  metal.vy += fy;

  // 🎆 Add spark particles for realism
  if (Math.random() < 0.3)
    particles.push(new Particle(metal.x, metal.y, "#ffcc00", 3, 25));

  // 🎵 Play looping pull sound
  if (pullSound.paused) {
    pullSound.currentTime = 0;
    pullSound.play().catch(() => {});
  }
} else {
  // 🛑 Stop sound when no attraction
  if (!pullSound.paused) {
    pullSound.pause();
    pullSound.currentTime = 0;
  }
}


  metal.vx *= 0.96; metal.vy *= 0.96;
  metal.x += metal.vx; metal.y += metal.vy;

  magnet.x = Math.min(Math.max(magnet.radius / 2, magnet.x), canvas.width - magnet.radius / 2);
  magnet.y = Math.min(Math.max(magnet.radius / 2, magnet.y), canvas.height - magnet.radius / 2);

  if (metal.x - metal.radius < 0) { metal.x = metal.radius; metal.vx *= -0.8; }
  if (metal.x + metal.radius > canvas.width) { metal.x = canvas.width - metal.radius; metal.vx *= -0.8; }
  if (metal.y - metal.radius < 0) { metal.y = metal.radius; metal.vy *= -0.8; }
  if (metal.y + metal.radius > canvas.height) { metal.y = canvas.height - metal.radius; metal.vy *= -0.8; }

  // Animate goal glow
goalGlowPhase += goalGlowSpeed;
const glowAlpha = 0.3 + 0.15 * Math.sin(goalGlowPhase * 2 * Math.PI);

ctx.save();
ctx.beginPath();
ctx.arc(goal.x, goal.y, goal.radius, 0, Math.PI * 2);

// Fill with glowing effect
ctx.fillStyle = `rgba(76, 175, 80, ${glowAlpha})`;
ctx.fill();

// Outer glowing stroke
ctx.lineWidth = 4;
ctx.shadowColor = `rgba(76, 175, 80, ${glowAlpha})`;
ctx.shadowBlur = 20;
ctx.strokeStyle = "#2e7d32";
ctx.stroke();
ctx.restore();


  ctx.beginPath();
  ctx.arc(metal.x, metal.y, metal.radius, 0, Math.PI * 2);
  ctx.fillStyle = "#9e9e9e";
  ctx.shadowColor = "#616161";
  ctx.shadowBlur = 6;
  ctx.fill();
  ctx.shadowBlur = 0;

  currentGlowColor = blendColors(currentGlowColor, targetGlowColor, 0.1);

  if (magnetImg) {
    ctx.save();
    ctx.shadowColor = currentGlowColor;
    ctx.shadowBlur = 30;
    ctx.drawImage(
      magnetImg,
      magnet.x - magnet.radius,
      magnet.y - magnet.radius,
      magnet.radius * 2,
      magnet.radius * 2
    );
    ctx.restore();
  } else {
    ctx.save();
    ctx.beginPath();
    ctx.arc(magnet.x, magnet.y, magnet.radius, 0, Math.PI * 2);
    ctx.fillStyle = magnet.polarity === 1 ? "#ff5252" : "#42a5f5";
    ctx.shadowColor = currentGlowColor;
    ctx.shadowBlur = 30;
    ctx.fill();
    ctx.restore();
  }

  particles.forEach((p, i) => { p.update(); p.draw(ctx); if (p.life <= 0) particles.splice(i, 1); });

  const distToGoal = Math.sqrt((metal.x - goal.x) ** 2 + (metal.y - goal.y) ** 2);
  if (distToGoal < goal.radius - metal.radius) handleWin();

  animationFrame = requestAnimationFrame(animate);
}
