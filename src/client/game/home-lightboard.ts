// ============================================================================
// HOME LIGHTBOARD
// ============================================================================

interface LightboardItem {
  text: string
  color: string
  glow: string
}

interface LightboardFont {
  family: string
  weight: number
}

interface DoodleParams {
  [key: string]: any
}

interface Doodle {
  type: string
  cx: number
  cy: number
  pctCX: number
  pctCY: number
  params: DoodleParams
  showMs: number
}

interface LightboardConfig {
  doodles: Doodle[]
}

const measureCanvas = document.createElement("canvas")
const measureContext = measureCanvas.getContext("2d")!

const HOME_LB_POOL: LightboardItem[] = [
  { text: "e<sup>iπ</sup> + 1 = 0", color: "#ff6ec7", glow: "rgba(255,110,199,0.5)" },
  { text: "π ≈ 3.14159",          color: "#00d4ff", glow: "rgba(0,212,255,0.5)"   },
  { text: "E = mc²",              color: "#ffe033", glow: "rgba(255,224,51,0.5)"  },
  { text: "√2 ≈ 1.414",           color: "#ff9d00", glow: "rgba(255,157,0,0.5)"   },
  { text: "F = ma",               color: "#39ff14", glow: "rgba(57,255,20,0.5)"   },
  { text: "Est. 1861",            color: "#c77dff", glow: "rgba(199,125,255,0.5)" },
  { text: "∑ 1/n² = π²/6",       color: "#00d4ff", glow: "rgba(0,212,255,0.5)"   },
  { text: "ℏω = E",               color: "#ffe033", glow: "rgba(255,224,51,0.5)"  },
  { text: "∇²ψ = 0",              color: "#39ff14", glow: "rgba(57,255,20,0.5)"   },
  { text: "PV = nRT",             color: "#ff9d00", glow: "rgba(255,157,0,0.5)"   },
  { text: "i² = −1",              color: "#c77dff", glow: "rgba(199,125,255,0.5)" },
  { text: "a² + b² = c²",        color: "#ff6ec7", glow: "rgba(255,110,199,0.5)" },
  { text: "det(A) ≠ 0",          color: "#00d4ff", glow: "rgba(0,212,255,0.5)"   },
  { text: "lim 1/n → 0",         color: "#ffe033", glow: "rgba(255,224,51,0.5)"  },
  { text: "∫eˣ dx = eˣ + C",    color: "#39ff14", glow: "rgba(57,255,20,0.5)"   },
  { text: "φ = (1+√5)/2",        color: "#ff9d00", glow: "rgba(255,157,0,0.5)"   },
  { text: "H|ψ⟩ = E|ψ⟩",        color: "#c77dff", glow: "rgba(199,125,255,0.5)" },
  { text: "Cambridge, MA",        color: "#ff6ec7", glow: "rgba(255,110,199,0.5)" },
  { text: "n! ~ (n/e)ⁿ√(2πn)",  color: "#00d4ff", glow: "rgba(0,212,255,0.5)"   },
]

const HOME_LB_FONTS: LightboardFont[] = [
  { family: "'Caveat'",              weight: 600 },
  { family: "'Patrick Hand'",        weight: 400 },
  { family: "'Architects Daughter'", weight: 400 },
  { family: "'Kalam'",               weight: 700 },
  { family: "'Kalam'",               weight: 400 },
]
const HOME_LB_SIZES = [17, 21, 25, 30, 36]

function pickStyle(text: string): { family: string; weight: number; size: number; widthPct: number; heightPct: number } {
  const font = HOME_LB_FONTS[Math.floor(Math.random() * HOME_LB_FONTS.length)]
  const boardEl = document.getElementById("home-lightboard")
  const boardW = boardEl ? boardEl.offsetWidth : 640
  const boardH = boardEl ? boardEl.offsetHeight : 300
  const scale = Math.min(1, boardW / 640)
  const maxSize = Math.floor((text.length > 15 ? 25 : text.length > 11 ? 30 : 36) * scale)
  const sizes = HOME_LB_SIZES.filter(s => s <= maxSize)
  const size = sizes.length ? sizes[Math.floor(Math.random() * sizes.length)] : HOME_LB_SIZES[0]
  const plain = text.replace(/<[^>]+>/g, "")
  measureContext.font = `${font.weight} ${size}px ${font.family}`
  const widthPct = (measureContext.measureText(plain).width + 12) / boardW * 100
  const heightPct = (size * 1.75) / boardH * 100
  return { family: font.family, weight: font.weight, size, widthPct, heightPct }
}

const DOODLE_POOL = ['gear', 'sine', 'helix', 'matrix', 'atom', 'fibonacci', 'venn', 'triangle', 'star', 'numberLine', 'rocket', 'dna', 'lightbulb', 'numtiles']
const DOODLE_PCT: Record<string, { rw: number; rh: number }> = {
  gear:       { rw: 9,  rh: 10 },
  sine:       { rw: 14, rh: 22 },
  helix:      { rw: 10, rh: 22 },
  matrix:     { rw: 17, rh: 13 },
  atom:       { rw: 11, rh: 11 },
  fibonacci:  { rw: 12, rh: 12 },
  venn:       { rw: 16, rh: 10 },
  triangle:   { rw: 10, rh: 10 },
  star:       { rw:  7, rh:  7 },
  numberLine: { rw: 17, rh:  6 },
  rocket:     { rw:  7, rh: 16 },
  dna:        { rw:  9, rh: 19 },
  lightbulb:  { rw: 10, rh: 14 },
  numtiles:   { rw: 17, rh: 12 },
}

let animationFrameId: number | null = null
let mutationTimer: ReturnType<typeof setTimeout> | null = null
let stars: any[] = []
let currentStar: any = null
let currentFirework: any = null
let currentStartTs: number | null = null
export let lightboardConfig: LightboardConfig | null = null

const DOODLE_PARAM_AXES: Record<string, Record<string, string>> = {
  gear:       { r: "h" },
  sine:       { gw: "w", gh: "h" },
  helix:      { gw: "w", gh: "h" },
  matrix:     { cw: "w", ch: "h" },
  atom:       { r: "h" },
  fibonacci:  { r: "h" },
  venn:       { r: "w" },
  triangle:   { size: "h" },
  star:       { r: "h" },
  numberLine: { lw: "w" },
  rocket:     { rh: "h" },
  dna:        { gw: "w", gh: "h" },
  lightbulb:  { r: "h" },
  numtiles:   { tw: "w" },
}

