import { useCallback, useRef } from "react"
import { useGameState, useGameDispatch, calculateDifficulty } from "../context/GameContext"
import { puzzleRush, puzzleCheck, type PuzzleOut, type CheckResult } from "../generator"
import type { BankItem, Puzzle } from "../types"

export function useGameActions() {
  const state = useGameState()
  const dispatch = useGameDispatch()
  const autoCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const equationsRef = useRef<string[]>([])

  const generatePuzzle = useCallback(() => {
    let difficulty = 3
    if (state.mode === "rush3" || state.mode === "rush5") {
      difficulty = calculateDifficulty(state.puzzlesSolved)
      dispatch({ type: "SET_DIFFICULTY", difficulty })
    }

    let data: PuzzleOut
    try {
      data = puzzleRush({ difficulty, decoys: 2 })
    } catch (e) {
      console.error("Generate puzzle error", e)
      dispatch({
        type: "SET_RESULT",
        result: { text: "Failed to generate puzzle.", type: "error" },
      })
      return
    }

    const bankItems: BankItem[] = data.numbers.map((n, i) => ({
      id: `bank-${i}-${n}-${Math.random().toString(36).slice(2, 8)}`,
      value: n,
      placedInSlot: null,
    }))

    dispatch({
      type: "SET_PUZZLE",
      puzzle: data as Puzzle,
      bankItems,
    })
  }, [state.mode, state.puzzlesSolved, dispatch])

  const checkPuzzle = useCallback(() => {
    const { puzzle, bankItems, slotValues } = state
    if (!puzzle) return

    const allFilled = slotValues.every(v => v !== null)
    if (!allFilled) return

    // Build expression from template
    const parts: string[] = []
    for (const tok of puzzle.template_tokens) {
      const isSlot = tok.startsWith("{") && tok.endsWith("}")
      if (isSlot) {
        const idx = parseInt(tok.slice(1, -1), 10)
        const tile = bankItems.find(item => item.placedInSlot === idx)
        if (!tile) return
        parts.push(String(tile.value))
      } else {
        parts.push(tok)
      }
    }

    const expression = parts.join("")
    const displayExpr = expression.replace(/\*/g, "×").replace(/\//g, "÷")

    const result: CheckResult = puzzleCheck({
      numbers: puzzle.numbers,
      expression,
      target: puzzle.target,
    })

    const evalDisplay = result.evaluated_display || String(result.evaluated)

    if (result.reason === "invalid_expression") {
      dispatch({
        type: "SET_RESULT",
        result: { text: `Invalid: ${result.message || "expression invalid"}`, type: "error" },
      })
      return
    }

    if (result.reason === "correct") {
      if (state.mode === "rush3" || state.mode === "rush5") {
        dispatch({ type: "INCREMENT_SOLVED" })
        equationsRef.current = [...equationsRef.current, `${displayExpr} = ${puzzle.target}`]
        dispatch({
          type: "SET_RESULT",
          result: { text: `Correct! Level ${state.puzzlesSolved + 2}`, type: "success" },
        })
        setTimeout(() => generatePuzzle(), 600)
      } else {
        dispatch({
          type: "SET_RESULT",
          result: { text: `Correct! ${displayExpr} = ${evalDisplay}`, type: "success" },
        })
      }
      return
    }

    if (result.reason === "wrong_value") {
      dispatch({
        type: "SET_RESULT",
        result: { text: `Incorrect. Got ${evalDisplay}, need ${puzzle.target}`, type: "error" },
      })
      return
    }

    dispatch({
      type: "SET_RESULT",
      result: { text: `Result: ${evalDisplay}`, type: "" },
    })
  }, [state, dispatch, generatePuzzle])

  const scheduleAutoCheck = useCallback(() => {
    if (autoCheckRef.current) {
      clearTimeout(autoCheckRef.current)
    }
    autoCheckRef.current = setTimeout(() => {
      autoCheckRef.current = null
      checkPuzzle()
    }, 300)
  }, [checkPuzzle])

  const endRush = useCallback(() => {
    dispatch({ type: "END_RUSH" })
  }, [dispatch])

  const startCountdown = useCallback(() => {
    dispatch({ type: "SHOW_COUNTDOWN" })
    let count = 3

    function tick() {
      dispatch({ type: "SET_COUNTDOWN_NUMBER", value: count })
      if (count === 1) {
        setTimeout(() => {
          dispatch({ type: "SET_COUNTDOWN_NUMBER", value: "GO!" })
          setTimeout(() => {
            dispatch({ type: "HIDE_COUNTDOWN" })
            dispatch({ type: "SET_RUSH_STARTED", started: true })
          }, 700)
        }, 750)
        return
      }
      count--
      setTimeout(tick, 750)
    }
    tick()
  }, [dispatch])

  const handleRushReady = useCallback(() => {
    dispatch({ type: "HIDE_RUSH_READY_MODAL" })
    dispatch({ type: "SET_RUSH_STARTED", started: true })
    dispatch({ type: "SET_RUSH_INTRO_PLAYING", playing: false })
  }, [dispatch])

  const playAgain = useCallback(() => {
    dispatch({ type: "HIDE_GAME_OVER_MODAL" })
    const was3 = state.mode === "rush3"
    dispatch({ type: "START_RUSH", minutes: was3 ? 3 : 5, skipIntro: true })
  }, [dispatch, state.mode])

  return {
    generatePuzzle,
    checkPuzzle,
    scheduleAutoCheck,
    endRush,
    startCountdown,
    handleRushReady,
    playAgain,
    equations: equationsRef.current,
  }
}
