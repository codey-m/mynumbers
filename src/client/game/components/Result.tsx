import styled from "styled-components"
import { useGameState } from "../context/GameContext"

const ResultMessage = styled.div<{ $type?: string }>`
  margin-top: 12px;
  min-height: 1.4em;
  text-align: center;
  font-weight: 600;
  color: ${p =>
    p.$type === "success" ? "#065f46" :
    p.$type === "error" ? "#7f1d1d" :
    p.$type === "reveal" ? "#0b5" :
    "inherit"
  };

  @media (max-width: 600px) {
    margin-top: 8px;
    font-size: 13px;
  }
`

export function Result() {
  const { result } = useGameState()

  if (!result) return <ResultMessage role="status" />

  return (
    <ResultMessage $type={result.type} role="status">
      {result.text}
    </ResultMessage>
  )
}