export function scaleDoodleParams(type: string, params: DoodleParams, wRatio: number, hRatio: number): void {
  const axes = DOODLE_PARAM_AXES[type]
  if (!axes) return
  for (const key in axes) {
    if (typeof params[key] !== "number") continue
    params[key] *= (axes[key] === "w" ? wRatio : hRatio)
  }
}

function buildDoodleParams(type: string, w: number, h: number): DoodleParams {
  switch (type) {
    case 'gear':       return { r: h * (0.060 + Math.random() * 0.035) }
    case 'sine':       return { gw: w * (0.110 + Math.random() * 0.050), gh: h * (0.24 + Math.random() * 0.10) }
    case 'helix':      return { gw: w * (0.080 + Math.random() * 0.040), gh: h * (0.24 + Math.random() * 0.12) }
    case 'matrix':     return { cw: w * (0.048 + Math.random() * 0.018), ch: h * (0.10 + Math.random() * 0.04) }
    case 'atom':       return { r: h * (0.070 + Math.random() * 0.030) }
    case 'fibonacci':  return { r: h * (0.090 + Math.random() * 0.030) }
    case 'venn':       return { r: w * (0.055 + Math.random() * 0.020) }
    case 'triangle':   return { size: h * (0.110 + Math.random() * 0.040) }
    case 'star':       return { r: h * (0.055 + Math.random() * 0.025) }
    case 'numberLine': return { lw: w * (0.140 + Math.random() * 0.070) }
    case 'rocket':     return { rh: h * (0.130 + Math.random() * 0.040) }
    case 'dna':        return { gw: w * (0.050 + Math.random() * 0.022), gh: h * (0.22 + Math.random() * 0.08) }
    case 'lightbulb':  return { r: h * (0.075 + Math.random() * 0.030) }
    case 'numtiles': {
      const tw = w * (0.028 + Math.random() * 0.010)
      const order = [0, 1, 2, 3, 4, 5, 6, 7, 8].sort(() => Math.random() - 0.5)
      const ci = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(() => Math.floor(Math.random() * _TILE_COLORS.length))
      const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5)
      return { tw, order, ci, nums }
    }
    default: return {}
  }
}

function buildConfig(w: number, h: number): LightboardConfig {
  const types = [...DOODLE_POOL].sort(() => Math.random() - 0.5).slice(0, 4 + Math.floor(Math.random() * 2))
  const doodles: Doodle[] = []

  for (const type of types) {
    const sz = DOODLE_PCT[type]
    let placed = false

    for (let attempt = 0; attempt < 80; attempt++) {
      let pctX: number, pctY: number
      const zone = Math.random()
      if (zone < 0.55) {
        pctX = sz.rw + Math.random() * Math.max(1, 95 - sz.rw * 2)
        pctY = sz.rh + Math.random() * Math.max(1, 44 - sz.rh * 2)
      } else {
        pctX = sz.rw + Math.random() * Math.max(1, 95 - sz.rw * 2)
        pctY = 50 + sz.rh + Math.random() * Math.max(1, 38 - sz.rh * 2)
      }

      const overlaps = doodles.some(d => {
        const osz = DOODLE_PCT[d.type]
        const dx = (pctX - d.pctCX) / (sz.rw + osz.rw)
        const dy = (pctY - d.pctCY) / (sz.rh + osz.rh)
        return dx * dx + dy * dy < 1
      })

      if (!overlaps) {
        doodles.push({ type, cx: pctX / 100 * w, cy: pctY / 100 * h, pctCX: pctX, pctCY: pctY,
          params: buildDoodleParams(type, w, h), showMs: 0 })
        placed = true
        break
      }
    }

    if (!placed) {
      const pctX = sz.rw + Math.random() * Math.max(1, 95 - sz.rw * 2)
      const pctY = sz.rh + Math.random() * Math.max(1, 90 - sz.rh * 2)
      doodles.push({ type, cx: pctX / 100 * w, cy: pctY / 100 * h, pctCX: pctX, pctCY: pctY,
        params: buildDoodleParams(type, w, h), showMs: 0 })
    }
  }

  let t = 0
  doodles.forEach(d => { d.showMs = t; t += (3 + Math.random() * 4) * 1000 })
  return { doodles }
}

function findRandomPositions(
  entries: { widthPct?: number; heightPct?: number }[],
  reservedZones: { cx: number; cy: number; rw: number; rh: number }[],
  alreadyPlaced: { x: number; y: number; wPct?: number; hPct?: number }[] = []
): { x: number; y: number; wPct: number; hPct: number }[] {
  const count = entries.length
  const placed = [...alreadyPlaced]
  const newItems: { x: number; y: number; wPct: number; hPct: number }[] = []
  const MIN_DIST = 22
  const MAX_TRIES = 120

  function conflicts(x: number, y: number, wPct: number, hPct: number): boolean {
    if (x < 1 || x + wPct > 95 || y < 1 || y + hPct > 94) return true
    for (const tx of [x, x + wPct * 0.5, x + wPct]) {
      for (const z of reservedZones) {
        const dx = (tx - z.cx) / z.rw, dy = (y - z.cy) / z.rh
        if (dx * dx + dy * dy < 1) return true
      }
    }
    for (const p of placed) {
      const pw = p.wPct ?? 20
      for (const ox of [0, pw * 0.5, pw]) {
        const dx = (x + wPct * 0.5) - (p.x + ox), dy = (y - p.y) * 1.6
        if (dx * dx + dy * dy < MIN_DIST * MIN_DIST) return true
      }
    }
    return false
  }

  for (let i = 0; i < count; i++) {
    const wPct = entries[i].widthPct ?? 20
    const hPct = entries[i].heightPct ?? 10
    const maxX = Math.max(2, 95 - wPct)
    const maxY = Math.max(2, 94 - hPct)
    let pos: { x: number; y: number; wPct: number; hPct: number } | null = null
    for (let a = 0; a < MAX_TRIES; a++) {
      let x: number, y: number
      const r = Math.random()
      if (r < 0.55) {
        x = 2 + Math.random() * Math.min(80, maxX - 2)
        y = 2 + Math.random() * Math.min(42, maxY - 2)
      } else {
        x = 2 + Math.random() * (maxX - 2)
        y = Math.min(48, maxY - 2) + Math.random() * Math.max(0, maxY - Math.min(48, maxY - 2))
      }
      x = Math.min(x, maxX)
      y = Math.min(y, maxY)
      if (!conflicts(x, y, wPct, hPct)) { pos = { x, y, wPct, hPct }; break }
    }
    if (pos) { placed.push(pos); newItems.push(pos) }
  }
  return newItems
}

