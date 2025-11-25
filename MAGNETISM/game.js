const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ensure canvas is pointer-ready (in case CSS changed)
canvas.style.position = canvas.style.position || "relative";
canvas.style.zIndex = 1;
canvas.style.pointerEvents = "auto";

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

// --- Glow animation control
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

// ✅ Default to "Small Magnet"
const selectedMagnet = {
  strengthMultiplier: 0.5,
  radius: 25,
  displaySize: 25,
  image: "assets/images/magnet.png"
};


// Ensure back button pauses music then navigates
const backBtn = document.getElementById('backBtn');
if (backBtn) {
  backBtn.addEventListener('click', () => {
    const bgMusic = document.getElementById('bgMusic');
    if (bgMusic && !bgMusic.paused) {
      bgMusic.pause();
      bgMusic.currentTime = 0;
    }
    window.location.href = "intro.html";
  });
}

// magnet strength base
let magnetStrength = selectedMagnet.strengthMultiplier * 400;

// --------------------------- Classes ---------------------------
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

// --------------------------- Assets ---------------------------
let magnetImg = null;
function loadMagnetImage(src) {
  if (!src) return;
  const img = new Image();
  img.src = src;
  img.onload = () => { magnetImg = img; };
  img.onerror = () => { /* fail silently if image not found */ };
}
loadMagnetImage(selectedMagnet.image);

// --------------------------- Magnet selector ---------------------------
document.querySelectorAll(".magnet-choice").forEach(option => {
  if (option.classList.contains("small")) option.classList.add("active");
  option.addEventListener("click", () => {
    document.querySelectorAll(".magnet-choice").forEach(opt => opt.classList.remove("active"));
    option.classList.add("active");

    if (option.classList.contains("small")) {
      selectedMagnet.strengthMultiplier = 0.5;
      selectedMagnet.displaySize = 25;
      magnetStrength = 0.5 * 300;
    } else if (option.classList.contains("medium")) {
      selectedMagnet.strengthMultiplier = 0.8;
      selectedMagnet.displaySize = 30;
      magnetStrength = 0.8 * 500;
    } else if (option.classList.contains("large")) {
      selectedMagnet.strengthMultiplier = 1.2;
      selectedMagnet.displaySize = 40;
      magnetStrength = 1.2 * 800;
    }

    if (option.dataset.image) {
      selectedMagnet.image = option.dataset.image;
      loadMagnetImage(selectedMagnet.image);
    }

    if (magnet) magnet.radius = selectedMagnet.displaySize;
  });
});


// --------------------------- Resize & Initialization ---------------------------
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

function resizeCanvas() {
  // Responsive but constrained size to avoid layout break
  const maxWidth = Math.min(window.innerWidth * 0.94, 1600);
  const maxHeight = Math.min(window.innerHeight * 0.84, 1200);

  canvas.width = Math.max(300, Math.floor(maxWidth - 40));
  canvas.height = Math.max(200, Math.floor(maxHeight - 20));

  // Keep CSS consistent (helps when CSS changes)
  canvas.style.width = canvas.width + "px";
  canvas.style.height = canvas.height + "px";

  const metalRadius = Math.max(8, canvas.height * 0.04);
  const goalRadius = Math.max(12, canvas.height * 0.06);
  const magnetRadius = selectedMagnet.displaySize;

  if (!magnet) {
    magnet = { x: 120, y: canvas.height / 2, radius: magnetRadius, polarity: 1 };
  } else {
    magnet.radius = magnetRadius;
    magnet.x = Math.min(Math.max(magnet.radius, magnet.x), canvas.width - magnet.radius);
    magnet.y = Math.min(Math.max(magnet.radius, magnet.y), canvas.height - magnet.radius);
  }

  if (!document.querySelector(".magnet-choice.active")) {
    document.querySelector(".magnet-choice.small")?.classList.add("active");
  }

  metal = { x: Math.min(300, canvas.width * 0.4), y: canvas.height / 2, radius: metalRadius, vx: 0, vy: 0 };
  goal = { x: canvas.width - Math.min(150, canvas.width*0.12), y: canvas.height / 2, radius: goalRadius };
  mouse = { x: magnet.x, y: magnet.y };

  createWaves();

  if (magnetImg && selectedMagnet.image) loadMagnetImage(selectedMagnet.image);

  const polarityIndicator = document.getElementById("polarity");
  if (polarityIndicator) polarityIndicator.textContent = "NORTH 🧲";
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// --------------------------- Input Handlers ---------------------------
// Mouse move
document.addEventListener("mousemove", e => {
  // If canvas hasn't been sized or has no rect, guard
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
});

// Mouse down/up
canvas.addEventListener("mousedown", e => { if (e.button === 0) isMouseDown = true; });
document.addEventListener("mouseup", () => { isMouseDown = false; });

// Prevent context menu on canvas
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

// 📱 Touch Controls (ONLY added ONCE)
canvas.addEventListener("touchstart", (e) => {
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  mouse.x = touch.clientX - rect.left;
  mouse.y = touch.clientY - rect.top;
  isMouseDown = true;
  e.preventDefault();
}, { passive: false });

canvas.addEventListener("touchmove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  mouse.x = touch.clientX - rect.left;
  mouse.y = touch.clientY - rect.top;
  e.preventDefault();
}, { passive: false });

