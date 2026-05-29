import { useGameState, useGameDispatch } from "../context/GameContext"

interface ModalsProps {
  onPlayAgain: () => void
}

export function RushReadyModal({ onStart }: { onStart: () => void }) {
  const { showRushReadyModal } = useGameState()
  const dispatch = useGameDispatch()

  if (!showRushReadyModal) return null

  return (
    <div className="modal-overlay" style={{ display: "flex" }}>
      <div className="modal-box">
        <h2>Ready to Rush?</h2>
        <p className="modal-desc">
          Arrange the numbers to hit the <strong>Target</strong>. Solve as many
          puzzles as you can before time runs out!
        </p>
        <div className="modal-buttons">
          <button
            className="modal-btn primary"
            onClick={() => {
              dispatch({ type: "HIDE_RUSH_READY_MODAL" })
              onStart()
            }}
          >
            Let&apos;s Go!
          </button>
        </div>
      </div>
    </div>
  )
}

export function GameOverModal({ onPlayAgain }: ModalsProps) {
  const { showGameOverModal, puzzlesSolved, mode } = useGameState()
  const dispatch = useGameDispatch()

  if (!showGameOverModal) return null

  const timSrc = puzzlesSolved >= 5
    ? "/static/images/tim-wave.svg"
    : "/static/images/tim-front.svg"

  function handleDismiss() {
    dispatch({ type: "HIDE_GAME_OVER_MODAL" })
  }

  return (
    <div
      className="modal-overlay"
      style={{ display: "flex" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleDismiss()
      }}
    >
      <canvas id="fireworks-canvas" className="fireworks-canvas" />
      <div className="modal-box">
        <button
          className="modal-close"
          aria-label="Close"
          onClick={handleDismiss}
        >
          &#x2715;
        </button>
        <img className="tim-img" src={timSrc} alt="Tim" />
        <h2>Rush Complete!</h2>
        <div className="modal-stats">
          <div className="modal-stat">
            <div className="modal-stat-value">{puzzlesSolved}</div>
            <div className="modal-stat-label">Puzzles Solved</div>
          </div>
        </div>
        <div className="modal-buttons">
          <button className="modal-btn primary" onClick={onPlayAgain}>
            Play Again
          </button>
          <button
            className="modal-btn"
            onClick={() => dispatch({ type: "SHOW_MENU" })}
          >
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  )
}