// ── Firework ──────────────────────────────────────────────────────────────────
const FW_COLORS = ["#ff1423", "#ff6ec7", "#ffe033", "#00d4ff", "#c77dff", "#39ff14", "#ff9d00"]

function createFirework(w: number, h: number): any {
  const left = Math.random() > 0.5
  const sx = left ? w * 0.07 : w * 0.93
  const ex = sx + (left ? 1 : -1) * w * (0.04 + Math.random() * 0.10)
  const ey = h * (0.10 + Math.random() * 0.28)
  return { phase: "launch", sx, x: sx, y: h, ex, ey, start: null, launchMs: 900, explodeAt: null, particles: [] }
}

function updateFirework(ctx: CanvasRenderingContext2D, fw: any, ts: number): boolean {
  if (!fw.start) fw.start = ts
  if (fw.phase === "launch") {
    const p = Math.min((ts - fw.start) / fw.launchMs, 1)
    fw.x = fw.sx + (fw.ex - fw.sx) * p
    fw.y = fw.y + (fw.ey - fw.y) * (p < 1 ? 0.08 : 1)
    ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = "#fff"
    ctx.shadowColor = "#fff"; ctx.shadowBlur = 8
    ctx.beginPath(); ctx.arc(fw.x, fw.y, 2, 0, Math.PI * 2); ctx.fill(); ctx.restore()
    if (p >= 1) {
      fw.phase = "explode"; fw.explodeAt = ts; fw.x = fw.ex; fw.y = fw.ey
      for (let i = 0; i < 32; i++) {
        const a = (i / 32) * Math.PI * 2 + (Math.random() - 0.5) * 0.4, spd = 1 + Math.random() * 2.2
        fw.particles.push({ x: fw.x, y: fw.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
          color: FW_COLORS[i % FW_COLORS.length], r: 1.5 + Math.random() * 1.5 })
      }
    }
  } else {
    const p = (ts - fw.explodeAt) / 2300
    if (p >= 1) return true
    fw.particles.forEach((pt: any) => {
      pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.05
      ctx.save(); ctx.globalAlpha = 1 - p; ctx.fillStyle = pt.color
      ctx.shadowColor = pt.color; ctx.shadowBlur = 5
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r * (1 - p * 0.5), 0, Math.PI * 2)
      ctx.fill(); ctx.restore()
    })
  }
  return false
}

// ── Doodle draw functions ─────────────────────────────────────────────────────

function doodleGear(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, ts: number, fade: number) {
  const teeth = 8, inner = r * 0.68, tooth = r * 0.38, hole = r * 0.28, angle = ts * 0.0004
  ctx.save()
  ctx.translate(cx, cy); ctx.rotate(angle)
  ctx.globalAlpha = 0.45 * fade; ctx.strokeStyle = "#c77dff"
  ctx.fillStyle = "rgba(199,125,255,0.12)"; ctx.lineWidth = 1.5
  ctx.shadowColor = "#c77dff"; ctx.shadowBlur = 7
  ctx.beginPath()
  for (let i = 0; i < teeth; i++) {
    const a1 = (i / teeth) * Math.PI * 2, a2 = ((i + 0.4) / teeth) * Math.PI * 2,
      a3 = ((i + 0.6) / teeth) * Math.PI * 2, a4 = ((i + 1) / teeth) * Math.PI * 2
    ctx.lineTo(Math.cos(a1) * inner, Math.sin(a1) * inner)
    ctx.lineTo(Math.cos(a2) * (inner + tooth), Math.sin(a2) * (inner + tooth))
    ctx.lineTo(Math.cos(a3) * (inner + tooth), Math.sin(a3) * (inner + tooth))
    ctx.lineTo(Math.cos(a4) * inner, Math.sin(a4) * inner)
  }
  ctx.closePath(); ctx.fill(); ctx.stroke()
  ctx.beginPath(); ctx.arc(0, 0, hole, 0, Math.PI * 2)
  ctx.globalAlpha = 0.7 * fade; ctx.stroke()
  ctx.restore()
}

function doodleSineGraph(ctx: CanvasRenderingContext2D, cx: number, cy: number, gw: number, gh: number, ts: number, fade: number) {
  ctx.save()
  ctx.globalAlpha = 0.55 * fade; ctx.strokeStyle = "#39ff14"
  ctx.lineWidth = 1.3; ctx.shadowColor = "#39ff14"; ctx.shadowBlur = 5
  ctx.beginPath(); ctx.moveTo(cx - gw / 2, cy); ctx.lineTo(cx + gw / 2, cy); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx, cy - gh / 2); ctx.lineTo(cx, cy + gh / 2); ctx.stroke()
  const ar = 5; ctx.beginPath()
  ctx.moveTo(cx + gw / 2, cy); ctx.lineTo(cx + gw / 2 - ar, cy - 3)
  ctx.moveTo(cx + gw / 2, cy); ctx.lineTo(cx + gw / 2 - ar, cy + 3)
  ctx.moveTo(cx, cy - gh / 2); ctx.lineTo(cx - 3, cy - gh / 2 + ar)
  ctx.moveTo(cx, cy - gh / 2); ctx.lineTo(cx + 3, cy - gh / 2 + ar); ctx.stroke()
  ctx.globalAlpha = 0.9 * fade; ctx.strokeStyle = "#ff6ec7"
  ctx.lineWidth = 2; ctx.shadowColor = "#ff6ec7"; ctx.shadowBlur = 7
  ctx.beginPath()
  for (let i = 0; i <= 80; i++) {
    const t = i / 80, x = cx - gw / 2 + 4 + t * (gw - 8), y = cy - (gh / 2 - 7) * Math.sin(t * Math.PI * 2 + ts * 0.001)
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.stroke()
  ctx.globalAlpha = 0.35 * fade; ctx.strokeStyle = "#39ff14"; ctx.lineWidth = 1; ctx.shadowBlur = 0
  ;[0.25, 0.5, 0.75].forEach(f => {
    const xp = cx - gw / 2 + f * gw
    ctx.beginPath(); ctx.moveTo(xp, cy - 3); ctx.lineTo(xp, cy + 3); ctx.stroke()
  })
  ctx.restore()
}