canvas.addEventListener("touchend", (e) => {
  isMouseDown = false;
  e.preventDefault();
}, { passive: false });

// Mobile polarity button (if present)
const mobilePolarityBtn = document.getElementById("mobilePolarityBtn");
if (mobilePolarityBtn) {
  function flipPolarityMobile() {
    if (gameRunning && !isPaused) {
      magnet.polarity *= -1;
      const polarityText = document.getElementById("polarity");
      if (polarityText) {
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
    }
  }
  mobilePolarityBtn.addEventListener("touchstart", (e) => { e.preventDefault(); flipPolarityMobile(); }, { passive: false });
  mobilePolarityBtn.addEventListener("click", flipPolarityMobile);
}

// Spacebar flips polarity
document.addEventListener("keydown", e => {
  if (e.code === "Space" && gameRunning && !isPaused) {
    magnet.polarity *= -1;
    const polarityText = document.getElementById("polarity");
    if (polarityText) {
      if (magnet.polarity === 1) {
        polarityText.textContent = "NORTH 🧲"; polarityText.style.color = "#ff5252";
        targetGlowColor = "rgba(255, 82, 82, 0.8)";
      } else {
        polarityText.textContent = "SOUTH 🧊"; polarityText.style.color = "#42a5f5";
        targetGlowColor = "rgba(66, 165, 245, 0.8)";
      }
    }
  }
});

// --------------------------- Visual helpers ---------------------------
let currentGlowColor = "rgba(255, 82, 82, 0.7)";
let targetGlowColor = currentGlowColor;
function blendColors(color1, color2, factor) {
  const c1 = color1.match(/\d+/g).map(Number);
  const c2 = color2.match(/\d+/g).map(Number);
  const result = c1.map((v, i) => Math.round(v + (c2[i] - v) * factor));
  return `rgba(${result[0]}, ${result[1]}, ${result[2]}, 0.8)`;
}

// ---------------- IMPROVED ATTRACTION & REPULSION ----------------
// ---------------- IMPROVED ATTRACTION SYSTEM ----------------
const dx = metal.x - magnet.x;
const dy = metal.y - magnet.y;
const distance = Math.sqrt(dx*dx + dy*dy) || 0.0001;

// Attraction radius based on magnet size
let effectiveRange =
    selectedMagnet.displaySize === 25 ? 180 :     // small
    selectedMagnet.displaySize === 30 ? 230 :     // medium
    300;                                          // large

// Attraction only inside range
if (distance < effectiveRange) {

    // Prevent overly strong force when metal is too close
    const minSafe =
        selectedMagnet.displaySize === 25 ? 55 :
        selectedMagnet.displaySize === 30 ? 40 :
        30;

    // Smooth attraction: prevents snapping when very close
    const attractionFactor = Math.max(0, (distance - minSafe) / distance);

    // Realistic force drop-off curve
    const force =
        magnetStrength *
        attractionFactor *
        (1 / Math.pow(distance, 0.55));

    const fx = (-dx / distance) * force * magnet.polarity;
    const fy = (-dy / distance) * force * magnet.polarity;

    metal.vx += fx;
    metal.vy += fy;

    if (Math.random() < 0.25)
        particles.push(new Particle(metal.x, metal.y, "#ffcc00", 3, 25));

    if (pullSound.paused) {
        pullSound.currentTime = 0;
        pullSound.play().catch(()=>{});
    }
} else {
    if (!pullSound.paused) {
        pullSound.pause();
        pullSound.currentTime = 0;
    }
}


// ---------------- VELOCITY INTEGRATION ----------------
metal.vx *= 0.96;
metal.vy *= 0.96;
metal.x += metal.vx;
metal.y += metal.vy;

// ---------------- CLAMP MAGNET ----------------
magnet.x = Math.min(Math.max(magnet.radius / 2, magnet.x), canvas.width - magnet.radius / 2);
magnet.y = Math.min(Math.max(magnet.radius / 2, magnet.y), canvas.height - magnet.radius / 2);

// ---------------- EDGE COLLISION FOR METAL ----------------
if (metal.x - metal.radius < 0) { metal.x = metal.radius; metal.vx *= -0.8; }
if (metal.x + metal.radius > canvas.width) { metal.x = canvas.width - metal.radius; metal.vx *= -0.8; }
if (metal.y - metal.radius < 0) { metal.y = metal.radius; metal.vy *= -0.8; }
if (metal.y + metal.radius > canvas.height) { metal.y = canvas.height - metal.radius; metal.vy *= -0.8; }

// ---------------- GOAL GLOW ----------------
goalGlowPhase += goalGlowSpeed;
const glowAlpha = 0.3 + 0.15 * Math.sin(goalGlowPhase * 2 * Math.PI);

// --------------------------- Score History ---------------------------
const scoreContainer = document.querySelector(".score-container");
const scoreHistoryContainer = document.createElement("div");
scoreHistoryContainer.className = "score-history";
if (scoreContainer) scoreContainer.appendChild(scoreHistoryContainer);

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

function updateScoreDisplay() { const el = document.getElementById("score"); if (el) el.textContent = score; }

// --------------------------- Buttons ---------------------------
const startBtn = document.getElementById("startBtn");
if (startBtn) startBtn.addEventListener("click", () => { if (!gameRunning) startGame(); });

const restartBtn = document.getElementById("restartBtn");
if (restartBtn) {
  restartBtn.addEventListener("click", () => {
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
}

const pauseBtn = document.getElementById("pauseBtn");
if (pauseBtn) {
  pauseBtn.addEventListener("click", () => {
    if (!gameRunning) return;
    if (!isPaused) pauseGame();
    else resumeGame();
  });
}

function pauseGame() {
  isPaused = true;
  clearInterval(timerInterval);
  if (pauseBtn) pauseBtn.textContent = "Resume ▶️";

  // stop pull sound while paused
  if (!pullSound.paused) {
    pullSound.pause();
    pullSound.currentTime = 0;
  }
}

function resumeGame() {
  isPaused = false;
  if (pauseBtn) pauseBtn.textContent = "Pause ⏸️";
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

  // resume visuals
  animate();
}

// --------------------------- Game Control ---------------------------
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
  if (!timeUp) {
    score += 100;
    updateScoreDisplay();

    for (let i = 0; i < 60; i++) {
      particles.push(new Particle(
        goal.x,
        goal.y,
        `hsl(${Math.random() * 360}, 80%, 60%)`,
        4,
        40
      ));
    }

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

// --------------------------- Main Animation Loop ---------------------------
function animate() {
  if (isPaused) return;
  // clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // update/draw waves
  waves.forEach(w => { w.update(); w.draw(ctx, canvas.width, canvas.height); });

  // HUD text
  ctx.save();
ctx.globalAlpha = 0.9;
ctx.fillStyle = "#0277bd";
ctx.font = "700 26px Poppins";
ctx.textAlign = "left";

ctx.shadowColor = "rgba(2, 119, 189, 0.6)";
ctx.shadowBlur = 8;

ctx.fillText(`Score: ${score}`, 20, 40);
ctx.fillText(`Time: ${timeLeft}s`, 20, 70);

ctx.restore();

// TIME'S UP animation
if (timeUpShown) {
  const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.005); // pulsing effect
  ctx.save();
  ctx.globalAlpha = pulse;

  ctx.fillStyle = "rgba(255, 0, 0, 0.9)";
  ctx.font = "bold 70px Poppins";
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(255,0,0,1)";
  ctx.shadowBlur = 25;

  ctx.fillText("TIME'S UP!", canvas.width / 2, canvas.height / 2);

  ctx.restore();
}

  // Magnet follows pointer while mouse/touch is down
  if (isMouseDown) {
    // smooth follow
    magnet.x += (mouse.x - magnet.x) * 0.2;
    magnet.y += (mouse.y - magnet.y) * 0.2;
  }

  // Attraction physics
// ----- IMPROVED MAGNET ATTRACTION BASED ON SIZE -----

// distance between magnet and object
const dx = metal.x - magnet.x;
const dy = metal.y - magnet.y;
const distance = Math.sqrt(dx * dx + dy * dy) || 0.0001;

// attraction range based on magnet size
let attractionRange =
  selectedMagnet.displaySize === 25 ? 180 :   // small magnet
  selectedMagnet.displaySize === 30 ? 230 :   // medium magnet
  300;                                        // large magnet

const withinRange = distance < attractionRange;

if (withinRange) {

  // force based on size + strength + distance
  const forceStrength =
    (magnetStrength * selectedMagnet.strengthMultiplier) /
    Math.max(distance, 60);

  const fx = (-dx / distance) * forceStrength * 0.06 * magnet.polarity;
  const fy = (-dy / distance) * forceStrength * 0.06 * magnet.polarity;

  metal.vx += fx;
  metal.vy += fy;

  // pull particles
  if (Math.random() < 0.25) {
    particles.push(new Particle(metal.x, metal.y, "#ffcc00", 3, 25));
  }

  // play pull sound
  if (pullSound.paused) {
    pullSound.currentTime = 0;
    pullSound.play().catch(() => {});
  }

} else {

  // stop sound when out of range
  if (!pullSound.paused) {
    pullSound.pause();
    pullSound.currentTime = 0;
  }

}

// integrate object movement
metal.vx *= 0.96;
metal.vy *= 0.96;
metal.x += metal.vx;
metal.y += metal.vy;


  // clamp magnet inside canvas
  magnet.x = Math.min(Math.max(magnet.radius / 2, magnet.x), canvas.width - magnet.radius / 2);
  magnet.y = Math.min(Math.max(magnet.radius / 2, magnet.y), canvas.height - magnet.radius / 2);

  // collisions with edges for metal
  if (metal.x - metal.radius < 0) { metal.x = metal.radius; metal.vx *= -0.8; }
  if (metal.x + metal.radius > canvas.width) { metal.x = canvas.width - metal.radius; metal.vx *= -0.8; }
  if (metal.y - metal.radius < 0) { metal.y = metal.radius; metal.vy *= -0.8; }
  if (metal.y + metal.radius > canvas.height) { metal.y = canvas.height - metal.radius; metal.vy *= -0.8; }

  // Goal glow
  goalGlowPhase += goalGlowSpeed;
  const glowAlpha = 0.3 + 0.15 * Math.sin(goalGlowPhase * 2 * Math.PI);

  ctx.save();
  ctx.beginPath();
  ctx.arc(goal.x, goal.y, goal.radius, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(76, 175, 80, ${glowAlpha})`;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.shadowColor = `rgba(76, 175, 80, ${glowAlpha})`;
  ctx.shadowBlur = 20;
  ctx.strokeStyle = "#2e7d32";
  ctx.stroke();
  ctx.restore();

  // Draw metal
  ctx.beginPath();
  ctx.arc(metal.x, metal.y, metal.radius, 0, Math.PI * 2);
  ctx.fillStyle = "#9e9e9e";
  ctx.shadowColor = "#616161";
  ctx.shadowBlur = 6;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Smooth magnet glow color
  currentGlowColor = blendColors(currentGlowColor, targetGlowColor, 0.1);

  // Draw magnet (image or circle)
  if (magnetImg) {
    ctx.save();
    ctx.shadowColor = currentGlowColor;
    ctx.shadowBlur = 40;
    let glowScale =
    selectedMagnet.displaySize === 25 ? 25 :
    selectedMagnet.displaySize === 30 ? 40 :
    60;

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

  // Update & draw particles (safe iteration)
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.update();
    p.draw(ctx);
    if (p.life <= 0) particles.splice(i, 1);
  }

  // Check goal collision
  const distToGoal = Math.sqrt((metal.x - goal.x) ** 2 + (metal.y - goal.y) ** 2);
  if (distToGoal < goal.radius - metal.radius) handleWin();

  // Loop
  animationFrame = requestAnimationFrame(animate);
}

// --------------------------- Initialize / Safety checks ---------------------------
// Ensure there is a polarity element and score element
if (!document.getElementById("polarity")) {
  const el = document.createElement("div");
  el.id = "polarity";
  el.style.display = "none";
  document.body.appendChild(el);
}
if (!document.getElementById("score")) {
  const el = document.createElement("div");
  el.id = "score";
  el.style.display = "none";
  document.body.appendChild(el);
}

// If canvas was hidden by CSS changes, ensure it is visible and sized
if (canvas) {
  resizeCanvas();
} else {
  console.error("Canvas element #gameCanvas not found.");
}

// --------------------------- Expose some helpers to console (optional) ---------------------------
window.MagnetQuest = {
  startGame,
  pauseGame,
  resumeGame,
  resetPositions,
  getState: () => ({ gameRunning, isPaused, score, timeLeft, totalScore }),
  setMagnetStrength: (s) => { selectedMagnet.strengthMultiplier = s; magnetStrength = s * 400; }
};

// End of game.js
