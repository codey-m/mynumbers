// ============================================================================
// RUSH LIGHTBOARD
// ============================================================================

const _lbMeasureCanvas = document.createElement("canvas");
const _lbMeasureCtx    = _lbMeasureCanvas.getContext("2d");
const LB_BASE_FONT     = 34;
const LB_MIN_FONT      = 12;
// Column boundaries in % of board width. Each equation gets the slice from its
// zone's left edge to the next boundary, so columns never overlap horizontally.
// The trailing 100 lets column 3 extend to the right edge of the board; the
// LB_WIDTH_SAFETY multiplier and LB_RIGHT_PAD_PX subtraction below provide the
// visual right-margin so equations don't actually butt against the border.
const LB_COL_BOUNDS    = [2, 34, 67, 100];
// Right padding on .lightboard-eq (in px) — reserved for the write-in animation
// overshoot. Subtracts from the equation's available text width.
const LB_RIGHT_PAD_PX  = 24;
// Multiplier on available width to keep a small breathing gap between columns.
const LB_WIDTH_SAFETY  = 0.95;
// Total line-box height in em (line-height: 1 + padding 0.4em + 0.3em).
// Used to vertically re-center smaller equations against the row anchor.
const LB_LINE_HEIGHT_EM = 1.7;

function lbAvailablePct(zoneLeftPct) {
  const next = LB_COL_BOUNDS.find(b => b > zoneLeftPct) ?? 92;
  return next - zoneLeftPct;
}

function getLightboardFontSize(expr, boardWidth, zoneLeftPct) {
  const slotW   = lbAvailablePct(zoneLeftPct) / 100 * boardWidth;
  const targetW = Math.max(1, slotW * LB_WIDTH_SAFETY - LB_RIGHT_PAD_PX);

  _lbMeasureCtx.font = `600 ${LB_BASE_FONT}px Caveat`;
  const naturalW = _lbMeasureCtx.measureText(expr).width || 1;

  return Math.max(LB_MIN_FONT, Math.min(LB_BASE_FONT, LB_BASE_FONT * targetW / naturalW));
}

function applyLightboardFontSize(el) {
  const board = document.getElementById("lightboard");
  if (!board) return;

  const expr        = el.dataset.expr || el.textContent.trim();
  const boardWidth  = board.getBoundingClientRect().width;
  const zoneLeftPct = parseFloat(el.style.left) || 2;
  const size        = getLightboardFontSize(expr, boardWidth, zoneLeftPct);

  el.style.fontSize = size + "px";
  // Center the equation vertically against where a base-size equation would
  // sit, so shorter (smaller-font) equations don't ride up to the top of the
  // row band relative to taller ones.
  const offsetY = (LB_BASE_FONT - size) * LB_LINE_HEIGHT_EM / 2;
  el.style.transform = offsetY > 0 ? `translateY(${offsetY.toFixed(1)}px)` : "";
}

// Caveat loads async from Google Fonts; canvas measureText falls back to a
// narrower font until it's ready, producing oversized equations on first paint.
// Re-apply once the font lands.
if (document.fonts && document.fonts.load) {
  document.fonts.load(`600 ${LB_BASE_FONT}px Caveat`).then(() => {
    document.querySelectorAll(".lightboard-eq").forEach(applyLightboardFontSize);
  }).catch(() => {});
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
  el.dataset.expr = expr;
  el.style.left = zone[0] + "%";
  el.style.top  = zone[1] + "%";
  el.style.color = palette.color;
  el.style.textShadow = `0 0 8px ${palette.glow}, 0 0 18px ${palette.glow}`;

  // Scale font-size so every equation occupies roughly the same visual width.
  applyLightboardFontSize(el);

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