function doodleHelix(ctx: CanvasRenderingContext2D, cx: number, cy: number, gw: number, gh: number, ts: number, fade: number) {
  const turns = 3.5, top = cy - gh / 2, totalT = turns * Math.PI * 2
  const segs = turns * 36 | 0
  const animOff = ts * 0.00025
  ctx.save()
  ctx.globalAlpha = 0.35 * fade; ctx.strokeStyle = "#00d4ff"
  ctx.lineWidth = 1; ctx.shadowColor = "#00d4ff"; ctx.shadowBlur = 3
  ctx.beginPath(); ctx.moveTo(cx, top - 4); ctx.lineTo(cx, top + gh + 4); ctx.stroke()
  ctx.strokeStyle = "#00d4ff"; ctx.shadowColor = "#00d4ff"
  for (let i = 0; i < segs; i++) {
    const t1 = (i / segs) * totalT, t2 = ((i + 1) / segs) * totalT
    const cos1 = Math.cos(t1 + animOff), cos2 = Math.cos(t2 + animOff)
    const depth = ((cos1 + cos2) * 0.5 + 1) * 0.5
    ctx.globalAlpha = (0.15 + depth * 0.75) * fade
    ctx.lineWidth = 0.8 + depth * 1.5
    ctx.shadowBlur = 2 + depth * 7
    ctx.setLineDash(depth < 0.3 ? [2, 3] : [])
    ctx.beginPath()
    ctx.moveTo(cx + (gw / 2) * cos1, top + (t1 / totalT) * gh)
    ctx.lineTo(cx + (gw / 2) * cos2, top + (t2 / totalT) * gh)
    ctx.stroke()
  }
  ctx.setLineDash([])
  ctx.restore()
}

function doodleMatrix(ctx: CanvasRenderingContext2D, cx: number, cy: number, cw: number, ch: number, fade: number) {
  const vals = [[2, -1, 0], [-1, 2, -1], [0, -1, 2]]
  const mw = cw * 3, mh = ch * 3, left = cx - mw / 2, top = cy - mh / 2
  ctx.save()
  ctx.globalAlpha = 0.78 * fade; ctx.fillStyle = "#c77dff"
  ctx.shadowColor = "#c77dff"; ctx.shadowBlur = 8
  ctx.font = `600 ${Math.round(ch * 0.72)}px 'Caveat', cursive`
  ctx.textAlign = "center"; ctx.textBaseline = "middle"
  vals.forEach((row, r) => row.forEach((v, c) =>
    ctx.fillText(String(v), left + c * cw + cw / 2, top + r * ch + ch / 2)
  ))
  ctx.strokeStyle = "#c77dff"; ctx.lineWidth = 2; ctx.shadowBlur = 6
  const bw = 7, pad = 4
  ;[[left - pad, left - pad + bw], [left + mw + pad - bw, left + mw + pad]].forEach(([x0, x1]) => {
    const isLeft = x1 < cx
    ctx.beginPath()
    ctx.moveTo(isLeft ? x1 : x0, top - pad); ctx.lineTo(isLeft ? x0 : x1, top - pad)
    ctx.lineTo(isLeft ? x0 : x1, top + mh + pad); ctx.lineTo(isLeft ? x1 : x0, top + mh + pad)
    ctx.stroke()
  })
  ctx.restore()
}

function doodleAtom(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, ts: number, fade: number) {
  ctx.save()
  ctx.globalAlpha = 0.85 * fade; ctx.fillStyle = "#ffe033"
  ctx.shadowColor = "#ffe033"; ctx.shadowBlur = 12
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.16, 0, Math.PI * 2); ctx.fill()
  ;[0, Math.PI / 3, -Math.PI / 3].forEach((tilt, idx) => {
    ctx.save()
    ctx.translate(cx, cy); ctx.rotate(tilt)
    ctx.globalAlpha = 0.30 * fade; ctx.strokeStyle = "#ffe033"
    ctx.lineWidth = 1; ctx.shadowColor = "#ffe033"; ctx.shadowBlur = 3
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.32, 0, 0, Math.PI * 2); ctx.stroke()
    const ea = ts * 0.0015 + idx * (Math.PI * 2 / 3)
    ctx.globalAlpha = 0.9 * fade; ctx.fillStyle = "#ff6ec7"
    ctx.shadowColor = "#ff6ec7"; ctx.shadowBlur = 8
    ctx.beginPath(); ctx.arc(r * Math.cos(ea), r * 0.32 * Math.sin(ea), r * 0.09, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  })
  ctx.restore()
}

function doodleFibonacci(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, fade: number) {
  ctx.save()
  ctx.globalAlpha = 0.65 * fade; ctx.strokeStyle = "#ff9d00"
  ctx.lineWidth = 1.5; ctx.shadowColor = "#ff9d00"; ctx.shadowBlur = 6
  ctx.beginPath()
  const b = 0.25, a = r * 0.05
  for (let i = 0; i <= 320; i++) {
    const theta = (i / 320) * Math.PI * 4, rad = a * Math.exp(b * theta)
    if (rad > r) break
    i === 0 ? ctx.moveTo(cx + rad * Math.cos(theta), cy + rad * Math.sin(theta))
      : ctx.lineTo(cx + rad * Math.cos(theta), cy + rad * Math.sin(theta))
  }
  ctx.stroke()
  ctx.restore()
}

