import { useGameDispatch } from "../context/GameContext"

export function ModeSelector() {
  const dispatch = useGameDispatch()

  return (
    <div className="mode-selector" id="mode-selector">
      <button
        className="mode-btn"
        onClick={() => dispatch({ type: "START_PRACTICE" })}
      >
        Practice
      </button>
      <button
        className="mode-btn"
        onClick={() => dispatch({ type: "START_RUSH", minutes: 3 })}
      >
        3-Min Rush
      </button>
      <button
        className="mode-btn"
        onClick={() => dispatch({ type: "START_RUSH", minutes: 5 })}
      >
        5-Min Rush
      </button>
    </div>
  )
}
