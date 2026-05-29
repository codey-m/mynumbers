// ============================================================================
// Explainer — Slide 2: Expression Tree
// ============================================================================

export const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface TreeNode {
  id: string;
  op?: string;
  val?: number;
  l?: string;
  r?: string;
  x: number;
  y: number;
}

const TREE: Record<string, TreeNode> = {
  n1: { id: "n1", op: "-", l: "n2", r: "n5", x: 280, y: 40 },
  n2: { id: "n2", op: "*", l: "n3", r: "n4", x: 160, y: 110 },
  n3: { id: "n3", op: "+", l: "n6", r: "n7", x: 90, y: 180 },
  n4: { id: "n4", val: 3, x: 230, y: 180 },
  n5: { id: "n5", op: "/", l: "n8", r: "n9", x: 400, y: 110 },
  n6: { id: "n6", val: 4, x: 50, y: 250 },
  n7: { id: "n7", val: 7, x: 130, y: 250 },
  n8: { id: "n8", val: 8, x: 360, y: 180 },
  n9: { id: "n9", val: 2, x: 440, y: 180 },
};

const BUILD_ORDER = ["n1", "n2", "n3", "n6", "n7", "n4", "n5", "n8", "n9"];

function evalNode(id: string): number {
  const n = TREE[id];
  if (n.val !== undefined) return n.val;
  const a = evalNode(n.l!), b = evalNode(n.r!);
  return n.op === "+" ? a + b : n.op === "-" ? a - b : n.op === "*" ? a * b : a / b;
}

function subExpr(id: string, parentPrec: number): string {
  const n = TREE[id];
  if (n.val !== undefined) return String(n.val);
  const sym = { "+": " + ", "-": " − ", "*": " × ", "/": " ÷ " }[n.op!]!;
  const prec = { "+": 1, "-": 1, "*": 2, "/": 2 }[n.op!]!;
  const inner = subExpr(n.l!, prec) + sym + subExpr(n.r!, prec);
  return prec < parentPrec ? `(${inner})` : inner;
}

function descendants(id: string, acc: string[]): string[] {
  acc.push(id);
  const n = TREE[id];
  if (n.l) descendants(n.l, acc);
  if (n.r) descendants(n.r, acc);
  return acc;
}

const SVG_NS = "http://www.w3.org/2000/svg";

function renderTree(): void {
  const svg = document.getElementById("tree-svg")!;
  svg.innerHTML = "";

  Object.values(TREE).forEach((n) => {
    (["l", "r"] as const).forEach((side) => {
      const childId = n[side];
      if (!childId) return;
      const c = TREE[childId];
      const line = document.createElementNS(SVG_NS, "line");
      line.setAttribute("x1", String(n.x)); line.setAttribute("y1", String(n.y));
      line.setAttribute("x2", String(c.x)); line.setAttribute("y2", String(c.y));
      line.setAttribute("class", "tree-edge");
      line.dataset.from = n.id; line.dataset.to = c.id;
      svg.appendChild(line);
    });
  });

  Object.values(TREE).forEach((n) => {
    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("class", "tree-node " + (n.val !== undefined ? "is-leaf" : "is-op"));
    g.setAttribute("transform", `translate(${n.x}, ${n.y})`);
    g.dataset.id = n.id;

    const c = document.createElementNS(SVG_NS, "circle");
    c.setAttribute("r", "22");
    const t = document.createElementNS(SVG_NS, "text");
    t.textContent = n.val !== undefined
      ? String(n.val)
      : ({ "*": "×", "/": "÷", "-": "−" }[n.op!] || n.op!);

    const badgeBg = document.createElementNS(SVG_NS, "rect");
    badgeBg.setAttribute("x", "-18"); badgeBg.setAttribute("y", "18");
    badgeBg.setAttribute("width", "36"); badgeBg.setAttribute("height", "18");
    badgeBg.setAttribute("rx", "4");
    badgeBg.setAttribute("class", "tree-badge-bg");
    const badgeText = document.createElementNS(SVG_NS, "text");
    badgeText.setAttribute("y", "27");
    badgeText.setAttribute("class", "tree-badge-text");
    badgeText.dataset.role = "badge";

    g.appendChild(c);
    g.appendChild(t);
    g.appendChild(badgeBg);
    g.appendChild(badgeText);

    g.addEventListener("click", () => {
      g.classList.remove("tap-pulse");
      void (g as unknown as HTMLElement).offsetWidth;
      g.classList.add("tap-pulse");
      animateEvaluateSubtree(n.id);
    });
    svg.appendChild(g);
  });
}