function doodleVenn(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, fade: number) {
  ctx.save()
  const off = r * 0.55, color = "#ff6ec7"
  ctx.globalAlpha = 0.18 * fade; ctx.fillStyle = color
  ctx.beginPath(); ctx.arc(cx - off * 0.5, cy, r, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(cx + off * 0.5, cy, r, 0, Math.PI * 2); ctx.fill()
  ctx.globalAlpha = 0.55 * fade; ctx.strokeStyle = color
  ctx.lineWidth = 1.5; ctx.shadowColor = color; ctx.shadowBlur = 6
  ctx.beginPath(); ctx.arc(cx - off * 0.5, cy, r, 0, Math.PI * 2); ctx.stroke()
  ctx.beginPath(); ctx.arc(cx + off * 0.5, cy, r, 0, Math.PI * 2); ctx.stroke()
  ctx.restore()
}

function doodleTriangle(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, fade: number) {
  ctx.save()
  const h = size * 0.5, color = "#ffe033"
  const pts: [number, number][] = [[cx - h, cy + h], [cx + h, cy + h], [cx - h, cy - h]]
  ctx.globalAlpha = 0.7 * fade; ctx.strokeStyle = color
  ctx.lineWidth = 1.8; ctx.shadowColor = color; ctx.shadowBlur = 7
  ctx.beginPath(); ctx.moveTo(...pts[0]); ctx.lineTo(...pts[1]); ctx.lineTo(...pts[2]); ctx.closePath(); ctx.stroke()
  const sq = size * 0.12, [bx, by] = pts[0]
  ctx.globalAlpha = 0.5 * fade; ctx.lineWidth = 1.2; ctx.shadowBlur = 4
  ctx.beginPath(); ctx.moveTo(bx + sq, by); ctx.lineTo(bx + sq, by - sq); ctx.lineTo(bx, by - sq); ctx.stroke()
  ctx.globalAlpha = 0.45 * fade; ctx.lineWidth = 1; ctx.shadowBlur = 3
  ctx.beginPath(); ctx.arc(pts[1][0], pts[1][1], size * 0.18, Math.PI, Math.PI + Math.PI / 4); ctx.stroke()
  ctx.restore()
}

function doodleStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, fade: number) {
  ctx.save()
  ctx.globalAlpha = 0.55 * fade; ctx.strokeStyle = "#ffe033"
  ctx.lineWidth = 1.5; ctx.shadowColor = "#ffe033"; ctx.shadowBlur = 8
  ctx.fillStyle = "rgba(255,224,51,0.08)"
  const inner = r * 0.38
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2, rad = i % 2 === 0 ? r : inner
    i === 0 ? ctx.moveTo(cx + rad * Math.cos(a), cy + rad * Math.sin(a))
      : ctx.lineTo(cx + rad * Math.cos(a), cy + rad * Math.sin(a))
  }
  ctx.closePath(); ctx.fill(); ctx.stroke()
  ctx.restore()
}

function doodleNumberLine(ctx: CanvasRenderingContext2D, cx: number, cy: number, lw: number, fade: number) {
  ctx.save()
  const color = "#c77dff"
  ctx.globalAlpha = 0.6 * fade; ctx.strokeStyle = color
  ctx.lineWidth = 1.5; ctx.shadowColor = color; ctx.shadowBlur = 5
  ctx.beginPath(); ctx.moveTo(cx - lw / 2, cy); ctx.lineTo(cx + lw / 2, cy); ctx.stroke()
  const ar = 5; ctx.beginPath()
  ctx.moveTo(cx + lw / 2, cy); ctx.lineTo(cx + lw / 2 - ar, cy - 3)
  ctx.moveTo(cx + lw / 2, cy); ctx.lineTo(cx + lw / 2 - ar, cy + 3)
  ctx.moveTo(cx - lw / 2, cy); ctx.lineTo(cx - lw / 2 + ar, cy - 3)
  ctx.moveTo(cx - lw / 2, cy); ctx.lineTo(cx - lw / 2 + ar, cy + 3)
  ctx.stroke()
  ctx.globalAlpha = 0.5 * fade; ctx.lineWidth = 1; ctx.shadowBlur = 3
  ctx.fillStyle = color; ctx.font = `600 10px 'Caveat', cursive`
  ctx.textAlign = "center"; ctx.textBaseline = "top"
  for (let v = -2; v <= 2; v++) {
    const x = cx + v * (lw / 4)
    ctx.beginPath(); ctx.moveTo(x, cy - (v === 0 ? 7 : 5)); ctx.lineTo(x, cy + (v === 0 ? 7 : 5)); ctx.stroke()
    ctx.fillText(String(v), x, cy + 8)
  }
  ctx.restore()
}

function doodleRocket(ctx: CanvasRenderingContext2D, cx: number, cy: number, rh: number, ts: number, fade: number) {
  const bw = rh * 0.32
  const bodyTop = cy - rh * 0.46
  const bodyBot = cy + rh * 0.18
  const noseH = rh * 0.38
  const finH = rh * 0.26
  const finW = bw * 1.6
  ctx.save()

  ctx.globalAlpha = 0.55 * fade
  ctx.strokeStyle = "#FF7043"; ctx.fillStyle = "rgba(255,112,67,0.18)"
  ctx.lineWidth = 1.3; ctx.shadowColor = "#FF7043"; ctx.shadowBlur = 6
  ctx.beginPath()
  ctx.moveTo(cx - bw, bodyBot - finH)
  ctx.lineTo(cx - bw - finW, bodyBot + rh * 0.10)
  ctx.lineTo(cx - bw, bodyBot)
  ctx.closePath(); ctx.fill(); ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx + bw, bodyBot - finH)
  ctx.lineTo(cx + bw + finW, bodyBot + rh * 0.10)
  ctx.lineTo(cx + bw, bodyBot)
  ctx.closePath(); ctx.fill(); ctx.stroke()

  ctx.globalAlpha = 0.50 * fade
  ctx.fillStyle = "rgba(255,112,67,0.15)"; ctx.strokeStyle = "#FF7043"
  ctx.lineWidth = 1.5; ctx.shadowBlur = 8
  ctx.beginPath()
  ctx.moveTo(cx - bw, bodyBot)
  ctx.lineTo(cx - bw, bodyTop)
  ctx.quadraticCurveTo(cx - bw, bodyTop - noseH * 0.4, cx, bodyTop - noseH)
  ctx.quadraticCurveTo(cx + bw, bodyTop - noseH * 0.4, cx + bw, bodyTop)
  ctx.lineTo(cx + bw, bodyBot)
  ctx.closePath(); ctx.fill(); ctx.stroke()

  ctx.globalAlpha = 0.70 * fade
  ctx.strokeStyle = "#FFD740"; ctx.fillStyle = "rgba(255,215,64,0.18)"
  ctx.lineWidth = 1.2; ctx.shadowColor = "#FFD740"; ctx.shadowBlur = 7
  ctx.beginPath(); ctx.arc(cx, cy - rh * 0.08, bw * 0.55, 0, Math.PI * 2)
  ctx.fill(); ctx.stroke()

  const flicker = 0.85 + 0.15 * Math.sin(ts * 0.014)
  const flicker2 = 0.72 + 0.28 * Math.sin(ts * 0.018 + 1.2)
  const fh = rh * 0.32 * flicker
  const fw = bw * 0.75
  ctx.globalAlpha = 0.80 * fade
  ctx.strokeStyle = "#FF7043"; ctx.lineWidth = 1.4
  ctx.shadowColor = "#FF7043"; ctx.shadowBlur = 8
  ctx.lineCap = "round"
  ctx.beginPath()
  ctx.moveTo(cx - fw, bodyBot)
  ctx.quadraticCurveTo(cx - fw * 0.3, bodyBot + fh * 0.5, cx, bodyBot + fh)
  ctx.quadraticCurveTo(cx + fw * 0.3, bodyBot + fh * 0.5, cx + fw, bodyBot)
  ctx.stroke()
  ctx.globalAlpha = 0.90 * fade
  ctx.strokeStyle = "#FFD740"; ctx.lineWidth = 1.1
  ctx.shadowColor = "#FFD740"; ctx.shadowBlur = 7
  ctx.beginPath()
  ctx.moveTo(cx - fw * 0.38, bodyBot)
  ctx.quadraticCurveTo(cx, bodyBot + fh * flicker2, cx + fw * 0.38, bodyBot)
  ctx.stroke()
  ctx.globalAlpha = 0.60 * fade
  ctx.strokeStyle = "#FFD740"; ctx.lineWidth = 0.8; ctx.shadowBlur = 5
  ctx.beginPath()
  ctx.moveTo(cx, bodyBot)
  ctx.lineTo(cx, bodyBot + fh * 1.12 * flicker)
  ctx.stroke()

  ctx.shadowBlur = 0
  for (let i = 0; i < 3; i++) {
    const phase = (ts * 0.0012 + i * 0.9) % 1
    const sy = bodyBot + fh + phase * rh * 0.5
    const sx = cx + Math.sin(ts * 0.003 + i * 2.1) * bw * 0.4
    const sr = bw * 0.22 * (1 - phase * 0.5)
    ctx.globalAlpha = 0.25 * (1 - phase) * fade
    ctx.fillStyle = "#FFB74D"
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}

