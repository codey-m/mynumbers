import styled, { keyframes } from "styled-components"
import { useGameState } from "../context/GameContext"

const pop = keyframes`
  0%   { transform: scale(1.4); opacity: 1; }
  70%  { transform: scale(0.95); opacity: 1; }
  100% { transform: scale(0.85); opacity: 0; }
`

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  pointer-events: none;
`

const Number = styled.span`
  font-size: 160px;
  font-weight: 900;
  color: white;
  text-shadow: 0 4px 24px rgba(0,0,0,0.45);
  animation: ${pop} 0.7s ease-out forwards;
  line-height: 1;
`

export function Countdown() {
  const { showCountdown, countdownNumber } = useGameState()

  if (!showCountdown) return null

  return (
    <Overlay>
      <Number key={countdownNumber}>{countdownNumber}</Number>
    </Overlay>
  )
}
