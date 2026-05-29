import { useGameState } from "../context/GameContext"

export function Result() {
  const { result } = useGameState()

  if (!result) return <div className="result" role="status" />

  return (
    <div className={`result ${result.type}`} role="status">
      {result.text}
    </div>
  )
}
