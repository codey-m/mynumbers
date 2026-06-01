import styled from "styled-components"
import { useGameDispatch } from "../context/GameContext"

const Wrapper = styled.div`
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-bottom: 16px;

  @media (max-width: 600px) {
    gap: 6px;
  }
`

const ModeBtn = styled.button`
  padding: clamp(10px, 1.1vw, 16px) clamp(20px, 2.4vw, 36px);
  border: 2px solid #750014;
  border-radius: 8px;
  background: #750014;
  color: #fff;
  font-size: clamp(16px, 1.4vw, 22px);
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms;

  &:hover {
    background: #7a1728;
    border-color: #7a1728;
    color: #fff;
  }

  @media (max-width: 600px) {
    padding: 8px 12px;
    font-size: 13px;
  }
`

export function ModeSelector() {
  const dispatch = useGameDispatch()

  return (
    <Wrapper>
      <ModeBtn onClick={() => dispatch({ type: "START_PRACTICE" })}>
        Practice
      </ModeBtn>
      <ModeBtn onClick={() => dispatch({ type: "START_RUSH", minutes: 3 })}>
        3-Min Rush
      </ModeBtn>
      <ModeBtn onClick={() => dispatch({ type: "START_RUSH", minutes: 5 })}>
        5-Min Rush
      </ModeBtn>
    </Wrapper>
  )
}
