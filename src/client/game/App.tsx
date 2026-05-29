import { useEffect, useRef } from "react"
import { useGameState, useGameDispatch } from "./context/GameContext"
import { Logo } from "./components/Logo"
import { ModeSelector } from "./components/ModeSelector"
import { RushStats, PracticeStats } from "./components/Stats"
import { TemplateArea } from "./components/TemplateArea"
import { Bank } from "./components/Bank"
import { Controls } from "./components/Controls"
import { Result } from "./components/Result"
import { Lightboard, HomeLightboard } from "./components/Lightboard"
import { RushReadyModal, GameOverModal } from "./components/Modals"
import { Countdown } from "./components/Countdown"
import { useTimer } from "./hooks/useTimer"
import { useGameActions } from "./hooks/useGameActions"

export function App() {
  const state = useGameState()
  const dispatch = useGameDispatch()
  const { startTimer } = useTimer()
  const {
    generatePuzzle,
    checkPuzzle,
    endRush,
    startCountdown,
    handleRushReady,
    playAgain,
    equations,
  } = useGameActions()

  const isRush = state.mode === "rush3" || state.mode === "rush5"
  const prevSlotValuesRef = useRef(state.slotValues)

  // Generate puzzle when mode starts
  const hasGenerated = useRef(false)
  useEffect(() => {
    if (state.mode && !state.puzzle && !hasGenerated.current) {
      hasGenerated.current = true
      generatePuzzle()
    }
    if (!state.mode) {
      hasGenerated.current = false
    }
  }, [state.mode, state.puzzle, generatePuzzle])

  // Auto-check when all slots are filled
  useEffect(() => {
    if (prevSlotValuesRef.current !== state.slotValues) {
      prevSlotValuesRef.current = state.slotValues
      const allFilled = state.slotValues.length > 0 && state.slotValues.every(v => v !== null)
      if (allFilled && !state.rushIntroPlaying) {
        checkPuzzle()
      }
    }
  }, [state.slotValues, state.rushIntroPlaying, checkPuzzle])

  // Handle rush intro → show ready modal
  useEffect(() => {
    if (isRush && state.rushIntroPlaying && !state.rushStarted) {
      const timeout = setTimeout(() => {
        dispatch({ type: "SHOW_RUSH_READY_MODAL" })
        dispatch({ type: "SET_RUSH_INTRO_PLAYING", playing: false })
      }, 1500)
      return () => clearTimeout(timeout)
    }
  }, [isRush, state.rushIntroPlaying, state.rushStarted, dispatch])

  // Handle rush start with skip intro
  useEffect(() => {
    if (isRush && !state.rushIntroPlaying && !state.rushStarted && !state.showRushReadyModal) {
      startCountdown()
    }
  }, [isRush, state.rushIntroPlaying, state.rushStarted, state.showRushReadyModal, startCountdown])

  if (state.showMenu) {
    return (
      <div className="container menu-mode">
        <Logo />
        <ModeSelector />
        <div className="template-area">
          <p style={{ textAlign: "center", color: "#999", padding: "20px" }}>
            Select a mode to begin
          </p>
        </div>
        <div className="explainer-link-row">
          <a href="/explainer" className="explainer-link">
            Inside <span>ARITHMIX</span>
          </a>
        </div>
        <HomeLightboard />
      </div>
    )
  }

  return (
    <div className="container">
      <Logo />

      {isRush && <RushStats />}
      {state.mode === "practice" && <PracticeStats />}

      {state.mode === "practice" && (
        <div className="how-to-play">
          <strong>How to play:</strong> Drag (or tap) numbers from the bank into
          the empty slots to make the equation equal the <strong>Target</strong>.
        </div>
      )}

      <TemplateArea />
      <Bank />
      <Controls onNewPuzzle={generatePuzzle} onEndRush={endRush} />
      <Result />

      {isRush && <Lightboard equations={equations} />}

      <RushReadyModal onStart={handleRushReady} />
      <GameOverModal onPlayAgain={playAgain} />
      <Countdown />
    </div>
  )
}
