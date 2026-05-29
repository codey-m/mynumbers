import { useEffect, useRef, useCallback } from "react"
import { useGameState, useGameDispatch } from "../context/GameContext"

export function useTimer() {
  const { mode, rushStarted, timeRemaining } = useGameState()
  const dispatch = useGameDispatch()
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isRush = mode === "rush3" || mode === "rush5"

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startTimer = useCallback(() => {
    stopTimer()
    timerRef.current = setInterval(() => {
      dispatch({ type: "TICK_TIMER" })
    }, 1000)
  }, [dispatch, stopTimer])

  // Start timer when rush starts
  useEffect(() => {
    if (isRush && rushStarted) {
      startTimer()
    } else {
      stopTimer()
    }
    return stopTimer
  }, [isRush, rushStarted, startTimer, stopTimer])

  // End rush when time runs out
  useEffect(() => {
    if (isRush && rushStarted && timeRemaining <= 0) {
      stopTimer()
      dispatch({ type: "END_RUSH" })
    }
  }, [isRush, rushStarted, timeRemaining, stopTimer, dispatch])

  return { startTimer, stopTimer }
}
