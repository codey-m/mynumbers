// ============================================================================
// RUSH MODE UTILITIES
// ============================================================================

function calculateDifficulty(solved) {
  if (solved <= 1)  return 1;  // puzzle 1
  if (solved <= 2)  return 2;  // puzzle 2
  if (solved <= 4)  return 3;  // puzzles 3–4
  if (solved <= 6)  return 4;  // puzzles 5–6
  if (solved <= 8)  return 5;  // puzzles 7–8
  if (solved <= 10) return 6;  // puzzles 9–10
  if (solved <= 12) return 7;  // puzzles 11–12
  if (solved <= 13) return 8;  // puzzle 13
  if (solved <= 14) return 9;  // puzzle 14
  if (solved <= 15) return 10; // puzzle 15
  if (solved <= 16) return 11; // rare
  return 12;                   // exceptional
}

function setBankAreaVisible(visible) {
  const el = document.getElementById("bankArea");
  if (!el) return;
  el.style.display = visible ? "" : "none";
}

function showMenu() {
  // Mark this shared-route entry as menu state. Idempotent — only writes
  // when the marker isn't already correct, so refresh / repeated calls
  // don't churn the history stack.
  if (history.state?.arithmix !== "menu") {
    history.replaceState({ arithmix: "menu" }, "", "/");
  }

  window.logoCycle?.startAccentCycle();

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
  // Mark this shared-route entry as game state. If the user clicks Inside
  // ARITHMIX from here, the Inside-link handler overwrites this back to
  // 'menu' so the entry behind /explainer always represents menu.
  history.replaceState({ arithmix: "game" }, "", "/");

  window.logoCycle?.stopAccentCycle();

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
  // See note in startPracticeMode() — same state-marker policy.
  history.replaceState({ arithmix: "game" }, "", "/");

  skipIntroAnimation = skipIntro;
  window.logoCycle?.stopAccentCycle();

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