function doodleDNA(ctx: CanvasRenderingContext2D, cx: number, cy: number, gw: number, gh: number, ts: number, fade: number) {
  const top = cy - gh / 2
  const segs = 60
  const twists = 3.0
  const off = ts * 0.0007
  ctx.save()

  ctx.lineWidth = 0.9; ctx.shadowBlur = 3
  for (let i = 0; i <= segs; i++) {
    const t = i / segs
    const y = top + t * gh
    const a1 = t * Math.PI * 2 * twists + off
    const x1 = cx + (gw / 2) * Math.cos(a1)
    const x2 = cx + (gw / 2) * Math.cos(a1 + Math.PI)
    const crossness = Math.abs(Math.sin(a1))
    if (crossness > 0.55 && i % 3 === 0) {
      ctx.globalAlpha = crossness * 0.45 * fade
      ctx.strokeStyle = "#f48fb1"; ctx.shadowColor = "#f48fb1"
      ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke()
    }
  }

  for (let i = 0; i < segs; i++) {
    const t1 = i / segs, t2 = (i + 1) / segs
    const a1 = t1 * Math.PI * 2 * twists + off
    const a2 = t2 * Math.PI * 2 * twists + off
    const depth = (Math.cos(a1) + 1) * 0.5
    ctx.globalAlpha = (0.15 + depth * 0.70) * fade
    ctx.strokeStyle = "#ff6ec7"; ctx.shadowColor = "#ff6ec7"
    ctx.lineWidth = 0.8 + depth * 1.8
    ctx.shadowBlur = 2 + depth * 9
    ctx.setLineDash(depth < 0.25 ? [2, 3] : [])
    ctx.beginPath()
    ctx.moveTo(cx + (gw / 2) * Math.cos(a1), top + t1 * gh)
    ctx.lineTo(cx + (gw / 2) * Math.cos(a2), top + t2 * gh)
    ctx.stroke()
  }

  for (let i = 0; i < segs; i++) {
    const t1 = i / segs, t2 = (i + 1) / segs
    const a1 = t1 * Math.PI * 2 * twists + off + Math.PI
    const a2 = t2 * Math.PI * 2 * twists + off + Math.PI
    const depth = (Math.cos(a1) + 1) * 0.5
    ctx.globalAlpha = (0.15 + depth * 0.70) * fade
    ctx.strokeStyle = "#00d4ff"; ctx.shadowColor = "#00d4ff"
    ctx.lineWidth = 0.8 + depth * 1.8
    ctx.shadowBlur = 2 + depth * 9
    ctx.setLineDash(depth < 0.25 ? [2, 3] : [])
    ctx.beginPath()
    ctx.moveTo(cx + (gw / 2) * Math.cos(a1), top + t1 * gh)
    ctx.lineTo(cx + (gw / 2) * Math.cos(a2), top + t2 * gh)
    ctx.stroke()
  }

  const tA = ((ts * 0.0004) % 1)
  const aA = tA * Math.PI * 2 * twists + off
  ctx.setLineDash([])
  ctx.globalAlpha = 0.90 * fade
  ctx.fillStyle = "#ff6ec7"; ctx.shadowColor = "#ff6ec7"; ctx.shadowBlur = 10
  ctx.beginPath(); ctx.arc(cx + (gw / 2) * Math.cos(aA), top + tA * gh, 2.5, 0, Math.PI * 2); ctx.fill()

  const tB = ((ts * 0.0004 + 0.5) % 1)
  const aB = tB * Math.PI * 2 * twists + off + Math.PI
  ctx.fillStyle = "#00d4ff"; ctx.shadowColor = "#00d4ff"
  ctx.beginPath(); ctx.arc(cx + (gw / 2) * Math.cos(aB), top + tB * gh, 2.5, 0, Math.PI * 2); ctx.fill()

  ctx.restore()
}

