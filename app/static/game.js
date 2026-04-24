console.log("game.js v36 loaded - Rush Mode Edition");

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let puzzle = null;

// Rush mode state
let gameMode = "practice";
let rushTimer = null;
let timeRemaining = 0;
let puzzlesSolved = 0;
let currentDifficulty = 1;
let maxDifficultyReached = 1;
let rushIntroPlaying = false;
let skipIntroAnimation = false;
let rushStarted = false;

// Share state (captured at end of rush, before Tim is hidden)
let currentShareBlob = null;
let currentShareBlobURL = null;

// Lightboard
let lightboardZoneIndex = 0;
let lightboardShuffledZones = [];
let lightboardEqEls = [];

// 4 rows × 3 columns of pre-defined positions (left%, top%)
// Shuffled at the start of each rush so the fill pattern is different every game
const LIGHTBOARD_ZONES = [
  [2, 5],  [34, 5],  [67, 5],
  [2, 32], [34, 32], [67, 32],
  [2, 59], [34, 59], [67, 59],
  [2, 79], [34, 79], [67, 79],
];

const LIGHTBOARD_COLORS = [
  { color: "#ff6ec7", glow: "rgba(255,110,199,0.5)" }, // neon pink
  { color: "#39ff14", glow: "rgba(57,255,20,0.5)"   }, // neon green
  { color: "#ffe033", glow: "rgba(255,224,51,0.5)"  }, // neon yellow
  { color: "#00d4ff", glow: "rgba(0,212,255,0.5)"   }, // neon cyan
  { color: "#ff9d00", glow: "rgba(255,157,0,0.5)"   }, // neon orange
  { color: "#c77dff", glow: "rgba(199,125,255,0.5)" }, // neon purple
];

// Drag/drop constants
const SNAP_THRESHOLD = 120;
const SNAP_ANIM_MS = 180;
const TAP_MOVE_PX = 18;
const CLICK_SUPPRESS_MS = 1200;

const GAME_URL = "https://mynumbers.onrender.com/static/game.html";

let suppressClickUntil = 0;
let pointerState = null;
let scrollLocked = false;

// ============================================================================
// RUSH MODE UTILITIES
// ============================================================================

function calculateDifficulty(solved) {
  if (solved <= 1) return 1;
  if (solved <= 4) return 2;
  if (solved <= 7) return 3;
  if (solved <= 11) return 4;
  if (solved <= 16) return 5;
  return 6;
}

// function getPoints(difficulty) {
//   return difficulty * 10;
// }

function setBankAreaVisible(visible) {
  const el = document.getElementById("bankArea");
  if (!el) return;
  el.style.display = visible ? "" : "none";
}

function showMenu() {
  gameMode = null;
  setBankAreaVisible(false);

  if (rushTimer) {
    clearInterval(rushTimer);
    rushTimer = null;
  }

  hideModal();

  const menuBtn = document.getElementById("menuBtn");
  if (menuBtn) menuBtn.style.display = "none";

  document.body.classList.add("menu-mode");
  document.getElementById("mode-selector").style.display = "flex";
  document.getElementById("rush-stats").style.display = "none";
  document.getElementById("practice-stats").style.display = "none";
  document.getElementById("how-to-play").style.display = "none";
  document.getElementById("rush-ready-modal").style.display = "none";
  document.getElementById("lightboard-section").style.display = "none";
  showHomeLightboard();

  document.getElementById("template-area").innerHTML =
    '<p style="text-align:center;color:#999;padding:20px;">Select a mode to begin</p>';
  document.getElementById("bank").innerHTML = "";
  document.getElementById("result").textContent = "";

  document.getElementById("menuBtn").style.display = "none";
  document.getElementById("resetBtn").style.display = "none";
  document.getElementById("newBtn").style.display = "none";
  document.getElementById("endRushBtn").style.display = "none";

  puzzle = null;
}

function startPracticeMode() {
  gameMode = "practice";
  document.body.classList.remove("menu-mode");
  hideModal();
  hideHomeLightboard();
  setBankAreaVisible(true);

  document.getElementById("mode-selector").style.display = "none";
  document.getElementById("rush-stats").style.display = "none";
  document.getElementById("practice-stats").style.display = "flex";
  document.getElementById("how-to-play").style.display = "block";
  document.getElementById("lightboard-section").style.display = "none";

  document.getElementById("resetBtn").style.display = "inline-block";
  document.getElementById("newBtn").style.display = "inline-block";
  document.getElementById("menuBtn").style.display = "inline-block";
  document.getElementById("endRushBtn").style.display = "none";

  newPuzzle();
}

function startRushMode(minutes, skipIntro = false) {
  skipIntroAnimation = skipIntro;
  gameMode = minutes === 3 ? "rush3" : "rush5";
  document.body.classList.remove("menu-mode");
  hideHomeLightboard();

  const menuBtn = document.getElementById("menuBtn");
  if (menuBtn) menuBtn.style.display = "none";

  puzzlesSolved = 0;
  currentDifficulty = 1;
  maxDifficultyReached = 1;
  timeRemaining = minutes * 60;
  updateTimerDisplay();
  rushStarted = false;

  hideModal();
  setBankAreaVisible(true);
  document.getElementById("mode-selector").style.display = "none";
  document.getElementById("rush-stats").style.display = "flex";
  document.getElementById("practice-stats").style.display = "none";
  document.getElementById("how-to-play").style.display = "none";
  document.getElementById("resetBtn").style.display = "inline-block";
  document.getElementById("endRushBtn").style.display = "inline-block";
  document.getElementById("newBtn").style.display = "none";

  clearLightboard();
  document.getElementById("lightboard-section").style.display = "block";

  updateRushUI();
  newPuzzle();
}

function startCountdown() {
  const overlay = document.getElementById("countdown-overlay");
  const numEl = document.getElementById("countdown-number");
  if (!overlay || !numEl) {
    rushStarted = true;
    rushIntroPlaying = false;
    startTimer();
    return;
  }

  let count = 3;
  overlay.style.display = "flex";

  function tick() {
    numEl.textContent = count;
    numEl.style.animation = "none";
    numEl.offsetWidth; // reflow to restart animation
    numEl.style.animation = "";

    if (count === 1) {
      setTimeout(() => {
        numEl.textContent = "GO!";
        numEl.style.animation = "none";
        numEl.offsetWidth;
        numEl.style.animation = "";
        setTimeout(() => {
          overlay.style.display = "none";
          rushStarted = true;
          rushIntroPlaying = false;
          startTimer();
        }, 700);
      }, 750);
      return;
    }
    count--;
    setTimeout(tick, 750);
  }
  tick();
}

function startTimer() {
  if (rushTimer) clearInterval(rushTimer);

  rushTimer = setInterval(() => {
    timeRemaining -= 1;
    updateTimerDisplay();

    if (timeRemaining <= 0) endRushMode();
  }, 1000);
}

function updateTimerDisplay() {
  const mins = Math.floor(timeRemaining / 60);
  const secs = timeRemaining % 60;
  const timerEl = document.getElementById("timer");
  if (!timerEl) return;

  // Fixed: no literal dollar signs
  timerEl.textContent = `${mins}:${secs.toString().padStart(2, "0")}`;

  // Visual warning colors
  if (timeRemaining <= 10) timerEl.style.color = "#dc2626";
  else if (timeRemaining <= 30) timerEl.style.color = "#f59e0b";
  else timerEl.style.color = "#ffffff";
}

function updateRushUI() {
  const diffEl = document.getElementById("difficulty-level");
  if (diffEl) diffEl.textContent = String(puzzlesSolved + 1);

  const targetEl = document.getElementById("rush-target");
  if (targetEl) targetEl.textContent = puzzle ? String(puzzle.target) : "—";
}

async function captureShareBlob() {
  const board = document.getElementById("lightboard");
  if (!board) return null;

  const scale = 2;
  const boardRect = board.getBoundingClientRect();
  const w = Math.round(boardRect.width  * scale);
  const h = Math.round(boardRect.height * scale);

  const out = document.createElement("canvas");
  out.width  = w;
  out.height = h;
  const ctx  = out.getContext("2d");

  // 0. White base — matches the container the board sits on in-game (board itself is transparent)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  // 1. Tim — fetch via blob URL to avoid SVG naturalWidth=0 canvas restriction
  const timImgEl = board.parentElement.querySelector(".lightboard-tim");
  if (timImgEl) {
    try {
      const resp = await fetch(timImgEl.src);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      await new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => {
          const tr  = timImgEl.getBoundingClientRect();
          const dx  = (tr.left - boardRect.left) * scale;
          const dy  = (tr.top  - boardRect.top)  * scale;
          const dw  = tr.width  * scale;
          const dh  = tr.height * scale;
          // Replicate object-fit:cover object-position:right center
          const nw = img.naturalWidth  || 2189.7706;
          const nh = img.naturalHeight || 547.0416;
          const coverScale = tr.height / nh;
          const srcW = tr.width / coverScale;
          const srcX = nw - srcW;
          ctx.save();
          ctx.globalAlpha = 0.85;
          try { ctx.filter = "brightness(0.88) saturate(0.9)"; } catch(_) {}
          ctx.drawImage(img, srcX, 0, srcW, nh, dx, dy, dw, dh);
          ctx.restore();
          URL.revokeObjectURL(blobUrl);
          res();
        };
        img.onerror = () => { URL.revokeObjectURL(blobUrl); res(); };
        img.src = blobUrl;
      });
    } catch(_) {}
  }

  // 2. Board gradient scrim — mirrors CSS ::before background
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0,    "rgba(0, 0, 0, 0.78)");
  grad.addColorStop(0.55, "rgba(0, 0, 0, 0.78)");
  grad.addColorStop(1,    "rgba(18, 18, 48, 0.58)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // 2b. Vignette — mirrors CSS ::before inset box-shadow: 0 0 250px rgba(0,5,40,0.35)
  const vig = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, "rgba(0,5,40,0)");
  vig.addColorStop(1, "rgba(0,5,40,0.35)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  // 3. Equations — ensure font loaded before drawing
  try { await document.fonts.load(`600 34px Caveat`); } catch(_) {}

  const surface = document.getElementById("lightboard-surface");
  if (surface) {
    ctx.textBaseline = "top";
    surface.querySelectorAll(".lightboard-eq").forEach(el => {
      const leftPct  = parseFloat(el.style.left) / 100;
      const topPct   = parseFloat(el.style.top)  / 100;
      const x        = leftPct * w;
      const y        = topPct  * h;
      const fontSize = parseFloat(window.getComputedStyle(el).fontSize) * scale;
      const color    = el.style.color || "#fff";
      const glowMatch = (el.style.textShadow || "").match(/rgba?\([^)]+\)/);
      const glow     = glowMatch ? glowMatch[0] : color;

      ctx.save();
      ctx.font      = `600 ${fontSize}px Caveat, cursive`;
      ctx.fillStyle = color;
      ctx.shadowColor = glow;
      ctx.shadowBlur  = 22 * scale;
      ctx.fillText(el.textContent, x, y);
      ctx.shadowBlur  = 10 * scale;
      ctx.fillText(el.textContent, x, y);
      ctx.shadowBlur  = 0;
      ctx.fillText(el.textContent, x, y);
      ctx.restore();
    });
  }

  return new Promise(resolve => out.toBlob(blob => resolve(blob), "image/png"));
}

async function endRushMode() {
  if (rushTimer) {
    clearInterval(rushTimer);
    rushTimer = null;
  }

  document.getElementById("rush-ready-modal").style.display = "none";
  rushIntroPlaying = false;

  // Capture lightboard WITH Tim visible, before hiding him
  if (currentShareBlobURL) {
    URL.revokeObjectURL(currentShareBlobURL);
    currentShareBlobURL = null;
  }
  currentShareBlob = null;
  try {
    currentShareBlob = await captureShareBlob();
  } catch { /* ignore */ }

  document.getElementById("lightboard-section").querySelector(".lightboard-tim").style.display = "none";

  const puzzlesSolvedEl = document.getElementById("puzzlesSolved");
  if (puzzlesSolvedEl) puzzlesSolvedEl.textContent = String(puzzlesSolved);

  const timImg = document.getElementById("tim-img");
  if (timImg) {
    timImg.src = puzzlesSolved >= 5
      ? "/static/images/tim-wave.svg"
      : "/static/images/tim-front.svg";
  }

  const shareBtn = document.getElementById("shareBtn");
  if (shareBtn) shareBtn.style.display = "";

  showModal();
}
function showModal() {
  const modal = document.getElementById("modal");
  if (modal) modal.style.display = "flex";
  launchCelebration(puzzlesSolved);
}

