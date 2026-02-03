// static/game.js
// Drag/drop with snapping, pointer fallback, click-to-place, and robust sticking.

let puzzle = null;
let attempts = 0;
const SNAP_THRESHOLD = 120;
const SNAP_ANIM_MS = 180;

let pointerState = null; // pointer drag fallback

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("resetBtn").addEventListener("click", resetSlots);
  document.getElementById("checkBtn").addEventListener("click", checkPuzzle);
  document.getElementById("newBtn").addEventListener("click", newPuzzle);

  const template = document.getElementById("template-area");
  template.ondragover = ev => ev.preventDefault();
  template.ondrop = handleDropOnTemplate;

  const bank = document.getElementById("bank");
  bank.ondragover = ev => ev.preventDefault();
  bank.ondrop = (ev) => {
    ev.preventDefault();
    const dragged = getDragged(ev);
    if (!dragged) return;
    bank.appendChild(dragged);
    updateControls();
  };

  // Delegated click handler for bank items
  bank.addEventListener("click", (ev) => {
    const item = ev.target.closest(".bank-item");
    if (!item) return;
    console.log("bank click:", item.dataset.value, "pointerActive:", !!pointerState);
    if (pointerState) return;
    const next = findNextEmptySlot();
    if (!next) return;
    animateSnapAndPlace(item, next);
  });

  newPuzzle();
});

