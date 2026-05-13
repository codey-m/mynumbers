/* ============================================================
   ARITHMIX Explainer — carousel + per-slide interactives
   5 slides:
     1 hero / pipeline
     2 expression trees (build / evaluate)
     3 rejection sampling (real random expressions)
     4 permutation verifier
     5 MIT Learn connections
   ============================================================ */

/* History seeding — runs synchronously before any other explainer code so
   the first browser Back from /explainer is guaranteed to land on a /
   entry in menu state. Idempotent: a `seeded` marker on history.state
   prevents re-seeding across refresh, bfcache restore, or repeat visits. */
(function seedHistoryIfNeeded() {
  if (history.state && history.state.seeded === true) return;

  const params = new URLSearchParams(window.location.search);
  const fromApp = params.get("from") === "app";

  if (fromApp) {
    // In-app push from game.js — a menu entry already sits behind us.
    // Strip the query and mark this entry seeded.
    history.replaceState(
      { arithmix: "explainer", seeded: true },
      "",
      "/explainer"
    );
  } else {
    // Direct load (typed URL, bookmark, external link). Synthesize a menu
    // entry behind us by replacing the current entry with `/` then pushing
    // `/explainer` back on top. URL ends back at /explainer; history has
    // [{/,menu}, {/explainer,seeded}].
    history.replaceState({ arithmix: "menu" }, "", "/");
    history.pushState(
      { arithmix: "explainer", seeded: true },
      "",
      "/explainer"
    );
  }
})();

/* Companion to the seeding IIFE above. In the direct-load branch the
   synthesized menu entry is same-document with /explainer, so a browser/
   in-app Back fires popstate but does NOT load game.html — the user stays
   visually on the explainer. Force a real load of `/` when popstate lands
   on the seeded menu state so the first Back from /explainer actually
   reaches the menu.

   In the in-app branch the menu entry belongs to a different document
   (game.html) so popstate doesn't fire on this document — the handler is
   inert there, which is what we want. */
window.addEventListener("popstate", (e) => {
  if (e.state && e.state.arithmix === "menu") {
    window.location.replace("/");
  }
});

