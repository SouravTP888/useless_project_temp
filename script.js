// Game state
let gameInterval;
let scores = { Red: 0, Blue: 0 };
let lastFrame = null;
let motionDetected = false;
let motionLevel = 0;
let defectiveMode = true;
let lastDetectedColor = null; // Track the last detected color
let colorChanged = false; // Track if color has changed

// DOM elements
const video = document.getElementById('video');
const canvasEl = document.getElementById('canvas');
const ctxEl = canvasEl.getContext('2d');
const currentColorElement = document.getElementById('currentColor');
const motionValueElement = document.getElementById('motionValue');
const homePage = document.getElementById('homePage');
const gamePage = document.getElementById('gamePage');
const systemStatus = document.getElementById('systemStatus');
const statusIndicator = document.getElementById('statusIndicator');
const mainStartBtn = document.getElementById('mainStartBtn');
const secretStartBtn = document.getElementById('secretStartBtn');
const riskContainer = document.getElementById('riskContainer');
const riskClue = document.getElementById('riskClue');
const btnHome = document.getElementById('btnHome');
const btnReset = document.getElementById('btnReset');

// Initialize the app
function initApp() {
  setupEventListeners();
  initMatrixBackground();
  createMatrixParticles();
  checkOrientation();
}

// Setup event listeners
function setupEventListeners() {
  mainStartBtn.addEventListener('click', () => {
    defectiveMode = true;
    systemStatus.textContent = "DEFECTIVE";
    systemStatus.style.color = "#f00";
    startGame();
  });

  secretStartBtn.addEventListener('click', () => {
    defectiveMode = false;
    systemStatus.textContent = "FULL ACCESS";
    systemStatus.style.color = "#0f0";
    startGame();
  });

  riskContainer.addEventListener('click', handleRiskContainerClick);
  btnHome.addEventListener('click', backToHome);
  btnReset.addEventListener('click', resetGame);
  window.addEventListener('resize', handleWindowResize);
  window.addEventListener('orientationchange', checkOrientation);
}

// Check orientation and show warning if needed
function checkOrientation() {
  const warning = document.querySelector('.orientation-warning');
  if (window.innerWidth < 768 && window.innerHeight > window.innerWidth) {
    warning.style.display = 'flex';
  } else {
    warning.style.display = 'none';
  }
}

// Matrix background effect
function initMatrixBackground() {
  const canvas = document.getElementById('matrix-bg');
  const ctx = canvas.getContext('2d');
  
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  
  resizeCanvas();
  
  const chars = "01";
  const charArr = chars.split("");
  const fontSize = 12;
  let columns = canvas.width / fontSize;
  const drops = [];
  
  for(let i = 0; i < columns; i++) {
    drops[i] = Math.floor(Math.random() * canvas.height);
  }
  
  function drawMatrix() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.04)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = "#0f0";
    ctx.font = fontSize + "px monospace";
    
    for(let i = 0; i < drops.length; i++) {
      const text = charArr[Math.floor(Math.random() * charArr.length)];
      ctx.fillText(text, i * fontSize, drops[i] * fontSize);
      
      if(drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }
  }
  
  setInterval(drawMatrix, 33);
}

// Create floating matrix particles
function createMatrixParticles() {
  setInterval(() => {
    const particle = document.createElement('div');
    particle.classList.add('matrix-particle');
    particle.textContent = Math.random() > 0.5 ? '0' : '1';
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.animationDuration = `${Math.random() * 5 + 3}s`;
    document.body.appendChild(particle);
    
    setTimeout(() => {
      particle.remove();
    }, 5000);
  }, 300);
}

// Risk clue interaction
function handleRiskContainerClick() {
  riskClue.textContent = "The secret lies in the corner where conformity reigns. Dare to explore beyond the obvious.";
  riskClue.style.opacity = "1";
  riskClue.style.color = "#0f0";
  
  setTimeout(() => {
    secretStartBtn.style.opacity = "0.8";
    secretStartBtn.style.boxShadow = "0 0 10px #0f0";
    riskClue.textContent = "The secret button has been revealed in the top-right corner!";
  }, 2000);
}

// Start the game
function startGame() {
  homePage.style.display = 'none';
  gamePage.style.display = 'block';
  initGame();
}

// Back to home page
function backToHome() {
  gamePage.style.display = 'none';
  homePage.style.display = 'flex';
  stopGame();
  resetGame();
}