function newPuzzle() {
  attempts = 0;
  updateAttemptsUI();
  fetch("/api/puzzle/new?decoys=2")
    .then(r => r.json())
    .then(data => {
      console.log("PUZZLE FROM SERVER:", data);
      puzzle = data;
      document.getElementById("target").textContent = data.target;
      renderTemplate(data.template_tokens);
      renderBank(data.numbers);
      document.getElementById("result").textContent = "";
      updateControls();
    })
    .catch(e => {
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
  tokens.forEach(tok => {
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
    item.draggable = false; // not draggable by default so clicks register
    item.id = `bank-item-${i}-${n}-${Math.random().toString(36).slice(2,8)}`;
    item.dataset.value = n;
    item.textContent = n;

    // enable dragging only on mousedown (mouse)
    item.addEventListener("mousedown", () => {
      item.draggable = true;
    });

    // dragstart: set transfer and UI state
    item.addEventListener("dragstart", (ev) => {
      document.body.classList.add("dragging");
      ev.dataTransfer.effectAllowed = "move";
      ev.dataTransfer.setData("text/plain", ev.target.id);
      try { ev.dataTransfer.setDragImage(ev.target, ev.offsetX, ev.offsetY); } catch(_) {}
    });

    // dragend: microtask parent-check with animation-awareness
    item.addEventListener("dragend", (ev) => {
      document.body.classList.remove("dragging");

      // defer so drop handlers run first
      setTimeout(() => {
        const el = document.getElementById(item.id);
        if (!el) return;

        // if element is animating (we used animateSnapAndPlace), wait for animation to finish
        if (el.dataset.animating === "1") {
          // schedule a later check after a safe window
          setTimeout(() => {
            finalizeDragEndCheck(el);
          }, SNAP_ANIM_MS + 120);
        } else {
          finalizeDragEndCheck(el);
        }
      }, 0);
    });

    // pointer fallback: start pointer drag only for touch/pen (not mouse)
    item.addEventListener("pointerdown", (ev) => {
      if (ev.pointerType === "mouse") return; // mouse handled by mousedown/drag events
      pointerDownHandler(ev);
    });

    bank.appendChild(item);
  });

  updateControls();
}

function finalizeDragEndCheck(el) {
  const parent = el.parentElement;
  const insideSlot = parent && !!parent.closest && !!parent.closest(".slot");
  if (!insideSlot && (!parent || parent.id !== "bank")) {
    try { document.getElementById("bank").appendChild(el); } catch(_) {}
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

// small helper used by drop handlers to clear any active pointer drag
function endPointerDragIfActive(revealOriginal = true) {
  if (pointerState) {
    endPointerDrag(revealOriginal);
  }
}

function handleDropOnSlot(ev) {
  ev.preventDefault();
  const dragged = getDragged(ev) || pointerState?.originEl;
  if (!dragged) return;

  // try to end pointer drag if any
  endPointerDragIfActive(false);

  const slot = ev.currentTarget;
  const bank = document.getElementById("bank");
  const existing = slot.querySelector(".bank-item");
  if (existing) bank.appendChild(existing);

  // if we can place immediately without animation, do so; otherwise animate
  // When the dragged element came from dataTransfer we can append directly
  // but for visual consistency, we'll use animateSnapAndPlace.
  animateSnapAndPlace(dragged, slot);
}

function handleDropOnTemplate(ev) {
  ev.preventDefault();
  const dragged = getDragged(ev) || pointerState?.originEl;
  if (!dragged) return;

  endPointerDragIfActive(false);

  const bank = document.getElementById("bank");
  const allSlots = Array.from(document.querySelectorAll(".slot"));
  const dropX = ev.clientX;
  const dropY = ev.clientY;

  let containing = null;
  for (const s of allSlots) {
    const r = s.getBoundingClientRect();
    if (dropX >= r.left && dropX <= r.right && dropY >= r.top && dropY <= r.bottom) {
      containing = s; break;
    }
  }

  if (containing) {
    const existing = containing.querySelector(".bank-item");
    if (existing) bank.appendChild(existing);
    animateSnapAndPlace(dragged, containing);
    return;
  }

  const emptySlots = allSlots.filter(s => !s.querySelector(".bank-item"));
  if (emptySlots.length === 0) { bank.appendChild(dragged); updateControls(); return; }

  let best = null; let bestDist = Infinity;
  for (const s of emptySlots) {
    const r = s.getBoundingClientRect();
    const cx = r.left + r.width/2;
    const cy = r.top + r.height/2;
    const d = Math.hypot(cx - dropX, cy - dropY);
    if (d < bestDist) { bestDist = d; best = s; }
  }

  if (best && bestDist <= SNAP_THRESHOLD) animateSnapAndPlace(dragged, best);
  else { bank.appendChild(dragged); updateControls(); }
}

function animateSnapAndPlace(el, slot) {
  // remove dragging state so no body.dragging CSS interferes
  document.body.classList.remove("dragging");

  if (el.parentElement === slot) return;

  // mark animating so dragend won't yank it back
  el.dataset.animating = "1";

  const rectFrom = el.getBoundingClientRect();
  const rectTo = slot.getBoundingClientRect();
  const clone = el.cloneNode(true);

  // IMPORTANT: do NOT give the clone the .bank-item class
  // so it cannot pick up any body.dragging .bank-item styles.
  clone.className = ""; // remove all classes
  clone.classList.add("snap-clone");

  // copy a few computed styles from original so it looks identical
  // (you can expand this list if your .bank-item has other visual rules)
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

  // position & size for predictable animation start
  clone.style.position = "fixed";
  clone.style.left = `${rectFrom.left}px`;
  clone.style.top = `${rectFrom.top}px`;
  clone.style.width = `${rectFrom.width}px`;
  clone.style.height = `${rectFrom.height}px`;
  clone.style.margin = "0";
  clone.style.zIndex = 9999;
  clone.style.pointerEvents = "none";

  // ensure neutral starting transform & no transition initially
  clone.style.transform = `translate(0px, 0px) scale(1)`;
  clone.style.opacity = "1";
  clone.style.transition = "none";
  clone.style.willChange = "transform, opacity";

  document.body.appendChild(clone);

  // hide the original during animation (after clone in DOM)
  el.style.visibility = "hidden";

  const dx = (rectTo.left + rectTo.width/2) - (rectFrom.left + rectFrom.width/2);
  const dy = (rectTo.top + rectTo.height/2) - (rectFrom.top + rectFrom.height/2);

  // start transition on next frame so the browser treats current transform as the start
  requestAnimationFrame(() => {
    clone.style.transition = `transform ${SNAP_ANIM_MS}ms cubic-bezier(.2,.9,.2,1), opacity ${SNAP_ANIM_MS}ms ease`;
    // subtle target transform
    clone.style.transform = `translate(${dx}px, ${dy}px) scale(1.01)`;
    clone.style.opacity = "0.99";
  });

  const cleanup = () => {
    clone.removeEventListener("transitionend", cleanup);
    try { document.body.removeChild(clone); } catch(_) {}
    const bank = document.getElementById("bank");
    const existing = slot.querySelector(".bank-item");
    if (existing) bank.appendChild(existing);
    slot.appendChild(el);
    el.style.visibility = "";
    el.classList.add("placed");
    setTimeout(() => el.classList.remove("placed"), SNAP_ANIM_MS + 40);

    // clear animating flag so dragend doesn't defer further
    delete el.dataset.animating;

    // ensure draggable is false after placement
    el.draggable = false;
    updateControls();
  };

  clone.addEventListener("transitionend", cleanup);
  // fallback cleanup (in case transitionend doesn't fire)
  setTimeout(cleanup, SNAP_ANIM_MS + 220);
}


function resetSlots() {
  if (!puzzle) return;
  const bank = document.getElementById("bank");
  document.querySelectorAll(".slot .bank-item").forEach(el => bank.appendChild(el));
  attempts = 0;
  updateAttemptsUI();
  document.getElementById("result").textContent = "";
  updateControls();
}

function buildExpressionFromTemplate() {
  if (!puzzle) return null;
  const tokens = puzzle.template_tokens;
  let parts = [];
  for (let tok of tokens) {
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
  if (!built) { resultEl.textContent = "No puzzle loaded."; resultEl.className = "result error"; return; }
  if (built.error) { resultEl.textContent = built.error; resultEl.className = "result error"; return; }
  if (!canCheck()) { resultEl.textContent = "Please fill all slots before checking."; resultEl.className = "result error"; return; }

  const payload = { numbers: puzzle.numbers, expression: built.expression, target: puzzle.target };

  fetch("/api/puzzle/check", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
  }).then(r => r.json()).then(data => {
    console.log("CHECK RESPONSE:", data);
    const resultEl = document.getElementById("result");
    if (data.reason === "invalid_expression") { resultEl.textContent = `Invalid: ${data.message || "expression invalid"}`; resultEl.className = "result error"; return; }
    if (data.reason === "wrong_value") {
      attempts += 1; updateAttemptsUI();
      if (attempts >= 3) {
        fetch(`/api/puzzle/reveal?round_id=${puzzle.round_id}`).then(r => r.json()).then(sol => {
          resultEl.textContent = `Incorrect. Your result = ${data.evaluated}. Solution: ${sol.solution}`; resultEl.className = "result reveal";
        });
      } else {
        resultEl.textContent = `Incorrect. Your result = ${data.evaluated}. Attempts left: ${3 - attempts}`; resultEl.className = "result error";
      }
      return;
    }
    if (data.reason === "correct") { resultEl.textContent = `Correct! ${built.expression} = ${data.evaluated}`; resultEl.className = "result success"; attempts = 0; updateAttemptsUI(); return; }
    resultEl.textContent = `Result: ${data.evaluated}`; resultEl.className = "result";
  }).catch(err => {
    console.error(err); resultEl.textContent = "Error checking expression."; resultEl.className = "result error";
  });
}

function canCheck() {
  const totalSlots = document.querySelectorAll(".slot").length;
  const filledSlots = document.querySelectorAll(".slot .bank-item").length;
  return totalSlots > 0 && filledSlots === totalSlots;
}
function updateControls() {
  const checkBtn = document.getElementById("checkBtn");
  if (!puzzle) { checkBtn.disabled = true; return; }
  checkBtn.disabled = !canCheck();
}

// Pointer fallback (touch) — we only start this for non-mouse pointers
function pointerDownHandler(ev) {
  if (ev.pointerType === "mouse") return;
  if (ev.button && ev.button !== 0) return;

  const el = ev.currentTarget;
  if (pointerState) endPointerDrag(true);

  try { el.setPointerCapture && el.setPointerCapture(ev.pointerId); } catch(e) {}

  const rect = el.getBoundingClientRect();
  const clone = el.cloneNode(true);
  clone.classList.add("drag-clone");
  clone.style.position = "fixed";
  clone.style.left = `${rect.left}px`;
  clone.style.top = `${rect.top}px`;
  clone.style.width = `${rect.width}px`;
  clone.style.height = `${rect.height}px`;
  clone.style.pointerEvents = "none";
  clone.style.zIndex = 9999;
  document.body.appendChild(clone);

  el.style.visibility = "hidden";

  pointerState = { originEl: el, clone, offsetX: ev.clientX - rect.left, offsetY: ev.clientY - rect.top, pointerId: ev.pointerId };

  window.addEventListener("pointermove", pointerMoveHandler, { passive: false });
  window.addEventListener("pointerup", pointerUpHandler, { passive: false });

  document.body.classList.add("dragging");
}

function pointerMoveHandler(ev) {
  if (!pointerState) return;
  ev.preventDefault();
  const { clone, offsetX, offsetY } = pointerState;
  clone.style.left = `${ev.clientX - offsetX}px`;
  clone.style.top = `${ev.clientY - offsetY}px`;

  const allSlots = Array.from(document.querySelectorAll(".slot"));
  let best = null; let bestDist = Infinity;
  const x = ev.clientX; const y = ev.clientY;
  for (const s of allSlots) {
    const r = s.getBoundingClientRect();
    const cx = r.left + r.width/2; const cy = r.top + r.height/2;
    const d = Math.hypot(cx - x, cy - y);
    if (d < bestDist) { bestDist = d; best = s; }
  }
  document.querySelectorAll(".slot").forEach(s => s.classList.remove("slot-highlight"));
  if (best && bestDist <= SNAP_THRESHOLD) best.classList.add("slot-highlight");
}

function pointerUpHandler(ev) {
  if (!pointerState) return;
  ev.preventDefault();
  const { originEl } = pointerState;
  const x = ev.clientX; const y = ev.clientY;
  const allSlots = Array.from(document.querySelectorAll(".slot"));

  let containing = null;
  for (const s of allSlots) {
    const r = s.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) { containing = s; break; }
  }

  const emptySlots = allSlots.filter(s => !s.querySelector(".bank-item"));
  let best = null; let bestDist = Infinity;
  for (const s of emptySlots) {
    const r = s.getBoundingClientRect();
    const cx = r.left + r.width/2; const cy = r.top + r.height/2;
    const d = Math.hypot(cx - x, cy - y);
    if (d < bestDist) { bestDist = d; best = s; }
  }

  if (containing) {
    const bank = document.getElementById("bank");
    const existing = containing.querySelector(".bank-item");
    if (existing) bank.appendChild(existing);
    animateSnapAndPlace(originEl, containing);
  } else if (best && bestDist <= SNAP_THRESHOLD) {
    animateSnapAndPlace(originEl, best);
  } else {
    document.getElementById("bank").appendChild(originEl);
    originEl.style.visibility = "";
    updateControls();
  }

  endPointerDrag(true);
}

function endPointerDrag(revealOriginal) {
  if (!pointerState) return;
  try { pointerState.clone.remove(); } catch(e) {}
  if (revealOriginal && pointerState.originEl) pointerState.originEl.style.visibility = "";
  document.body.classList.remove("dragging");
  document.querySelectorAll(".slot").forEach(s => s.classList.remove("slot-highlight"));
  window.removeEventListener("pointermove", pointerMoveHandler);
  window.removeEventListener("pointerup", pointerUpHandler);
  pointerState = null;
}
