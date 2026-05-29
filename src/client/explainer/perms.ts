// ============================================================================
// Explainer — Slide 4: Permutation Verifier
// ============================================================================

import { reducedMotion } from './tree'

const BANK = [2, 3, 4, 5, 7, 8, 9]
const TARGET = 29
const K = 5
const TOTAL_PERMS = 2520

function* permGen(n: number, k: number): Generator<number[]> {
  const idx = Array.from({ length: n }, (_, i) => i)
  function* recurse(arr: number[], depth: number): Generator<number[]> {
    if (depth === k) { yield arr.slice(0, k); return }
    for (let i = depth; i < arr.length; i++) {
      [arr[depth], arr[i]] = [arr[i], arr[depth]]
      yield* recurse(arr, depth + 1)
      ;[arr[depth], arr[i]] = [arr[i], arr[depth]]
    }
  }
  yield* recurse(idx, 0)
}

function evalTemplate(a: number, b: number, c: number, d: number, e: number): number {
  if (e === 0) return NaN
  return ((a + b) * c) - (d / e)
}

const SOLUTIONS_COUNT = (() => {
  let s = 0
  for (const perm of permGen(BANK.length, K)) {
    if (evalTemplate(...(perm.map((i) => BANK[i]) as [number, number, number, number, number])) === TARGET) s++
  }
  return s
})()

const PERM_START_MS = 400
const PERM_MIN_MS = 8
const PERM_DECAY = 0.96

interface PermState {
  gen: Generator<number[]>
  count: number
  done: boolean
  found: boolean
}

let permState: PermState | null = null
let permAutoTimer: ReturnType<typeof setTimeout> | null = null
let permAutoSpeed = 0

function fillSlots(vals: (number | null)[]): void {
  for (let i = 0; i < 5; i++) {
    const slot = document.querySelector<HTMLElement>(`.ex-pslot[data-slot="${i}"]`)
    if (!slot) continue
    if (vals[i] === null || vals[i] === undefined) {
      slot.textContent = "__"
      slot.classList.remove("is-filled", "is-pulse")
    } else {
      slot.textContent = String(vals[i])
      slot.classList.add("is-filled")
      slot.classList.remove("is-pulse")
      void slot.offsetWidth
      slot.classList.add("is-pulse")
    }
  }
}

function setMatch(state: string | null): void {
  const check = document.getElementById("p-match")
  if (!check) return
  check.classList.toggle("is-visible", state === "match")
}

function resetPerm(): void {
  permState = { gen: permGen(BANK.length, K), count: 0, done: false, found: false }
  permAutoSpeed = 0
  fillSlots([null, null, null, null, null])
  document.getElementById("p-count")!.textContent = "0"
  document.getElementById("p-total")!.textContent = String(TOTAL_PERMS)
  document.getElementById("p-result")!.textContent = ""
  document.querySelector(".ex-perm-board")!.classList.remove("has-result")
  setMatch(null)
}

function stepPerm(): boolean | null {
  if (!permState) resetPerm()
  if (permState!.done) return false
  const next = permState!.gen.next()
  if (next.done) { permState!.done = true; return false }
  const vals = next.value.map((i: number) => BANK[i])
  fillSlots(vals)
  permState!.count++
  document.getElementById("p-count")!.textContent = String(permState!.count)
  const v = evalTemplate(...(vals as [number, number, number, number, number]))
  document.getElementById("p-result")!.textContent = Number.isInteger(v) ? String(v) : v.toFixed(2)
  document.querySelector(".ex-perm-board")!.classList.add("has-result")
  if (v === TARGET) {
    setMatch("match")
    permState!.found = true
    permState!.done = true
    return true
  }
  setMatch("miss")
  return null
}

export function stopAuto(): void {
  if (permAutoTimer) { clearTimeout(permAutoTimer); permAutoTimer = null }
  const btn = document.getElementById("p-auto")
  if (btn) btn.textContent = "Autoplay"
}

function scheduleNextPermTick(): void {
  permAutoTimer = setTimeout(() => {
    const r = stepPerm()
    if (r === true || (permState && permState.done)) { stopAuto(); return }
    permAutoSpeed = Math.max(reducedMotion ? 1 : PERM_MIN_MS, permAutoSpeed * PERM_DECAY)
    scheduleNextPermTick()
  }, permAutoSpeed)
}

export function initPerms(): void {
  const EXPECTED_CHECKS = Math.round((TOTAL_PERMS + 1) / (SOLUTIONS_COUNT + 1))
  document.getElementById("p-solutions")!.textContent = String(SOLUTIONS_COUNT)
  document.getElementById("p-expected")!.textContent = String(EXPECTED_CHECKS)

  document.getElementById("p-step")!.addEventListener("click", () => { stopAuto(); stepPerm() })
  document.getElementById("p-reset")!.addEventListener("click", () => { stopAuto(); resetPerm() })
  document.getElementById("p-auto")!.addEventListener("click", () => {
    if (permAutoTimer) { stopAuto(); return }
    document.getElementById("p-auto")!.textContent = "Pause"
    if (permAutoSpeed === 0) permAutoSpeed = reducedMotion ? 1 : PERM_START_MS
    scheduleNextPermTick()
  })
  resetPerm()
}
