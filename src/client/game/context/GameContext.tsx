import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from "react"
import { type GameState, type GameAction, type BankItem } from "../types"

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

const initialState: GameState = {
  mode: null,
  puzzle: null,
  puzzlesSolved: 0,
  timeRemaining: 0,
  currentDifficulty: 1,
  maxDifficultyReached: 1,
  rushStarted: false,
  rushIntroPlaying: false,
  slotValues: [],
  bankItems: [],
  result: null,
  showMenu: true,
  showRushReadyModal: false,
  showGameOverModal: false,
  showCountdown: false,
  countdownNumber: 3,
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "SHOW_MENU":
      return {
        ...initialState,
        showMenu: true,
      }

    case "START_PRACTICE":
      return {
        ...state,
        mode: "practice",
        showMenu: false,
        showRushReadyModal: false,
        showGameOverModal: false,
        puzzlesSolved: 0,
        result: null,
      }

    case "START_RUSH": {
      const mode = action.minutes === 3 ? "rush3" : "rush5"
      return {
        ...state,
        mode: mode as "rush3" | "rush5",
        showMenu: false,
        showRushReadyModal: false,
        showGameOverModal: false,
        puzzlesSolved: 0,
        currentDifficulty: 1,
        maxDifficultyReached: 1,
        timeRemaining: action.minutes * 60,
        rushStarted: false,
        rushIntroPlaying: !action.skipIntro,
        result: null,
      }
    }

    case "SET_PUZZLE": {
      const slotValues = new Array(action.puzzle.num_placeholders).fill(null)
      return {
        ...state,
        puzzle: action.puzzle,
        slotValues,
        bankItems: action.bankItems,
        result: null,
      }
    }

    case "PLACE_TILE": {
      const bankItems = state.bankItems.map(item =>
        item.id === action.tileId
          ? { ...item, placedInSlot: action.slotIndex }
          : item.placedInSlot === action.slotIndex
            ? { ...item, placedInSlot: null }
            : item
      )
      const slotValues = [...state.slotValues]
      const tile = state.bankItems.find(i => i.id === action.tileId)
      if (tile) slotValues[action.slotIndex] = tile.value
      return { ...state, bankItems, slotValues, result: null }
    }

    case "REMOVE_TILE": {
      const bankItems = state.bankItems.map(item =>
        item.placedInSlot === action.slotIndex
          ? { ...item, placedInSlot: null }
          : item
      )
      const slotValues = [...state.slotValues]
      slotValues[action.slotIndex] = null
      return { ...state, bankItems, slotValues, result: null }
    }

    case "RESET_SLOTS": {
      const bankItems = state.bankItems.map(item => ({ ...item, placedInSlot: null }))
      const slotValues = new Array(state.slotValues.length).fill(null)
      return { ...state, bankItems, slotValues, result: null }
    }

    case "SET_RESULT":
      return { ...state, result: action.result }

    case "TICK_TIMER":
      return { ...state, timeRemaining: Math.max(0, state.timeRemaining - 1) }

    case "END_RUSH":
      return { ...state, rushStarted: false, showGameOverModal: true }

    case "SET_RUSH_STARTED":
      return { ...state, rushStarted: action.started }

    case "SET_RUSH_INTRO_PLAYING":
      return { ...state, rushIntroPlaying: action.playing }

    case "SHOW_RUSH_READY_MODAL":
      return { ...state, showRushReadyModal: true }

    case "HIDE_RUSH_READY_MODAL":
      return { ...state, showRushReadyModal: false }

    case "SHOW_GAME_OVER_MODAL":
      return { ...state, showGameOverModal: true }

    case "HIDE_GAME_OVER_MODAL":
      return { ...state, showGameOverModal: false }

    case "SHOW_COUNTDOWN":
      return { ...state, showCountdown: true }

    case "SET_COUNTDOWN_NUMBER":
      return { ...state, countdownNumber: action.value }

    case "HIDE_COUNTDOWN":
      return { ...state, showCountdown: false }

    case "INCREMENT_SOLVED":
      return { ...state, puzzlesSolved: state.puzzlesSolved + 1 }

    case "SET_DIFFICULTY": {
      const maxD = Math.max(state.maxDifficultyReached, action.difficulty)
      return { ...state, currentDifficulty: action.difficulty, maxDifficultyReached: maxD }
    }

    default:
      return state
  }
}

const GameStateContext = createContext<GameState>(initialState)
const GameDispatchContext = createContext<Dispatch<GameAction>>(() => {})

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState)
  return (
    <GameStateContext.Provider value={state}>
      <GameDispatchContext.Provider value={dispatch}>
        {children}
      </GameDispatchContext.Provider>
    </GameStateContext.Provider>
  )
}

export function useGameState() {
  return useContext(GameStateContext)
}

export function useGameDispatch() {
  return useContext(GameDispatchContext)
}
