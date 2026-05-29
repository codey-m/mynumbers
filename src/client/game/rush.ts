// ============================================================================
// RUSH MODE UTILITIES
// ============================================================================

import {
  puzzle, gameMode, rushTimer, timeRemaining, puzzlesSolved,
  currentDifficulty, maxDifficultyReached, rushIntroPlaying,
  skipIntroAnimation, rushStarted, currentShareBlob, currentShareBlobURL,
  GAME_URL, LIGHTBOARD_COLORS,
  setPuzzle, setGameMode, setRushTimer, setTimeRemaining,
  setPuzzlesSolved, setCurrentDifficulty, setMaxDifficultyReached,
  setRushIntroPlaying, setSkipIntroAnimation, setRushStarted,
  setCurrentShareBlob, setCurrentShareBlobURL,
} from './state'
import { clearLightboard, addEquationToLightboard, updateControls, playWrongFillAnimation } from './lightboard'
import { showHomeLightboard, hideHomeLightboard } from './home-lightboard'
import { newPuzzle } from './puzzle'

export function calculateDifficulty(solved: number): number {
  if (solved <= 1) return 1
  if (solved <= 2) return 2
  if (solved <= 4) return 3
  if (solved <= 6) return 4
  if (solved <= 8) return 5
  if (solved <= 10) return 6
  if (solved <= 12) return 7
  if (solved <= 13) return 8
  if (solved <= 14) return 9
  if (solved <= 15) return 10
  if (solved <= 16) return 11
  return 12
}

function setBankAreaVisible(visible: boolean): void {
  const el = document.getElementById("bankArea")
  if (!el) return
  el.style.display = visible ? "" : "none"
}

export function showMenu(): void {
  if (history.state?.arithmix !== "menu") {
    history.replaceState({ arithmix: "menu" }, "", "/")
  }

  (window as any).logoCycle?.startAccentCycle()

  setGameMode(null)
  setBankAreaVisible(false)

  if (rushTimer) {
    clearInterval(rushTimer)
    setRushTimer(null)
  }

  hideModal()

  const menuBtn = document.getElementById("menuBtn")
  if (menuBtn) menuBtn.style.display = "none"

  document.body.classList.add("menu-mode")
  document.getElementById("mode-selector")!.style.display = "flex"
  document.getElementById("rush-stats")!.style.display = "none"
  document.getElementById("practice-stats")!.style.display = "none"
  document.getElementById("how-to-play")!.style.display = "none"
  document.getElementById("rush-ready-modal")!.style.display = "none"
  document.getElementById("lightboard-section")!.style.display = "none"
  showHomeLightboard()

  document.getElementById("template-area")!.innerHTML =
    '<p style="text-align:center;color:#999;padding:20px;">Select a mode to begin</p>'
  document.getElementById("bank")!.innerHTML = ""
  document.getElementById("result")!.textContent = ""

  document.getElementById("menuBtn")!.style.display = "none"
  document.getElementById("resetBtn")!.style.display = "none"
  document.getElementById("newBtn")!.style.display = "none"
  document.getElementById("endRushBtn")!.style.display = "none"

  setPuzzle(null)
}

export function startPracticeMode(): void {
  history.replaceState({ arithmix: "game" }, "", "/")

  void (window as any).logoCycle?.stopAccentCycle()

  setGameMode("practice")
  document.body.classList.remove("menu-mode")
  hideModal()
  hideHomeLightboard()
  setBankAreaVisible(true)

  document.getElementById("mode-selector")!.style.display = "none"
  document.getElementById("rush-stats")!.style.display = "none"
  document.getElementById("practice-stats")!.style.display = "flex"
  document.getElementById("how-to-play")!.style.display = "block"
  document.getElementById("lightboard-section")!.style.display = "none"

  document.getElementById("resetBtn")!.style.display = "inline-block"
  document.getElementById("newBtn")!.style.display = "inline-block"
  document.getElementById("menuBtn")!.style.display = "inline-block"
  document.getElementById("endRushBtn")!.style.display = "none"

  newPuzzle()
}

export function startRushMode(minutes: number, skipIntro = false): void {
  history.replaceState({ arithmix: "game" }, "", "/")

  setSkipIntroAnimation(skipIntro)
  void (window as any).logoCycle?.stopAccentCycle()

  setGameMode(minutes === 3 ? "rush3" : "rush5")
  document.body.classList.remove("menu-mode")
  hideHomeLightboard()

  const menuBtn = document.getElementById("menuBtn")
  if (menuBtn) menuBtn.style.display = "none"

  setPuzzlesSolved(0)
  setCurrentDifficulty(1)
  setMaxDifficultyReached(1)
  setTimeRemaining(minutes * 60)
  updateTimerDisplay()
  setRushStarted(false)

  hideModal()
  setBankAreaVisible(true)
  document.getElementById("mode-selector")!.style.display = "none"
  document.getElementById("rush-stats")!.style.display = "flex"
  document.getElementById("practice-stats")!.style.display = "none"
  document.getElementById("how-to-play")!.style.display = "none"
  document.getElementById("resetBtn")!.style.display = "inline-block"
  document.getElementById("endRushBtn")!.style.display = "inline-block"
  document.getElementById("newBtn")!.style.display = "none"

  clearLightboard()
  document.getElementById("lightboard-section")!.style.display = "block"

  updateRushUI()
  newPuzzle()
}

