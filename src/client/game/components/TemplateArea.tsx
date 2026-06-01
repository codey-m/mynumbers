import styled from "styled-components"
import { useGameState, useGameDispatch } from "../context/GameContext"
import type { BankItem } from "../types"

const DISPLAY_OPS: Record<string, string> = {
  "*": "×",
  "/": "÷",
}

const TemplateWrapper = styled.div`
  padding: 10px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #d0d0d0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  min-height: 56px;
  margin-bottom: 30px;
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;

  body.menu-mode & {
    margin-bottom: 0;
  }

  @media (max-width: 600px) {
    padding: 6px;
    min-height: 44px;
  }
`

const EquationRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  white-space: nowrap;
  min-width: 100%;
  box-sizing: border-box;

  @media (max-width: 600px) {
    gap: 4px;
  }
`

const InlineToken = styled.span`
  display: inline-block;
  padding: 4px 6px;
  font-weight: 700;
  color: #0f172a;
  background: transparent;
  border-radius: 4px;
  font-size: 18px;

  @media (max-width: 600px) {
    font-size: 18px;
    padding: 3px 4px;
    font-weight: 800;
  }
`

const SlotWrapper = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  height: 44px;
  border-radius: 8px;
  border: 0;
  background: linear-gradient(180deg, #f5f5f5, #e0e0e0);
  box-shadow: inset 0 -2px 0 rgba(255, 255, 255, 0.6);
  font-weight: 700;
  color: #0f172a;
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;

  @media (max-width: 600px) {
    min-width: 32px;
    height: 32px;
    font-size: 14px;
  }
`

const SlotTile = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  height: 44px;
  padding: 0 12px;
  background: #750014;
  color: white;
  font-weight: 700;
  font-size: 18px;
  border-radius: 10px;
  cursor: grab;
  user-select: none;
  box-shadow: 0 6px 14px rgba(30, 30, 30, 0.28);

  @media (max-width: 600px) {
    min-width: 32px;
    height: 32px;
    font-size: 14px;
    padding: 0 6px;
  }
`

interface SlotProps {
  index: number
  tile: BankItem | undefined
  onDrop: (tileId: string, slotIndex: number) => void
  onRemove: (slotIndex: number) => void
}

function Slot({ index, tile, onDrop, onRemove }: SlotProps) {
  return (
    <SlotWrapper
      data-slot-index={index}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        const tileId = e.dataTransfer.getData("text/plain")
        if (tileId) onDrop(tileId, index)
      }}
      onClick={() => {
        if (tile) onRemove(index)
      }}
    >
      {tile && (
        <SlotTile
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move"
            e.dataTransfer.setData("text/plain", tile.id)
          }}
        >
          {tile.value}
        </SlotTile>
      )}
    </SlotWrapper>
  )
}

export function TemplateArea() {
  const { puzzle, bankItems } = useGameState()
  const dispatch = useGameDispatch()

  if (!puzzle) {
    return (
      <TemplateWrapper>
        <p style={{ textAlign: "center", color: "#999", padding: "20px", margin: 0, fontSize: "16px", fontWeight: 500 }}>
          Select a mode to begin
        </p>
      </TemplateWrapper>
    )
  }

  function handleDrop(tileId: string, slotIndex: number) {
    dispatch({ type: "PLACE_TILE", tileId, slotIndex })
  }

  function handleRemove(slotIndex: number) {
    dispatch({ type: "REMOVE_TILE", slotIndex })
  }

  return (
    <TemplateWrapper>
      <EquationRow>
        {puzzle.template_tokens.map((tok, i) => {
          const isSlot = tok.startsWith("{") && tok.endsWith("}")

          if (isSlot) {
            const slotIndex = parseInt(tok.slice(1, -1), 10)
            const tile = bankItems.find(item => item.placedInSlot === slotIndex)
            return (
              <Slot
                key={`slot-${slotIndex}`}
                index={slotIndex}
                tile={tile}
                onDrop={handleDrop}
                onRemove={handleRemove}
              />
            )
          }

          return (
            <InlineToken key={`token-${i}`}>
              {DISPLAY_OPS[tok] || tok}
            </InlineToken>
          )
        })}
      </EquationRow>
    </TemplateWrapper>
  )
}
