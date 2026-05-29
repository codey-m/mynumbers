// ============================================================================
// STATE MANAGEMENT
// ============================================================================

export interface Puzzle {
  target: number
  numbers: number[]
  template_tokens: string[]
  num_placeholders: number
  solution_expr: string | null
}

export interface PointerDragState {
  pointerId: number
  originEl: HTMLElement
  clone: HTMLElement
  offsetX: number
  offsetY: number
  startX: number
  startY: number
  lastX: number
  lastY: number
  startT: number
}

export let puzzle: Puzzle | null = null

// Rush mode state
export let gameMode: string | null = "practice"
export let rushTimer: ReturnType<typeof setInterval> | null = null
export let timeRemaining = 0
export let puzzlesSolved = 0
export let currentDifficulty = 1
export let maxDifficultyReached = 1
export let rushIntroPlaying = false
export let skipIntroAnimation = false
export let rushStarted = false

// Share state (captured at end of rush, before Tim is hidden)
export let currentShareBlob: Blob | null = null
export let currentShareBlobURL: string | null = null

// Lightboard
export let lightboardZoneIndex = 0
export let lightboardShuffledZones: number[][] = []
export let lightboardEqEls: (HTMLElement | null)[] = []

// 4 rows × 3 columns of pre-defined positions (left%, top%)
// Shuffled at the start of each rush so the fill pattern is different every game
export const LIGHTBOARD_ZONES: number[][] = [
  [2, 5],  [34, 5],  [67, 5],
  [2, 32], [34, 32], [67, 32],
  [2, 59], [34, 59], [67, 59],
  [2, 79], [34, 79], [67, 79],
]

export const LIGHTBOARD_COLORS = [
  { color: "#ff6ec7", glow: "rgba(255,110,199,0.5)" }, // neon pink
  { color: "#39ff14", glow: "rgba(57,255,20,0.5)"   }, // neon green
  { color: "#ffe033", glow: "rgba(255,224,51,0.5)"  }, // neon yellow
  { color: "#00d4ff", glow: "rgba(0,212,255,0.5)"   }, // neon cyan
  { color: "#ff9d00", glow: "rgba(255,157,0,0.5)"   }, // neon orange
  { color: "#c77dff", glow: "rgba(199,125,255,0.5)" }, // neon purple
]

// Drag/drop constants
export const SNAP_THRESHOLD = 120
export const SNAP_ANIM_MS = 180
export const TAP_MOVE_PX = 18
export const CLICK_SUPPRESS_MS = 1200

export const GAME_URL = "https://mynumbers.onrender.com/"

export let suppressClickUntil = 0
export let pointerState: PointerDragState | null = null
export let scrollLocked = false

export let autoCheckTimeout: ReturnType<typeof setTimeout> | null = null

// Setters for mutable state
export function setPuzzle(p: Puzzle | null) { puzzle = p }
export function setGameMode(m: string | null) { gameMode = m }
export function setRushTimer(t: ReturnType<typeof setInterval> | null) { rushTimer = t }
export function setTimeRemaining(t: number) { timeRemaining = t }
export function setPuzzlesSolved(n: number) { puzzlesSolved = n }
export function setCurrentDifficulty(d: number) { currentDifficulty = d }
export function setMaxDifficultyReached(d: number) { maxDifficultyReached = d }
export function setRushIntroPlaying(b: boolean) { rushIntroPlaying = b }
export function setSkipIntroAnimation(b: boolean) { skipIntroAnimation = b }
export function setRushStarted(b: boolean) { rushStarted = b }
export function setCurrentShareBlob(b: Blob | null) { currentShareBlob = b }
export function setCurrentShareBlobURL(u: string | null) { currentShareBlobURL = u }
export function setLightboardZoneIndex(i: number) { lightboardZoneIndex = i }
export function setLightboardShuffledZones(z: number[][]) { lightboardShuffledZones = z }
export function setLightboardEqEls(e: (HTMLElement | null)[]) { lightboardEqEls = e }
export function setSuppressClickUntil(t: number) { suppressClickUntil = t }
export function setPointerState(s: PointerDragState | null) { pointerState = s }
export function setScrollLocked(b: boolean) { scrollLocked = b }
export function setAutoCheckTimeout(t: ReturnType<typeof setTimeout> | null) { autoCheckTimeout = t }