function doodleLightbulb(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, ts: number, fade: number) {
  const baseTop = cy + r * 0.55
  const baseH = r * 0.28
  const baseW = r * 0.62
  const filH = r * 0.35
  const pulse = 0.80 + 0.20 * Math.sin(ts * 0.004)
  ctx.save()

  ctx.globalAlpha = 0.10 * pulse * fade
  const grad = ctx.createRadialGradient(cx, cy - r * 0.1, r * 0.2, cx, cy - r * 0.1, r * 1.55)
  grad.addColorStop(0, "#FFD740"); grad.addColorStop(1, "transparent")
  ctx.fillStyle = grad
  ctx.beginPath(); ctx.arc(cx, cy - r * 0.1, r * 1.55, 0, Math.PI * 2); ctx.fill()

  ctx.globalAlpha = 0.55 * fade
  ctx.strokeStyle = "#FFD740"; ctx.lineWidth = 1.5
  ctx.shadowColor = "#FFD740"; ctx.shadowBlur = 8 + 6 * pulse
  ctx.fillStyle = `rgba(255,215,64,${0.08 * pulse})`
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke()

  ctx.globalAlpha = 0.80 * pulse * fade
  ctx.strokeStyle = "#FFD740"; ctx.lineWidth = 1.2; ctx.shadowBlur = 10
  ctx.beginPath()
  ctx.moveTo(cx - baseW * 0.55, cy + r * 0.25)
  ctx.lineTo(cx - baseW * 0.55, cy + r * 0.25 - filH * 0.4)
  ctx.quadraticCurveTo(cx - baseW * 0.2, cy - filH * 0.2, cx, cy - filH * 0.5)
  ctx.quadraticCurveTo(cx + baseW * 0.2, cy - filH * 0.2, cx + baseW * 0.55, cy + r * 0.25 - filH * 0.4)
  ctx.lineTo(cx + baseW * 0.55, cy + r * 0.25)
  ctx.stroke()

  ctx.globalAlpha = 0.55 * fade
  ctx.lineWidth = 1.3; ctx.shadowBlur = 5
  ;[0, 1, 2].forEach(i => {
    const by = baseTop + i * (baseH / 2.5)
    const bx = baseW * (1 - i * 0.12)
    ctx.beginPath(); ctx.moveTo(cx - bx, by); ctx.lineTo(cx + bx, by); ctx.stroke()
  })

  ctx.lineWidth = 1.0; ctx.shadowBlur = 4
  const rayCount = 8
  for (let i = 0; i < rayCount; i++) {
    const a = (i / rayCount) * Math.PI * 2 + ts * 0.0008
    const rIn = r * 1.15
    const rOut = r * (1.45 + 0.12 * Math.sin(ts * 0.005 + i))
    ctx.globalAlpha = 0.30 * pulse * fade
    ctx.beginPath()
    ctx.moveTo(cx + rIn * Math.cos(a), cy + rIn * Math.sin(a))
    ctx.lineTo(cx + rOut * Math.cos(a), cy + rOut * Math.sin(a))
    ctx.stroke()
  }
  ctx.restore()
}

const _TILE_COLORS: [string, string][] = [
  ["#ff6ec7", "rgba(255,110,199,0.20)"],
  ["#39ff14", "rgba(57,255,20,0.20)"],
  ["#ffe033", "rgba(255,224,51,0.20)"],
  ["#00d4ff", "rgba(0,212,255,0.20)"],
  ["#ff9d00", "rgba(255,157,0,0.20)"],
  ["#c77dff", "rgba(199,125,255,0.20)"],
]

function doodleNumtiles(ctx: CanvasRenderingContext2D, cx: number, cy: number, tw: number, _ts: number, fade: number, order: number[], ci: number[], nums: number[]) {
  const cols = 3, rows = 3
  const gap = tw * 0.18
  const totalW = cols * tw + (cols - 1) * gap
  const totalH = rows * tw + (rows - 1) * gap
  const left = cx - totalW / 2
  const top = cy - totalH / 2
  ctx.save()
  ctx.font = `700 ${Math.round(tw * 0.55)}px 'Caveat', cursive`
  ctx.textAlign = "center"; ctx.textBaseline = "middle"

  for (let i = 0; i < 9; i++) {
    const idx = order[i]
    const r = (idx / cols) | 0, c = idx % cols
    const [stroke, fill] = _TILE_COLORS[ci[idx]]
    const num = nums[idx]
    const x = left + c * (tw + gap)
    const y = top + r * (tw + gap)
    const rx = tw * 0.22

    ctx.globalAlpha = 0.62 * fade
    ctx.fillStyle = fill
    ctx.strokeStyle = stroke
    ctx.lineWidth = 1.3
    ctx.shadowColor = stroke; ctx.shadowBlur = 6
    ctx.beginPath()
    ctx.moveTo(x + rx, y)
    ctx.lineTo(x + tw - rx, y); ctx.arcTo(x + tw, y, x + tw, y + rx, rx)
    ctx.lineTo(x + tw, y + tw - rx); ctx.arcTo(x + tw, y + tw, x + tw - rx, y + tw, rx)
    ctx.lineTo(x + rx, y + tw); ctx.arcTo(x, y + tw, x, y + tw - rx, rx)
    ctx.lineTo(x, y + rx); ctx.arcTo(x, y, x + rx, y, rx)
    ctx.closePath()
    ctx.fill(); ctx.stroke()

    ctx.globalAlpha = 0.85 * fade
    ctx.fillStyle = stroke
    ctx.shadowBlur = 9
    ctx.fillText(String(num), x + tw / 2, y + tw / 2)
  }
  ctx.restore()
}

function drawDoodle(ctx: CanvasRenderingContext2D, d: Doodle, ts: number, fade: number) {
  const p = d.params
  switch (d.type) {
    case 'gear':       doodleGear(ctx, d.cx, d.cy, p.r, ts, fade); break
    case 'sine':       doodleSineGraph(ctx, d.cx, d.cy, p.gw, p.gh, ts, fade); break
    case 'helix':      doodleHelix(ctx, d.cx, d.cy, p.gw, p.gh, ts, fade); break
    case 'matrix':     doodleMatrix(ctx, d.cx, d.cy, p.cw, p.ch, fade); break
    case 'atom':       doodleAtom(ctx, d.cx, d.cy, p.r, ts, fade); break
    case 'fibonacci':  doodleFibonacci(ctx, d.cx, d.cy, p.r, fade); break
    case 'venn':       doodleVenn(ctx, d.cx, d.cy, p.r, fade); break
    case 'triangle':   doodleTriangle(ctx, d.cx, d.cy, p.size, fade); break
    case 'star':       doodleStar(ctx, d.cx, d.cy, p.r, fade); break
    case 'numberLine': doodleNumberLine(ctx, d.cx, d.cy, p.lw, fade); break
    case 'rocket':     doodleRocket(ctx, d.cx, d.cy, p.rh, ts, fade); break
    case 'dna':        doodleDNA(ctx, d.cx, d.cy, p.gw, p.gh, ts, fade); break
    case 'lightbulb':  doodleLightbulb(ctx, d.cx, d.cy, p.r, ts, fade); break
    case 'numtiles':   doodleNumtiles(ctx, d.cx, d.cy, p.tw, ts, fade, p.order, p.ci, p.nums); break
  }
}