function hideModal() {
  const modal = document.getElementById("modal");
  if (modal) modal.style.display = "none";
  stopFireworks();
}

// ── Celebration ──────────────────────────────────────────────────────────────
let _fwAnimId = null;
const _fwParticles = [];

function launchCelebration(n) {
  if (n <= 3) {
    launchConfettiPoppers(n);
  } else {
    launchFireworks(n);
  }
}

function launchConfettiPoppers(n) {
  if (n === 0) return;
  const canvas = document.getElementById("fireworks-canvas");
  const timEl = document.getElementById("tim-img");
  if (!canvas || !timEl) return;
  const overlay = canvas.parentElement;
  canvas.width = overlay.offsetWidth || window.innerWidth;
  canvas.height = overlay.offsetHeight || window.innerHeight;
  const ctx = canvas.getContext("2d");
  _fwParticles.length = 0;

  const COLORS = [
    [255, 60, 60], [255, 210, 50], [50, 210, 80],
    [70, 160, 255], [210, 60, 210], [255, 155, 50],
  ];

  const r = timEl.getBoundingClientRect();
  const tx = r.left + r.width / 2;
  const ty = r.top + r.height / 2;

  // Origins and spray angles around Tim
  const pops = [
    { x: tx,               y: ty - r.height * 0.65, aC: -Math.PI / 2,    spread: Math.PI * 0.55 }, // above
    { x: tx + r.width * 0.6, y: ty,                 aC: -Math.PI * 0.15, spread: Math.PI * 0.45 }, // right
    { x: tx - r.width * 0.6, y: ty,                 aC: -Math.PI * 0.85, spread: Math.PI * 0.45 }, // left
  ].slice(0, n);

  let popsDone = 0;

  function pop() {
    if (popsDone >= pops.length) return;
    const pos = pops[popsDone++];
    for (let i = 0; i < 32; i++) {
      const angle = pos.aC - pos.spread / 2 + Math.random() * pos.spread;
      const speed = 1.2 + Math.random() * 2.8;
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      _fwParticles.push({
        x: pos.x, y: pos.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        color,
        w: 4 + Math.random() * 3,
        h: 2 + Math.random() * 2,
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 0.25,
      });
    }
  }

  pop();
  const iv = setInterval(() => {
    pop();
    if (popsDone >= pops.length) clearInterval(iv);
  }, 360);

  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = _fwParticles.length - 1; i >= 0; i--) {
      const p = _fwParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.07;
      p.vx *= 0.98;
      p.alpha -= 0.014;
      p.rot += p.rotV;
      if (p.alpha <= 0) { _fwParticles.splice(i, 1); continue; }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.alpha;
      const [rr, g, b] = p.color;
      ctx.fillStyle = `rgb(${rr},${g},${b})`;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (_fwParticles.length > 0 || popsDone < pops.length) {
      _fwAnimId = requestAnimationFrame(frame);
    } else {
      _fwAnimId = null;
    }
  }
  _fwAnimId = requestAnimationFrame(frame);
}

