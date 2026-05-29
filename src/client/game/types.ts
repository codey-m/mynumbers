export interface Puzzle {
  target: number
  numbers: number[]
  template_tokens: string[]
  num_placeholders: number
  solution_expr: string | null
}

export type GameMode = "practice" | "rush3" | "rush5" | null

export interface GameState {
  mode: GameMode
  puzzle: Puzzle | null
  puzzlesSolved: number
  timeRemaining: number
  currentDifficulty: number
  maxDifficultyReached: number
  rushStarted: boolean
  rushIntroPlaying: boolean
  slotValues: (number | null)[]
  bankItems: BankItem[]
  result: { text: string; type: "success" | "error" | "" } | null
  showMenu: boolean
  showRushReadyModal: boolean
  showGameOverModal: boolean
  showCountdown: boolean
  countdownNumber: number | string
}

export interface BankItem {
  id: string
  value: number
  placedInSlot: number | null
}

export type GameAction =
  | { type: "SHOW_MENU" }
  | { type: "START_PRACTICE" }
  | { type: "START_RUSH"; minutes: number; skipIntro?: boolean }
  | { type: "SET_PUZZLE"; puzzle: Puzzle; bankItems: BankItem[] }
  | { type: "PLACE_TILE"; tileId: string; slotIndex: number }
  | { type: "REMOVE_TILE"; slotIndex: number }
  | { type: "RESET_SLOTS" }
  | { type: "SET_RESULT"; result: GameState["result"] }
  | { type: "TICK_TIMER" }
  | { type: "END_RUSH" }
  | { type: "SET_RUSH_STARTED"; started: boolean }
  | { type: "SET_RUSH_INTRO_PLAYING"; playing: boolean }
  | { type: "SHOW_RUSH_READY_MODAL" }
  | { type: "HIDE_RUSH_READY_MODAL" }
  | { type: "SHOW_GAME_OVER_MODAL" }
  | { type: "HIDE_GAME_OVER_MODAL" }
  | { type: "SHOW_COUNTDOWN" }
  | { type: "SET_COUNTDOWN_NUMBER"; value: number | string }
  | { type: "HIDE_COUNTDOWN" }
  | { type: "INCREMENT_SOLVED" }
  | { type: "SET_DIFFICULTY"; difficulty: number }