(function () {
  const TOTAL_SLIDES = 5;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const SUBTITLES = {
    1: "From random expression to playable challenge",
    2: "Recursion, evaluation, and pretty-printing",
    3: "Bernoulli trials and the geometric distribution",
    4: "Searching arrangements of the bank",
    5: "MIT Learn courses go deeper on these ideas and more",
  };

  /* ──────────────── Carousel ──────────────── */
  const track = document.getElementById("ex-track");
  const viewport = document.getElementById("ex-viewport");
  const dotsHost = document.getElementById("ex-dots");
  const prevBtn = document.getElementById("ex-prev");
  const nextBtn = document.getElementById("ex-next");
  const progressFill = document.getElementById("ex-progress-fill");
  const counter = document.getElementById("ex-current");
  const subtitle = document.getElementById("ex-slide-subtitle");
  document.getElementById("ex-total").textContent = TOTAL_SLIDES;

  let current = 1;

  for (let i = 1; i <= TOTAL_SLIDES; i++) {
    const b = document.createElement("button");
    b.className = "ex-dot";
    b.setAttribute("role", "tab");
    b.setAttribute("aria-label", `Slide ${i}`);
    b.dataset.target = i;
    b.addEventListener("click", () => goTo(i));
    dotsHost.appendChild(b);
  }

  function goTo(n, opts) {
    n = Math.max(1, Math.min(TOTAL_SLIDES, n));
    const previous = current;
    current = n;
    track.style.transform = `translateX(-${(n - 1) * 100}%)`;
    counter.textContent = n;
    progressFill.style.width = (n / TOTAL_SLIDES * 100).toFixed(3) + "%";
    subtitle.textContent = SUBTITLES[n] || "";
    [...dotsHost.children].forEach((d, i) => d.classList.toggle("is-active", i === n - 1));
    prevBtn.disabled = n === 1;
    nextBtn.disabled = n === TOTAL_SLIDES;
    if (opts && opts.highlight) {
      const slide = track.children[n - 1];
      slide.classList.remove("is-jumped");
      void slide.offsetWidth;
      slide.classList.add("is-jumped");
    }
    // Stop background activity when leaving slides that run timers
    if (n !== 4) stopAuto();
    if (n !== 3) stopStream();
    if (n !== 2) cancelTreeAnims();
    if (n === 2 && previous !== 2) resetTreeAndAnimate();
  }

  prevBtn.addEventListener("click", () => goTo(current - 1));
  nextBtn.addEventListener("click", () => goTo(current + 1));

  // Return to the homepage. Uses history.back() so this in-app control
  // behaves IDENTICALLY to the browser Back button. The seeding IIFE at the
  // top of this file guarantees that a `/` entry in menu state always sits
  // immediately behind /explainer, so back() always lands on the menu.
  function returnToGame() {
    window.history.back();
  }

  document.addEventListener("keydown", (e) => {
    const tag = (document.activeElement && document.activeElement.tagName) || "";
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
    if (e.key === "ArrowRight") { goTo(current + 1); e.preventDefault(); }
    else if (e.key === "ArrowLeft") { goTo(current - 1); e.preventDefault(); }
    else if (e.key === "Escape") { returnToGame(); }
  });

  // Swipe (pointer) — drag >20% of viewport to advance
  (function bindSwipe() {
    let startX = null, dx = 0, dragging = false;
    const SWIPE_THRESH = 0.20;
    viewport.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button, select, input, a, svg .tree-node, .ex-pslot")) return;
      startX = e.clientX; dx = 0; dragging = true;
      try { viewport.setPointerCapture(e.pointerId); } catch (_) {}
    });
    viewport.addEventListener("pointermove", (e) => { if (dragging) dx = e.clientX - startX; });
    viewport.addEventListener("pointerup", () => {
      if (!dragging) return;
      dragging = false;
      const ratio = dx / viewport.clientWidth;
      if (ratio < -SWIPE_THRESH) goTo(current + 1);
      else if (ratio > SWIPE_THRESH) goTo(current - 1);
    });
    viewport.addEventListener("pointercancel", () => { dragging = false; });
  })();

  // Click-to-jump (pipeline + concept chips)
  document.addEventListener("click", (e) => {
    const j = e.target.closest("[data-jump]");
    if (j) {
      const target = parseInt(j.dataset.jump, 10);
      goTo(target, { highlight: !!j.dataset.highlight });
    }
  });

  // Intercept explainer→home navigations and route them through returnToGame()
  // so the visit uses replace (no new history entry). Covers both anchor links
  // to "/" and any button with [data-go-home]. Bail on modifier/middle-click so
  // "Open in new tab" still works as expected.
  document.addEventListener("click", (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const t = e.target.closest('a[href="/"], [data-go-home]');
    if (!t) return;
    e.preventDefault();
    returnToGame();
  });

  // "Go deeper" drawers
  document.querySelectorAll(".ex-deeper").forEach((btn) => {
    btn.addEventListener("click", () => {
      const drawer = document.getElementById(btn.dataset.drawer);
      const open = !drawer.hidden;
      drawer.hidden = open;
      btn.textContent = open ? "Go deeper ▾" : "Go deeper ▴";
    });
  });

  /* ──────────────── Slide 2: Expression tree ──────────────── */
  // Hardcoded tree for ((4 + 7) × 3) - (8 ÷ 2)
  //          -
  //        /   \
  //       ×     ÷
  //      / \   / \
  //     +   3 8   2
  //    / \
  //   4   7
  const TREE = {
    n1: { id: "n1", op: "-",  l: "n2", r: "n5", x: 280, y: 40 },
    n2: { id: "n2", op: "*",  l: "n3", r: "n4", x: 160, y: 110 },
    n3: { id: "n3", op: "+",  l: "n6", r: "n7", x: 90,  y: 180 },
    n4: { id: "n4", val: 3,                     x: 230, y: 180 },
    n5: { id: "n5", op: "/",  l: "n8", r: "n9", x: 400, y: 110 },
    n6: { id: "n6", val: 4,                     x: 50,  y: 250 },
    n7: { id: "n7", val: 7,                     x: 130, y: 250 },
    n8: { id: "n8", val: 8,                     x: 360, y: 180 },
    n9: { id: "n9", val: 2,                     x: 440, y: 180 },
  };
  const POST_ORDER = ["n6", "n7", "n3", "n4", "n2", "n8", "n9", "n5", "n1"];
  // Pre-order DFS — mirrors a recursive build(node) call stack: visit the
  // node, recurse left, recurse right. The reveal walks down the left
  // spine first, then unwinds to fill right subtrees.
  const BUILD_ORDER = ["n1", "n2", "n3", "n6", "n7", "n4", "n5", "n8", "n9"];

  function evalNode(id) {
    const n = TREE[id];
    if (n.val !== undefined) return n.val;
    const a = evalNode(n.l), b = evalNode(n.r);
    return n.op === "+" ? a + b : n.op === "-" ? a - b : n.op === "*" ? a * b : a / b;
  }

  function subExpr(id, parentPrec) {
    const n = TREE[id];
    if (n.val !== undefined) return String(n.val);
    const sym = { "+": " + ", "-": " − ", "*": " × ", "/": " ÷ " }[n.op];
    const prec = { "+": 1, "-": 1, "*": 2, "/": 2 }[n.op];
    const inner = subExpr(n.l, prec) + sym + subExpr(n.r, prec);
    return prec < parentPrec ? `(${inner})` : inner;
  }

  function descendants(id, acc) {
    acc.push(id);
    const n = TREE[id];
    if (n.l) descendants(n.l, acc);
    if (n.r) descendants(n.r, acc);
    return acc;
  }

  const SVG_NS = "http://www.w3.org/2000/svg";
  function renderTree() {
    const svg = document.getElementById("tree-svg");
    svg.innerHTML = "";

    // edges first
    Object.values(TREE).forEach((n) => {
      ["l", "r"].forEach((side) => {
        if (!n[side]) return;
        const c = TREE[n[side]];
        const line = document.createElementNS(SVG_NS, "line");
        line.setAttribute("x1", n.x); line.setAttribute("y1", n.y);
        line.setAttribute("x2", c.x); line.setAttribute("y2", c.y);
        line.setAttribute("class", "tree-edge");
        line.dataset.from = n.id; line.dataset.to = c.id;
        svg.appendChild(line);
      });
    });

    // nodes
    Object.values(TREE).forEach((n) => {
      const g = document.createElementNS(SVG_NS, "g");
      g.setAttribute("class", "tree-node " + (n.val !== undefined ? "is-leaf" : "is-op"));
      g.setAttribute("transform", `translate(${n.x}, ${n.y})`);
      g.dataset.id = n.id;

      const c = document.createElementNS(SVG_NS, "circle");
      c.setAttribute("r", 22);
      const t = document.createElementNS(SVG_NS, "text");
      t.textContent = n.val !== undefined
        ? String(n.val)
        : ({ "*": "×", "/": "÷", "-": "−" }[n.op] || n.op);

      // value badge — rendered but hidden until "has-val" is applied
      const badgeBg = document.createElementNS(SVG_NS, "rect");
      badgeBg.setAttribute("x", -18); badgeBg.setAttribute("y", 18);
      badgeBg.setAttribute("width", 36); badgeBg.setAttribute("height", 18);
      badgeBg.setAttribute("rx", 4);
      badgeBg.setAttribute("class", "tree-badge-bg");
      const badgeText = document.createElementNS(SVG_NS, "text");
      badgeText.setAttribute("y", 27);
      badgeText.setAttribute("class", "tree-badge-text");
      badgeText.dataset.role = "badge";

      g.appendChild(c);
      g.appendChild(t);
      g.appendChild(badgeBg);
      g.appendChild(badgeText);

      g.addEventListener("click", () => {
        g.classList.remove("tap-pulse");
        void g.offsetWidth;
        g.classList.add("tap-pulse");
        animateEvaluateSubtree(n.id);
      });
      svg.appendChild(g);
    });
  }

  function highlightSubtree(id) {
    const svg = document.getElementById("tree-svg");
    svg.querySelectorAll(".tree-node.is-hi").forEach(el => el.classList.remove("is-hi"));
    svg.querySelectorAll(".tree-edge.is-hi").forEach(el => el.classList.remove("is-hi"));
    const ids = descendants(id, []);
    ids.forEach((nid) => {
      const node = svg.querySelector(`.tree-node[data-id="${nid}"]`);
      if (node) node.classList.add("is-hi");
    });
    svg.querySelectorAll(".tree-edge").forEach((e) => {
      if (ids.includes(e.dataset.from) && ids.includes(e.dataset.to)) e.classList.add("is-hi");
    });
    document.getElementById("tree-readout-label").textContent = "Selected subtree";
    document.getElementById("tree-sub-expr").textContent = subExpr(id, 0);
    document.getElementById("tree-sub-val").textContent = "= " + evalNode(id);
  }

  function clearAllBadges() {
    document.querySelectorAll("#tree-svg .tree-node").forEach((el) => {
      el.classList.remove("has-val", "eval-pulse", "is-hi");
      const bt = el.querySelector('text[data-role="badge"]');
      if (bt) bt.textContent = "";
    });
    document.querySelectorAll("#tree-svg .tree-edge.is-hi").forEach((e) => e.classList.remove("is-hi"));
  }

  // Timer registries so we can cancel pending build/eval frames when the
  // user leaves slide 2 mid-animation or clicks a node during a build.
  let buildTimers = [];
  let evalTimers = [];

  function cancelTreeAnims() {
    buildTimers.forEach(clearTimeout);
    buildTimers = [];
    evalTimers.forEach(clearTimeout);
    evalTimers = [];
  }

  // Called when the carousel arrives on slide 2. Recreates the SVG (which
  // also reattaches click handlers) and plays the build animation from a
  // clean slate so each visit feels like a fresh start.
  function resetTreeAndAnimate() {
    cancelTreeAnims();
    renderTree();
    clearAllBadges();
    document.getElementById("tree-readout-label").textContent = "select a node to begin";
    document.getElementById("tree-sub-expr").textContent = "";
    document.getElementById("tree-sub-val").textContent = "";
    // Hide the tree immediately so it doesn't pop in during the slide
    // transition, then defer the build animation until the slide has
    // finished sliding into view (CSS transition is 320ms). Without this
    // delay, n1 fades in while the slide is still mid-transition and
    // looks pre-rendered by the time the user can focus on it.
    const svg = document.getElementById("tree-svg");
    svg.querySelectorAll(".tree-node").forEach((el) => (el.style.opacity = "0"));
    svg.querySelectorAll(".tree-edge").forEach((el) => (el.style.opacity = "0"));
    if (reducedMotion) { animateBuild(); return; }
    buildTimers.push(setTimeout(animateBuild, 340));
  }

  // Build animation: reveal nodes top-down, mirrors recursive construction.
  function animateBuild() {
    const svg = document.getElementById("tree-svg");
    const allNodes = [...svg.querySelectorAll(".tree-node")];
    const allEdges = [...svg.querySelectorAll(".tree-edge")];
    allNodes.forEach((el) => (el.style.opacity = "0"));
    allEdges.forEach((el) => (el.style.opacity = "0"));
    if (reducedMotion) {
      allNodes.forEach((el) => (el.style.opacity = "1"));
      allEdges.forEach((el) => (el.style.opacity = "1"));
      return;
    }
    BUILD_ORDER.forEach((id, i) => {
      buildTimers.push(setTimeout(() => {
        const el = svg.querySelector(`.tree-node[data-id="${id}"]`);
        if (el) el.style.opacity = "1";
        svg.querySelectorAll(`.tree-edge[data-to="${id}"]`).forEach((e) => (e.style.opacity = "1"));
      }, i * 180));
    });
  }

  function postOrder(rootId) {
    const out = [];
    (function visit(id) {
      const n = TREE[id];
      if (n.l) visit(n.l);
      if (n.r) visit(n.r);
      out.push(id);
    })(rootId);
    return out;
  }

  // Evaluate animation for the subtree rooted at rootId. Cancels any in-flight
  // build/eval timers and forces all nodes visible — covers mid-build clicks
  // where some nodes/edges still have opacity 0.
  function animateEvaluateSubtree(rootId) {
    cancelTreeAnims();
    const svg = document.getElementById("tree-svg");
    svg.querySelectorAll(".tree-node").forEach((el) => (el.style.opacity = "1"));
    svg.querySelectorAll(".tree-edge").forEach((el) => (el.style.opacity = "1"));
    clearAllBadges();
    highlightSubtree(rootId);
    const order = postOrder(rootId);
    if (reducedMotion) {
      order.forEach((id) => {
        const el = svg.querySelector(`.tree-node[data-id="${id}"]`);
        if (!el) return;
        const bt = el.querySelector('text[data-role="badge"]');
        if (bt) bt.textContent = String(evalNode(id));
        el.classList.add("has-val");
      });
      document.getElementById("tree-sub-expr").textContent = subExpr(rootId, 0);
      document.getElementById("tree-sub-val").textContent = "= " + evalNode(rootId);
      return;
    }
    order.forEach((id, i) => {
      evalTimers.push(setTimeout(() => {
        const el = svg.querySelector(`.tree-node[data-id="${id}"]`);
        if (!el) return;
        const v = evalNode(id);
        el.classList.remove("eval-pulse");
        void el.offsetWidth;
        el.classList.add("eval-pulse");
        const bt = el.querySelector('text[data-role="badge"]');
        if (bt) bt.textContent = String(v);
        el.classList.add("has-val");
        document.getElementById("tree-sub-expr").textContent = subExpr(id, 0);
        document.getElementById("tree-sub-val").textContent = "= " + v;
      }, i * 480));
    });
  }

  /* ──────────────── Slide 3: Sampler ──────────────── */
  // Generate real random expressions and evaluate them client-side so the
  // user sees what the server is actually rejecting.
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

  /* ──────────────── Slide 4: Permutation verifier ──────────────── */
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

  /* ──────────────── Init ──────────────── */
  goTo(1);
})();
