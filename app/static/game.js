console.log("game.js v8 loaded");

let puzzle = null;
let attempts = 0;

const SNAP_THRESHOLD = 120;
const SNAP_ANIM_MS = 180;
const TAP_MOVE_PX = 18;
const CLICK_SUPPRESS_MS = 1200;

let suppressClickUntil = 0;
let pointerState = null;
let scrollLockY = 0;
let scrollLocked = false;

// iOS scroll blocker: prevent page scrolling while dragging
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

  document.getElementById("resetBtn").addEventListener("click", resetSlots);
  document.getElementById("checkBtn").addEventListener("click", checkPuzzle);
  document.getElementById("newBtn").addEventListener("click", newPuzzle);

  const template = document.getElementById("template-area");
  template.ondragover = (ev) => ev.preventDefault();
  template.ondrop = handleDropOnTemplate;

  const bank = document.getElementById("bank");
  bank.ondragover = (ev) => ev.preventDefault();
  bank.ondrop = (ev) => {
    ev.preventDefault();
    const dragged = getDragged(ev);
    if (!dragged) return;
    bank.appendChild(dragged);
    updateControls();
  };

  // Only enable click-to-place on desktop (not touch devices)
  const IS_TOUCH = navigator.maxTouchPoints && navigator.maxTouchPoints > 0;
  if (!IS_TOUCH) {
    bank.addEventListener("click", (ev) => {
      const item = ev.target.closest(".bank-item");
      if (!item) return;
      if (pointerState) return;

      const next = findNextEmptySlot();
      if (!next) return;
      animateSnapAndPlace(item, next);
    });
  }

  newPuzzle();
});

function newPuzzle() {
  attempts = 0;
  updateAttemptsUI();

  fetch("/api/puzzle/new?decoys=2")
    .then((r) => r.json())
    .then((data) => {
      puzzle = data;
      document.getElementById("target").textContent = data.target;
      renderTemplate(data.template_tokens);
      renderBank(data.numbers);
      document.getElementById("result").textContent = "";
      updateControls();
    })
    .catch((e) => {
      console.error("Fetch puzzle error", e);
      document.getElementById("result").textContent = "Failed to fetch puzzle.";
    });
}

function updateAttemptsUI() {
  document.getElementById("attempts").textContent = attempts;
}

function renderTemplate(tokens) {
  const container = document.getElementById("template-area");
  container.innerHTML = "";

  tokens.forEach((tok) => {
    if (tok.startsWith("{") && tok.endsWith("}")) {
      const idx = tok.slice(1, -1);
      const slot = document.createElement("div");
      slot.className = "slot";
      slot.dataset.slotIndex = idx;

      slot.addEventListener("dragover", (ev) => ev.preventDefault());
      slot.addEventListener("drop", handleDropOnSlot);

      slot.addEventListener("click", (ev) => {
        const child = slot.querySelector(".bank-item");
        if (child && ev.target.closest(".bank-item")) {
          document.getElementById("bank").appendChild(child);
          updateControls();
        }
      });

      container.appendChild(slot);
    } else {
      const span = document.createElement("span");
      span.className = "inline-token";
      span.textContent = tok;
      container.appendChild(span);
    }
  });

  updateControls();
}

