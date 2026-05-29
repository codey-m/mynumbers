/* ============================================================
   Explainer — Slide 3: Rejection Sampler
   ============================================================ */

const TARGET_BANDS = {
  wide:   [10, 99],
  mid:    [20, 60],
  narrow: [25, 35],
};
const OP_SETS = {
  add:    ["+"],
  addsub: ["+", "-"],
  all:    ["+", "-", "*", "/"],
};

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// Random expression of 3 distinct integers in [1..15] with random ops.
// Form: a op1 b op2 c, evaluated with standard precedence so that
// operator precedence is part of what the user sees.
function genExpression(ops) {
  const pool = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15];
  // pick 3 distinct
  const picks = [];
  for (let i = 0; i < 3; i++) {
    const j = randInt(0, pool.length - 1);
    picks.push(pool.splice(j, 1)[0]);
  }
  const o1 = ops[randInt(0, ops.length - 1)];
  const o2 = ops[randInt(0, ops.length - 1)];
  return { a: picks[0], b: picks[1], c: picks[2], o1, o2 };
}

function evalExpr(e) {
  // honor precedence: × ÷ before + −
  const isMul = (op) => op === "*" || op === "/";
  const apply = (x, op, y) => op === "+" ? x + y : op === "-" ? x - y : op === "*" ? x * y : y === 0 ? NaN : x / y;
  if (isMul(e.o1) && !isMul(e.o2)) return apply(apply(e.a, e.o1, e.b), e.o2, e.c);
  if (!isMul(e.o1) && isMul(e.o2)) return apply(e.a, e.o1, apply(e.b, e.o2, e.c));
  // same precedence — left to right
  return apply(apply(e.a, e.o1, e.b), e.o2, e.c);
}

const OP_DISPLAY = { "+": "+", "-": "−", "*": "×", "/": "÷" };
function fmtExpr(e) {
  return `${e.a} ${OP_DISPLAY[e.o1]} ${e.b} ${OP_DISPLAY[e.o2]} ${e.c}`;
}

// Classify each attempt against the difficulty config
function classify(e, ops, band) {
  const v = evalExpr(e);
  if (!Number.isFinite(v)) return { ok: false, val: v, reason: "div by zero" };
  if (!Number.isInteger(v)) return { ok: false, val: v, reason: "non-integer" };
  if (v < band[0] || v > band[1]) return { ok: false, val: v, reason: `out of [${band[0]},${band[1]}]` };
  return { ok: true, val: v, reason: "accepted ✓" };
}

// Monte-Carlo estimate of p using N quick trials with the current settings.
// Pure client-side; never calls the backend.
function estimateP(opsKey, bandKey, samples = 4000) {
  const ops = OP_SETS[opsKey];
  const band = TARGET_BANDS[bandKey];
  let ok = 0;
  for (let i = 0; i < samples; i++) {
    if (classify(genExpression(ops), ops, band).ok) ok++;
  }
  return Math.max(1e-6, ok / samples);
}

function fmtPct(x) {
  if (x >= 0.001) return (x * 100).toFixed(1) + "%";
  return x.toExponential(2);
}
function fmtExpected(p) { return (1 / p).toFixed(1); }
function fmtFail(p) {
  if (p >= 0.02) return "≈ 0";
  const q = Math.pow(1 - p, 2000);
  if (q < 1e-6) return "< 1e−6";
  return q.toExponential(2);
}

function refreshSamplerStats() {
  const opsKey = document.getElementById("s-ops").value;
  const bandKey = document.getElementById("s-range").value;
  const p = estimateP(opsKey, bandKey);
  document.getElementById("s-p").textContent = fmtPct(p);
  document.getElementById("s-exp").textContent = fmtExpected(p);
  document.getElementById("s-fail").textContent = fmtFail(p);
  return p;
}

let streamTimer = null;
function stopStream() {
  if (streamTimer) { clearInterval(streamTimer); streamTimer = null; }
}

function runStream() {
  stopStream();
  const opsKey = document.getElementById("s-ops").value;
  const bandKey = document.getElementById("s-range").value;
  const ops = OP_SETS[opsKey];
  const band = TARGET_BANDS[bandKey];
  refreshSamplerStats();

  const stream = document.getElementById("s-stream");
  stream.innerHTML = "";
  let n = 0;
  const MAX = 60;
  streamTimer = setInterval(() => {
    n++;
    const expr = genExpression(ops);
    const verdict = classify(expr, ops, band);
    const row = document.createElement("div");
    row.className = "ex-attempt " + (verdict.ok ? "is-ok" : "is-bad");
    row.innerHTML = `
      <div class="ex-attempt-num">#${n}</div>
      <div class="ex-attempt-expr">${fmtExpr(expr)}</div>
      <div class="ex-attempt-val">= ${Number.isFinite(verdict.val) ? (Number.isInteger(verdict.val) ? verdict.val : verdict.val.toFixed(2)) : "NaN"}</div>
      <div class="ex-attempt-reason">${verdict.reason}</div>
    `;
    stream.appendChild(row);
    stream.scrollTop = stream.scrollHeight;
    if (verdict.ok) {
      stopStream();
    } else if (n >= MAX) {
      stopStream();
      const note = document.createElement("div");
      note.className = "ex-attempt is-bad";
      note.style.gridTemplateColumns = "1fr";
      note.textContent = `…gave up after ${MAX} attempts. Loosen the band or simplify operators.`;
      stream.appendChild(note);
    }
  }, reducedMotion ? 30 : 90);
}

// Bind sampler controls
["s-ops", "s-range"].forEach((id) =>
  document.getElementById(id).addEventListener("change", refreshSamplerStats)
);
document.getElementById("s-run").addEventListener("click", runStream);
refreshSamplerStats();

// Populate the "Go deeper" drawer's narrow-band reference numbers. Uses an
// exhaustive enumeration over the 43,680 (15·14·13 ordered triples × 4·4
// operator pairs) expressions rather than a Monte Carlo estimate so the
// value the drawer cites is exact and identical across reloads — and lines
// up with the live stat card when the user actually picks the narrow band.
(function populateNarrowDeepDive() {
  const band = TARGET_BANDS.narrow;
  const ops = OP_SETS.all;
  let total = 0, ok = 0;
  for (let i = 1; i <= 15; i++) {
    for (let j = 1; j <= 15; j++) {
      if (j === i) continue;
      for (let k = 1; k <= 15; k++) {
        if (k === i || k === j) continue;
        for (const o1 of ops) {
          for (const o2 of ops) {
            total++;
            if (classify({ a: i, b: j, c: k, o1, o2 }, ops, band).ok) ok++;
          }
        }
      }
    }
  }
  const p = ok / total;
  document.getElementById("d3-narrow-p").textContent = fmtPct(p);
  document.getElementById("d3-narrow-exp").textContent = fmtExpected(p);
  document.getElementById("d3-narrow-fail").textContent = fmtFail(p);
})();
