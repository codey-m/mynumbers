// ============================================================================
// INITIALIZATION
// ============================================================================

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

  // Button event listeners
  const menuBtn = document.getElementById("menuBtn");
  if (menuBtn) menuBtn.addEventListener("click", showMenu);

  const resetBtn = document.getElementById("resetBtn");
  if (resetBtn) resetBtn.addEventListener("click", resetSlots);

  const newBtn = document.getElementById("newBtn");
  if (newBtn) newBtn.addEventListener("click", newPuzzle);

  // Mode selection
  const practiceBtn = document.getElementById("practiceBtn");
  if (practiceBtn) practiceBtn.addEventListener("click", startPracticeMode);

  const rush3Btn = document.getElementById("rush3Btn");
  if (rush3Btn) rush3Btn.addEventListener("click", () => startRushMode(3));

  const rush5Btn = document.getElementById("rush5Btn");
  if (rush5Btn) rush5Btn.addEventListener("click", () => startRushMode(5));

  // Inside ARITHMIX explainer link. Two-step navigation to enforce the
  // invariant "entry behind /explainer is menu state":
  //   1. replaceState marks the current shared-route entry as menu — even
  //      if the user was mid-game, the entry left behind now represents
  //      the menu, so browser Back from /explainer lands on menu.
  //   2. location.assign pushes a new /explainer entry. The ?from=app
  //      query tells explainer.js a menu entry is already behind it, so
  //      it skips its own seeding logic (no junk chain on round-trips).
  // Bail on modifier/middle-clicks so "Open in new tab" still works.
  const explainerLink = document.querySelector(".explainer-link");
  if (explainerLink) {
    explainerLink.addEventListener("click", (e) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      history.replaceState({ arithmix: "menu" }, "", "/");
      window.location.assign("/explainer?from=app");
    });
  }

  // bfcache restoration: any time the browser brings this page back from
  // a cached snapshot — typically the user pressing Back from /explainer
  // after having started a game in this tab — drop to the menu. We do not
  // honor history.state here because the user can reach /explainer via
  // routes that bypass game.js's in-app link handler (e.g., browser
  // Forward from a game entry into a previously visited /explainer entry),
  // leaving the / entry marked "game" instead of "menu". Showing the
  // menu unconditionally on persisted pageshow keeps the "menu sits
  // behind /explainer" invariant intact even on those paths, and ensures
  // an in-progress game never silently resumes after the user navigated
  // away. showMenu() also rewrites history.state back to "menu".
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) {
      showMenu();
    }
  });

  const endRushBtn = document.getElementById("endRushBtn");
  if (endRushBtn) {
    endRushBtn.addEventListener("click", () => {
      if (confirm("End this rush session?")) endRushMode();
    });
  }

  const rushReadyBtn = document.getElementById("rushReadyBtn");
  if (rushReadyBtn) {
    rushReadyBtn.addEventListener("click", () => {
      document.getElementById("rush-ready-modal").style.display = "none";
      rushStarted = true;
      rushIntroPlaying = false;
      startTimer();
    });
  }

  // Modal buttons
  const playAgainBtn = document.getElementById("playAgainBtn");
  if (playAgainBtn) {
    playAgainBtn.addEventListener("click", () => {
      const was3Min = gameMode === "rush3";
      startRushMode(was3Min ? 3 : 5, true);
    });
  }

  const backToMenuBtn = document.getElementById("backToMenuBtn");
  if (backToMenuBtn) backToMenuBtn.addEventListener("click", showMenu);

  // X button and click-outside both dismiss the game-over modal
  const gameOverModal = document.getElementById("modal");
  if (gameOverModal) {
    gameOverModal.addEventListener("click", (ev) => {
      if (ev.target === gameOverModal) dismissRushModal();
    });
  }

  const modalCloseBtn = document.getElementById("modalCloseBtn");
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", dismissRushModal);
  }

  // Share / download lightboard
  const shareBtn = document.getElementById("shareBtn");
  if (shareBtn) {
    shareBtn.addEventListener("click", async () => {
      shareBtn.disabled = true;
      try {
        const blob = currentShareBlob || await captureShareBlob();
        if (!blob) { shareBtn.disabled = false; return; }

        const file = new File([blob], "arithmix-lightboard.png", { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({
            text: `Play ARITHMIX! ${GAME_URL}`,
            files: [file],
          }).catch(() => {});
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "arithmix-lightboard.png";
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 10000);
        }
        shareBtn.disabled = false;
      } catch {
        shareBtn.disabled = false;
      }
    });
  }

  // Template area drag/drop
  const template = document.getElementById("template-area");
  if (template) {
    template.ondragover = (ev) => ev.preventDefault();
    template.ondrop = handleDropOnTemplate;
  }

  // Bank area drag/drop
  const bank = document.getElementById("bank");
  if (bank) {
    bank.ondragover = (ev) => ev.preventDefault();
    bank.ondrop = (ev) => {
      ev.preventDefault();
      const dragged = getDragged(ev);
      if (!dragged) return;
      bank.appendChild(dragged);
      updateControls();
    };
  }

  // Click-to-place on desktop only (not touch devices)
  const isTouch = Number(navigator.maxTouchPoints) > 0;
  if (!isTouch && bank) {
    bank.addEventListener("click", (ev) => {
      const item = ev.target.closest(".bank-item");
      if (!item) return;
      if (pointerState) return;

      const next = findNextEmptySlot();
      if (!next) return;
      animateSnapAndPlace(item, next);
    });
  }

  let _lbResizeRAF = null;

  function refreshHomeLightboardItems() {
    const board = document.getElementById("home-lightboard");
    if (!board) return;
    const w = board.offsetWidth;
    if (!w) return;
    document.querySelectorAll(".home-lb-item").forEach(el => {
      const origPx = parseFloat(el.dataset.origFontPx);
      const origW  = parseFloat(el.dataset.origBoardW);
      if (!origPx || !origW) return;
      el.style.fontSize = (origPx * w / origW).toFixed(1) + "px";
    });
  }

  function resizeHomeLightboardCanvas() {
    const canvas = document.getElementById("home-lb-canvas");
    const lb     = document.getElementById("home-lightboard");
    if (!canvas || !lb || !homeLbCfg) return;

    const newW = lb.offsetWidth;
    const newH = lb.offsetHeight;
    if (!newW || !newH) return;

    const oldW = canvas.width;
    const oldH = canvas.height;
    if (oldW === newW && oldH === newH) return;

    canvas.width  = newW;
    canvas.height = newH;

    const wRatio = oldW ? newW / oldW : 1;
    const hRatio = oldH ? newH / oldH : 1;

    homeLbCfg.doodles.forEach(d => {
      d.cx = d.pctCX / 100 * newW;
      d.cy = d.pctCY / 100 * newH;
      homeLbScaleParams(d.type, d.params, wRatio, hRatio);
    });

    // Drop the in-flight firework so the next one is launched at fresh dims.
    homeLbFw = null;
  }

  function refreshLightboardEquations() {
    if (_lbResizeRAF) cancelAnimationFrame(_lbResizeRAF);

    _lbResizeRAF = requestAnimationFrame(() => {
      document.querySelectorAll(".lightboard-eq").forEach(applyLightboardFontSize);
      refreshHomeLightboardItems();
      resizeHomeLightboardCanvas();
    });
  }

  // Window resize (desktop + orientation change fallback)
  window.addEventListener("resize", refreshLightboardEquations);

  // ResizeObserver (best for mobile + layout changes)
  if ("ResizeObserver" in window) {
    const lb = document.getElementById("lightboard");
    if (lb) {
      const ro = new ResizeObserver(refreshLightboardEquations);
      ro.observe(lb);
    }
    const homeLb = document.getElementById("home-lightboard");
    if (homeLb) {
      const ro = new ResizeObserver(refreshLightboardEquations);
      ro.observe(homeLb);
    }
  }

  // Start with menu only (no puzzle)
  showMenu();
});
