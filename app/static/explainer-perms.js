/* ============================================================
   Explainer — Slide 4: Permutation Verifier
   ============================================================ */

const BANK = [2, 3, 4, 5, 7, 8, 9];
const TARGET = 29;
const K = 5;
const TOTAL_PERMS = 2520;

// Lazy lex-order k-permutation generator over indices [0..n-1].
// Yields one arrangement per next() — used so step / autoplay share state.
function* permGen(n, k) {
  const idx = Array.from({ length: n }, (_, i) => i);
  function* recurse(arr, depth) {
    if (depth === k) { yield arr.slice(0, k); return; }
    for (let i = depth; i < arr.length; i++) {
      [arr[depth], arr[i]] = [arr[i], arr[depth]];
      yield* recurse(arr, depth + 1);
      [arr[depth], arr[i]] = [arr[i], arr[depth]];
    }
  }
  yield* recurse(idx, 0);
}

function evalTemplate(a, b, c, d, e) {
  if (e === 0) return NaN;
  return ((a + b) * c) - (d / e);
}

// Count solutions once at load. Used to display the expected-checks stat:
// assuming the S solutions are uniformly distributed across N arrangements,
// the expected index of the first hit is (N + 1) / (S + 1).
const SOLUTIONS_COUNT = (() => {
  let s = 0;
  for (const perm of permGen(BANK.length, K)) {
    if (evalTemplate(...perm.map((i) => BANK[i])) === TARGET) s++;
  }
  return s;
})();
const EXPECTED_CHECKS = Math.round((TOTAL_PERMS + 1) / (SOLUTIONS_COUNT + 1));
document.getElementById("p-solutions").textContent = SOLUTIONS_COUNT;
document.getElementById("p-expected").textContent = EXPECTED_CHECKS;

// Autoplay pacing: start slow so the eye can follow individual checks,
// then decay the per-step delay geometrically until it hits a fast floor.
const PERM_START_MS = 400;
const PERM_MIN_MS = 8;
const PERM_DECAY = 0.96;
let permState = null;
let permAutoTimer = null;
let permAutoSpeed = 0;

function resetPerm() {
  permState = { gen: permGen(BANK.length, K), count: 0, done: false, found: false };
  permAutoSpeed = 0;
  fillSlots([null, null, null, null, null]);
  document.getElementById("p-count").textContent = "0";
  document.getElementById("p-total").textContent = TOTAL_PERMS;
  document.getElementById("p-result").textContent = "";
  document.querySelector(".ex-perm-board").classList.remove("has-result");
  setMatch(null);
}

function setMatch(state) {
  const check = document.getElementById("p-match");
  if (!check) return;
  check.classList.toggle("is-visible", state === "match");
}

function fillSlots(vals) {
  for (let i = 0; i < 5; i++) {
    const slot = document.querySelector(`.ex-pslot[data-slot="${i}"]`);
    if (!slot) continue;
    if (vals[i] === null || vals[i] === undefined) {
      slot.textContent = "__";
      slot.classList.remove("is-filled", "is-pulse");
    } else {
      slot.textContent = vals[i];
      slot.classList.add("is-filled");
      slot.classList.remove("is-pulse");
      void slot.offsetWidth;
      slot.classList.add("is-pulse");
    }
  }
}

function stepPerm() {
  if (!permState) resetPerm();
  if (permState.done) return false;
  const next = permState.gen.next();
  if (next.done) { permState.done = true; return false; }
  const vals = next.value.map((i) => BANK[i]);
  fillSlots(vals);
  permState.count++;
  document.getElementById("p-count").textContent = permState.count;
  const v = evalTemplate(...vals);
  document.getElementById("p-result").textContent = Number.isInteger(v) ? v : v.toFixed(2);
  document.querySelector(".ex-perm-board").classList.add("has-result");
  if (v === TARGET) {
    setMatch("match");
    permState.found = true;
    permState.done = true;
    return true;
  }
  setMatch("miss");
  return null;
}

function stopAuto() {
  if (permAutoTimer) { clearTimeout(permAutoTimer); permAutoTimer = null; }
  const btn = document.getElementById("p-auto");
  if (btn) btn.textContent = "Autoplay";
}

// Recursive setTimeout (not setInterval) so each tick can use a different
// delay — that's how the exponential ramp-up actually accelerates.
function scheduleNextPermTick() {
  permAutoTimer = setTimeout(() => {
    const r = stepPerm();
    if (r === true || (permState && permState.done)) { stopAuto(); return; }
    permAutoSpeed = Math.max(reducedMotion ? 1 : PERM_MIN_MS, permAutoSpeed * PERM_DECAY);
    scheduleNextPermTick();
  }, permAutoSpeed);
}

document.getElementById("p-step").addEventListener("click", () => { stopAuto(); stepPerm(); });
document.getElementById("p-reset").addEventListener("click", () => { stopAuto(); resetPerm(); });
document.getElementById("p-auto").addEventListener("click", () => {
  if (permAutoTimer) { stopAuto(); return; }
  document.getElementById("p-auto").textContent = "Pause";
  // Fresh autoplay starts slow; resume after a pause keeps current speed.
  if (permAutoSpeed === 0) permAutoSpeed = reducedMotion ? 1 : PERM_START_MS;
  scheduleNextPermTick();
});
resetPerm();