// ── Orchestration ─────────────────────────────────────────────────────────────
export function showHomeLightboard(): void {
  const sec = document.getElementById("home-lightboard-section")
  if (sec) sec.style.display = ""

  if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null }
  if (mutationTimer) { clearTimeout(mutationTimer); mutationTimer = null }
  currentStar = null; currentFirework = null; stars = []; currentStartTs = null

  const canvas = document.getElementById("home-lb-canvas") as HTMLCanvasElement | null
  const lb = document.getElementById("home-lightboard")
  if (!canvas || !lb) return

  canvas.width = lb.offsetWidth || 640
  canvas.height = lb.offsetHeight || 300
  const w = canvas.width, h = canvas.height

  lightboardConfig = buildConfig(w, h)
  const cfg = lightboardConfig

  const doodleReserved = () => cfg.doodles.map(d => {
    const sz = DOODLE_PCT[d.type]
    return { cx: d.pctCX, cy: d.pctCY, rw: sz.rw * 1.4, rh: sz.rh * 1.4 }
  })

  const poolOrder = HOME_LB_POOL.map((_, i) => i).sort(() => Math.random() - 0.5)
  const count = 9 + Math.floor(Math.random() * 4)
  const selIdx = poolOrder.slice(0, count)
  const selected = selIdx.map(i => HOME_LB_POOL[i])
  const styles = selected.map(item => pickStyle(item.text))
  const positions = findRandomPositions(styles, doodleReserved())
  const actual = positions.length

  interface TextEntry {
    kind: "text"
    item: LightboardItem
    pos: { x: number; y: number; wPct: number; hPct: number }
    delay: number
    poolIdx: number
    fontFamily: string
    fontWeight: number
    fontSize: number
  }

  const textEntries: TextEntry[] = selected.slice(0, actual).map((item, i) => ({
    kind: "text" as const, item, pos: positions[i], delay: 0, poolIdx: selIdx[i],
    fontFamily: styles[i].family, fontWeight: styles[i].weight, fontSize: styles[i].size,
  }))
  const doodleEntries = cfg.doodles.map(d => ({ kind: "doodle" as const, d }))
  const allEntries = [...textEntries, ...doodleEntries].sort(() => Math.random() - 0.5)
  let t = 1 + Math.random() * 2
  allEntries.forEach(entry => {
    if (entry.kind === "text") { (entry as TextEntry).delay = t }
    else { entry.d.showMs = t * 1000 }
    t += 3 + Math.random() * 4
  })

  const surface = document.getElementById("home-lb-surface")
  if (!surface) return
  surface.innerHTML = ""

  const activeItems: { item: LightboardItem; pos: { x: number; y: number; wPct?: number; hPct?: number }; el: HTMLElement; poolIdx: number }[] = []
  const usedPool = new Set(selIdx.slice(0, actual))

  function makeTextEl(item: LightboardItem, pos: { x: number; y: number }, delaySec: number, fontFamily: string, fontWeight: number, fontSize: number): HTMLElement {
    const el = document.createElement("div")
    el.className = "home-lb-item"
    el.innerHTML = item.text + " "
    el.style.left = pos.x.toFixed(1) + "%"
    el.style.top = pos.y.toFixed(1) + "%"
    el.style.color = item.color
    el.style.textShadow = `0 0 8px ${item.glow}, 0 0 18px ${item.glow}`
    el.style.fontFamily = fontFamily + ", cursive"
    el.style.fontWeight = String(fontWeight)
    el.style.fontSize = fontSize + "px"
    el.style.animationDelay = delaySec.toFixed(2) + "s"
    const lbEl = document.getElementById("home-lightboard")
    el.dataset.origFontPx = String(fontSize)
    el.dataset.origBoardW = String(lbEl ? lbEl.offsetWidth : 640)
    return el
  }

  textEntries.forEach(({ item, pos, delay, fontFamily, fontWeight, fontSize, poolIdx }) => {
    const el = makeTextEl(item, pos, delay, fontFamily, fontWeight, fontSize)
    surface.appendChild(el)
    activeItems.push({ item, pos, el, poolIdx })
  })

  function addItem() {
    const available = HOME_LB_POOL.map((_, i) => i).filter(i => !usedPool.has(i))
    if (!available.length) return
    const poolIdx = available[Math.floor(Math.random() * available.length)]
    const item = HOME_LB_POOL[poolIdx]
    const style = pickStyle(item.text)
    const spots = findRandomPositions([style], doodleReserved(), activeItems.map(a => a.pos))
    if (!spots.length) return
    const pos = spots[0]
    const el = makeTextEl(item, pos, 0, style.family, style.weight, style.size)
    surface!.appendChild(el)
    activeItems.push({ item, pos, el, poolIdx })
    usedPool.add(poolIdx)
  }

  function removeItem() {
    if (activeItems.length <= 4) return
    const idx = Math.floor(Math.random() * activeItems.length)
    const { el, poolIdx } = activeItems.splice(idx, 1)[0]
    usedPool.delete(poolIdx)
    el.style.transition = "opacity 1.8s ease"
    el.style.opacity = "0"
    setTimeout(() => el.remove(), 1800)
  }

  function scheduleMutation() {
    mutationTimer = setTimeout(() => {
      if (Math.random() < 0.6 || activeItems.length < 5) addItem()
      else removeItem()
      scheduleMutation()
    }, 6000 + Math.random() * 9000)
  }
  scheduleMutation()

  let fwNext = Infinity

  function frame(ts: number) {
    animationFrameId = requestAnimationFrame(frame)
    if (!currentStartTs) { currentStartTs = ts; fwNext = ts + 4500 }
    const elapsed = ts - currentStartTs
    const ctx = canvas!.getContext("2d")!
    const cw = canvas!.width, ch = canvas!.height
    ctx.clearRect(0, 0, cw, ch)

    cfg.doodles.forEach(d => {
      const fade = Math.min(1, Math.max(0, (elapsed - d.showMs) / 2500))
      if (fade > 0) drawDoodle(ctx, d, ts, fade)
    })

    if (!currentFirework && ts >= fwNext) { currentFirework = createFirework(cw, ch); fwNext = ts + 9000 + Math.random() * 5000 }
    if (currentFirework && updateFirework(ctx, currentFirework, ts)) currentFirework = null
  }

  animationFrameId = requestAnimationFrame(frame)
}

export function hideHomeLightboard(): void {
  const sec = document.getElementById("home-lightboard-section")
  if (sec) sec.style.display = "none"
  if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null }
  if (mutationTimer) { clearTimeout(mutationTimer); mutationTimer = null }
  currentStar = null
  currentFirework = null
}
