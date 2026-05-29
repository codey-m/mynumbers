// ============================================================================
// Explainer — Slide 3: Rejection Sampler
// ============================================================================

import { reducedMotion } from './tree'

const TARGET_BANDS: Record<string, [number, number]> = {
  wide: [10, 99],
  mid: [20, 60],
  narrow: [25, 35],
}
const OP_SETS: Record<string, string[]> = {
  add: ["+"],
  addsub: ["+", "-"],
  all: ["+", "-", "*", "/"],
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

interface Expression {
  a: number
  b: number
  c: number
  o1: string
  o2: string
}

function genExpression(ops: string[]): Expression {
  const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
  const picks: number[] = []
  for (let i = 0; i < 3; i++) {
    const j = randInt(0, pool.length - 1)
    picks.push(pool.splice(j, 1)[0])
  }
  const o1 = ops[randInt(0, ops.length - 1)]
  const o2 = ops[randInt(0, ops.length - 1)]
  return { a: picks[0], b: picks[1], c: picks[2], o1, o2 }
}

function evalExpr(e: Expression): number {
  const isMul = (op: string) => op === "*" || op === "/"
  const apply = (x: number, op: string, y: number) =>
    op === "+" ? x + y : op === "-" ? x - y : op === "*" ? x * y : y === 0 ? NaN : x / y
  if (isMul(e.o1) && !isMul(e.o2)) return apply(apply(e.a, e.o1, e.b), e.o2, e.c)
  if (!isMul(e.o1) && isMul(e.o2)) return apply(e.a, e.o1, apply(e.b, e.o2, e.c))
  return apply(apply(e.a, e.o1, e.b), e.o2, e.c)
}

const OP_DISPLAY: Record<string, string> = { "+": "+", "-": "−", "*": "×", "/": "÷" }
function fmtExpr(e: Expression): string {
  return `${e.a} ${OP_DISPLAY[e.o1]} ${e.b} ${OP_DISPLAY[e.o2]} ${e.c}`
}

function classify(e: Expression, _ops: string[], band: [number, number]): { ok: boolean; val: number; reason: string } {
  const v = evalExpr(e)
  if (!Number.isFinite(v)) return { ok: false, val: v, reason: "div by zero" }
  if (!Number.isInteger(v)) return { ok: false, val: v, reason: "non-integer" }
  if (v < band[0] || v > band[1]) return { ok: false, val: v, reason: `out of [${band[0]},${band[1]}]` }
  return { ok: true, val: v, reason: "accepted ✓" }
}

function estimateP(opsKey: string, bandKey: string, samples = 4000): number {
  const ops = OP_SETS[opsKey]
  const band = TARGET_BANDS[bandKey]
  let ok = 0
  for (let i = 0; i < samples; i++) {
    if (classify(genExpression(ops), ops, band).ok) ok++
  }
  return Math.max(1e-6, ok / samples)
}

function fmtPct(x: number): string {
  if (x >= 0.001) return (x * 100).toFixed(1) + "%"
  return x.toExponential(2)
}
function fmtExpected(p: number): string { return (1 / p).toFixed(1) }
function fmtFail(p: number): string {
  if (p >= 0.02) return "≈ 0"
  const q = Math.pow(1 - p, 2000)
  if (q < 1e-6) return "< 1e−6"
  return q.toExponential(2)
}

function refreshSamplerStats(): number {
  const opsKey = (document.getElementById("s-ops") as HTMLSelectElement).value
  const bandKey = (document.getElementById("s-range") as HTMLSelectElement).value
  const p = estimateP(opsKey, bandKey)
  document.getElementById("s-p")!.textContent = fmtPct(p)
  document.getElementById("s-exp")!.textContent = fmtExpected(p)
  document.getElementById("s-fail")!.textContent = fmtFail(p)
  return p
}

let streamTimer: ReturnType<typeof setInterval> | null = null

export function stopStream(): void {
  if (streamTimer) { clearInterval(streamTimer); streamTimer = null }
}

function runStream(): void {
  stopStream()
  const opsKey = (document.getElementById("s-ops") as HTMLSelectElement).value
  const bandKey = (document.getElementById("s-range") as HTMLSelectElement).value
  const ops = OP_SETS[opsKey]
  const band = TARGET_BANDS[bandKey]
  refreshSamplerStats()

  const stream = document.getElementById("s-stream")!
  stream.innerHTML = ""
  let n = 0
  const MAX = 60
  streamTimer = setInterval(() => {
    n++
    const expr = genExpression(ops)
    const verdict = classify(expr, ops, band)
    const row = document.createElement("div")
    row.className = "ex-attempt " + (verdict.ok ? "is-ok" : "is-bad")
    row.innerHTML = `
      <div class="ex-attempt-num">#${n}</div>
      <div class="ex-attempt-expr">${fmtExpr(expr)}</div>
      <div class="ex-attempt-val">= ${Number.isFinite(verdict.val) ? (Number.isInteger(verdict.val) ? verdict.val : verdict.val.toFixed(2)) : "NaN"}</div>
      <div class="ex-attempt-reason">${verdict.reason}</div>
    `
    stream.appendChild(row)
    stream.scrollTop = stream.scrollHeight
    if (verdict.ok) {
      stopStream()
    } else if (n >= MAX) {
      stopStream()
      const note = document.createElement("div")
      note.className = "ex-attempt is-bad"
      note.style.gridTemplateColumns = "1fr"
      note.textContent = `…gave up after ${MAX} attempts. Loosen the band or simplify operators.`
      stream.appendChild(note)
    }
  }, reducedMotion ? 30 : 90)
}

export function initSampler(): void {
  // Bind sampler controls
  ["s-ops", "s-range"].forEach((id) =>
    document.getElementById(id)!.addEventListener("change", () => refreshSamplerStats())
  )
  document.getElementById("s-run")!.addEventListener("click", runStream)
  refreshSamplerStats()

  // Populate narrow-band deep dive
  const band = TARGET_BANDS.narrow
  const ops = OP_SETS.all
  let total = 0, ok = 0
  for (let i = 1; i <= 15; i++) {
    for (let j = 1; j <= 15; j++) {
      if (j === i) continue
      for (let k = 1; k <= 15; k++) {
        if (k === i || k === j) continue
        for (const o1 of ops) {
          for (const o2 of ops) {
            total++
            if (classify({ a: i, b: j, c: k, o1, o2 }, ops, band).ok) ok++
          }
        }
      }
    }
  }
  const p = ok / total
  document.getElementById("d3-narrow-p")!.textContent = fmtPct(p)
  document.getElementById("d3-narrow-exp")!.textContent = fmtExpected(p)
  document.getElementById("d3-narrow-fail")!.textContent = fmtFail(p)
}
