/* ============================================================
   Explainer — Slide 2: Expression Tree
   ============================================================ */

// Shared across slides
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