function highlightSubtree(id: string): void {
  const svg = document.getElementById("tree-svg")!;
  svg.querySelectorAll(".tree-node.is-hi").forEach(el => el.classList.remove("is-hi"));
  svg.querySelectorAll(".tree-edge.is-hi").forEach(el => el.classList.remove("is-hi"));
  const ids = descendants(id, []);
  ids.forEach((nid) => {
    const node = svg.querySelector(`.tree-node[data-id="${nid}"]`);
    if (node) node.classList.add("is-hi");
  });
  svg.querySelectorAll(".tree-edge").forEach((e) => {
    const el = e as SVGElement;
    if (ids.includes(el.dataset.from!) && ids.includes(el.dataset.to!)) el.classList.add("is-hi");
  });
  document.getElementById("tree-readout-label")!.textContent = "Selected subtree";
  document.getElementById("tree-sub-expr")!.textContent = subExpr(id, 0);
  document.getElementById("tree-sub-val")!.textContent = "= " + evalNode(id);
}

function clearAllBadges(): void {
  document.querySelectorAll("#tree-svg .tree-node").forEach((el) => {
    el.classList.remove("has-val", "eval-pulse", "is-hi");
    const bt = el.querySelector('text[data-role="badge"]');
    if (bt) bt.textContent = "";
  });
  document.querySelectorAll("#tree-svg .tree-edge.is-hi").forEach((e) => e.classList.remove("is-hi"));
}

let buildTimers: ReturnType<typeof setTimeout>[] = [];
let evalTimers: ReturnType<typeof setTimeout>[] = [];

export function cancelTreeAnims(): void {
  buildTimers.forEach(clearTimeout);
  buildTimers = [];
  evalTimers.forEach(clearTimeout);
  evalTimers = [];
}

export function resetTreeAndAnimate(): void {
  cancelTreeAnims();
  renderTree();
  clearAllBadges();
  document.getElementById("tree-readout-label")!.textContent = "select a node to begin";
  document.getElementById("tree-sub-expr")!.textContent = "";
  document.getElementById("tree-sub-val")!.textContent = "";
  const svg = document.getElementById("tree-svg")!;
  svg.querySelectorAll<SVGElement>(".tree-node").forEach((el) => (el.style.opacity = "0"));
  svg.querySelectorAll<SVGElement>(".tree-edge").forEach((el) => (el.style.opacity = "0"));
  if (reducedMotion) { animateBuild(); return; }
  buildTimers.push(setTimeout(animateBuild, 340));
}

function animateBuild(): void {
  const svg = document.getElementById("tree-svg")!;
  const allNodes = [...svg.querySelectorAll<SVGElement>(".tree-node")];
  const allEdges = [...svg.querySelectorAll<SVGElement>(".tree-edge")];
  allNodes.forEach((el) => (el.style.opacity = "0"));
  allEdges.forEach((el) => (el.style.opacity = "0"));
  if (reducedMotion) {
    allNodes.forEach((el) => (el.style.opacity = "1"));
    allEdges.forEach((el) => (el.style.opacity = "1"));
    return;
  }
  BUILD_ORDER.forEach((id, i) => {
    buildTimers.push(setTimeout(() => {
      const el = svg.querySelector<SVGElement>(`.tree-node[data-id="${id}"]`);
      if (el) el.style.opacity = "1";
      svg.querySelectorAll<SVGElement>(`.tree-edge[data-to="${id}"]`).forEach((e) => (e.style.opacity = "1"));
    }, i * 180));
  });
}

function postOrder(rootId: string): string[] {
  const out: string[] = [];
  (function visit(id: string) {
    const n = TREE[id];
    if (n.l) visit(n.l);
    if (n.r) visit(n.r);
    out.push(id);
  })(rootId);
  return out;
}

function animateEvaluateSubtree(rootId: string): void {
  cancelTreeAnims();
  const svg = document.getElementById("tree-svg")!;
  svg.querySelectorAll<SVGElement>(".tree-node").forEach((el) => (el.style.opacity = "1"));
  svg.querySelectorAll<SVGElement>(".tree-edge").forEach((el) => (el.style.opacity = "1"));
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
    document.getElementById("tree-sub-expr")!.textContent = subExpr(rootId, 0);
    document.getElementById("tree-sub-val")!.textContent = "= " + evalNode(rootId);
    return;
  }
  order.forEach((id, i) => {
    evalTimers.push(setTimeout(() => {
      const el = svg.querySelector(`.tree-node[data-id="${id}"]`);
      if (!el) return;
      const v = evalNode(id);
      el.classList.remove("eval-pulse");
      void (el as unknown as HTMLElement).offsetWidth;
      el.classList.add("eval-pulse");
      const bt = el.querySelector('text[data-role="badge"]');
      if (bt) bt.textContent = String(v);
      el.classList.add("has-val");
      document.getElementById("tree-sub-expr")!.textContent = subExpr(id, 0);
      document.getElementById("tree-sub-val")!.textContent = "= " + v;
    }, i * 480));
  });
}