export function startCountdown(): void {
  const overlay = document.getElementById("countdown-overlay")
  const numEl = document.getElementById("countdown-number")
  if (!overlay || !numEl) {
    setRushStarted(true)
    setRushIntroPlaying(false)
    startTimer()
    return
  }

  let count = 3
  overlay.style.display = "flex"

  function tick() {
    numEl!.textContent = String(count)
    numEl!.textContent = String(count)
    numEl!.style.animation = "none"
    void (numEl as HTMLElement).offsetWidth // reflow
    numEl!.style.animation = ""

    if (count === 1) {
      setTimeout(() => {
        numEl!.textContent = "GO!"
        numEl!.style.animation = "none"
        void (numEl as HTMLElement).offsetWidth
        numEl!.style.animation = ""
        setTimeout(() => {
          overlay!.style.display = "none"
          setRushStarted(true)
          setRushIntroPlaying(false)
          startTimer()
        }, 700)
      }, 750)
      return
    }
    count--
    setTimeout(tick, 750)
  }
  tick()
}

export function startTimer(): void {
  if (rushTimer) clearInterval(rushTimer)

  setRushTimer(setInterval(() => {
    setTimeRemaining(timeRemaining - 1)
    updateTimerDisplay()

    if (timeRemaining <= 1) endRushMode()
  }, 1000))
}

export function updateTimerDisplay(): void {
  const mins = Math.floor(timeRemaining / 60)
  const secs = timeRemaining % 60
  const timerEl = document.getElementById("timer")
  if (!timerEl) return

  timerEl.textContent = `${mins}:${secs.toString().padStart(2, "0")}`

  if (timeRemaining <= 10) timerEl.style.color = "#dc2626"
  else if (timeRemaining <= 30) timerEl.style.color = "#f59e0b"
  else timerEl.style.color = "#ffffff"
}

export function updateRushUI(): void {
  const diffEl = document.getElementById("difficulty-level")
  if (diffEl) diffEl.textContent = String(puzzlesSolved + 1)

  const targetEl = document.getElementById("rush-target")
  if (targetEl) targetEl.textContent = puzzle ? String(puzzle.target) : "—"
}

export async function captureShareBlob(): Promise<Blob | null> {
  const board = document.getElementById("lightboard")
  if (!board) return null

  const scale = 2
  const boardRect = board.getBoundingClientRect()
  const w = Math.round(boardRect.width * scale)
  const h = Math.round(boardRect.height * scale)

  const out = document.createElement("canvas")
  out.width = w
  out.height = h
  const ctx = out.getContext("2d")!

  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, w, h)

  const timImgEl = board.parentElement?.querySelector<HTMLImageElement>(".lightboard-tim")
  if (timImgEl) {
    try {
      const resp = await fetch(timImgEl.src)
      const blob = await resp.blob()
      const blobUrl = URL.createObjectURL(blob)
      await new Promise<void>((res) => {
        const img = new Image()
        img.onload = () => {
          const tr = timImgEl.getBoundingClientRect()
          const dx = (tr.left - boardRect.left) * scale
          const dy = (tr.top - boardRect.top) * scale
          const dw = tr.width * scale
          const dh = tr.height * scale
          const nw = img.naturalWidth || 2189.7706
          const nh = img.naturalHeight || 547.0416
          const coverScale = tr.height / nh
          const srcW = tr.width / coverScale
          const srcX = nw - srcW
          ctx.save()
          ctx.globalAlpha = 0.85
          try { (ctx as any).filter = "brightness(0.88) saturate(0.9)" } catch (_) {}
          ctx.drawImage(img, srcX, 0, srcW, nh, dx, dy, dw, dh)
          ctx.restore()
          URL.revokeObjectURL(blobUrl)
          res()
        }
        img.onerror = () => { URL.revokeObjectURL(blobUrl); res() }
        img.src = blobUrl
      })
    } catch (_) {}
  }

  const grad = ctx.createLinearGradient(0, 0, w, 0)
  grad.addColorStop(0, "rgba(0, 0, 0, 0.78)")
  grad.addColorStop(0.55, "rgba(0, 0, 0, 0.78)")
  grad.addColorStop(1, "rgba(18, 18, 48, 0.58)")
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)

  const vig = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.75)
  vig.addColorStop(0, "rgba(0,5,40,0)")
  vig.addColorStop(1, "rgba(0,5,40,0.35)")
  ctx.fillStyle = vig
  ctx.fillRect(0, 0, w, h)

  try { await document.fonts.load(`600 34px Caveat`) } catch (_) {}

  const surface = document.getElementById("lightboard-surface")
  if (surface) {
    ctx.textBaseline = "top"
    surface.querySelectorAll<HTMLElement>(".lightboard-eq").forEach(el => {
      const leftPct = parseFloat(el.style.left) / 100
      const topPct = parseFloat(el.style.top) / 100
      const x = leftPct * w
      const y = topPct * h
      const fontSize = parseFloat(window.getComputedStyle(el).fontSize) * scale
      const color = el.style.color || "#fff"
      const glowMatch = (el.style.textShadow || "").match(/rgba?\([^)]+\)/)
      const glow = glowMatch ? glowMatch[0] : color

      ctx.save()
      ctx.font = `600 ${fontSize}px Caveat, cursive`
      ctx.fillStyle = color
      ctx.shadowColor = glow
      ctx.shadowBlur = 22 * scale
      ctx.fillText(el.textContent!, x, y)
      ctx.shadowBlur = 10 * scale
      ctx.fillText(el.textContent!, x, y)
      ctx.shadowBlur = 0
      ctx.fillText(el.textContent!, x, y)
      ctx.restore()
    })
  }

  return new Promise(resolve => out.toBlob(blob => resolve(blob), "image/png"))
}

