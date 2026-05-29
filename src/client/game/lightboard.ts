// ============================================================================
// RUSH LIGHTBOARD
// ============================================================================

import {
  LIGHTBOARD_ZONES, LIGHTBOARD_COLORS,
  lightboardZoneIndex, lightboardShuffledZones, lightboardEqEls,
  setLightboardZoneIndex, setLightboardShuffledZones, setLightboardEqEls,
  autoCheckTimeout, setAutoCheckTimeout, rushIntroPlaying, setRushIntroPlaying,
  SNAP_ANIM_MS, puzzle, rushStarted,
} from './state';
import { canCheck, checkPuzzle, resetSlots } from './puzzle';
import { animateIntroTile } from './drag';

const _lbMeasureCanvas = document.createElement("canvas");
const _lbMeasureCtx = _lbMeasureCanvas.getContext("2d")!;
const LB_BASE_FONT = 34;
const LB_MIN_FONT = 12;
const LB_COL_BOUNDS = [2, 34, 67, 100];
const LB_RIGHT_PAD_PX = 24;
const LB_WIDTH_SAFETY = 0.95;
const LB_LINE_HEIGHT_EM = 1.7;

function lbAvailablePct(zoneLeftPct: number): number {
  const next = LB_COL_BOUNDS.find(b => b > zoneLeftPct) ?? 92;
  return next - zoneLeftPct;
}

export function getLightboardFontSize(expr: string, boardWidth: number, zoneLeftPct: number): number {
  const slotW = lbAvailablePct(zoneLeftPct) / 100 * boardWidth;
  const targetW = Math.max(1, slotW * LB_WIDTH_SAFETY - LB_RIGHT_PAD_PX);

  _lbMeasureCtx.font = `600 ${LB_BASE_FONT}px Caveat`;
  const naturalW = _lbMeasureCtx.measureText(expr).width || 1;

  return Math.max(LB_MIN_FONT, Math.min(LB_BASE_FONT, LB_BASE_FONT * targetW / naturalW));
}

export function applyLightboardFontSize(el: HTMLElement): void {
  const board = document.getElementById("lightboard");
  if (!board) return;

  const expr = el.dataset.expr || el.textContent!.trim();
  const boardWidth = board.getBoundingClientRect().width;
  const zoneLeftPct = parseFloat(el.style.left) || 2;
  const size = getLightboardFontSize(expr, boardWidth, zoneLeftPct);

  el.style.fontSize = size + "px";
  const offsetY = (LB_BASE_FONT - size) * LB_LINE_HEIGHT_EM / 2;
  el.style.transform = offsetY > 0 ? `translateY(${offsetY.toFixed(1)}px)` : "";
}

// Caveat loads async from Google Fonts; re-apply once the font lands.
if (document.fonts && document.fonts.load) {
  document.fonts.load(`600 ${LB_BASE_FONT}px Caveat`).then(() => {
    document.querySelectorAll<HTMLElement>(".lightboard-eq").forEach(applyLightboardFontSize);
  }).catch(() => {});
}

export function addEquationToLightboard(expr: string): void {
  const surface = document.getElementById("lightboard-surface");
  if (!surface) return;

  const slotIdx = lightboardZoneIndex % lightboardShuffledZones.length;
  const zone = lightboardShuffledZones[slotIdx];
  const palette = LIGHTBOARD_COLORS[lightboardZoneIndex % LIGHTBOARD_COLORS.length];
  setLightboardZoneIndex(lightboardZoneIndex + 1);

  if (lightboardEqEls[slotIdx]) lightboardEqEls[slotIdx]!.remove();

  const el = document.createElement("div");
  el.className = "lightboard-eq";
  el.textContent = expr + "\u00A0";
  el.dataset.expr = expr;
  el.style.left = zone[0] + "%";
  el.style.top = zone[1] + "%";
  el.style.color = palette.color;
  el.style.textShadow = `0 0 8px ${palette.glow}, 0 0 18px ${palette.glow}`;

  applyLightboardFontSize(el);

  surface.appendChild(el);
  const newEls = [...lightboardEqEls];
  newEls[slotIdx] = el;
  setLightboardEqEls(newEls);
}

export function clearLightboard(): void {
  const surface = document.getElementById("lightboard-surface");
  if (surface) surface.innerHTML = "";
  setLightboardZoneIndex(0);
  setLightboardShuffledZones([...LIGHTBOARD_ZONES].sort(() => Math.random() - 0.5));
  setLightboardEqEls([]);
  const timEl = document.getElementById("lightboard-section")?.querySelector<HTMLElement>(".lightboard-tim");
  if (timEl) timEl.style.display = "";
  const shareBtn = document.getElementById("shareBtn");
  if (shareBtn) (shareBtn as HTMLElement).style.display = "none";
}

export function playWrongFillAnimation(): void {
  setRushIntroPlaying(true);
  if (autoCheckTimeout !== null) {
    clearTimeout(autoCheckTimeout);
    setAutoCheckTimeout(null);
  }

  const slots = Array.from(document.querySelectorAll<HTMLElement>(".slot"));
  const bankItems = Array.from(document.querySelectorAll<HTMLElement>("#bank .bank-item"));
  if (slots.length === 0 || bankItems.length === 0) {
    setRushIntroPlaying(false);
    return;
  }

  const shuffledItems = [...bankItems].sort(() => Math.random() - 0.5);
  const shuffledSlots = [...slots].sort(() => Math.random() - 0.5);
  const count = Math.min(slots.length, shuffledItems.length);

  const INTRO_ANIM_MS = SNAP_ANIM_MS * 2;

  const delays = [0];
  for (let i = 1; i < count; i++) {
    delays.push(delays[i - 1] + 200 + Math.floor(Math.random() * 360));
  }
  const allLanded = delays[count - 1] + INTRO_ANIM_MS + 320;

  for (let i = 0; i < count; i++) {
    setTimeout(() => animateIntroTile(shuffledItems[i], shuffledSlots[i], INTRO_ANIM_MS), delays[i]);
  }

  setTimeout(() => {
    if (autoCheckTimeout !== null) {
      clearTimeout(autoCheckTimeout);
      setAutoCheckTimeout(null);
    }
    const resultEl = document.getElementById("result");
    setTimeout(() => {
      resetSlots();
      if (resultEl) resultEl.textContent = "";
      if (!rushStarted && rushIntroPlaying) {
        document.getElementById("rush-ready-modal")!.style.display = "flex";
      } else {
        setRushIntroPlaying(false);
      }
    }, 700);
  }, allLanded);
}

export function updateControls(): void {
  if (!puzzle) return;
  if (rushIntroPlaying) return;

  if (!canCheck()) return;

  if (autoCheckTimeout !== null) return;

  setAutoCheckTimeout(setTimeout(() => {
    setAutoCheckTimeout(null);
    if (!puzzle) return;
    if (rushIntroPlaying) return;
    if (canCheck()) checkPuzzle();
  }, 300));
}