function launchFireworks(level) {
  const canvas = document.getElementById("fireworks-canvas");
  if (!canvas) return;
  const overlay = canvas.parentElement;
  canvas.width = overlay.offsetWidth || window.innerWidth;
  canvas.height = overlay.offsetHeight || window.innerHeight;
  const ctx = canvas.getContext("2d");
  _fwParticles.length = 0;

  const COLORS = [0, 30, 55, 200, 280, 340];
  const scale = level - 4; // 0 at level 4, grows with each level
  const TOTAL_BURSTS = Math.min(3 + scale * 2, 22);
  const particleCount = Math.min(35 + scale * 5, 90);
  const baseSpeed = 1.5 + Math.min(scale * 0.15, 1.5);
  const burstInterval = Math.max(170, 350 - scale * 25);

  let burstsDone = 0;

  function burst() {
    if (burstsDone >= TOTAL_BURSTS) return;
    burstsDone++;
    const cx = 0.15 * canvas.width + Math.random() * 0.7 * canvas.width;
    const cy = 0.1 * canvas.height + Math.random() * 0.5 * canvas.height;
    const hue = COLORS[Math.floor(Math.random() * COLORS.length)];
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.3;
      const speed = baseSpeed + Math.random() * 3.5;
      _fwParticles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5,
        alpha: 1,
        hue: hue + Math.floor(Math.random() * 40) - 20,
        r: 2 + Math.random() * 2,
      });
    }
  }

  burst();
  const iv = setInterval(() => {
    burst();
    if (burstsDone >= TOTAL_BURSTS) clearInterval(iv);
  }, burstInterval);

  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = _fwParticles.length - 1; i >= 0; i--) {
      const p = _fwParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.06;
      p.alpha -= 0.013;
      if (p.alpha <= 0) { _fwParticles.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue},90%,60%,${p.alpha})`;
      ctx.fill();
    }
    if (_fwParticles.length > 0 || burstsDone < TOTAL_BURSTS) {
      _fwAnimId = requestAnimationFrame(frame);
    } else {
      _fwAnimId = null;
    }
  }
  _fwAnimId = requestAnimationFrame(frame);
}

function stopFireworks() {
  if (_fwAnimId) { cancelAnimationFrame(_fwAnimId); _fwAnimId = null; }
  _fwParticles.length = 0;
  const canvas = document.getElementById("fireworks-canvas");
  if (canvas) canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
}
// ─────────────────────────────────────────────────────────────────────────────

function dismissRushModal() {
  hideModal();

  // Clean up preview blob URL
  const preview = document.getElementById("lightboard-preview");
  if (preview) preview.style.display = "none";
  if (currentShareBlobURL) {
    URL.revokeObjectURL(currentShareBlobURL);
    currentShareBlobURL = null;
  }

  // Restore Tim to lightboard
  const timEl = document.querySelector("#lightboard-section .lightboard-tim");
  if (timEl) timEl.style.display = "";
  // Swap End Rush → Menu now that rush is over
  document.getElementById("endRushBtn").style.display = "none";
  document.getElementById("menuBtn").style.display = "inline-block";
  // Lock bank items so the puzzle isn't playable after dismissing
  document.querySelectorAll(".bank-item").forEach(el => el.classList.add("bank-item--locked"));
}

// ============================================================================
// SCROLL LOCK (iOS)
// ============================================================================

function touchMoveBlocker(e) {
  if (pointerState) e.preventDefault();
}
window.addEventListener("touchmove", touchMoveBlocker, { passive: false });

function suppressGhostClicks() {
  suppressClickUntil = Date.now() + CLICK_SUPPRESS_MS;
}

function lockPageScroll() {
  if (scrollLocked) return;
  scrollLocked = true;
  document.body.style.overflow = "hidden";
}

function unlockPageScroll() {
  if (!scrollLocked) return;
  scrollLocked = false;
  document.body.style.overflow = "";
}

// ============================================================================
// PUZZLE MANAGEMENT
// ============================================================================

function newPuzzle() {
  let endpoint = "/api/puzzle/rush?difficulty=3&decoys=2";

  if (gameMode === "rush3" || gameMode === "rush5") {
    currentDifficulty = calculateDifficulty(puzzlesSolved);
    if (currentDifficulty > maxDifficultyReached) maxDifficultyReached = currentDifficulty;
    endpoint = `/api/puzzle/rush?difficulty=${currentDifficulty}&decoys=2`;
  }

  fetch(endpoint)
    .then((r) => r.json())
    .then((data) => {
      puzzle = data;
      renderTemplate(data.template_tokens);
      renderBank(data.numbers);

      const resultEl = document.getElementById("result");
      if (resultEl) resultEl.textContent = "";

      updateControls();

      if (gameMode === "rush3" || gameMode === "rush5") {
        updateRushUI();
        if (!rushStarted) {
          if (skipIntroAnimation) {
            skipIntroAnimation = false;
            startCountdown();
          } else {
            playWrongFillAnimation();
          }
        }
      } else {
        const targetEl = document.getElementById("target");
        if (targetEl) targetEl.textContent = String(data.target);
      }
    })
    .catch((e) => {
      console.error("Fetch puzzle error", e);
      const resultEl = document.getElementById("result");
      if (resultEl) resultEl.textContent = "Failed to fetch puzzle.";
    });
}

function renderTemplate(tokens) {
  const container = document.getElementById("template-area");
  if (!container) return;

  container.innerHTML = "";

  // Map backend operators to display symbols
  const DISPLAY_OPS = {
    "*": "×",
    "/": "÷",
  };

  const row = document.createElement("div");
  row.className = "equation-row";

  tokens.forEach((tok) => {
    const isSlot = tok.startsWith("{") ? tok.endsWith("}") : false;

    if (isSlot) {
      const idx = tok.slice(1, -1);
      const slot = document.createElement("div");
      slot.className = "slot";
      slot.dataset.slotIndex = idx;

      slot.addEventListener("dragover", (ev) => ev.preventDefault());
      slot.addEventListener("drop", handleDropOnSlot);

      slot.addEventListener("click", (ev) => {
        const child = slot.querySelector(".bank-item");
        if (!child) return;
        if (!ev.target.closest(".bank-item")) return;
        const bank = document.getElementById("bank");
        if (bank) bank.appendChild(child);
        updateControls();
      });

      row.appendChild(slot);
    } else {
      const span = document.createElement("span");
      span.className = "inline-token";
      span.textContent = DISPLAY_OPS[tok] || tok;
      row.appendChild(span);
    }
  });

  container.appendChild(row);

  updateControls();
}

function renderBank(numbers) {
  const bank = document.getElementById("bank");
  if (!bank) return;

  bank.innerHTML = "";

  numbers.forEach((n, i) => {
    const item = document.createElement("div");
    item.className = "bank-item";
    item.draggable = false;

    // Fixed: remove literal dollar signs from the id template
    item.id = `bank-item-${i}-${n}-${Math.random().toString(36).slice(2, 8)}`;

    item.dataset.value = String(n);
    item.textContent = String(n);

    item.addEventListener("mousedown", () => {
      item.draggable = true;
    });

    item.addEventListener("dragstart", (ev) => {
      document.body.classList.add("dragging");
      ev.dataTransfer.effectAllowed = "move";
      ev.dataTransfer.setData("text/plain", ev.target.id);
      try {
        ev.dataTransfer.setDragImage(ev.target, ev.offsetX, ev.offsetY);
      } catch (_) {}
    });

    item.addEventListener("dragend", () => {
      document.body.classList.remove("dragging");

      setTimeout(() => {
        const el = document.getElementById(item.id);
        if (!el) return;

        if (el.dataset.animating === "1") {
          setTimeout(() => finalizeDragEndCheck(el), SNAP_ANIM_MS + 120);
        } else {
          finalizeDragEndCheck(el);
        }
      }, 0);
    });

    item.addEventListener("pointerdown", (ev) => {
      if (ev.pointerType === "mouse") return;
      pointerDownHandler(ev);
    });

    bank.appendChild(item);
  });

  updateControls();
}

function finalizeDragEndCheck(el) {
  const parent = el.parentElement;
  const insideSlot = parent?.closest ? parent.closest(".slot") : null;

  const inBank = parent ? parent.id === "bank" : false;

  if (!insideSlot && !inBank) {
    try {
      const bank = document.getElementById("bank");
      if (bank) bank.appendChild(el);
    } catch (_) {}
  }

  el.draggable = false;
  updateControls();
}

function resetSlots() {
  if (!puzzle) return;
  const bank = document.getElementById("bank");
  if (!bank) return;

  document.querySelectorAll(".slot .bank-item").forEach((el) => bank.appendChild(el));

  const resultEl = document.getElementById("result");
  if (resultEl) resultEl.textContent = "";

  updateControls();
}

function buildExpressionFromTemplate() {
  if (!puzzle) return null;

  const tokens = puzzle.template_tokens;
  const parts = [];

  for (const tok of tokens) {
    const isSlot = tok.startsWith("{") ? tok.endsWith("}") : false;

    if (isSlot) {
      const idx = tok.slice(1, -1);
      const slot = document.querySelector(`.slot[data-slot-index="${idx}"]`);
      if (!slot) return { error: `Slot ${idx} missing` };

      const child = slot.querySelector(".bank-item");
      if (!child) return { error: `Slot ${idx} is empty` };

      parts.push(child.dataset.value);
    } else {
      parts.push(tok);
    }
  }

  return { expression: parts.join("") };
}

function checkPuzzle() {
  const built = buildExpressionFromTemplate();
  const resultEl = document.getElementById("result");

  if (!resultEl) return;

  if (!built) {
    resultEl.textContent = "No puzzle loaded.";
    resultEl.className = "result error";
    return;
  }

  if (built.error) {
    resultEl.textContent = built.error;
    resultEl.className = "result error";
    return;
  }

  if (!canCheck()) {
    resultEl.textContent = "Please fill all slots before checking.";
    resultEl.className = "result error";
    return;
  }

  // Replace * and / with display symbols for the expression shown to user
  const displayExpr = built.expression
    .replace(/\*/g, "×")
    .replace(/\//g, "÷");

  const payload = {
    numbers: puzzle.numbers,
    expression: built.expression,
    target: puzzle.target,
  };

  fetch("/api/puzzle/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then((r) => r.json())
    .then((data) => {
      // Use evaluated_display for user-facing messages (shows fractions properly)
      const evalDisplay = data.evaluated_display || String(data.evaluated);

      if (data.reason === "invalid_expression") {
        resultEl.textContent = `Invalid: ${data.message || "expression invalid"}`;
        resultEl.className = "result error";
        return;
      }

      if (data.reason === "correct") {
        if (gameMode === "rush3" || gameMode === "rush5") {
          puzzlesSolved += 1;
          addEquationToLightboard(`${displayExpr} = ${puzzle.target}`);

          resultEl.textContent = `Correct! Level ${puzzlesSolved + 1}`;
          resultEl.className = "result success";

          setTimeout(() => {
            newPuzzle();
          }, 600);
        } else {
          resultEl.textContent = `Correct! ${displayExpr} = ${evalDisplay}`;
          resultEl.className = "result success";
        }
        return;
      }

      if (data.reason === "wrong_value") {
        resultEl.textContent = `Incorrect. Got ${evalDisplay}, need ${puzzle.target}`;
        resultEl.className = "result error";
        return;
      }

      resultEl.textContent = `Result: ${evalDisplay}`;
      resultEl.className = "result";
    })
    .catch((err) => {
      console.error(err);
      resultEl.textContent = "Error checking expression.";
      resultEl.className = "result error";
    });
}

function canCheck() {
  const totalSlots = document.querySelectorAll(".slot").length;
  const filledSlots = document.querySelectorAll(".slot .bank-item").length;
  return totalSlots > 0 && filledSlots === totalSlots;
}

function addEquationToLightboard(expr) {
  const surface = document.getElementById("lightboard-surface");
  if (!surface) return;

  const slotIdx = lightboardZoneIndex % lightboardShuffledZones.length;
  const zone    = lightboardShuffledZones[slotIdx];
  const palette = LIGHTBOARD_COLORS[lightboardZoneIndex % LIGHTBOARD_COLORS.length];
  lightboardZoneIndex++;

  if (lightboardEqEls[slotIdx]) lightboardEqEls[slotIdx].remove();

  const el = document.createElement("div");
  el.className = "lightboard-eq";
  el.textContent = expr + "\u00A0";
  el.style.left = zone[0] + "%";
  el.style.top  = zone[1] + "%";
  el.style.color = palette.color;
  el.style.textShadow = `0 0 8px ${palette.glow}, 0 0 18px ${palette.glow}`;
  surface.appendChild(el);

  lightboardEqEls[slotIdx] = el;
}

function clearLightboard() {
  const surface = document.getElementById("lightboard-surface");
  if (surface) surface.innerHTML = "";
  lightboardZoneIndex = 0;
  lightboardShuffledZones = [...LIGHTBOARD_ZONES].sort(() => Math.random() - 0.5);
  lightboardEqEls = [];
  const timEl = document.getElementById("lightboard-section").querySelector(".lightboard-tim");
  if (timEl) timEl.style.display = "";
  const shareBtn = document.getElementById("shareBtn");
  if (shareBtn) shareBtn.style.display = "none";
}

let autoCheckTimeout = null;

function playWrongFillAnimation() {
  rushIntroPlaying = true;
  if (autoCheckTimeout !== null) {
    clearTimeout(autoCheckTimeout);
    autoCheckTimeout = null;
  }

  const slots = Array.from(document.querySelectorAll(".slot"));
  const bankItems = Array.from(document.querySelectorAll("#bank .bank-item"));
  if (slots.length === 0 || bankItems.length === 0) {
    rushIntroPlaying = false;
    return;
  }

  // Shuffle both items AND slots independently for maximum whimsy
  const shuffledItems = [...bankItems].sort(() => Math.random() - 0.5);
  const shuffledSlots = [...slots].sort(() => Math.random() - 0.5);
  const count = Math.min(slots.length, shuffledItems.length);

  // Half-speed for the intro — double both the flight duration and the stagger gaps
  const INTRO_ANIM_MS = SNAP_ANIM_MS * 2;

  // Random stagger (200–560 ms gaps) so tiles feel organic, not mechanical
  const delays = [0];
  for (let i = 1; i < count; i++) {
    delays.push(delays[i - 1] + 200 + Math.floor(Math.random() * 360));
  }
  const allLanded = delays[count - 1] + INTRO_ANIM_MS + 320;

  for (let i = 0; i < count; i++) {
    setTimeout(() => animateIntroTile(shuffledItems[i], shuffledSlots[i], INTRO_ANIM_MS), delays[i]);
  }

  // After all tiles land: cancel any snuck-through auto-check, show brief feedback, then reset
  setTimeout(() => {
    if (autoCheckTimeout !== null) {
      clearTimeout(autoCheckTimeout);
      autoCheckTimeout = null;
    }
    const resultEl = document.getElementById("result");
    setTimeout(() => {
      resetSlots();
      if (resultEl) resultEl.textContent = "";
      if (!rushStarted && rushIntroPlaying) {
        // First puzzle: show ready modal — timer starts only when clicked through
        document.getElementById("rush-ready-modal").style.display = "flex";
      } else {
        // Subsequent puzzles: timer is running, just unlock interaction
        rushIntroPlaying = false;
      }
    }, 700);
  }, allLanded);
}

function updateControls() {
  if (!puzzle) return;
  if (rushIntroPlaying) return;

  if (!canCheck()) return;

  if (autoCheckTimeout !== null) return;

  autoCheckTimeout = setTimeout(() => {
    autoCheckTimeout = null;
    if (!puzzle) return;
    if (rushIntroPlaying) return;
    if (canCheck()) checkPuzzle();
  }, 300);
}

// ============================================================================
// DRAG AND DROP HELPERS
// ============================================================================

function findNextEmptySlot() {
  const slots = Array.from(document.querySelectorAll(".slot"));
  for (const s of slots) {
    if (!s.querySelector(".bank-item")) return s;
  }
  return null;
}

function getDragged(ev) {
  const id = ev.dataTransfer.getData("text/plain");
  return id ? document.getElementById(id) : null;
}

function handleDropOnSlot(ev) {
  ev.preventDefault();
  const dragged = getDragged(ev);
  if (!dragged) return;

  const slot = ev.currentTarget;
  const bank = document.getElementById("bank");
  const existing = slot.querySelector(".bank-item");
  if (existing && bank) bank.appendChild(existing);

  animateSnapAndPlace(dragged, slot);
}

function handleDropOnTemplate(ev) {
  ev.preventDefault();
  const dragged = getDragged(ev);
  if (!dragged) return;

  const bank = document.getElementById("bank");
  const allSlots = Array.from(document.querySelectorAll(".slot"));
  const dropX = ev.clientX;
  const dropY = ev.clientY;

  let containing = null;
  for (const s of allSlots) {
    const r = s.getBoundingClientRect();
    if (dropX >= r.left && dropX <= r.right && dropY >= r.top && dropY <= r.bottom) {
      containing = s;
      break;
    }
  }

  if (containing) {
    const existing = containing.querySelector(".bank-item");
    if (existing && bank) bank.appendChild(existing);
    animateSnapAndPlace(dragged, containing);
    return;
  }

  const emptySlots = allSlots.filter((s) => !s.querySelector(".bank-item"));
  if (emptySlots.length === 0) {
    if (bank) bank.appendChild(dragged);
    updateControls();
    return;
  }

  let best = null;
  let bestDist = Infinity;
  for (const s of emptySlots) {
    const r = s.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const d = Math.hypot(cx - dropX, cy - dropY);
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }

  if (best && bestDist <= SNAP_THRESHOLD) animateSnapAndPlace(dragged, best);
  else {
    if (bank) bank.appendChild(dragged);
    updateControls();
  }
}

function makeVisualClone(el, className) {
  const clone = el.cloneNode(true);
  clone.className = "";
  clone.classList.add(className);

  const cs = getComputedStyle(el);
  clone.style.background = cs.backgroundColor || cs.background;
  clone.style.color = cs.color;
  clone.style.padding = cs.padding;
  clone.style.borderRadius = cs.borderRadius;
  clone.style.fontWeight = cs.fontWeight;
  clone.style.fontSize = cs.fontSize;
  clone.style.display = "inline-flex";
  clone.style.alignItems = "center";
  clone.style.justifyContent = "center";
  clone.style.boxSizing = "border-box";
  clone.style.boxShadow = cs.boxShadow;
  clone.style.userSelect = "none";
  clone.style.webkitUserSelect = "none";

  return clone;
}

function animateIntroTile(el, slot, animMs) {
  if (el.parentElement === slot) return;

  el.dataset.animating = "1";

  const rectFrom = el.getBoundingClientRect();
  const rectTo   = slot.getBoundingClientRect();

  const clone = makeVisualClone(el, "snap-clone");
  clone.style.position     = "fixed";
  clone.style.left         = `${rectFrom.left}px`;
  clone.style.top          = `${rectFrom.top}px`;
  clone.style.width        = `${rectFrom.width}px`;
  clone.style.height       = `${rectFrom.height}px`;
  clone.style.margin       = "0";
  clone.style.zIndex       = "9999";
  clone.style.pointerEvents = "none";
  clone.style.transition   = "none";
  clone.style.willChange   = "left, top";
  document.body.appendChild(clone);
  el.style.visibility = "hidden";

const fromX = rectFrom.left + rectFrom.width  / 2;
  const fromY = rectFrom.top  + rectFrom.height / 2;
  const toX   = rectTo.left   + rectTo.width    / 2;
  const toY   = rectTo.top    + rectTo.height   / 2;

  const vx  = toX - fromX;
  const vy  = toY - fromY;
  const len = Math.sqrt(vx * vx + vy * vy) || 1;
  const arcSign = Math.random() < 0.5 ? 1 : -1;
  const arcAmt  = Math.min(len * 0.35, 90) * arcSign;
  const cpX = (fromX + toX) / 2 + (-vy / len) * arcAmt;
  const cpY = (fromY + toY) / 2 + ( vx / len) * arcAmt;

  const halfW = rectFrom.width  / 2;
  const halfH = rectFrom.height / 2;

  const startTime = performance.now();

  function easeInOut(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
  function quad(t, p0, p1, p2) { const u = 1 - t; return u*u*p0 + 2*u*t*p1 + t*t*p2; }

  function tick(now) {
    const raw = Math.min((now - startTime) / animMs, 1);
    const t   = easeInOut(raw);

    clone.style.left = `${quad(t, fromX, cpX, toX) - halfW}px`;
    clone.style.top  = `${quad(t, fromY, cpY, toY) - halfH}px`;

if (raw < 1) { requestAnimationFrame(tick); } else { done(); }
  }

  requestAnimationFrame(tick);

  function done() {
    try { clone.remove(); } catch (_) {}

    const bank     = document.getElementById("bank");
    const existing = slot.querySelector(".bank-item");
    if (existing && bank) bank.appendChild(existing);

    slot.appendChild(el);
    el.style.visibility = "";
    el.classList.add("placed");
    setTimeout(() => el.classList.remove("placed"), animMs + 40);

    delete el.dataset.animating;
    el.draggable = false;
    updateControls();
  }
}

function animateSnapAndPlace(el, slot, animMs = SNAP_ANIM_MS) {
  document.body.classList.remove("dragging");
  if (el.parentElement === slot) return;

  el.dataset.animating = "1";

  const rectFrom = el.getBoundingClientRect();
  const rectTo = slot.getBoundingClientRect();

  const clone = makeVisualClone(el, "snap-clone");
  clone.style.position = "fixed";
  clone.style.left = `${rectFrom.left}px`;
  clone.style.top = `${rectFrom.top}px`;
  clone.style.width = `${rectFrom.width}px`;
  clone.style.height = `${rectFrom.height}px`;
  clone.style.margin = "0";
  clone.style.zIndex = 9999;
  clone.style.pointerEvents = "none";
  clone.style.transform = "translate(0px, 0px) scale(1)";
  clone.style.opacity = "1";
  clone.style.transition = "none";
  clone.style.willChange = "transform, opacity";

  document.body.appendChild(clone);
  el.style.visibility = "hidden";

  const dx = rectTo.left + rectTo.width / 2 - (rectFrom.left + rectFrom.width / 2);
  const dy = rectTo.top + rectTo.height / 2 - (rectFrom.top + rectFrom.height / 2);

  requestAnimationFrame(() => {
    // Fixed: removed literal dollar signs in CSS strings
    clone.style.transition = `transform ${animMs}ms cubic-bezier(.2,.9,.2,1), opacity ${animMs}ms ease`;
    clone.style.transform = `translate(${dx}px, ${dy}px) scale(1.01)`;
    clone.style.opacity = "0.99";
  });

  const cleanup = () => {
    clone.removeEventListener("transitionend", cleanup);
    try {
      clone.remove();
    } catch (_) {}

    const bank = document.getElementById("bank");
    const existing = slot.querySelector(".bank-item");
    if (existing && bank) bank.appendChild(existing);

    slot.appendChild(el);
    el.style.visibility = "";
    el.classList.add("placed");
    setTimeout(() => el.classList.remove("placed"), animMs + 40);

    delete el.dataset.animating;
    el.draggable = false;
    updateControls();
  };

  clone.addEventListener("transitionend", cleanup);
  setTimeout(cleanup, animMs + 220);
}

// ============================================================================
// TOUCH AND POINTER HANDLERS
// ============================================================================

function pointerDownHandler(ev) {
  if (ev.pointerType === "mouse") return;

  if (typeof ev.button === "number") {
    if (ev.button !== 0) return;
  }

  ev.preventDefault();
  suppressGhostClicks();
  lockPageScroll();

  const el = ev.currentTarget;

  if (pointerState) endPointerDrag({ revealOriginal: true, removeClone: true });

  if (typeof el.setPointerCapture === "function") {
    try {
      el.setPointerCapture(ev.pointerId);
    } catch (_) {}
  }

  const rect = el.getBoundingClientRect();
  const clone = makeVisualClone(el, "drag-clone");

  clone.style.position = "fixed";
  clone.style.left = `${rect.left}px`;
  clone.style.top = `${rect.top}px`;
  clone.style.width = `${rect.width}px`;
  clone.style.height = `${rect.height}px`;
  clone.style.zIndex = 9999;
  clone.style.pointerEvents = "none";
  clone.style.margin = "0";

  document.body.appendChild(clone);
  el.style.visibility = "hidden";
  document.body.classList.add("dragging");

  pointerState = {
    pointerId: ev.pointerId,
    originEl: el,
    clone,
    offsetX: ev.clientX - rect.left,
    offsetY: ev.clientY - rect.top,
    startX: ev.clientX,
    startY: ev.clientY,
    lastX: ev.clientX,
    lastY: ev.clientY,
    startT: performance.now(),
  };

  window.addEventListener("pointermove", pointerMoveHandler, { passive: false });
  window.addEventListener("pointerup", pointerUpHandler, { passive: false });
  window.addEventListener("pointercancel", pointerCancelHandler, { passive: false });
}

function pointerMoveHandler(ev) {
  if (!pointerState) return;
  if (ev.pointerId !== pointerState.pointerId) return;

  ev.preventDefault();

  pointerState.lastX = ev.clientX;
  pointerState.lastY = ev.clientY;

  const clone = pointerState.clone;
  clone.style.left = `${ev.clientX - pointerState.offsetX}px`;
  clone.style.top = `${ev.clientY - pointerState.offsetY}px`;

  const allSlots = Array.from(document.querySelectorAll(".slot"));
  const emptySlots = allSlots.filter((s) => !s.querySelector(".bank-item"));

  document.querySelectorAll(".slot").forEach((s) => s.classList.remove("slot-highlight"));
  if (emptySlots.length === 0) return;

  let best = null;
  let bestDist = Infinity;
  const x = ev.clientX;
  const y = ev.clientY;

  for (const s of emptySlots) {
    const r = s.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const d = Math.hypot(cx - x, cy - y);
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }

  if (best && bestDist <= SNAP_THRESHOLD) best.classList.add("slot-highlight");
}

function pointerUpHandler(ev) {
  if (!pointerState) return;
  if (ev.pointerId !== pointerState.pointerId) return;

  ev.preventDefault();
  suppressGhostClicks();

  const originEl = pointerState.originEl;
  const clone = pointerState.clone;
  const startX = pointerState.startX;
  const startY = pointerState.startY;
  const lastX = pointerState.lastX;
  const lastY = pointerState.lastY;
  const startT = pointerState.startT;

  document.querySelectorAll(".slot").forEach((s) => s.classList.remove("slot-highlight"));

  const dist = Math.hypot(lastX - startX, lastY - startY);
  const dt = performance.now() - startT;
  const isTap = dist <= TAP_MOVE_PX && dt < 600;

  if (isTap) {
    endPointerDrag({ revealOriginal: true, removeClone: true });

    const next = findNextEmptySlot();
    const bank = document.getElementById("bank");
    if (next) animateSnapAndPlace(originEl, next);
    else if (bank) bank.appendChild(originEl);

    unlockPageScroll();
    updateControls();
    return;
  }

  const x = ev.clientX;
  const y = ev.clientY;

  const allSlots = Array.from(document.querySelectorAll(".slot"));

  let containing = null;
  for (const s of allSlots) {
    const r = s.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
      containing = s;
      break;
    }
  }

  let target = containing;

  if (!target) {
    const emptySlots = allSlots.filter((s) => !s.querySelector(".bank-item"));
    let best = null;
    let bestDist = Infinity;

    for (const s of emptySlots) {
      const r = s.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const d = Math.hypot(cx - x, cy - y);
      if (d < bestDist) {
        bestDist = d;
        best = s;
      }
    }

    if (best && bestDist <= SNAP_THRESHOLD) target = best;
  }

  if (!target) {
    endPointerDrag({ revealOriginal: true, removeClone: true });
    const bank = document.getElementById("bank");
    if (bank) bank.appendChild(originEl);
    unlockPageScroll();
    updateControls();
    return;
  }

  const bank = document.getElementById("bank");
  const existing = target.querySelector(".bank-item");
  if (existing && bank) bank.appendChild(existing);

  animatePointerCloneIntoSlot({ dragClone: clone, originEl, slot: target });
}

function pointerCancelHandler(ev) {
  if (!pointerState) return;
  if (ev.pointerId !== pointerState.pointerId) return;

  suppressGhostClicks();
  endPointerDrag({ revealOriginal: true, removeClone: true });
  unlockPageScroll();
  updateControls();
}

function endPointerDrag({ revealOriginal, removeClone }) {
  if (!pointerState) return;

  window.removeEventListener("pointermove", pointerMoveHandler);
  window.removeEventListener("pointerup", pointerUpHandler);
  window.removeEventListener("pointercancel", pointerCancelHandler);

  document.body.classList.remove("dragging");
  document.querySelectorAll(".slot").forEach((s) => s.classList.remove("slot-highlight"));

  if (removeClone && pointerState.clone) {
    try {
      pointerState.clone.remove();
    } catch (_) {}
  }

  if (revealOriginal && pointerState.originEl) pointerState.originEl.style.visibility = "";

  pointerState = null;
}

function animatePointerCloneIntoSlot({ dragClone, originEl, slot }) {
  endPointerDrag({ revealOriginal: false, removeClone: false });

  const rectFrom = dragClone.getBoundingClientRect();
  const rectTo = slot.getBoundingClientRect();

  const dx = rectTo.left + rectTo.width / 2 - (rectFrom.left + rectFrom.width / 2);
  const dy = rectTo.top + rectTo.height / 2 - (rectFrom.top + rectFrom.height / 2);

  dragClone.style.willChange = "transform, opacity";

  // Fixed: removed literal dollar signs in CSS strings
  dragClone.style.transition = `transform ${SNAP_ANIM_MS}ms cubic-bezier(.2,.9,.2,1), opacity ${SNAP_ANIM_MS}ms ease`;
  dragClone.style.transform = `translate(${dx}px, ${dy}px) scale(1.01)`;
  dragClone.style.opacity = "0.99";

  const cleanup = () => {
    dragClone.removeEventListener("transitionend", cleanup);
    try {
      dragClone.remove();
    } catch (_) {}

    slot.appendChild(originEl);
    originEl.style.visibility = "";
    originEl.classList.add("placed");
    setTimeout(() => originEl.classList.remove("placed"), SNAP_ANIM_MS + 40);

    originEl.draggable = false;

    unlockPageScroll();
    updateControls();
  };

  dragClone.addEventListener("transitionend", cleanup);
  setTimeout(cleanup, SNAP_ANIM_MS + 220);
}

// ============================================================================
// HOME LIGHTBOARD
// ============================================================================

const HOME_LB_POOL = [
  { text: "e^(iπ) + 1 = 0",      color: "#ff6ec7", glow: "rgba(255,110,199,0.5)" },
  { text: "π ≈ 3.14159",          color: "#00d4ff", glow: "rgba(0,212,255,0.5)"   },
  { text: "E = mc²",              color: "#ffe033", glow: "rgba(255,224,51,0.5)"  },
  { text: "√2 ≈ 1.414",           color: "#ff9d00", glow: "rgba(255,157,0,0.5)"   },
  { text: "F = ma",               color: "#39ff14", glow: "rgba(57,255,20,0.5)"   },
  { text: "Est. 1861",            color: "#c77dff", glow: "rgba(199,125,255,0.5)" },
  { text: "∑ 1/n² = π²/6",       color: "#00d4ff", glow: "rgba(0,212,255,0.5)"   },
  { text: "ℏω = E",               color: "#ffe033", glow: "rgba(255,224,51,0.5)"  },
  { text: "∇²ψ = 0",              color: "#39ff14", glow: "rgba(57,255,20,0.5)"   },
  { text: "PV = nRT",             color: "#ff9d00", glow: "rgba(255,157,0,0.5)"   },
  { text: "i² = −1",              color: "#c77dff", glow: "rgba(199,125,255,0.5)" },
  { text: "a² + b² = c²",        color: "#ff6ec7", glow: "rgba(255,110,199,0.5)" },
  { text: "det(A) ≠ 0",          color: "#00d4ff", glow: "rgba(0,212,255,0.5)"   },
  { text: "lim 1/n → 0",         color: "#ffe033", glow: "rgba(255,224,51,0.5)"  },
  { text: "∫eˣ dx = eˣ + C",    color: "#39ff14", glow: "rgba(57,255,20,0.5)"   },
  { text: "φ = (1+√5)/2",        color: "#ff9d00", glow: "rgba(255,157,0,0.5)"   },
  { text: "H|ψ⟩ = E|ψ⟩",        color: "#c77dff", glow: "rgba(199,125,255,0.5)" },
  { text: "Cambridge, MA",        color: "#ff6ec7", glow: "rgba(255,110,199,0.5)" },
  { text: "n! ~ (n/e)ⁿ√(2πn)",  color: "#00d4ff", glow: "rgba(0,212,255,0.5)"   },
];

const HOME_LB_FONTS = [
  { family: "'Caveat'",              weight: 600 },
  { family: "'Patrick Hand'",        weight: 400 },
  { family: "'Architects Daughter'", weight: 400 },
  { family: "'Kalam'",               weight: 700 },
  { family: "'Kalam'",               weight: 400 },
];
const HOME_LB_SIZES = [17, 21, 25, 30, 36];

function homeLbPickStyle(text) {
  const font = HOME_LB_FONTS[Math.floor(Math.random() * HOME_LB_FONTS.length)];
  // Constrain max size for longer strings so they don't overflow
  const maxSize = text.length > 15 ? 25 : text.length > 11 ? 30 : 36;
  const sizes = HOME_LB_SIZES.filter(s => s <= maxSize);
  const size = sizes[Math.floor(Math.random() * sizes.length)];
  // Width estimate: avg char ≈ size * 0.60px, canvas baseline 640px
  const widthPct = (text.length * size * 0.62) / 640 * 100;
  return { family: font.family, weight: font.weight, size, widthPct };
}

// Doodle pool — approximate half-extents in % of canvas for overlap detection
const DOODLE_POOL = ['gear', 'sine', 'helix', 'matrix', 'atom', 'fibonacci', 'venn', 'triangle', 'star', 'numberLine', 'rocket', 'dna', 'lightbulb', 'numtiles'];
const DOODLE_PCT  = {
  gear:       { rw: 9,  rh: 10 },
  sine:       { rw: 14, rh: 22 },
  helix:      { rw: 10, rh: 22 },
  matrix:     { rw: 17, rh: 13 },
  atom:       { rw: 11, rh: 11 },
  fibonacci:  { rw: 12, rh: 12 },
  venn:       { rw: 16, rh: 10 },
  triangle:   { rw: 10, rh: 10 },
  star:       { rw:  7, rh:  7 },
  numberLine: { rw: 17, rh:  6 },
  rocket:     { rw:  7, rh: 16 },
  dna:        { rw:  9, rh: 19 },
  lightbulb:  { rw: 10, rh: 14 },
  numtiles:   { rw: 17, rh: 12 },
};

let homeLbAnimId    = null;
let homeLbMutateTimer = null;
let homeLbStars     = [];
let homeLbStar      = null;
let homeLbFw        = null;
let homeLbStartTs   = null;
let homeLbCfg       = null;

// ── Doodle params and placement ───────────────────────────────────────────────
function homeLbBuildParams(type, w, h) {
  switch (type) {
    case 'gear':       return { r:  h*(0.060+Math.random()*0.035) };
    case 'sine':       return { gw: w*(0.110+Math.random()*0.050), gh: h*(0.24+Math.random()*0.10) };
    case 'helix':      return { gw: w*(0.080+Math.random()*0.040), gh: h*(0.24+Math.random()*0.12) };
    case 'matrix':     return { cw: w*(0.048+Math.random()*0.018), ch: h*(0.10+Math.random()*0.04) };
    case 'atom':       return { r:  h*(0.070+Math.random()*0.030) };
    case 'fibonacci':  return { r:  h*(0.090+Math.random()*0.030) };
    case 'venn':       return { r:  w*(0.055+Math.random()*0.020) };
    case 'triangle':   return { size: h*(0.110+Math.random()*0.040) };
    case 'star':       return { r:  h*(0.055+Math.random()*0.025) };
    case 'numberLine': return { lw: w*(0.140+Math.random()*0.070) };
    case 'rocket':     return { rh: h*(0.130+Math.random()*0.040) };
    case 'dna':        return { gw: w*(0.050+Math.random()*0.022), gh: h*(0.22+Math.random()*0.08) };
    case 'lightbulb':  return { r:  h*(0.075+Math.random()*0.030) };
    case 'numtiles': {
      const tw = w*(0.028+Math.random()*0.010);
      // Pre-shuffle draw order and color assignment so tiles appear in random order
      const order = [0,1,2,3,4,5,6,7,8].sort(() => Math.random()-0.5);
      const ci    = [0,1,2,3,4,5,6,7,8].map(() => Math.floor(Math.random()*_TILE_COLORS.length));
      const nums  = [1,2,3,4,5,6,7,8,9].sort(() => Math.random()-0.5);
      return { tw, order, ci, nums };
    }
    default: return {};
  }
}

function homeLbBuildCfg(w, h) {
  const types   = [...DOODLE_POOL].sort(() => Math.random() - 0.5).slice(0, 4 + Math.floor(Math.random() * 2));
  const doodles = [];

  for (const type of types) {
    const sz = DOODLE_PCT[type];
    let placed = false;

    for (let attempt = 0; attempt < 80; attempt++) {
      let pctX, pctY;
      const zone = Math.random();
      if (zone < 0.55) {
        pctX = sz.rw + Math.random() * Math.max(1, 95 - sz.rw * 2);
        pctY = sz.rh + Math.random() * Math.max(1, 44 - sz.rh * 2);
      } else {
        pctX = sz.rw + Math.random() * Math.max(1, 95 - sz.rw * 2);
        pctY = 50 + sz.rh + Math.random() * Math.max(1, 38 - sz.rh * 2);
      }

      const overlaps = doodles.some(d => {
        const osz = DOODLE_PCT[d.type];
        const dx  = (pctX - d.pctCX) / (sz.rw + osz.rw);
        const dy  = (pctY - d.pctCY) / (sz.rh + osz.rh);
        return dx * dx + dy * dy < 1;
      });

      if (!overlaps) {
        doodles.push({ type, cx: pctX/100*w, cy: pctY/100*h, pctCX: pctX, pctCY: pctY,
                       params: homeLbBuildParams(type, w, h), showMs: 0 });
        placed = true;
        break;
      }
    }

    if (!placed) {
      const pctX = sz.rw + Math.random() * Math.max(1, 95 - sz.rw * 2);
      const pctY = sz.rh + Math.random() * Math.max(1, 90 - sz.rh * 2);
      doodles.push({ type, cx: pctX/100*w, cy: pctY/100*h, pctCX: pctX, pctCY: pctY,
                     params: homeLbBuildParams(type, w, h), showMs: 0 });
    }
  }

  let t = 0;
  doodles.forEach(d => { d.showMs = t; t += (3 + Math.random() * 4) * 1000; });
  return { doodles };
}

// ── Text item position generator ──────────────────────────────────────────────
// entries: array of {widthPct} — used to clamp right edge per item
function homeLbRandomPositions(entries, reservedZones, alreadyPlaced = []) {
  const count    = entries.length;
  const placed   = [...alreadyPlaced];
  const newItems = [];
  const MIN_DIST  = 22;
  const MAX_TRIES = 120;

  function conflicts(x, y, wPct) {
    if (x < 1 || x + wPct > 97 || y < 1 || y > 92) return true;
    // Sample points along the text body to check doodle overlap
    for (const tx of [x, x + wPct * 0.5, x + wPct]) {
      for (const z of reservedZones) {
        const dx = (tx - z.cx) / z.rw, dy = (y - z.cy) / z.rh;
        if (dx * dx + dy * dy < 1) return true;
      }
    }
    // Check against existing items using their stored width (default 20)
    for (const p of placed) {
      const pw = p.wPct ?? 20;
      for (const ox of [0, pw * 0.5, pw]) {
        const dx = (x + wPct * 0.5) - (p.x + ox), dy = (y - p.y) * 1.6;
        if (dx * dx + dy * dy < MIN_DIST * MIN_DIST) return true;
      }
    }
    return false;
  }

  for (let i = 0; i < count; i++) {
    const wPct = entries[i].widthPct ?? 20;
    // Max safe x so text fits within the lightboard
    const maxX = Math.max(2, 97 - wPct);
    let pos = null;
    for (let a = 0; a < MAX_TRIES; a++) {
      let x, y;
      const r = Math.random();
      if (r < 0.55) {
        x = 2 + Math.random() * Math.min(80, maxX - 2); y = 2 + Math.random() * 42;
      } else {
        x = 2 + Math.random() * (maxX - 2); y = 48 + Math.random() * 40;
      }
      x = Math.min(x, maxX);
      if (!conflicts(x, y, wPct)) { pos = { x, y, wPct }; break; }
    }
    if (pos) { placed.push(pos); newItems.push(pos); }
    // No fallback — skip items that can't be cleanly placed
  }
  return newItems;
}

// ── Stars ─────────────────────────────────────────────────────────────────────
function homeLbMakeStars(w, h) {
  const pts = [
    [0.05,0.08],[0.28,0.06],[0.50,0.15],[0.72,0.10],[0.92,0.08],
    [0.15,0.22],[0.45,0.28],[0.65,0.30],[0.85,0.24],[0.20,0.34],
    [0.04,0.58],[0.10,0.76],[0.07,0.88],
    [0.88,0.60],[0.94,0.76],[0.91,0.88],[0.80,0.82],
  ];
  return pts.map(([px,py], i) => ({
    x: px*w, y: py*h, phase: (i/pts.length)*Math.PI*2, size: 1.5+(i%3)*0.65,
  }));
}

function homeLbDrawStars(ctx, ts) {
  homeLbStars.forEach(s => {
    const alpha = 0.25 + 0.75*(0.5 + 0.5*Math.sin(ts*0.0018 + s.phase));
    const r     = s.size*(0.85 + 0.15*Math.sin(ts*0.003 + s.phase + 1));
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = "#fff";
    ctx.shadowColor = "#ffe033"; ctx.shadowBlur = 4;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i/8)*Math.PI*2, rad = i%2===0 ? r : r*0.35;
      i===0 ? ctx.moveTo(s.x+rad*Math.cos(a), s.y+rad*Math.sin(a))
            : ctx.lineTo(s.x+rad*Math.cos(a), s.y+rad*Math.sin(a));
    }
    ctx.closePath(); ctx.fill(); ctx.restore();
  });
}

// ── Shooting star ─────────────────────────────────────────────────────────────
function homeLbNewStar(w, h) {
  return { x:w*(0.02+Math.random()*0.22), y:h*(0.03+Math.random()*0.22),
           vx:w*0.00055, vy:h*0.00018, trail:[], start:null, dur:2000 };
}

function homeLbTickStar(ctx, s, ts) {
  if (!s.start) s.start = ts;
  const t = (ts - s.start) / s.dur;
  if (t >= 1) return true;
  s.x += s.vx; s.y += s.vy;
  s.trail.push({ x:s.x, y:s.y });
  if (s.trail.length > 28) s.trail.shift();
  const alpha = t < 0.12 ? t/0.12 : t > 0.75 ? (1-t)/0.25 : 1;
  s.trail.forEach((p, i) => {
    const tf = i/s.trail.length;
    ctx.save(); ctx.globalAlpha = alpha*tf*0.55; ctx.fillStyle = "#ffe033";
    ctx.beginPath(); ctx.arc(p.x, p.y, tf*2, 0, Math.PI*2); ctx.fill(); ctx.restore();
  });
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = "#fff";
  ctx.shadowColor = "#ffe033"; ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.arc(s.x, s.y, 2.5, 0, Math.PI*2); ctx.fill(); ctx.restore();
  return false;
}

// ── Firework ──────────────────────────────────────────────────────────────────
const FW_COLORS = ["#ff1423","#ff6ec7","#ffe033","#00d4ff","#c77dff","#39ff14","#ff9d00"];

function homeLbNewFw(w, h) {
  const left = Math.random() > 0.5;
  const sx = left ? w*0.07 : w*0.93;
  const ex = sx + (left ? 1 : -1) * w * (0.04 + Math.random()*0.10);
  const ey = h * (0.10 + Math.random()*0.28);
  return { phase:"launch", sx, x:sx, y:h, ex, ey, start:null, launchMs:900, explodeAt:null, particles:[] };
}

function homeLbTickFw(ctx, fw, ts) {
  if (!fw.start) fw.start = ts;
  if (fw.phase === "launch") {
    const p = Math.min((ts - fw.start) / fw.launchMs, 1);
    fw.x = fw.sx + (fw.ex - fw.sx) * p;
    fw.y = fw.y + (fw.ey - fw.y) * (p < 1 ? 0.08 : 1);
    ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = "#fff";
    ctx.shadowColor = "#fff"; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(fw.x, fw.y, 2, 0, Math.PI*2); ctx.fill(); ctx.restore();
    if (p >= 1) {
      fw.phase = "explode"; fw.explodeAt = ts; fw.x = fw.ex; fw.y = fw.ey;
      for (let i = 0; i < 32; i++) {
        const a = (i/32)*Math.PI*2 + (Math.random()-0.5)*0.4, spd = 1 + Math.random()*2.2;
        fw.particles.push({ x:fw.x, y:fw.y, vx:Math.cos(a)*spd, vy:Math.sin(a)*spd,
                            color:FW_COLORS[i%FW_COLORS.length], r:1.5+Math.random()*1.5 });
      }
    }
  } else {
    const p = (ts - fw.explodeAt) / 2300;
    if (p >= 1) return true;
    fw.particles.forEach(pt => {
      pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.05;
      ctx.save(); ctx.globalAlpha = 1-p; ctx.fillStyle = pt.color;
      ctx.shadowColor = pt.color; ctx.shadowBlur = 5;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r*(1-p*0.5), 0, Math.PI*2);
      ctx.fill(); ctx.restore();
    });
  }
  return false;
}

// ── Doodle draw functions ─────────────────────────────────────────────────────

function doodleGear(ctx, cx, cy, r, ts, fade) {
  const teeth=8, inner=r*0.68, tooth=r*0.38, hole=r*0.28, angle=ts*0.0004;
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(angle);
  ctx.globalAlpha = 0.45*fade; ctx.strokeStyle = "#c77dff";
  ctx.fillStyle = "rgba(199,125,255,0.12)"; ctx.lineWidth = 1.5;
  ctx.shadowColor = "#c77dff"; ctx.shadowBlur = 7;
  ctx.beginPath();
  for (let i = 0; i < teeth; i++) {
    const a1=(i/teeth)*Math.PI*2,        a2=((i+0.4)/teeth)*Math.PI*2,
          a3=((i+0.6)/teeth)*Math.PI*2,  a4=((i+1)/teeth)*Math.PI*2;
    ctx.lineTo(Math.cos(a1)*inner,         Math.sin(a1)*inner);
    ctx.lineTo(Math.cos(a2)*(inner+tooth), Math.sin(a2)*(inner+tooth));
    ctx.lineTo(Math.cos(a3)*(inner+tooth), Math.sin(a3)*(inner+tooth));
    ctx.lineTo(Math.cos(a4)*inner,         Math.sin(a4)*inner);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, hole, 0, Math.PI*2);
  ctx.globalAlpha = 0.7*fade; ctx.stroke();
  ctx.restore();
}

function doodleSineGraph(ctx, cx, cy, gw, gh, ts, fade) {
  ctx.save();
  ctx.globalAlpha = 0.55*fade; ctx.strokeStyle = "#39ff14";
  ctx.lineWidth = 1.3; ctx.shadowColor = "#39ff14"; ctx.shadowBlur = 5;
  ctx.beginPath(); ctx.moveTo(cx-gw/2, cy); ctx.lineTo(cx+gw/2, cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy-gh/2); ctx.lineTo(cx, cy+gh/2); ctx.stroke();
  const ar = 5; ctx.beginPath();
  ctx.moveTo(cx+gw/2,cy); ctx.lineTo(cx+gw/2-ar,cy-3);
  ctx.moveTo(cx+gw/2,cy); ctx.lineTo(cx+gw/2-ar,cy+3);
  ctx.moveTo(cx,cy-gh/2); ctx.lineTo(cx-3,cy-gh/2+ar);
  ctx.moveTo(cx,cy-gh/2); ctx.lineTo(cx+3,cy-gh/2+ar); ctx.stroke();
  ctx.globalAlpha = 0.9*fade; ctx.strokeStyle = "#ff6ec7";
  ctx.lineWidth = 2; ctx.shadowColor = "#ff6ec7"; ctx.shadowBlur = 7;
  ctx.beginPath();
  for (let i = 0; i <= 80; i++) {
    const t=i/80, x=cx-gw/2+4+t*(gw-8), y=cy-(gh/2-7)*Math.sin(t*Math.PI*2+ts*0.001);
    i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
  }
  ctx.stroke();
  ctx.globalAlpha = 0.35*fade; ctx.strokeStyle = "#39ff14"; ctx.lineWidth = 1; ctx.shadowBlur = 0;
  [0.25,0.5,0.75].forEach(f => {
    const xp = cx-gw/2+f*gw;
    ctx.beginPath(); ctx.moveTo(xp,cy-3); ctx.lineTo(xp,cy+3); ctx.stroke();
  });
  ctx.restore();
}

function doodleHelix(ctx, cx, cy, gw, gh, ts, fade) {
  const turns = 3.5, top = cy - gh/2, totalT = turns * Math.PI * 2;
  const segs  = turns * 36 | 0;
  const animOff = ts * 0.00025; // slow rotation
  ctx.save();
  // vertical axis
  ctx.globalAlpha = 0.35*fade; ctx.strokeStyle = "#00d4ff";
  ctx.lineWidth = 1; ctx.shadowColor = "#00d4ff"; ctx.shadowBlur = 3;
  ctx.beginPath(); ctx.moveTo(cx, top-4); ctx.lineTo(cx, top+gh+4); ctx.stroke();
  // draw each segment with smoothly-varying depth: back=dim/dashed, front=bright/solid
  ctx.strokeStyle = "#00d4ff"; ctx.shadowColor = "#00d4ff";
  for (let i = 0; i < segs; i++) {
    const t1 = (i/segs)*totalT,     t2 = ((i+1)/segs)*totalT;
    const cos1 = Math.cos(t1+animOff), cos2 = Math.cos(t2+animOff);
    const depth = ((cos1+cos2)*0.5 + 1) * 0.5; // 0=fully back, 1=fully front
    ctx.globalAlpha = (0.15 + depth*0.75) * fade;
    ctx.lineWidth   = 0.8 + depth*1.5;
    ctx.shadowBlur  = 2 + depth*7;
    ctx.setLineDash(depth < 0.3 ? [2,3] : []);
    ctx.beginPath();
    ctx.moveTo(cx+(gw/2)*cos1, top+(t1/totalT)*gh);
    ctx.lineTo(cx+(gw/2)*cos2, top+(t2/totalT)*gh);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();
}

function doodleMatrix(ctx, cx, cy, cw, ch, fade) {
  const vals=[[2,-1,0],[-1,2,-1],[0,-1,2]];
  const mw=cw*3, mh=ch*3, left=cx-mw/2, top=cy-mh/2;
  ctx.save();
  ctx.globalAlpha = 0.78*fade; ctx.fillStyle = "#c77dff";
  ctx.shadowColor = "#c77dff"; ctx.shadowBlur = 8;
  ctx.font = `600 ${Math.round(ch*0.72)}px 'Caveat', cursive`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  vals.forEach((row,r) => row.forEach((v,c) =>
    ctx.fillText(v, left+c*cw+cw/2, top+r*ch+ch/2)
  ));
  ctx.strokeStyle = "#c77dff"; ctx.lineWidth = 2; ctx.shadowBlur = 6;
  const bw=7, pad=4;
  [[left-pad, left-pad+bw],[left+mw+pad-bw, left+mw+pad]].forEach(([x0,x1]) => {
    const isLeft = x1 < cx;
    ctx.beginPath();
    ctx.moveTo(isLeft?x1:x0, top-pad); ctx.lineTo(isLeft?x0:x1, top-pad);
    ctx.lineTo(isLeft?x0:x1, top+mh+pad); ctx.lineTo(isLeft?x1:x0, top+mh+pad);
    ctx.stroke();
  });
  ctx.restore();
}

function doodleAtom(ctx, cx, cy, r, ts, fade) {
  ctx.save();
  ctx.globalAlpha = 0.85*fade; ctx.fillStyle = "#ffe033";
  ctx.shadowColor = "#ffe033"; ctx.shadowBlur = 12;
  ctx.beginPath(); ctx.arc(cx, cy, r*0.16, 0, Math.PI*2); ctx.fill();
  [0, Math.PI/3, -Math.PI/3].forEach((tilt, idx) => {
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(tilt);
    ctx.globalAlpha = 0.30*fade; ctx.strokeStyle = "#ffe033";
    ctx.lineWidth = 1; ctx.shadowColor = "#ffe033"; ctx.shadowBlur = 3;
    ctx.beginPath(); ctx.ellipse(0, 0, r, r*0.32, 0, 0, Math.PI*2); ctx.stroke();
    const ea = ts*0.0015 + idx*(Math.PI*2/3);
    ctx.globalAlpha = 0.9*fade; ctx.fillStyle = "#ff6ec7";
    ctx.shadowColor = "#ff6ec7"; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(r*Math.cos(ea), r*0.32*Math.sin(ea), r*0.09, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  });
  ctx.restore();
}

function doodleFibonacci(ctx, cx, cy, r, fade) {
  ctx.save();
  ctx.globalAlpha = 0.65*fade; ctx.strokeStyle = "#ff9d00";
  ctx.lineWidth = 1.5; ctx.shadowColor = "#ff9d00"; ctx.shadowBlur = 6;
  ctx.beginPath();
  const b=0.25, a=r*0.05;
  for (let i = 0; i <= 320; i++) {
    const theta = (i/320)*Math.PI*4, rad = a*Math.exp(b*theta);
    if (rad > r) break;
    i===0 ? ctx.moveTo(cx+rad*Math.cos(theta), cy+rad*Math.sin(theta))
          : ctx.lineTo(cx+rad*Math.cos(theta), cy+rad*Math.sin(theta));
  }
  ctx.stroke();
  ctx.restore();
}

function doodleVenn(ctx, cx, cy, r, fade) {
  ctx.save();
  const off=r*0.55, color="#ff6ec7";
  ctx.globalAlpha = 0.18*fade; ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(cx-off*0.5, cy, r, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx+off*0.5, cy, r, 0, Math.PI*2); ctx.fill();
  ctx.globalAlpha = 0.55*fade; ctx.strokeStyle = color;
  ctx.lineWidth = 1.5; ctx.shadowColor = color; ctx.shadowBlur = 6;
  ctx.beginPath(); ctx.arc(cx-off*0.5, cy, r, 0, Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx+off*0.5, cy, r, 0, Math.PI*2); ctx.stroke();
  ctx.restore();
}

function doodleTriangle(ctx, cx, cy, size, fade) {
  ctx.save();
  const h=size*0.5, color="#ffe033";
  const pts = [[cx-h, cy+h], [cx+h, cy+h], [cx-h, cy-h]];
  ctx.globalAlpha = 0.7*fade; ctx.strokeStyle = color;
  ctx.lineWidth = 1.8; ctx.shadowColor = color; ctx.shadowBlur = 7;
  ctx.beginPath(); ctx.moveTo(...pts[0]); ctx.lineTo(...pts[1]); ctx.lineTo(...pts[2]); ctx.closePath(); ctx.stroke();
  const sq=size*0.12, [bx,by]=pts[0];
  ctx.globalAlpha = 0.5*fade; ctx.lineWidth = 1.2; ctx.shadowBlur = 4;
  ctx.beginPath(); ctx.moveTo(bx+sq,by); ctx.lineTo(bx+sq,by-sq); ctx.lineTo(bx,by-sq); ctx.stroke();
  ctx.globalAlpha = 0.45*fade; ctx.lineWidth = 1; ctx.shadowBlur = 3;
  ctx.beginPath(); ctx.arc(pts[1][0], pts[1][1], size*0.18, Math.PI, Math.PI+Math.PI/4); ctx.stroke();
  ctx.restore();
}

function doodleStar(ctx, cx, cy, r, fade) {
  ctx.save();
  ctx.globalAlpha = 0.55*fade; ctx.strokeStyle = "#ffe033";
  ctx.lineWidth = 1.5; ctx.shadowColor = "#ffe033"; ctx.shadowBlur = 8;
  ctx.fillStyle = "rgba(255,224,51,0.08)";
  const inner = r*0.38;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a=(i/10)*Math.PI*2 - Math.PI/2, rad=i%2===0?r:inner;
    i===0 ? ctx.moveTo(cx+rad*Math.cos(a), cy+rad*Math.sin(a))
          : ctx.lineTo(cx+rad*Math.cos(a), cy+rad*Math.sin(a));
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function doodleNumberLine(ctx, cx, cy, lw, fade) {
  ctx.save();
  const color = "#c77dff";
  ctx.globalAlpha = 0.6*fade; ctx.strokeStyle = color;
  ctx.lineWidth = 1.5; ctx.shadowColor = color; ctx.shadowBlur = 5;
  ctx.beginPath(); ctx.moveTo(cx-lw/2, cy); ctx.lineTo(cx+lw/2, cy); ctx.stroke();
  const ar=5; ctx.beginPath();
  ctx.moveTo(cx+lw/2,cy); ctx.lineTo(cx+lw/2-ar,cy-3);
  ctx.moveTo(cx+lw/2,cy); ctx.lineTo(cx+lw/2-ar,cy+3);
  ctx.moveTo(cx-lw/2,cy); ctx.lineTo(cx-lw/2+ar,cy-3);
  ctx.moveTo(cx-lw/2,cy); ctx.lineTo(cx-lw/2+ar,cy+3);
  ctx.stroke();
  ctx.globalAlpha = 0.5*fade; ctx.lineWidth = 1; ctx.shadowBlur = 3;
  ctx.fillStyle = color; ctx.font = `600 10px 'Caveat', cursive`;
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  for (let v = -2; v <= 2; v++) {
    const x = cx + v*(lw/4);
    ctx.beginPath(); ctx.moveTo(x, cy-(v===0?7:5)); ctx.lineTo(x, cy+(v===0?7:5)); ctx.stroke();
    ctx.fillText(String(v), x, cy+8);
  }
  ctx.restore();
}

function doodleRocket(ctx, cx, cy, rh, ts, fade) {
  const bw = rh * 0.32;   // body half-width
  const bodyTop = cy - rh * 0.46;
  const bodyBot = cy + rh * 0.18;
  const noseH   = rh * 0.38;
  const finH    = rh * 0.26;
  const finW    = bw * 1.6;
  ctx.save();

  // Fins
  ctx.globalAlpha = 0.55 * fade;
  ctx.strokeStyle = "#FF7043"; ctx.fillStyle = "rgba(255,112,67,0.18)";
  ctx.lineWidth = 1.3; ctx.shadowColor = "#FF7043"; ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.moveTo(cx - bw, bodyBot - finH);
  ctx.lineTo(cx - bw - finW, bodyBot + rh * 0.10);
  ctx.lineTo(cx - bw, bodyBot);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + bw, bodyBot - finH);
  ctx.lineTo(cx + bw + finW, bodyBot + rh * 0.10);
  ctx.lineTo(cx + bw, bodyBot);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Body
  ctx.globalAlpha = 0.50 * fade;
  ctx.fillStyle = "rgba(255,112,67,0.15)"; ctx.strokeStyle = "#FF7043";
  ctx.lineWidth = 1.5; ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(cx - bw, bodyBot);
  ctx.lineTo(cx - bw, bodyTop);
  ctx.quadraticCurveTo(cx - bw, bodyTop - noseH * 0.4, cx, bodyTop - noseH);
  ctx.quadraticCurveTo(cx + bw, bodyTop - noseH * 0.4, cx + bw, bodyTop);
  ctx.lineTo(cx + bw, bodyBot);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Porthole
  ctx.globalAlpha = 0.70 * fade;
  ctx.strokeStyle = "#FFD740"; ctx.fillStyle = "rgba(255,215,64,0.18)";
  ctx.lineWidth = 1.2; ctx.shadowColor = "#FFD740"; ctx.shadowBlur = 7;
  ctx.beginPath(); ctx.arc(cx, cy - rh * 0.08, bw * 0.55, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();

  // Animated flame — line-drawing style, open strokes only
  const flicker  = 0.85 + 0.15 * Math.sin(ts * 0.014);
  const flicker2 = 0.72 + 0.28 * Math.sin(ts * 0.018 + 1.2);
  const fh = rh * 0.32 * flicker;
  const fw = bw * 0.75;
  // outer flame outline (open at base — no closePath)
  ctx.globalAlpha = 0.80 * fade;
  ctx.strokeStyle = "#FF7043"; ctx.lineWidth = 1.4;
  ctx.shadowColor = "#FF7043"; ctx.shadowBlur = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - fw, bodyBot);
  ctx.quadraticCurveTo(cx - fw * 0.3, bodyBot + fh * 0.5, cx, bodyBot + fh);
  ctx.quadraticCurveTo(cx + fw * 0.3, bodyBot + fh * 0.5, cx + fw, bodyBot);
  ctx.stroke();
  // inner flame line
  ctx.globalAlpha = 0.90 * fade;
  ctx.strokeStyle = "#FFD740"; ctx.lineWidth = 1.1;
  ctx.shadowColor = "#FFD740"; ctx.shadowBlur = 7;
  ctx.beginPath();
  ctx.moveTo(cx - fw * 0.38, bodyBot);
  ctx.quadraticCurveTo(cx, bodyBot + fh * flicker2, cx + fw * 0.38, bodyBot);
  ctx.stroke();
  // a thin centre spike
  ctx.globalAlpha = 0.60 * fade;
  ctx.strokeStyle = "#FFD740"; ctx.lineWidth = 0.8; ctx.shadowBlur = 5;
  ctx.beginPath();
  ctx.moveTo(cx, bodyBot);
  ctx.lineTo(cx, bodyBot + fh * 1.12 * flicker);
  ctx.stroke();

  // Exhaust smoke dots drifting down
  ctx.shadowBlur = 0;
  for (let i = 0; i < 3; i++) {
    const phase = (ts * 0.0012 + i * 0.9) % 1;
    const sy = bodyBot + fh + phase * rh * 0.5;
    const sx = cx + Math.sin(ts * 0.003 + i * 2.1) * bw * 0.4;
    const sr = bw * 0.22 * (1 - phase * 0.5);
    ctx.globalAlpha = 0.25 * (1 - phase) * fade;
    ctx.fillStyle = "#FFB74D";
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function doodleDNA(ctx, cx, cy, gw, gh, ts, fade) {
  const top  = cy - gh / 2;
  const segs = 60;
  const twists = 3.0;
  const off = ts * 0.0007;
  ctx.save();

  // Draw rungs first (behind strands)
  ctx.lineWidth = 0.9; ctx.shadowBlur = 3;
  for (let i = 0; i <= segs; i++) {
    const t  = i / segs;
    const y  = top + t * gh;
    const a1 = t * Math.PI * 2 * twists + off;
    const x1 = cx + (gw / 2) * Math.cos(a1);
    const x2 = cx + (gw / 2) * Math.cos(a1 + Math.PI);
    // only draw rung when strands are close to the "side" plane (nearly crossing)
    const crossness = Math.abs(Math.sin(a1)); // 1 = crossing
    if (crossness > 0.55 && i % 3 === 0) {
      ctx.globalAlpha = crossness * 0.45 * fade;
      ctx.strokeStyle = "#f48fb1"; ctx.shadowColor = "#f48fb1";
      ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
    }
  }

  // Strand A (pink) — draw back-to-front segments
  for (let i = 0; i < segs; i++) {
    const t1 = i / segs, t2 = (i + 1) / segs;
    const a1 = t1 * Math.PI * 2 * twists + off;
    const a2 = t2 * Math.PI * 2 * twists + off;
    const depth = (Math.cos(a1) + 1) * 0.5;
    ctx.globalAlpha = (0.15 + depth * 0.70) * fade;
    ctx.strokeStyle = "#ff6ec7"; ctx.shadowColor = "#ff6ec7";
    ctx.lineWidth   = 0.8 + depth * 1.8;
    ctx.shadowBlur  = 2 + depth * 9;
    ctx.setLineDash(depth < 0.25 ? [2, 3] : []);
    ctx.beginPath();
    ctx.moveTo(cx + (gw / 2) * Math.cos(a1), top + t1 * gh);
    ctx.lineTo(cx + (gw / 2) * Math.cos(a2), top + t2 * gh);
    ctx.stroke();
  }

  // Strand B (cyan) — offset by π
  for (let i = 0; i < segs; i++) {
    const t1 = i / segs, t2 = (i + 1) / segs;
    const a1 = t1 * Math.PI * 2 * twists + off + Math.PI;
    const a2 = t2 * Math.PI * 2 * twists + off + Math.PI;
    const depth = (Math.cos(a1) + 1) * 0.5;
    ctx.globalAlpha = (0.15 + depth * 0.70) * fade;
    ctx.strokeStyle = "#00d4ff"; ctx.shadowColor = "#00d4ff";
    ctx.lineWidth   = 0.8 + depth * 1.8;
    ctx.shadowBlur  = 2 + depth * 9;
    ctx.setLineDash(depth < 0.25 ? [2, 3] : []);
    ctx.beginPath();
    ctx.moveTo(cx + (gw / 2) * Math.cos(a1), top + t1 * gh);
    ctx.lineTo(cx + (gw / 2) * Math.cos(a2), top + t2 * gh);
    ctx.stroke();
  }

  // Travelling highlight dot on each strand
  const tA = ((ts * 0.0004) % 1);
  const aA = tA * Math.PI * 2 * twists + off;
  ctx.setLineDash([]);
  ctx.globalAlpha = 0.90 * fade;
  ctx.fillStyle = "#ff6ec7"; ctx.shadowColor = "#ff6ec7"; ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.arc(cx + (gw / 2) * Math.cos(aA), top + tA * gh, 2.5, 0, Math.PI * 2); ctx.fill();

  const tB = ((ts * 0.0004 + 0.5) % 1);
  const aB = tB * Math.PI * 2 * twists + off + Math.PI;
  ctx.fillStyle = "#00d4ff"; ctx.shadowColor = "#00d4ff";
  ctx.beginPath(); ctx.arc(cx + (gw / 2) * Math.cos(aB), top + tB * gh, 2.5, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

function doodleLightbulb(ctx, cx, cy, r, ts, fade) {
  const baseTop = cy + r * 0.55;
  const baseH   = r * 0.28;
  const baseW   = r * 0.62;
  const filH    = r * 0.35;
  // Pulse glow
  const pulse = 0.80 + 0.20 * Math.sin(ts * 0.004);
  ctx.save();

  // Outer glow halo
  ctx.globalAlpha = 0.10 * pulse * fade;
  const grad = ctx.createRadialGradient(cx, cy - r * 0.1, r * 0.2, cx, cy - r * 0.1, r * 1.55);
  grad.addColorStop(0, "#FFD740"); grad.addColorStop(1, "transparent");
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(cx, cy - r * 0.1, r * 1.55, 0, Math.PI * 2); ctx.fill();

  // Bulb
  ctx.globalAlpha = 0.55 * fade;
  ctx.strokeStyle = "#FFD740"; ctx.lineWidth = 1.5;
  ctx.shadowColor = "#FFD740"; ctx.shadowBlur = 8 + 6 * pulse;
  ctx.fillStyle = `rgba(255,215,64,${0.08 * pulse})`;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // Filament squiggle
  ctx.globalAlpha = 0.80 * pulse * fade;
  ctx.strokeStyle = "#FFD740"; ctx.lineWidth = 1.2; ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(cx - baseW * 0.55, cy + r * 0.25);
  ctx.lineTo(cx - baseW * 0.55, cy + r * 0.25 - filH * 0.4);
  ctx.quadraticCurveTo(cx - baseW * 0.2, cy - filH * 0.2, cx, cy - filH * 0.5);
  ctx.quadraticCurveTo(cx + baseW * 0.2, cy - filH * 0.2, cx + baseW * 0.55, cy + r * 0.25 - filH * 0.4);
  ctx.lineTo(cx + baseW * 0.55, cy + r * 0.25);
  ctx.stroke();

  // Base rings
  ctx.globalAlpha = 0.55 * fade;
  ctx.lineWidth = 1.3; ctx.shadowBlur = 5;
  [0, 1, 2].forEach(i => {
    const by = baseTop + i * (baseH / 2.5);
    const bx = baseW * (1 - i * 0.12);
    ctx.beginPath(); ctx.moveTo(cx - bx, by); ctx.lineTo(cx + bx, by); ctx.stroke();
  });

  // Animated rays
  ctx.lineWidth = 1.0; ctx.shadowBlur = 4;
  const rayCount = 8;
  for (let i = 0; i < rayCount; i++) {
    const a    = (i / rayCount) * Math.PI * 2 + ts * 0.0008;
    const rIn  = r * 1.15;
    const rOut = r * (1.45 + 0.12 * Math.sin(ts * 0.005 + i));
    ctx.globalAlpha = 0.30 * pulse * fade;
    ctx.beginPath();
    ctx.moveTo(cx + rIn  * Math.cos(a), cy + rIn  * Math.sin(a));
    ctx.lineTo(cx + rOut * Math.cos(a), cy + rOut * Math.sin(a));
    ctx.stroke();
  }
  ctx.restore();
}

const _TILE_COLORS = [
  ["#ff6ec7", "rgba(255,110,199,0.20)"],
  ["#39ff14", "rgba(57,255,20,0.20)"],
  ["#ffe033", "rgba(255,224,51,0.20)"],
  ["#00d4ff", "rgba(0,212,255,0.20)"],
  ["#ff9d00", "rgba(255,157,0,0.20)"],
  ["#c77dff", "rgba(199,125,255,0.20)"],
];
const _TILE_NUMS = [
  [3, 7, 2],
  [9, 4, 1],
  [8, 5, 6],
];

function doodleNumtiles(ctx, cx, cy, tw, _ts, fade, order, ci, nums) {
  const cols = 3, rows = 3;
  const gap    = tw * 0.18;
  const totalW = cols * tw + (cols - 1) * gap;
  const totalH = rows * tw + (rows - 1) * gap;
  const left   = cx - totalW / 2;
  const top    = cy - totalH / 2;
  ctx.save();
  ctx.font = `700 ${Math.round(tw * 0.55)}px 'Caveat', cursive`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";

  // Draw tiles in pre-shuffled order (static — no animation)
  for (let i = 0; i < 9; i++) {
    const idx = order[i];
    const r = (idx / cols) | 0, c = idx % cols;
    const [stroke, fill] = _TILE_COLORS[ci[idx]];
    const num = nums[idx];
    const x = left + c * (tw + gap);
    const y = top  + r * (tw + gap);
    const rx = tw * 0.22;

    ctx.globalAlpha = 0.62 * fade;
    ctx.fillStyle   = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth   = 1.3;
    ctx.shadowColor = stroke; ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(x + rx, y);
    ctx.lineTo(x + tw - rx, y);         ctx.arcTo(x + tw, y,      x + tw, y + rx,      rx);
    ctx.lineTo(x + tw, y + tw - rx);    ctx.arcTo(x + tw, y + tw, x + tw - rx, y + tw, rx);
    ctx.lineTo(x + rx, y + tw);         ctx.arcTo(x,      y + tw, x,      y + tw - rx, rx);
    ctx.lineTo(x, y + rx);              ctx.arcTo(x,      y,      x + rx, y,            rx);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    ctx.globalAlpha = 0.85 * fade;
    ctx.fillStyle   = stroke;
    ctx.shadowBlur  = 9;
    ctx.fillText(String(num), x + tw / 2, y + tw / 2);
  }
  ctx.restore();
}

function drawDoodle(ctx, d, ts, fade) {
  const p = d.params;
  switch (d.type) {
    case 'gear':       doodleGear(ctx, d.cx, d.cy, p.r, ts, fade);              break;
    case 'sine':       doodleSineGraph(ctx, d.cx, d.cy, p.gw, p.gh, ts, fade); break;
    case 'helix':      doodleHelix(ctx, d.cx, d.cy, p.gw, p.gh, ts, fade);     break;
    case 'matrix':     doodleMatrix(ctx, d.cx, d.cy, p.cw, p.ch, fade);        break;
    case 'atom':       doodleAtom(ctx, d.cx, d.cy, p.r, ts, fade);             break;
    case 'fibonacci':  doodleFibonacci(ctx, d.cx, d.cy, p.r, fade);            break;
    case 'venn':       doodleVenn(ctx, d.cx, d.cy, p.r, fade);                 break;
    case 'triangle':   doodleTriangle(ctx, d.cx, d.cy, p.size, fade);          break;
    case 'star':       doodleStar(ctx, d.cx, d.cy, p.r, fade);                 break;
    case 'numberLine': doodleNumberLine(ctx, d.cx, d.cy, p.lw, fade);          break;
    case 'rocket':     doodleRocket(ctx, d.cx, d.cy, p.rh, ts, fade);         break;
    case 'dna':        doodleDNA(ctx, d.cx, d.cy, p.gw, p.gh, ts, fade);      break;
    case 'lightbulb':  doodleLightbulb(ctx, d.cx, d.cy, p.r, ts, fade);       break;
    case 'numtiles':   doodleNumtiles(ctx, d.cx, d.cy, p.tw, ts, fade, p.order, p.ci, p.nums); break;
  }
}

// ── Orchestration ─────────────────────────────────────────────────────────────
function showHomeLightboard() {
  const sec = document.getElementById("home-lightboard-section");
  if (sec) sec.style.display = "";

  if (homeLbAnimId) { cancelAnimationFrame(homeLbAnimId); homeLbAnimId = null; }
  if (homeLbMutateTimer) { clearTimeout(homeLbMutateTimer); homeLbMutateTimer = null; }
  homeLbStar = null; homeLbFw = null; homeLbStars = []; homeLbStartTs = null;

  const canvas = document.getElementById("home-lb-canvas");
  const lb     = document.getElementById("home-lightboard");
  if (!canvas || !lb) return;

  canvas.width  = lb.offsetWidth  || 640;
  canvas.height = lb.offsetHeight || 300;
  const w = canvas.width, h = canvas.height;

  homeLbCfg = homeLbBuildCfg(w, h);
  const cfg = homeLbCfg;

  const doodleReserved = () => cfg.doodles.map(d => {
    const sz = DOODLE_PCT[d.type];
    return { cx: d.pctCX, cy: d.pctCY, rw: sz.rw * 1.4, rh: sz.rh * 1.4 };
  });

  const poolOrder = HOME_LB_POOL.map((_, i) => i).sort(() => Math.random() - 0.5);
  const count     = 9 + Math.floor(Math.random() * 4);
  // Pick styles first so widthPct is available for right-edge-aware placement
  const selIdx    = poolOrder.slice(0, count);
  const selected  = selIdx.map(i => HOME_LB_POOL[i]);
  const styles    = selected.map(item => homeLbPickStyle(item.text));
  const positions = homeLbRandomPositions(styles, doodleReserved());
  const actual    = positions.length;

  // Unified shuffled timeline for text + doodles
  const textEntries   = selected.slice(0, actual).map((item, i) => ({
    kind: "text", item, pos: positions[i], delay: 0, poolIdx: selIdx[i],
    fontFamily: styles[i].family, fontWeight: styles[i].weight, fontSize: styles[i].size,
  }));
  const doodleEntries = cfg.doodles.map(d => ({ kind: "doodle", d }));
  const allEntries    = [...textEntries, ...doodleEntries].sort(() => Math.random() - 0.5);
  let t = 1 + Math.random() * 2;
  allEntries.forEach(entry => {
    if (entry.kind === "text") { entry.delay = t; }
    else                       { entry.d.showMs = t * 1000; }
    t += 3 + Math.random() * 4;
  });

  const surface = document.getElementById("home-lb-surface");
  if (!surface) return;
  surface.innerHTML = "";

  // Active item tracking for mutation
  const activeItems = [];
  const usedPool    = new Set(selIdx.slice(0, actual));

  function makeTextEl(item, pos, delaySec, fontFamily, fontWeight, fontSize) {
    const el = document.createElement("div");
    el.className    = "home-lb-item";
    el.textContent  = item.text + " ";
    el.style.left   = pos.x.toFixed(1) + "%";
    el.style.top    = pos.y.toFixed(1) + "%";
    el.style.color  = item.color;
    el.style.textShadow  = `0 0 8px ${item.glow}, 0 0 18px ${item.glow}`;
    el.style.fontFamily  = fontFamily + ", cursive";
    el.style.fontWeight  = fontWeight;
    el.style.fontSize    = fontSize + "px";
    el.style.animationDelay = delaySec.toFixed(2) + "s";
    return el;
  }

  textEntries.forEach(({ item, pos, delay, fontFamily, fontWeight, fontSize, poolIdx }) => {
    const el = makeTextEl(item, pos, delay, fontFamily, fontWeight, fontSize);
    surface.appendChild(el);
    activeItems.push({ item, pos, el, poolIdx });
  });

  // ── Mutation: continuously add/remove text items ──────────────────────────
  function addItem() {
    const available = HOME_LB_POOL.map((_, i) => i).filter(i => !usedPool.has(i));
    if (!available.length) return;
    const poolIdx = available[Math.floor(Math.random() * available.length)];
    const item    = HOME_LB_POOL[poolIdx];
    const style   = homeLbPickStyle(item.text);
    const spots   = homeLbRandomPositions([style], doodleReserved(), activeItems.map(a => a.pos));
    if (!spots.length) return;
    const pos = spots[0];
    const el  = makeTextEl(item, pos, 0, style.family, style.weight, style.size);
    surface.appendChild(el);
    activeItems.push({ item, pos, el, poolIdx });
    usedPool.add(poolIdx);
  }

  function removeItem() {
    if (activeItems.length <= 4) return;
    const idx = Math.floor(Math.random() * activeItems.length);
    const { el, poolIdx } = activeItems.splice(idx, 1)[0];
    usedPool.delete(poolIdx);
    el.style.transition = "opacity 1.8s ease";
    el.style.opacity    = "0";
    setTimeout(() => el.remove(), 1800);
  }

  function scheduleMutation() {
    homeLbMutateTimer = setTimeout(() => {
      if (Math.random() < 0.6 || activeItems.length < 5) addItem();
      else removeItem();
      scheduleMutation();
    }, 6000 + Math.random() * 9000);
  }
  scheduleMutation();

  // ── Animation frame ───────────────────────────────────────────────────────
  let fwNext = Infinity;

  function frame(ts) {
    homeLbAnimId = requestAnimationFrame(frame);
    if (!homeLbStartTs) { homeLbStartTs = ts; fwNext = ts + 4500; }
    const elapsed = ts - homeLbStartTs;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, w, h);

    cfg.doodles.forEach(d => {
      const fade = Math.min(1, Math.max(0, (elapsed - d.showMs) / 2500));
      if (fade > 0) drawDoodle(ctx, d, ts, fade);
    });

    if (!homeLbFw && ts >= fwNext) { homeLbFw = homeLbNewFw(w, h); fwNext = ts + 9000 + Math.random() * 5000; }
    if (homeLbFw && homeLbTickFw(ctx, homeLbFw, ts)) homeLbFw = null;
  }

  homeLbAnimId = requestAnimationFrame(frame);
}

function hideHomeLightboard() {
  const sec = document.getElementById("home-lightboard-section");
  if (sec) sec.style.display = "none";
  if (homeLbAnimId) { cancelAnimationFrame(homeLbAnimId); homeLbAnimId = null; }
  if (homeLbMutateTimer) { clearTimeout(homeLbMutateTimer); homeLbMutateTimer = null; }
  homeLbStar = null;
  homeLbFw   = null;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener("DOMContentLoaded", () => {
  // Global ghost-click canceller
  document.addEventListener(
    "click",
    (ev) => {
      if (Date.now() < suppressClickUntil) {
        ev.preventDefault();
        ev.stopPropagation();
      }
    },
    true
  );

  // Button event listeners
  const menuBtn = document.getElementById("menuBtn");
  if (menuBtn) menuBtn.addEventListener("click", showMenu);

  const resetBtn = document.getElementById("resetBtn");
  if (resetBtn) resetBtn.addEventListener("click", resetSlots);

  const newBtn = document.getElementById("newBtn");
  if (newBtn) newBtn.addEventListener("click", newPuzzle);

  // Mode selection
  const practiceBtn = document.getElementById("practiceBtn");
  if (practiceBtn) practiceBtn.addEventListener("click", startPracticeMode);

  const rush3Btn = document.getElementById("rush3Btn");
  if (rush3Btn) rush3Btn.addEventListener("click", () => startRushMode(3));

  const rush5Btn = document.getElementById("rush5Btn");
  if (rush5Btn) rush5Btn.addEventListener("click", () => startRushMode(5));

  const endRushBtn = document.getElementById("endRushBtn");
  if (endRushBtn) {
    endRushBtn.addEventListener("click", () => {
      if (confirm("End this rush session?")) endRushMode();
    });
  }

  const rushReadyBtn = document.getElementById("rushReadyBtn");
  if (rushReadyBtn) {
    rushReadyBtn.addEventListener("click", () => {
      document.getElementById("rush-ready-modal").style.display = "none";
      rushStarted = true;
      rushIntroPlaying = false;
      startTimer();
    });
  }

  // Modal buttons
  const playAgainBtn = document.getElementById("playAgainBtn");
  if (playAgainBtn) {
    playAgainBtn.addEventListener("click", () => {
      const was3Min = gameMode === "rush3";
      startRushMode(was3Min ? 3 : 5, true);
    });
  }

  const backToMenuBtn = document.getElementById("backToMenuBtn");
  if (backToMenuBtn) backToMenuBtn.addEventListener("click", showMenu);

  // X button and click-outside both dismiss the game-over modal
  const gameOverModal = document.getElementById("modal");
  if (gameOverModal) {
    gameOverModal.addEventListener("click", (ev) => {
      if (ev.target === gameOverModal) dismissRushModal();
    });
  }

  const modalCloseBtn = document.getElementById("modalCloseBtn");
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", dismissRushModal);
  }

  // Share / download lightboard
  const shareBtn = document.getElementById("shareBtn");
  if (shareBtn) {
    shareBtn.addEventListener("click", async () => {
      shareBtn.disabled = true;
      try {
        const blob = currentShareBlob || await captureShareBlob();
        if (!blob) { shareBtn.disabled = false; return; }

        const file = new File([blob], "arithmix-lightboard.png", { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({
            text: `Play ARITHMIX! ${GAME_URL}`,
            files: [file],
          }).catch(() => {});
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "arithmix-lightboard.png";
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 10000);
        }
        shareBtn.disabled = false;
      } catch {
        shareBtn.disabled = false;
      }
    });
  }

  // Template area drag/drop
  const template = document.getElementById("template-area");
  if (template) {
    template.ondragover = (ev) => ev.preventDefault();
    template.ondrop = handleDropOnTemplate;
  }

  // Bank area drag/drop
  const bank = document.getElementById("bank");
  if (bank) {
    bank.ondragover = (ev) => ev.preventDefault();
    bank.ondrop = (ev) => {
      ev.preventDefault();
      const dragged = getDragged(ev);
      if (!dragged) return;
      bank.appendChild(dragged);
      updateControls();
    };
  }

  // Click-to-place on desktop only (not touch devices)
  const isTouch = Number(navigator.maxTouchPoints) > 0;
  if (!isTouch && bank) {
    bank.addEventListener("click", (ev) => {
      const item = ev.target.closest(".bank-item");
      if (!item) return;
      if (pointerState) return;

      const next = findNextEmptySlot();
      if (!next) return;
      animateSnapAndPlace(item, next);
    });
  }

  

  // Start with menu only (no puzzle)
  showMenu();
});