export async function endRushMode(): Promise<void> {
  if (rushTimer) {
    clearInterval(rushTimer)
    setRushTimer(null)
  }

  document.getElementById("rush-ready-modal")!.style.display = "none"
  setRushIntroPlaying(false)

  if (currentShareBlobURL) {
    URL.revokeObjectURL(currentShareBlobURL)
    setCurrentShareBlobURL(null)
  }
  setCurrentShareBlob(null)
  try {
    setCurrentShareBlob(await captureShareBlob())
  } catch { /* ignore */ }

  document.getElementById("lightboard-section")!.querySelector<HTMLElement>(".lightboard-tim")!.style.display = "none"

  const puzzlesSolvedEl = document.getElementById("puzzlesSolved")
  if (puzzlesSolvedEl) puzzlesSolvedEl.textContent = String(puzzlesSolved)

  const timImg = document.getElementById("tim-img") as HTMLImageElement | null
  if (timImg) {
    timImg.src = puzzlesSolved >= 5
      ? "/static/images/tim-wave.svg"
      : "/static/images/tim-front.svg"
  }

  const shareBtn = document.getElementById("shareBtn")
  if (shareBtn) shareBtn.style.display = ""

  showModal()
}

export function showModal(): void {
  const modal = document.getElementById("modal")
  if (modal) modal.style.display = "flex"
  launchCelebration(puzzlesSolved)
}

export function hideModal(): void {
  const modal = document.getElementById("modal")
  if (modal) modal.style.display = "none"
  stopFireworks()
}

// ── Celebration ──────────────────────────────────────────────────────────────

interface FwParticle {
  x: number; y: number
  vx: number; vy: number
  alpha: number
  [key: string]: any
}

let fireworksAnimId: number | null = null
const fireworkParticles: FwParticle[] = []

function launchCelebration(n: number): void {
  if (n <= 3) {
    launchConfettiPoppers(n)
  } else {
    launchFireworks(n)
  }
}

