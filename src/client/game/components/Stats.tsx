import { useGameState } from "../context/GameContext"

export function RushStats() {
  const { timeRemaining, puzzle, puzzlesSolved } = useGameState()
  const mins = Math.floor(timeRemaining / 60)
  const secs = timeRemaining % 60

  let timerColor = "#ffffff"
  if (timeRemaining <= 10) timerColor = "#dc2626"
  else if (timeRemaining <= 30) timerColor = "#f59e0b"

  return (
    <div className="rush-stats" id="rush-stats">
      <div className="stat">
        <span className="stat-label">Time</span>
        <span className="stat-value timer" style={{ color: timerColor }}>
          {mins}:{secs.toString().padStart(2, "0")}
        </span>
      </div>
      <div className="stat stat-center">
        <span className="stat-label">Target</span>
        <span className="stat-value">
          {puzzle ? puzzle.target : "—"}
        </span>
      </div>
      <div className="stat">
        <span className="stat-label">Level</span>
        <span className="stat-value">{puzzlesSolved + 1}</span>
      </div>
    </div>
  )
}

export function PracticeStats() {
  const { puzzle } = useGameState()

  return (
    <div className="rush-stats" id="practice-stats">
      <div className="stat stat-center">
        <span className="stat-label">Target</span>
        <span className="stat-value">
          {puzzle ? puzzle.target : "—"}
        </span>
      </div>
    </div>
  )
}