// Reset the game
function resetGame() {
  scores = { Red: 0, Blue: 0 };
  document.getElementById('redScore').textContent = '0';
  document.getElementById('blueScore').textContent = '0';
  lastFrame = null;
  motionDetected = false;
  motionLevel = 0;
  motionValueElement.textContent = "0%";
  updateCurrentColor("NONE");
  lastDetectedColor = null;
  colorChanged = false;
}

// Stop the game
function stopGame() {
  if (gameInterval) {
    clearInterval(gameInterval);
    gameInterval = null;
  }
  
  if (video.srcObject) {
    const tracks = video.srcObject.getTracks();
    tracks.forEach(track => track.stop());
    video.srcObject = null;
  }
}

// Initialize the game
function initGame() {
  navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
    .then(stream => {
      video.srcObject = stream;
      
      video.addEventListener('loadedmetadata', () => {
        canvasEl.width = video.videoWidth;
        canvasEl.height = video.videoHeight;
        startDetection();
      });
    })
    .catch(err => {
      console.error("Camera error:", err);
      statusIndicator.textContent = "Camera Error";
      statusIndicator.style.color = "#f00";
    });
}

// Start color detection
function startDetection() {
  gameInterval = setInterval(detectColor, 300);
  statusIndicator.textContent = "Operational";
  statusIndicator.style.color = "#0f0";
}

// Detect color and motion
function detectColor() {
  if (video.readyState !== video.HAVE_ENOUGH_DATA) return;
  
  ctxEl.drawImage(video, 0, 0, canvasEl.width, canvasEl.height);
  
  const zoneWidth = canvasEl.width * 0.5;
  const zoneHeight = canvasEl.height * 0.5;
  const zoneX = (canvasEl.width - zoneWidth) / 2;
  const zoneY = (canvasEl.height - zoneHeight) / 2;
  
  const frame = ctxEl.getImageData(zoneX, zoneY, zoneWidth, zoneHeight);
  const data = frame.data;
  
  motionDetected = false;
  motionLevel = 0;
  
  if (lastFrame) {
    let diff = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      const prevR = lastFrame[i];
      const prevG = lastFrame[i + 1];
      const prevB = lastFrame[i + 2];
      
      const pixelDiff = Math.abs(r - prevR) + Math.abs(g - prevG) + Math.abs(b - prevB);
      diff += pixelDiff;
    }
    
    motionLevel = Math.min(100, Math.floor(diff / (data.length / 4) / 10));
    motionValueElement.textContent = motionLevel + "%";
    motionDetected = motionLevel > 8;
  }
  
  lastFrame = new Uint8ClampedArray(data);
  
  if (!motionDetected) {
    updateCurrentColor("NONE");
    colorChanged = false;
    return;
  }
  
  let r = 0, g = 0, b = 0, total = 0;
  
  for (let i = 0; i < data.length; i += 16) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    total++;
  }
  
  r = Math.round(r / total);
  g = Math.round(g / total);
  b = Math.round(b / total);
  
  let color = "None";
  const minDiff = 10;
  
  if (r > g && r > b) {
    color = "Red";
  } else if (b > r && b > g) {
    color = "Blue";
  }
  
  // Check if color has changed
  if (color !== lastDetectedColor) {
    colorChanged = true;
    lastDetectedColor = color;
  } else {
    colorChanged = false;
  }
  
  updateCurrentColor(color);
  
  // Only increment if color changed and motion is detected
  if (colorChanged && color !== "None") {
    if (defectiveMode) {
      scores.Blue++;
      document.getElementById('blueScore').textContent = scores.Blue;
    } else {
      scores[color]++;
      document.getElementById('redScore').textContent = scores.Red;
      document.getElementById('blueScore').textContent = scores.Blue;
    }
  }
}

// Update current color display
function updateCurrentColor(color) {
  currentColorElement.textContent = color;
  currentColorElement.className = "detected-color";
  if (color === "Red") {
    currentColorElement.classList.add("detected-red");
  } else if (color === "Blue") {
    currentColorElement.classList.add("detected-blue");
  }
}

// Handle window resize
function handleWindowResize() {
  const canvas = document.getElementById('matrix-bg');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    canvasEl.width = video.videoWidth;
    canvasEl.height = video.videoHeight;
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', initApp);