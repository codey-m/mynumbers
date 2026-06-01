import { useEffect, useRef } from "react"
import { Link } from "./router"
import styled from "styled-components"
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

const Container = styled.div`
  max-width: 900px;
  margin: 24px auto;
  padding: 18px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(2, 6, 23, 0.08);

  @media (max-width: 600px) {
    margin: 6px auto;
    padding: 10px;
  }
`

const HowToPlay = styled.div`
  margin: 10px 0 4px;
  padding: 10px 14px;
  border-radius: 8px;
  background: #f5f5f5;
  border-left: 3px solid #750014;
  font-size: 14px;
  color: #374151;
  line-height: 1.5;
`

const ExplainerLinkRow = styled.div`
  display: none;
  text-align: center;
  margin: 16px 0;

  body.menu-mode & {
    display: block;
  }

  @media (max-width: 600px) {
    margin: 10px 0;
  }
`

const ExplainerLink = styled(Link)`
  display: inline-block;
  padding: clamp(10px, 1.1vw, 16px) clamp(20px, 2.4vw, 36px);
  border: 2px solid #fff;
  border-radius: 8px;
  background: #dde1e6;
  font-family: 'Fredoka One', system-ui, sans-serif;
  font-size: clamp(16px, 1.4vw, 22px);
  letter-spacing: 0.5px;
  color: #000;
  text-decoration: none;
  line-height: 1;
  cursor: pointer;
  transition: background 150ms, transform 100ms;

  span {
    color: #750014;
  }

  &:active {
    transform: translateY(1px);
  }
`

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

  // Toggle body.menu-mode for CSS that targets it
  useEffect(() => {
    if (state.showMenu) {
      document.body.classList.add("menu-mode")
    } else {
      document.body.classList.remove("menu-mode")
    }
  }, [state.showMenu])

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
      <Container>
        <Logo />
        <ModeSelector />
        <TemplateArea />
        <ExplainerLinkRow>
          <ExplainerLink to="/explainer">
            Inside <span>ARITHMIX</span>
          </ExplainerLink>
        </ExplainerLinkRow>
        <HomeLightboard />
      </Container>
    )
  }

  return (
    <Container>
      <Logo />

      {isRush && <RushStats />}
      {state.mode === "practice" && <PracticeStats />}

      {state.mode === "practice" && (
        <HowToPlay>
          <strong>How to play:</strong> Drag (or tap) numbers from the bank into
          the empty slots to make the equation equal the <strong>Target</strong>.
        </HowToPlay>
      )}

      <TemplateArea />
      <Bank />
      <Controls onNewPuzzle={generatePuzzle} onEndRush={endRush} />
      <Result />

      {isRush && <Lightboard equations={equations} />}

      <RushReadyModal onStart={handleRushReady} />
      <GameOverModal onPlayAgain={playAgain} />
      <Countdown />
    </Container>
  )
}
