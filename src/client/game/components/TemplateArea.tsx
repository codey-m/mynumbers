import { useGameState, useGameDispatch } from "../context/GameContext"
import type { BankItem } from "../types"

const DISPLAY_OPS: Record<string, string> = {
  "*": "×",
  "/": "÷",
}

interface SlotProps {
  index: number
  tile: BankItem | undefined
  onDrop: (tileId: string, slotIndex: number) => void
  onRemove: (slotIndex: number) => void
}

function Slot({ index, tile, onDrop, onRemove }: SlotProps) {
  return (
    <div
      className={`slot${tile ? " filled" : ""}`}
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
        <div
          className="bank-item"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move"
            e.dataTransfer.setData("text/plain", tile.id)
          }}
        >
          {tile.value}
        </div>
      )}
    </div>
  )
}

export function TemplateArea() {
  const { puzzle, bankItems } = useGameState()
  const dispatch = useGameDispatch()

  if (!puzzle) {
    return (
      <div className="template-area" id="template-area">
        <p style={{ textAlign: "center", color: "#999", padding: "20px" }}>
          Select a mode to begin
        </p>
      </div>
    )
  }

  function handleDrop(tileId: string, slotIndex: number) {
    dispatch({ type: "PLACE_TILE", tileId, slotIndex })
  }

  function handleRemove(slotIndex: number) {
    dispatch({ type: "REMOVE_TILE", slotIndex })
  }

  return (
    <div className="template-area" id="template-area">
      <div className="equation-row">
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
            <span key={`token-${i}`} className="inline-token">
              {DISPLAY_OPS[tok] || tok}
            </span>
          )
        })}
      </div>
    </div>
  )
}
