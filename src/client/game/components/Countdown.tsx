import { useGameState } from "../context/GameContext"

export function Countdown() {
  const { showCountdown, countdownNumber } = useGameState()

  if (!showCountdown) return null

  return (
    <div id="countdown-overlay" style={{ display: "flex" }}>
      <span id="countdown-number">{countdownNumber}</span>
    </div>
  )
}
