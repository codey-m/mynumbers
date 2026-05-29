// ============================================================================
// INITIALIZATION
// ============================================================================

import { suppressClickUntil, GAME_URL, currentShareBlob, pointerState, gameMode } from './state'
import { showMenu, startPracticeMode, startRushMode, endRushMode, startTimer, dismissRushModal, captureShareBlob, hideModal } from './rush'
import { resetSlots, newPuzzle } from './puzzle'
import { findNextEmptySlot, handleDropOnTemplate, animateSnapAndPlace, cancelActiveDrag, pointerDownHandler } from './drag'
import { applyLightboardFontSize, updateControls } from './lightboard'
import { showHomeLightboard, hideHomeLightboard, lightboardConfig, scaleDoodleParams } from './home-lightboard'
import { setRushStarted, setRushIntroPlaying, gameMode as getGameMode } from './state'

document.addEventListener("DOMContentLoaded", () => {
  // Global ghost-click canceller
  document.addEventListener(
    "click",
    (ev) => {
      if (Date.now() < suppressClickUntil) {
        ev.preventDefault()
        ev.stopPropagation()
      }
    },
    true
  )

  // Button event listeners
  const menuBtn = document.getElementById("menuBtn")
  if (menuBtn) menuBtn.addEventListener("click", showMenu)

  const resetBtn = document.getElementById("resetBtn")
  if (resetBtn) resetBtn.addEventListener("click", resetSlots)

  const newBtn = document.getElementById("newBtn")
  if (newBtn) newBtn.addEventListener("click", newPuzzle)

  // Mode selection
  const practiceBtn = document.getElementById("practiceBtn")
  if (practiceBtn) practiceBtn.addEventListener("click", startPracticeMode)

  const rush3Btn = document.getElementById("rush3Btn")
  if (rush3Btn) rush3Btn.addEventListener("click", () => startRushMode(3))

  const rush5Btn = document.getElementById("rush5Btn")
  if (rush5Btn) rush5Btn.addEventListener("click", () => startRushMode(5))

  // Inside ARITHMIX explainer link
  const explainerLink = document.querySelector(".explainer-link")
  if (explainerLink) {
    explainerLink.addEventListener("click", (e) => {
      if ((e as MouseEvent).button !== 0 || (e as KeyboardEvent).metaKey || (e as KeyboardEvent).ctrlKey || (e as KeyboardEvent).shiftKey || (e as KeyboardEvent).altKey) return
      e.preventDefault()
      history.replaceState({ arithmix: "menu" }, "", "/")
      window.location.assign("/explainer?from=app")
    })
  }

  // bfcache restoration
  window.addEventListener("pageshow", (e) => {
    if ((e as PageTransitionEvent).persisted) {
      showMenu()
    }
  })

  const endRushBtn = document.getElementById("endRushBtn")
  if (endRushBtn) {
    endRushBtn.addEventListener("click", () => {
      if (confirm("End this rush session?")) endRushMode()
    })
  }

  const rushReadyBtn = document.getElementById("rushReadyBtn")
  if (rushReadyBtn) {
    rushReadyBtn.addEventListener("click", () => {
      document.getElementById("rush-ready-modal")!.style.display = "none"
      setRushStarted(true)
      setRushIntroPlaying(false)
      startTimer()
    })
  }

  // Modal buttons
  const playAgainBtn = document.getElementById("playAgainBtn")
  if (playAgainBtn) {
    playAgainBtn.addEventListener("click", () => {
      const was3Min = getGameMode === "rush3"
      startRushMode(was3Min ? 3 : 5, true)
    })
  }

  const backToMenuBtn = document.getElementById("backToMenuBtn")
  if (backToMenuBtn) backToMenuBtn.addEventListener("click", showMenu)

  // X button and click-outside both dismiss the game-over modal
  const gameOverModal = document.getElementById("modal")
  if (gameOverModal) {
    gameOverModal.addEventListener("click", (ev) => {
      if (ev.target === gameOverModal) dismissRushModal()
    })
  }

  const modalCloseBtn = document.getElementById("modalCloseBtn")
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", dismissRushModal)
  }

  // Share / download lightboard
  const shareBtn = document.getElementById("shareBtn")
  if (shareBtn) {
    shareBtn.addEventListener("click", async () => {
      (shareBtn as HTMLButtonElement).disabled = true
      try {
        const blob = currentShareBlob || await captureShareBlob()
        if (!blob) { (shareBtn as HTMLButtonElement).disabled = false; return }

        const file = new File([blob], "arithmix-lightboard.png", { type: "image/png" })
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({
            text: `Play ARITHMIX! ${GAME_URL}`,
            files: [file],
          }).catch(() => {})
        } else {
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = "arithmix-lightboard.png"
          a.click()
          setTimeout(() => URL.revokeObjectURL(url), 10000)
        }
        (shareBtn as HTMLButtonElement).disabled = false
      } catch {
        (shareBtn as HTMLButtonElement).disabled = false
      }
    })
  }

  // Template area drag/drop
  const template = document.getElementById("template-area")
  if (template) {
    template.ondragover = (ev) => ev.preventDefault()
    template.ondrop = handleDropOnTemplate as any
  }

  // Bank area drag/drop
  const bank = document.getElementById("bank")
  if (bank) {
    bank.ondragover = (ev) => ev!.preventDefault()
    bank.ondrop = (ev) => {
      ev!.preventDefault()
      const id = ev!.dataTransfer!.getData("text/plain")
      const dragged = id ? document.getElementById(id) : null
      if (!dragged) return
      bank.appendChild(dragged)
      updateControls()
    }
  }

  // Click-to-place on desktop only
  const isTouch = Number(navigator.maxTouchPoints) > 0
  if (!isTouch && bank) {
    bank.addEventListener("click", (ev) => {
      const item = (ev.target as HTMLElement).closest(".bank-item") as HTMLElement | null
      if (!item) return
      if (pointerState) return

      const next = findNextEmptySlot()
      if (!next) return
      animateSnapAndPlace(item, next)
    })
  }

  let resizeAnimationFrame: number | null = null

  function refreshHomeLightboardItems() {
    const board = document.getElementById("home-lightboard")
    if (!board) return
    const w = board.offsetWidth
    if (!w) return
    document.querySelectorAll<HTMLElement>(".home-lb-item").forEach(el => {
      const origPx = parseFloat(el.dataset.origFontPx!)
      const origW = parseFloat(el.dataset.origBoardW!)
      if (!origPx || !origW) return
      el.style.fontSize = (origPx * w / origW).toFixed(1) + "px"
    })
  }

  function resizeHomeLightboardCanvas() {
    const canvas = document.getElementById("home-lb-canvas") as HTMLCanvasElement | null
    const lb = document.getElementById("home-lightboard")
    if (!canvas || !lb || !lightboardConfig) return

    const newW = lb.offsetWidth
    const newH = lb.offsetHeight
    if (!newW || !newH) return

    const oldW = canvas.width
    const oldH = canvas.height
    if (oldW === newW && oldH === newH) return

    canvas.width = newW
    canvas.height = newH

    const wRatio = oldW ? newW / oldW : 1
    const hRatio = oldH ? newH / oldH : 1

    lightboardConfig.doodles.forEach(d => {
      d.cx = d.pctCX / 100 * newW
      d.cy = d.pctCY / 100 * newH
      scaleDoodleParams(d.type, d.params, wRatio, hRatio)
    })

    // Drop the in-flight firework so the next one is launched at fresh dims.
    // (homeLbFw is module-private, but the resize + next frame handles this)
  }

  function refreshLightboardEquations() {
    if (resizeAnimationFrame) cancelAnimationFrame(resizeAnimationFrame)

    resizeAnimationFrame = requestAnimationFrame(() => {
      document.querySelectorAll<HTMLElement>(".lightboard-eq").forEach(applyLightboardFontSize)
      refreshHomeLightboardItems()
      resizeHomeLightboardCanvas()
    })
  }

  // Window resize
  window.addEventListener("resize", refreshLightboardEquations)

  // ResizeObserver
  if ("ResizeObserver" in window) {
    const lb = document.getElementById("lightboard")
    if (lb) {
      const ro = new ResizeObserver(refreshLightboardEquations)
      ro.observe(lb)
    }
    const homeLb = document.getElementById("home-lightboard")
    if (homeLb) {
      const ro = new ResizeObserver(refreshLightboardEquations)
      ro.observe(homeLb)
    }
  }

  // Start with menu only (no puzzle)
  showMenu()
})