function launchConfettiPoppers(n: number): void {
  if (n === 0) return
  const canvas = document.getElementById("fireworks-canvas") as HTMLCanvasElement | null
  const timEl = document.getElementById("tim-img")
  if (!canvas || !timEl) return
  const overlay = canvas.parentElement!
  canvas.width = overlay.offsetWidth || window.innerWidth
  canvas.height = overlay.offsetHeight || window.innerHeight
  const ctx = canvas.getContext("2d")!
  fireworkParticles.length = 0

  const COLORS = [
    [255, 60, 60], [255, 210, 50], [50, 210, 80],
    [70, 160, 255], [210, 60, 210], [255, 155, 50],
  ]

  const r = timEl.getBoundingClientRect()
  const tx = r.left + r.width / 2
  const ty = r.top + r.height / 2

  const pops = [
    { x: tx, y: ty - r.height * 0.65, aC: -Math.PI / 2, spread: Math.PI * 0.55 },
    { x: tx + r.width * 0.6, y: ty, aC: -Math.PI * 0.15, spread: Math.PI * 0.45 },
    { x: tx - r.width * 0.6, y: ty, aC: -Math.PI * 0.85, spread: Math.PI * 0.45 },
  ].slice(0, n)

  let popsDone = 0

  function pop() {
    if (popsDone >= pops.length) return
    const pos = pops[popsDone++]
    for (let i = 0; i < 32; i++) {
      const angle = pos.aC - pos.spread / 2 + Math.random() * pos.spread
      const speed = 1.2 + Math.random() * 2.8
      const color = COLORS[Math.floor(Math.random() * COLORS.length)]
      fireworkParticles.push({
        x: pos.x, y: pos.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        color,
        w: 4 + Math.random() * 3,
        h: 2 + Math.random() * 2,
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 0.25,
      })
    }
  }

  pop()
  const iv = setInterval(() => {
    pop()
    if (popsDone >= pops.length) clearInterval(iv)
  }, 360)

  function frame() {
    ctx.clearRect(0, 0, canvas!.width, canvas!.height)
    for (let i = fireworkParticles.length - 1; i >= 0; i--) {
      const p = fireworkParticles[i]
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.07
      p.vx *= 0.98
      p.alpha -= 0.014
      p.rot += p.rotV
      if (p.alpha <= 0) { fireworkParticles.splice(i, 1); continue }
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.globalAlpha = p.alpha
      const [rr, g, b] = p.color
      ctx.fillStyle = `rgb(${rr},${g},${b})`
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
      ctx.restore()
    }
    if (fireworkParticles.length > 0 || popsDone < pops.length) {
      fireworksAnimId = requestAnimationFrame(frame)
    } else {
      fireworksAnimId = null
    }
  }
  fireworksAnimId = requestAnimationFrame(frame)
}

function launchFireworks(level: number): void {
  const canvas = document.getElementById("fireworks-canvas") as HTMLCanvasElement | null
  if (!canvas) return
  const overlay = canvas.parentElement!
  canvas.width = overlay.offsetWidth || window.innerWidth
  canvas.height = overlay.offsetHeight || window.innerHeight
  const ctx = canvas.getContext("2d")!
  fireworkParticles.length = 0

  const COLORS = [0, 30, 55, 200, 280, 340]
  const scale = level - 4
  const TOTAL_BURSTS = Math.min(3 + scale * 2, 22)
  const particleCount = Math.min(35 + scale * 5, 90)
  const baseSpeed = 1.5 + Math.min(scale * 0.15, 1.5)
  const burstInterval = Math.max(170, 350 - scale * 25)

  let burstsDone = 0

  function burst() {
    if (burstsDone >= TOTAL_BURSTS) return
    burstsDone++
    const cx = 0.15 * canvas!.width + Math.random() * 0.7 * canvas!.width
    const cy = 0.1 * canvas!.height + Math.random() * 0.5 * canvas!.height
    const hue = COLORS[Math.floor(Math.random() * COLORS.length)]
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.3
      const speed = baseSpeed + Math.random() * 3.5
      fireworkParticles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5,
        alpha: 1,
        hue: hue + Math.floor(Math.random() * 40) - 20,
        r: 2 + Math.random() * 2,
      })
    }
  }

  burst()
  const iv = setInterval(() => {
    burst()
    if (burstsDone >= TOTAL_BURSTS) clearInterval(iv)
  }, burstInterval)

  function frame() {
    ctx.clearRect(0, 0, canvas!.width, canvas!.height)
    for (let i = fireworkParticles.length - 1; i >= 0; i--) {
      const p = fireworkParticles[i]
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.06
      p.alpha -= 0.013
      if (p.alpha <= 0) { fireworkParticles.splice(i, 1); continue }
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${p.hue},90%,60%,${p.alpha})`
      ctx.fill()
    }
    if (fireworkParticles.length > 0 || burstsDone < TOTAL_BURSTS) {
      fireworksAnimId = requestAnimationFrame(frame)
    } else {
      fireworksAnimId = null
    }
  }
  fireworksAnimId = requestAnimationFrame(frame)
}

function stopFireworks(): void {
  if (fireworksAnimId) { cancelAnimationFrame(fireworksAnimId); fireworksAnimId = null }
  fireworkParticles.length = 0
  const canvas = document.getElementById("fireworks-canvas") as HTMLCanvasElement | null
  if (canvas) canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height)
}

export function dismissRushModal(): void {
  hideModal()

  const preview = document.getElementById("lightboard-preview")
  if (preview) (preview as HTMLElement).style.display = "none"
  if (currentShareBlobURL) {
    URL.revokeObjectURL(currentShareBlobURL)
    setCurrentShareBlobURL(null)
  }

  const timEl = document.querySelector<HTMLElement>("#lightboard-section .lightboard-tim")
  if (timEl) timEl.style.display = ""
  document.getElementById("endRushBtn")!.style.display = "none"
  document.getElementById("menuBtn")!.style.display = "inline-block"
  document.querySelectorAll<HTMLElement>(".bank-item").forEach(el => el.classList.add("bank-item--locked"))
}
