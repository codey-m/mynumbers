import styled from "styled-components"
import { useGameState, useGameDispatch } from "../context/GameContext"

const Wrapper = styled.div`
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 8px;

  @media (max-width: 600px) {
    margin-top: 8px;
    gap: 6px;
  }
`

const Btn = styled.button<{ $caution?: boolean }>`
  padding: 10px 14px;
  border-radius: 8px;
  border: none;
  background: ${p => p.$caution ? "#92400e" : "#111827"};
  color: white;
  cursor: pointer;
  font-weight: 700;
  transition: opacity 150ms;

  &:hover {
    ${p => p.$caution ? "background: #78350f;" : ""}
  }

  @media (max-width: 600px) {
    padding: 8px 10px;
    font-size: 13px;
  }
`

interface ControlsProps {
  onNewPuzzle: () => void
  onEndRush: () => void
}

export function Controls({ onNewPuzzle, onEndRush }: ControlsProps) {
  const { mode } = useGameState()
  const dispatch = useGameDispatch()

  const isRush = mode === "rush3" || mode === "rush5"

  return (
    <Wrapper>
      <Btn onClick={() => dispatch({ type: "RESET_SLOTS" })}>
        Reset
      </Btn>
      {!isRush && (
        <Btn onClick={onNewPuzzle}>
          New Puzzle
        </Btn>
      )}
      {isRush && (
        <Btn
          $caution
          onClick={() => {
            if (confirm("End this rush session?")) onEndRush()
          }}
        >
          End Rush
        </Btn>
      )}
      <Btn
        $caution
        onClick={() => dispatch({ type: "SHOW_MENU" })}
      >
        Menu
      </Btn>
    </Wrapper>
  )
}
