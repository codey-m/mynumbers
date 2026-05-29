import { useGameState, useGameDispatch } from "../context/GameContext"

interface ControlsProps {
  onNewPuzzle: () => void
  onEndRush: () => void
}

export function Controls({ onNewPuzzle, onEndRush }: ControlsProps) {
  const { mode } = useGameState()
  const dispatch = useGameDispatch()

  const isRush = mode === "rush3" || mode === "rush5"

  return (
    <div className="controls">
      <button id="resetBtn" onClick={() => dispatch({ type: "RESET_SLOTS" })}>
        Reset
      </button>
      {!isRush && (
        <button id="newBtn" onClick={onNewPuzzle}>
          New Puzzle
        </button>
      )}
      {isRush && (
        <button
          id="endRushBtn"
          className="caution-btn"
          onClick={() => {
            if (confirm("End this rush session?")) onEndRush()
          }}
        >
          End Rush
        </button>
      )}
      <button
        id="menuBtn"
        className="caution-btn"
        onClick={() => dispatch({ type: "SHOW_MENU" })}
      >
        Menu
      </button>
    </div>
  )
}
