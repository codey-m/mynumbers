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

function cancelActiveDrag() {
  if (!pointerState) return;
  window.removeEventListener("pointermove", pointerMoveHandler);
  window.removeEventListener("pointerup",   pointerUpHandler);
  window.removeEventListener("pointercancel", pointerCancelHandler);
  document.body.classList.remove("dragging");
  document.querySelectorAll(".slot").forEach(s => s.classList.remove("slot-highlight"));
  if (pointerState.clone) try { pointerState.clone.remove(); } catch(_) {}
  if (pointerState.originEl) pointerState.originEl.style.visibility = "";
  pointerState = null;
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
