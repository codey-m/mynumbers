// ============================================================================
// Explainer — Carousel navigation & initialization
// ============================================================================

import { cancelTreeAnims, resetTreeAndAnimate } from './tree';
import { stopStream } from './sampler';
import { stopAuto } from './perms';

const TOTAL_SLIDES = 5;

const SUBTITLES: Record<number, string> = {
  1: "From random expression to playable challenge",
  2: "Recursion, evaluation, and pretty-printing",
  3: "Bernoulli trials and the geometric distribution",
  4: "Searching arrangements of the bank",
  5: "MIT Learn courses go deeper on these ideas and more",
};

export function initCarousel(): void {
  const track = document.getElementById("ex-track")!;
  const viewport = document.getElementById("ex-viewport")!;
  const dotsHost = document.getElementById("ex-dots")!;
  const prevBtn = document.getElementById("ex-prev") as HTMLButtonElement;
  const nextBtn = document.getElementById("ex-next") as HTMLButtonElement;
  const progressFill = document.getElementById("ex-progress-fill")!;
  const counter = document.getElementById("ex-current")!;
  const subtitle = document.getElementById("ex-slide-subtitle")!;
  document.getElementById("ex-total")!.textContent = String(TOTAL_SLIDES);

  let current = 1;

  for (let i = 1; i <= TOTAL_SLIDES; i++) {
    const b = document.createElement("button");
    b.className = "ex-dot";
    b.setAttribute("role", "tab");
    b.setAttribute("aria-label", `Slide ${i}`);
    b.dataset.target = String(i);
    b.addEventListener("click", () => goTo(i));
    dotsHost.appendChild(b);
  }

  function goTo(n: number, opts?: { highlight?: boolean }): void {
    n = Math.max(1, Math.min(TOTAL_SLIDES, n));
    const previous = current;
    current = n;
    track.style.transform = `translateX(-${(n - 1) * 100}%)`;
    counter.textContent = String(n);
    progressFill.style.width = (n / TOTAL_SLIDES * 100).toFixed(3) + "%";
    subtitle.textContent = SUBTITLES[n] || "";
    [...dotsHost.children].forEach((d, i) => (d as HTMLElement).classList.toggle("is-active", i === n - 1));
    prevBtn.disabled = n === 1;
    nextBtn.disabled = n === TOTAL_SLIDES;
    if (opts && opts.highlight) {
      const slide = track.children[n - 1] as HTMLElement;
      slide.classList.remove("is-jumped");
      void slide.offsetWidth;
      slide.classList.add("is-jumped");
    }
    if (n !== 4) stopAuto();
    if (n !== 3) stopStream();
    if (n !== 2) cancelTreeAnims();
    if (n === 2 && previous !== 2) resetTreeAndAnimate();
  }

  prevBtn.addEventListener("click", () => goTo(current - 1));
  nextBtn.addEventListener("click", () => goTo(current + 1));

  function returnToGame(): void {
    window.history.back();
  }

  document.addEventListener("keydown", (e) => {
    const tag = (document.activeElement && document.activeElement.tagName) || "";
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
    if (e.key === "ArrowRight") { goTo(current + 1); e.preventDefault(); }
    else if (e.key === "ArrowLeft") { goTo(current - 1); e.preventDefault(); }
    else if (e.key === "Escape") { returnToGame(); }
  });

  // Swipe
  (function bindSwipe() {
    let startX: number | null = null, dx = 0, dragging = false;
    const SWIPE_THRESH = 0.20;
    viewport.addEventListener("pointerdown", (e) => {
      if ((e.target as HTMLElement).closest("button, select, input, a, svg .tree-node, .ex-pslot")) return;
      startX = e.clientX; dx = 0; dragging = true;
      try { viewport.setPointerCapture(e.pointerId); } catch (_) {}
    });
    viewport.addEventListener("pointermove", (e) => { if (dragging && startX !== null) dx = e.clientX - startX; });
    viewport.addEventListener("pointerup", () => {
      if (!dragging) return;
      dragging = false;
      const ratio = dx / viewport.clientWidth;
      if (ratio < -SWIPE_THRESH) goTo(current + 1);
      else if (ratio > SWIPE_THRESH) goTo(current - 1);
    });
    viewport.addEventListener("pointercancel", () => { dragging = false; });
  })();

  // Click-to-jump
  document.addEventListener("click", (e) => {
    const j = (e.target as HTMLElement).closest("[data-jump]") as HTMLElement | null;
    if (j) {
      const target = parseInt(j.dataset.jump!, 10);
      goTo(target, { highlight: !!j.dataset.highlight });
    }
  });

  // Intercept home navigations
  document.addEventListener("click", (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const t = (e.target as HTMLElement).closest('a[href="/"], [data-go-home]');
    if (!t) return;
    e.preventDefault();
    returnToGame();
  });

  // "Go deeper" drawers
  document.querySelectorAll<HTMLElement>(".ex-deeper").forEach((btn) => {
    btn.addEventListener("click", () => {
      const drawer = document.getElementById(btn.dataset.drawer!);
      if (!drawer) return;
      const open = !drawer.hidden;
      drawer.hidden = open;
      btn.textContent = open ? "Go deeper ▾" : "Go deeper ▴";
    });
  });

  // Start on slide 1
  goTo(1);
}