function renderBank(numbers) {
  const bank = document.getElementById("bank");
  bank.innerHTML = "";

  numbers.forEach((n, i) => {
    const item = document.createElement("div");
    item.className = "bank-item";
    item.draggable = false;
    item.id = `bank-item-${i}-${n}-${Math.random().toString(36).slice(2, 8)}`;
    item.dataset.value = n;
    item.textContent = n;

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
  const insideSlot = parent && parent.closest && parent.closest(".slot");
  if (!insideSlot && (!parent || parent.id !== "bank")) {
    try {
      document.getElementById("bank").appendChild(el);
    } catch (_) {}
  }
  el.draggable = false;
  updateControls();
}

function findNextEmptySlot() {
  const slots = Array.from(document.querySelectorAll(".slot"));
  for (const s of slots) if (!s.querySelector(".bank-item")) return s;
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
  if (existing) bank.appendChild(existing);

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
    if (existing) bank.appendChild(existing);
    animateSnapAndPlace(dragged, containing);
    return;
  }

  const emptySlots = allSlots.filter((s) => !s.querySelector(".bank-item"));
  if (emptySlots.length === 0) {
    bank.appendChild(dragged);
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
    bank.appendChild(dragged);
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

function animateSnapAndPlace(el, slot) {
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
    clone.style.transition = `transform ${SNAP_ANIM_MS}ms cubic-bezier(.2,.9,.2,1), opacity ${SNAP_ANIM_MS}ms ease`;
    clone.style.transform = `translate(${dx}px, ${dy}px) scale(1.01)`;
    clone.style.opacity = "0.99";
  });

  const cleanup = () => {
    clone.removeEventListener("transitionend", cleanup);
    try { clone.remove(); } catch (_) {}

    const bank = document.getElementById("bank");
    const existing = slot.querySelector(".bank-item");
    if (existing) bank.appendChild(existing);

    slot.appendChild(el);
    el.style.visibility = "";
    el.classList.add("placed");
    setTimeout(() => el.classList.remove("placed"), SNAP_ANIM_MS + 40);

    delete el.dataset.animating;
    el.draggable = false;
    updateControls();
  };

  clone.addEventListener("transitionend", cleanup);
  setTimeout(cleanup, SNAP_ANIM_MS + 220);
}

function resetSlots() {
  if (!puzzle) return;
  const bank = document.getElementById("bank");
  document.querySelectorAll(".slot .bank-item").forEach((el) => bank.appendChild(el));
  attempts = 0;
  updateAttemptsUI();
  document.getElementById("result").textContent = "";
  updateControls();
}

function buildExpressionFromTemplate() {
  if (!puzzle) return null;

  const tokens = puzzle.template_tokens;
  const parts = [];

  for (const tok of tokens) {
    if (tok.startsWith("{") && tok.endsWith("}")) {
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

  const payload = { numbers: puzzle.numbers, expression: built.expression, target: puzzle.target };

  fetch("/api/puzzle/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then((r) => r.json())
    .then((data) => {
      if (data.reason === "invalid_expression") {
        resultEl.textContent = `Invalid: ${data.message || "expression invalid"}`;
        resultEl.className = "result error";
        return;
      }

      if (data.reason === "wrong_value") {
        attempts += 1;
        updateAttemptsUI();

        if (attempts >= 3) {
          fetch(`/api/puzzle/reveal?round_id=${encodeURIComponent(puzzle.round_id)}`)
            .then((r) => r.json())
            .then((sol) => {
              resultEl.textContent = `Incorrect. Your result = ${data.evaluated}. Solution: ${sol.solution}`;
              resultEl.className = "result reveal";
            });
        } else {
          resultEl.textContent = `Incorrect. Your result = ${data.evaluated}. Attempts left: ${3 - attempts}`;
          resultEl.className = "result error";
        }
        return;
      }

      if (data.reason === "correct") {
        resultEl.textContent = `Correct! ${built.expression} = ${data.evaluated}`;
        resultEl.className = "result success";
        attempts = 0;
        updateAttemptsUI();
        return;
      }

      resultEl.textContent = `Result: ${data.evaluated}`;
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

function updateControls() {
  const checkBtn = document.getElementById("checkBtn");
  checkBtn.disabled = !puzzle || !canCheck();
}

function pointerDownHandler(ev) {
  if (ev.pointerType === "mouse") return;
  if (ev.button && ev.button !== 0) return;

  ev.preventDefault();
  suppressGhostClicks();
  lockPageScroll();

  const el = ev.currentTarget;

  if (pointerState) endPointerDrag({ revealOriginal: true, removeClone: true });

  try { el.setPointerCapture && el.setPointerCapture(ev.pointerId); } catch (_) {}

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

  const { clone, offsetX, offsetY } = pointerState;
  clone.style.left = `${ev.clientX - offsetX}px`;
  clone.style.top = `${ev.clientY - offsetY}px`;

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

  const { originEl, clone, startX, startY, lastX, lastY, startT } = pointerState;

  document.querySelectorAll(".slot").forEach((s) => s.classList.remove("slot-highlight"));

  const dist = Math.hypot(lastX - startX, lastY - startY);
  const dt = performance.now() - startT;
  const isTap = dist <= TAP_MOVE_PX && dt < 600;

  if (isTap) {
    endPointerDrag({ revealOriginal: true, removeClone: true });

    const next = findNextEmptySlot();
    if (next) animateSnapAndPlace(originEl, next);
    else document.getElementById("bank").appendChild(originEl);

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
    document.getElementById("bank").appendChild(originEl);
    unlockPageScroll();
    updateControls();
    return;
  }

  const bank = document.getElementById("bank");
  const existing = target.querySelector(".bank-item");
  if (existing) bank.appendChild(existing);

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
    try { pointerState.clone.remove(); } catch (_) {}
  }

  if (revealOriginal && pointerState.originEl) {
    pointerState.originEl.style.visibility = "";
  }

  pointerState = null;
}

function animatePointerCloneIntoSlot({ dragClone, originEl, slot }) {
  endPointerDrag({ revealOriginal: false, removeClone: false });

  const rectFrom = dragClone.getBoundingClientRect();
  const rectTo = slot.getBoundingClientRect();

  const dx = rectTo.left + rectTo.width / 2 - (rectFrom.left + rectFrom.width / 2);
  const dy = rectTo.top + rectTo.height / 2 - (rectFrom.top + rectFrom.height / 2);

  dragClone.style.willChange = "transform, opacity";
  dragClone.style.transition = `transform ${SNAP_ANIM_MS}ms cubic-bezier(.2,.9,.2,1), opacity ${SNAP_ANIM_MS}ms ease`;
  dragClone.style.transform = `translate(${dx}px, ${dy}px) scale(1.01)`;
  dragClone.style.opacity = "0.99";

  const cleanup = () => {
    dragClone.removeEventListener("transitionend", cleanup);
    try { dragClone.remove(); } catch (_) {}

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