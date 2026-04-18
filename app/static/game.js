console.log("game.js v28 loaded - Rush Mode Edition");

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
let rushStarted = false;

// Lightboard
let lightboardZoneIndex = 0;
let lightboardShuffledZones = [];

// 5 rows × 3 columns of pre-defined positions (left%, top%)
// Shuffled at the start of each rush so the fill pattern is different every game
const LIGHTBOARD_ZONES = [
  [2, 5],  [36, 5],  [68, 5],
  [2, 24], [36, 24], [68, 24],
  [2, 43], [36, 43], [68, 43],
  [2, 62],           [68, 62],   // center omitted — Tim occupies bottom-center
  [2, 80],           [68, 80],   // center omitted — Tim occupies bottom-center
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

let suppressClickUntil = 0;
let pointerState = null;
let scrollLocked = false;

// ============================================================================
// RUSH MODE UTILITIES
// ============================================================================

function calculateDifficulty(solved) {
  // Progressive difficulty: every 3 puzzles increases level
  return Math.min(6, Math.floor(solved / 3) + 1);
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

function startRushMode(minutes) {
  gameMode = minutes === 3 ? "rush3" : "rush5";
  hideHomeLightboard();

  const menuBtn = document.getElementById("menuBtn");
  if (menuBtn) menuBtn.style.display = "none";

  puzzlesSolved = 0;
  currentDifficulty = 1;
  maxDifficultyReached = 1;
  timeRemaining = minutes * 60;
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

function endRushMode() {
  if (rushTimer) {
    clearInterval(rushTimer);
    rushTimer = null;
  }

  document.getElementById("rush-ready-modal").style.display = "none";
  document.getElementById("lightboard-section").querySelector(".lightboard-tim").style.display = "none";
  rushIntroPlaying = false;

  const puzzlesSolvedEl = document.getElementById("puzzlesSolved");
  if (puzzlesSolvedEl) puzzlesSolvedEl.textContent = String(puzzlesSolved);

  const timImg = document.getElementById("tim-img");
  if (timImg) {
    timImg.src = puzzlesSolved >= 5
      ? "/static/images/tim-wave.svg"
      : "/static/images/tim-front.svg";
  }

  showModal();
}
function showModal() {
  const modal = document.getElementById("modal");
  if (modal) modal.style.display = "flex";
}

function hideModal() {
  const modal = document.getElementById("modal");
  if (modal) modal.style.display = "none";
}

function dismissRushModal() {
  hideModal();
  // Restore Tim to lightboard
  const timEl = document.querySelector("#lightboard-section .lightboard-tim");
  if (timEl) timEl.style.display = "";
  // Swap End Rush → Menu now that rush is over
  document.getElementById("endRushBtn").style.display = "none";
  document.getElementById("menuBtn").style.display = "inline-block";
  // Reveal the share icon now that the game is over and modal is gone
  const shareBtn = document.getElementById("shareBtn");
  if (shareBtn) shareBtn.style.display = "";
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
        if (!rushStarted) playWrongFillAnimation();
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

  const zone = lightboardShuffledZones[lightboardZoneIndex % lightboardShuffledZones.length];
  const palette = LIGHTBOARD_COLORS[lightboardZoneIndex % LIGHTBOARD_COLORS.length];
  lightboardZoneIndex++;

  const el = document.createElement("div");
  el.className = "lightboard-eq";
  el.textContent = expr;
  el.style.left = zone[0] + "%";
  el.style.top = zone[1] + "%";
  el.style.color = palette.color;
  el.style.textShadow = `0 0 8px ${palette.glow}, 0 0 18px ${palette.glow}`;
  surface.appendChild(el);
}

function clearLightboard() {
  const surface = document.getElementById("lightboard-surface");
  if (surface) surface.innerHTML = "";
  lightboardZoneIndex = 0;
  lightboardShuffledZones = [...LIGHTBOARD_ZONES].sort(() => Math.random() - 0.5);
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
    setTimeout(() => animateSnapAndPlace(shuffledItems[i], shuffledSlots[i], INTRO_ANIM_MS), delays[i]);
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
      if (!rushStarted) {
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

const HOME_LB_ITEMS = [
  // top band — full width
  { text: "e^(iπ) + 1 = 0", x:  2, y:  4, color: "#ff6ec7", glow: "rgba(255,110,199,0.5)" },
  { text: "π ≈ 3.14159",     x: 60, y:  4, color: "#00d4ff", glow: "rgba(0,212,255,0.5)"   },
  // second band — center + right (left reserved for graph ~x:10–24%)
  { text: "E = mc²",         x: 36, y: 15, color: "#ffe033", glow: "rgba(255,224,51,0.5)"  },
  { text: "√2 ≈ 1.414",      x: 64, y: 23, color: "#ff9d00", glow: "rgba(255,157,0,0.5)"   },
  // third band
  { text: "F = ma",          x: 27, y: 31, color: "#39ff14", glow: "rgba(57,255,20,0.5)"   },
  { text: "Est. 1861",       x: 55, y: 37, color: "#c77dff", glow: "rgba(199,125,255,0.5)" },
  // fourth band — just above Tim (top ≤ 41%)
  { text: "∑ 1/n² = π²/6",  x: 27, y: 43, color: "#00d4ff", glow: "rgba(0,212,255,0.5)"   },
  // bottom-left safe column (clear of Tim's centre)
  { text: "Mens et Manus",   x:  2, y: 60, color: "#ff6ec7", glow: "rgba(255,110,199,0.5)" },
  { text: "ℏω = E",          x:  2, y: 76, color: "#ffe033", glow: "rgba(255,224,51,0.5)"  },
];

let homeLbAnimId  = null;
let homeLbStars   = [];
let homeLbStar    = null;    // active shooting star
let homeLbFw      = null;    // active firework
let homeLbGearAng = 0;

// ── Stars ──────────────────────────────────────────────────────────────────
function homeLbMakeStars(w, h) {
  // Fixed fractional positions in safe zones (avoiding Tim's bottom-center 50%)
  const pts = [
    [0.05,0.08],[0.28,0.06],[0.50,0.15],[0.72,0.10],[0.92,0.08],
    [0.15,0.22],[0.45,0.28],[0.65,0.30],[0.85,0.24],[0.20,0.34],
    [0.04,0.58],[0.10,0.76],[0.07,0.88],               // bottom-left
    [0.88,0.60],[0.94,0.76],[0.91,0.88],[0.80,0.82],   // bottom-right
  ];
  return pts.map(([px,py], i) => ({
    x: px * w, y: py * h,
    phase: (i / pts.length) * Math.PI * 2,
    size: 1.5 + (i % 3) * 0.65,
  }));
}

function homeLbDrawStars(ctx, ts) {
  homeLbStars.forEach(s => {
    const alpha = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(ts * 0.0018 + s.phase));
    const r     = s.size * (0.85 + 0.15 * Math.sin(ts * 0.003 + s.phase + 1));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = "#fff";
    ctx.shadowColor = "#ffe033";
    ctx.shadowBlur  = 4;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a   = (i / 8) * Math.PI * 2;
      const rad = i % 2 === 0 ? r : r * 0.35;
      i === 0
        ? ctx.moveTo(s.x + rad * Math.cos(a), s.y + rad * Math.sin(a))
        : ctx.lineTo(s.x + rad * Math.cos(a), s.y + rad * Math.sin(a));
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });
}

// ── Shooting star ───────────────────────────────────────────────────────────
function homeLbNewStar(w, h) {
  return {
    x: w * (0.02 + Math.random() * 0.22),
    y: h * (0.03 + Math.random() * 0.22),
    vx: w * 0.00055, vy: h * 0.00018,
    trail: [], start: null, dur: 2000,
  };
}

function homeLbTickStar(ctx, s, ts) {
  if (!s.start) s.start = ts;
  const t = (ts - s.start) / s.dur;
  if (t >= 1) return true;
  s.x += s.vx; s.y += s.vy;
  s.trail.push({ x: s.x, y: s.y });
  if (s.trail.length > 28) s.trail.shift();
  const alpha = t < 0.12 ? t / 0.12 : t > 0.75 ? (1 - t) / 0.25 : 1;
  s.trail.forEach((p, i) => {
    const tf = i / s.trail.length;
    ctx.save(); ctx.globalAlpha = alpha * tf * 0.55;
    ctx.fillStyle = "#ffe033";
    ctx.beginPath(); ctx.arc(p.x, p.y, tf * 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.fillStyle = "#fff"; ctx.shadowColor = "#ffe033"; ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.arc(s.x, s.y, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  return false;
}

// ── Firework ────────────────────────────────────────────────────────────────
const FW_COLORS = ["#ff1423","#ff6ec7","#ffe033","#00d4ff","#c77dff","#39ff14","#ff9d00"];

function homeLbNewFw(w, h) {
  const left = Math.random() > 0.5;
  const sx = left ? w * 0.07 : w * 0.93;
  const ex = sx + (left ? 1 : -1) * w * (0.04 + Math.random() * 0.10);
  const ey = h * (0.10 + Math.random() * 0.28);
  return { phase:"launch", sx, x:sx, y:h, ex, ey, start:null, launchMs:900, explodeAt:null, particles:[] };
}

function homeLbTickFw(ctx, fw, ts) {
  if (!fw.start) fw.start = ts;
  if (fw.phase === "launch") {
    const p = Math.min((ts - fw.start) / fw.launchMs, 1);
    fw.x = fw.sx + (fw.ex - fw.sx) * p;
    fw.y = fw.y + (fw.ey - fw.y) * (p < 1 ? 0.08 : 1); // ease up
    ctx.save(); ctx.globalAlpha = 0.9;
    ctx.fillStyle = "#fff"; ctx.shadowColor = "#fff"; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(fw.x, fw.y, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (p >= 1) {
      fw.phase = "explode"; fw.explodeAt = ts;
      fw.x = fw.ex; fw.y = fw.ey;
      for (let i = 0; i < 32; i++) {
        const a   = (i / 32) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
        const spd = 1 + Math.random() * 2.2;
        fw.particles.push({
          x: fw.x, y: fw.y,
          vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
          color: FW_COLORS[i % FW_COLORS.length],
          r: 1.5 + Math.random() * 1.5,
        });
      }
    }
  } else {
    const elapsed = ts - fw.explodeAt, dur = 2300, p = elapsed / dur;
    if (p >= 1) return true;
    fw.particles.forEach(pt => {
      pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.05;
      ctx.save(); ctx.globalAlpha = 1 - p;
      ctx.fillStyle = pt.color; ctx.shadowColor = pt.color; ctx.shadowBlur = 5;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r * (1 - p * 0.5), 0, Math.PI * 2);
      ctx.fill(); ctx.restore();
    });
  }
  return false;
}

// ── Sine-wave graph ─────────────────────────────────────────────────────────
function homeLbDrawGraph(ctx, cx, cy, gw, gh, ts) {
  ctx.save();

  // Axes
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = "#39ff14";
  ctx.lineWidth   = 1.3;
  ctx.shadowColor = "#39ff14";
  ctx.shadowBlur  = 5;

  // x-axis
  ctx.beginPath();
  ctx.moveTo(cx - gw / 2, cy);
  ctx.lineTo(cx + gw / 2, cy);
  ctx.stroke();

  // y-axis
  ctx.beginPath();
  ctx.moveTo(cx, cy - gh / 2);
  ctx.lineTo(cx, cy + gh / 2);
  ctx.stroke();

  // Arrow tips
  const ar = 5;
  ctx.beginPath();
  ctx.moveTo(cx + gw / 2, cy);
  ctx.lineTo(cx + gw / 2 - ar, cy - 3);
  ctx.moveTo(cx + gw / 2, cy);
  ctx.lineTo(cx + gw / 2 - ar, cy + 3);
  ctx.moveTo(cx, cy - gh / 2);
  ctx.lineTo(cx - 3, cy - gh / 2 + ar);
  ctx.moveTo(cx, cy - gh / 2);
  ctx.lineTo(cx + 3, cy - gh / 2 + ar);
  ctx.stroke();

  // Scrolling sine wave
  const phase = ts * 0.001;
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = "#ff6ec7";
  ctx.lineWidth   = 2;
  ctx.shadowColor = "#ff6ec7";
  ctx.shadowBlur  = 7;
  ctx.beginPath();
  const segs = 80;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const x = cx - gw / 2 + 4 + t * (gw - 8);
    const y = cy - (gh / 2 - 7) * Math.sin(t * Math.PI * 2 + phase);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Axis tick marks
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = "#39ff14";
  ctx.lineWidth   = 1;
  ctx.shadowBlur  = 0;
  [0.25, 0.5, 0.75].forEach(f => {
    const xp = cx - gw / 2 + f * gw;
    ctx.beginPath(); ctx.moveTo(xp, cy - 3); ctx.lineTo(xp, cy + 3); ctx.stroke();
  });
  [-0.35, 0.35].forEach(f => {
    const yp = cy + f * gh;
    ctx.beginPath(); ctx.moveTo(cx - 3, yp); ctx.lineTo(cx + 3, yp); ctx.stroke();
  });

  ctx.restore();
}

// ── Matrix ───────────────────────────────────────────────────────────────────
function homeLbDrawMatrix(ctx, cx, cy, cellW, cellH) {
  const vals = [[2, -1, 0], [-1, 2, -1], [0, -1, 2]];
  const cols = vals[0].length, rows = vals.length;
  const mw = cellW * cols, mh = cellH * rows;
  const left = cx - mw / 2, top = cy - mh / 2;

  ctx.save();
  ctx.globalAlpha = 0.78;
  ctx.fillStyle   = "#c77dff";
  ctx.shadowColor = "#c77dff";
  ctx.shadowBlur  = 8;
  ctx.font        = `600 ${Math.round(cellH * 0.72)}px 'Caveat', cursive`;
  ctx.textAlign   = "center";
  ctx.textBaseline = "middle";

  vals.forEach((row, r) =>
    row.forEach((v, c) =>
      ctx.fillText(v, left + c * cellW + cellW / 2, top + r * cellH + cellH / 2)
    )
  );

  // Square brackets
  ctx.strokeStyle = "#c77dff";
  ctx.lineWidth   = 2;
  ctx.shadowBlur  = 6;
  const bw = 7, pad = 4;
  [[left - pad, left - pad + bw], [left + mw + pad - bw, left + mw + pad]].forEach(([x0, x1]) => {
    const isLeft = x1 < cx;
    ctx.beginPath();
    ctx.moveTo(isLeft ? x1 : x0, top - pad);
    ctx.lineTo(isLeft ? x0 : x1, top - pad);
    ctx.lineTo(isLeft ? x0 : x1, top + mh + pad);
    ctx.lineTo(isLeft ? x1 : x0, top + mh + pad);
    ctx.stroke();
  });

  ctx.restore();
}

// ── Gear ────────────────────────────────────────────────────────────────────
function homeLbDrawGear(ctx, cx, cy, r, angle) {
  const teeth = 8, inner = r * 0.68, tooth = r * 0.38, hole = r * 0.28;
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(angle);
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = "#c77dff"; ctx.fillStyle = "rgba(199,125,255,0.12)";
  ctx.lineWidth = 1.5; ctx.shadowColor = "#c77dff"; ctx.shadowBlur = 7;
  ctx.beginPath();
  for (let i = 0; i < teeth; i++) {
    const a1 = (i / teeth) * Math.PI * 2,        a2 = ((i + 0.4) / teeth) * Math.PI * 2,
          a3 = ((i + 0.6) / teeth) * Math.PI * 2, a4 = ((i + 1)   / teeth) * Math.PI * 2;
    ctx.lineTo(Math.cos(a1) * inner,        Math.sin(a1) * inner);
    ctx.lineTo(Math.cos(a2) * (inner+tooth), Math.sin(a2) * (inner+tooth));
    ctx.lineTo(Math.cos(a3) * (inner+tooth), Math.sin(a3) * (inner+tooth));
    ctx.lineTo(Math.cos(a4) * inner,        Math.sin(a4) * inner);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, hole, 0, Math.PI * 2);
  ctx.globalAlpha = 0.7; ctx.stroke();
  ctx.restore();
}

// ── Orchestration ───────────────────────────────────────────────────────────
function showHomeLightboard() {
  const sec = document.getElementById("home-lightboard-section");
  if (sec) sec.style.display = "";

  // Repopulate every visit so the write-in animation replays fresh each time
  const surface = document.getElementById("home-lb-surface");
  if (surface) {
    surface.innerHTML = "";
    HOME_LB_ITEMS.forEach((item, i) => {
      const el = document.createElement("div");
      el.className = "home-lb-item";
      el.textContent = item.text;
      el.style.left           = item.x + "%";
      el.style.top            = item.y + "%";
      el.style.color          = item.color;
      el.style.textShadow     = `0 0 8px ${item.glow}, 0 0 18px ${item.glow}`;
      el.style.animationDelay = (i * 0.9) + "s";  // one at a time
      surface.appendChild(el);
    });
  }

  const canvas = document.getElementById("home-lb-canvas");
  const lb     = document.getElementById("home-lightboard");
  if (!canvas || !lb || homeLbAnimId) return;

  canvas.width  = lb.offsetWidth  || 640;
  canvas.height = lb.offsetHeight || 300;
  if (!homeLbStars.length) homeLbStars = homeLbMakeStars(canvas.width, canvas.height);

  const w = canvas.width, h = canvas.height;
  // Static positions for permanent canvas elements
  const gearX   = w * 0.925, gearY  = h * 0.14,  gearR  = h * 0.075;
  const graphCX = w * 0.17,  graphCY = h * 0.34,  graphW = w * 0.13, graphH = h * 0.30;
  const matCX   = w * 0.83,  matCY  = h * 0.70,  matCW  = w * 0.055, matCH = h * 0.115;
  let starNext = Infinity, fwNext = Infinity, initialized = false;

  function frame(ts) {
    homeLbAnimId = requestAnimationFrame(frame);
    if (!initialized) {
      initialized = true;
      starNext = ts + 1800;
      fwNext   = ts + 4500;
    }

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, w, h);

    homeLbDrawStars(ctx, ts);
    homeLbDrawGraph(ctx, graphCX, graphCY, graphW, graphH, ts);
    homeLbDrawMatrix(ctx, matCX, matCY, matCW, matCH);

    if (!homeLbStar && ts >= starNext) {
      homeLbStar = homeLbNewStar(w, h);
      starNext   = ts + 7000 + Math.random() * 4000;
    }
    if (homeLbStar && homeLbTickStar(ctx, homeLbStar, ts)) homeLbStar = null;

    if (!homeLbFw && ts >= fwNext) {
      homeLbFw = homeLbNewFw(w, h);
      fwNext   = ts + 9000 + Math.random() * 5000;
    }
    if (homeLbFw && homeLbTickFw(ctx, homeLbFw, ts)) homeLbFw = null;

    homeLbGearAng += 0.006;
    homeLbDrawGear(ctx, gearX, gearY, gearR, homeLbGearAng);
  }
  homeLbAnimId = requestAnimationFrame(frame);
}

function hideHomeLightboard() {
  const sec = document.getElementById("home-lightboard-section");
  if (sec) sec.style.display = "none";
  if (homeLbAnimId) { cancelAnimationFrame(homeLbAnimId); homeLbAnimId = null; }
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
      startRushMode(was3Min ? 3 : 5);
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

  // Share / download lightboard (icon excluded from capture via ignoreElements)
  const shareBtn = document.getElementById("shareBtn");
  if (shareBtn) {
    shareBtn.addEventListener("click", async () => {
      const board = document.getElementById("lightboard");
      if (!board || typeof html2canvas === "undefined") return;

      shareBtn.disabled = true;

      try {
        const scale = 2;
        const boardRect = board.getBoundingClientRect();
        const w = Math.round(boardRect.width * scale);
        const h = Math.round(boardRect.height * scale);

        // Composite manually so the Tim SVG img renders correctly —
        // html2canvas struggles with SVG <img> elements but native drawImage handles them fine.
        const out = document.createElement("canvas");
        out.width = w;
        out.height = h;
        const ctx = out.getContext("2d");

        ctx.fillStyle = "#07071a";
        ctx.fillRect(0, 0, w, h);

        const timImg = board.querySelector(".lightboard-tim");
        if (timImg && timImg.complete) {
          const tr = timImg.getBoundingClientRect();
          ctx.globalAlpha = 0.62;
          ctx.filter = "brightness(0.9) saturate(0.85)";
          ctx.drawImage(
            timImg,
            (tr.left - boardRect.left) * scale,
            (tr.top  - boardRect.top)  * scale,
            tr.width  * scale,
            tr.height * scale
          );
          ctx.filter = "none";
          ctx.globalAlpha = 1;
        }

        const surface = document.getElementById("lightboard-surface");
        const eqCanvas = await html2canvas(surface, {
          useCORS: true,
          scale,
          backgroundColor: null,
        });
        ctx.drawImage(eqCanvas, 0, 0);

        // Footer strip with "Play ARITHMIX!" link text
        const GAME_URL = "https://mynumbers.onrender.com/static/game.html";
        const footerH = 36 * scale;
        const fullH = h + footerH;
        const final = document.createElement("canvas");
        final.width = w;
        final.height = fullH;
        const fc = final.getContext("2d");
        fc.drawImage(out, 0, 0);
        fc.fillStyle = "#07071a";
        fc.fillRect(0, h, w, footerH);
        fc.fillStyle = "#1e1e36";
        fc.fillRect(0, h, w, 2 * scale);
        fc.font = `${13 * scale}px 'Caveat', cursive`;
        fc.textAlign = "center";
        fc.textBaseline = "middle";
        fc.fillStyle = "#00d4ff";
        fc.fillText("Play ARITHMIX!  →  " + GAME_URL, w / 2, h + footerH / 2);

        final.toBlob((blob) => {
          shareBtn.disabled = false;
          const file = new File([blob], "arithmix-lightboard.png", { type: "image/png" });

          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            navigator.share({
              title: "ARITHMIX Lightboard",
              text: "Play ARITHMIX!",
              url: GAME_URL,
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
        }, "image/png");  // final.toBlob
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