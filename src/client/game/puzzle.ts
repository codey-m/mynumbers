// ============================================================================
// PUZZLE MANAGEMENT & SCROLL LOCK
// ============================================================================

import {
  puzzle, gameMode, puzzlesSolved, currentDifficulty, maxDifficultyReached,
  rushStarted, rushIntroPlaying, skipIntroAnimation,
  pointerState, scrollLocked, suppressClickUntil, CLICK_SUPPRESS_MS,
  setPuzzle, setCurrentDifficulty, setMaxDifficultyReached,
  setPuzzlesSolved, setScrollLocked, setSuppressClickUntil,
  setSkipIntroAnimation, Puzzle,
} from './state';
import { updateControls, addEquationToLightboard, playWrongFillAnimation } from './lightboard';
import { calculateDifficulty, updateRushUI, startCountdown } from './rush';
import { cancelActiveDrag, handleDropOnSlot, pointerDownHandler, animateSnapAndPlace } from './drag';
import { puzzleRush, puzzleCheck } from './generator';

// ============================================================================
// SCROLL LOCK (iOS)
// ============================================================================

function touchMoveBlocker(e: TouchEvent) {
  if (pointerState) e.preventDefault();
}
window.addEventListener("touchmove", touchMoveBlocker, { passive: false });

export function suppressGhostClicks(): void {
  setSuppressClickUntil(Date.now() + CLICK_SUPPRESS_MS);
}

export function lockPageScroll(): void {
  if (scrollLocked) return;
  setScrollLocked(true);
  document.body.style.overflow = "hidden";
}

export function unlockPageScroll(): void {
  if (!scrollLocked) return;
  setScrollLocked(false);
  document.body.style.overflow = "";
}

// ============================================================================
// PUZZLE MANAGEMENT
// ============================================================================

export function newPuzzle(): void {
  cancelActiveDrag();

  let difficulty = 3;
  if (gameMode === "rush3" || gameMode === "rush5") {
    setCurrentDifficulty(calculateDifficulty(puzzlesSolved));
    if (currentDifficulty > maxDifficultyReached) setMaxDifficultyReached(currentDifficulty);
    difficulty = currentDifficulty;
  }

  let data: Puzzle;
  try {
    data = puzzleRush({ difficulty, decoys: 2 }) as Puzzle;
  } catch (e) {
    console.error("Generate puzzle error", e);
    const resultEl = document.getElementById("result");
    if (resultEl) resultEl.textContent = "Failed to generate puzzle.";
    return;
  }

  setPuzzle(data);
  renderTemplate(data.template_tokens);
  renderBank(data.numbers);

  const resultEl = document.getElementById("result");
  if (resultEl) resultEl.textContent = "";

  updateControls();

  if (gameMode === "rush3" || gameMode === "rush5") {
    updateRushUI();
    if (!rushStarted) {
      if (skipIntroAnimation) {
        setSkipIntroAnimation(false);
        startCountdown();
      } else {
        playWrongFillAnimation();
      }
    }
  } else {
    const targetEl = document.getElementById("target");
    if (targetEl) targetEl.textContent = String(data.target);
  }
}

export function renderTemplate(tokens: string[]): void {
  const container = document.getElementById("template-area");
  if (!container) return;

  container.innerHTML = "";

  const DISPLAY_OPS: Record<string, string> = {
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
      slot.addEventListener("drop", handleDropOnSlot as EventListener);

      slot.addEventListener("click", (ev) => {
        const child = slot.querySelector(".bank-item") as HTMLElement | null;
        if (!child) return;
        if (!(ev.target as HTMLElement).closest(".bank-item")) return;
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

export function renderBank(numbers: number[]): void {
  const bank = document.getElementById("bank");
  if (!bank) return;

  bank.innerHTML = "";

  numbers.forEach((n, i) => {
    const item = document.createElement("div");
    item.className = "bank-item";
    item.draggable = false;

    item.id = `bank-item-${i}-${n}-${Math.random().toString(36).slice(2, 8)}`;

    item.dataset.value = String(n);
    item.textContent = String(n);

    item.addEventListener("mousedown", () => {
      item.draggable = true;
    });

    item.addEventListener("dragstart", (ev) => {
      document.body.classList.add("dragging");
      ev.dataTransfer!.effectAllowed = "move";
      ev.dataTransfer!.setData("text/plain", (ev.target as HTMLElement).id);
      try {
        ev.dataTransfer!.setDragImage(ev.target as HTMLElement, ev.offsetX, ev.offsetY);
      } catch (_) {}
    });

    item.addEventListener("dragend", () => {
      document.body.classList.remove("dragging");

      setTimeout(() => {
        const el = document.getElementById(item.id);
        if (!el) return;

        if (el.dataset.animating === "1") {
          setTimeout(() => finalizeDragEndCheck(el as HTMLElement), 180 + 120);
        } else {
          finalizeDragEndCheck(el as HTMLElement);
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

export function finalizeDragEndCheck(el: HTMLElement): void {
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

export function resetSlots(): void {
  if (!puzzle) return;
  const bank = document.getElementById("bank");
  if (!bank) return;

  document.querySelectorAll<HTMLElement>(".slot .bank-item").forEach((el) => bank.appendChild(el));

  const resultEl = document.getElementById("result");
  if (resultEl) resultEl.textContent = "";

  updateControls();
}

function buildExpressionFromTemplate(): { expression?: string; error?: string } | null {
  if (!puzzle) return null;

  const tokens = puzzle.template_tokens;
  const parts: string[] = [];

  for (const tok of tokens) {
    const isSlot = tok.startsWith("{") ? tok.endsWith("}") : false;

    if (isSlot) {
      const idx = tok.slice(1, -1);
      const slot = document.querySelector(`.slot[data-slot-index="${idx}"]`);
      if (!slot) return { error: `Slot ${idx} missing` };

      const child = slot.querySelector(".bank-item") as HTMLElement | null;
      if (!child) return { error: `Slot ${idx} is empty` };

      parts.push(child.dataset.value!);
    } else {
      parts.push(tok);
    }
  }

  return { expression: parts.join("") };
}

export function checkPuzzle(): void {
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

  const displayExpr = built.expression!
    .replace(/\*/g, "×")
    .replace(/\//g, "÷");

  const data = puzzleCheck({
    numbers: puzzle!.numbers,
    expression: built.expression!,
    target: puzzle!.target,
  });

  const evalDisplay = data.evaluated_display || String(data.evaluated);

  if (data.reason === "invalid_expression") {
    resultEl.textContent = `Invalid: ${data.message || "expression invalid"}`;
    resultEl.className = "result error";
    return;
  }

  if (data.reason === "correct") {
    if (gameMode === "rush3" || gameMode === "rush5") {
      setPuzzlesSolved(puzzlesSolved + 1);
      addEquationToLightboard(`${displayExpr} = ${puzzle!.target}`);

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
    resultEl.textContent = `Incorrect. Got ${evalDisplay}, need ${puzzle!.target}`;
    resultEl.className = "result error";
    return;
  }

  resultEl.textContent = `Result: ${evalDisplay}`;
  resultEl.className = "result";
}

export function canCheck(): boolean {
  const totalSlots = document.querySelectorAll(".slot").length;
  const filledSlots = document.querySelectorAll(".slot .bank-item").length;
  return totalSlots > 0 && filledSlots === totalSlots;
}
