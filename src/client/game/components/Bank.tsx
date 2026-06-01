import styled from "styled-components"
import { useGameState, useGameDispatch } from "../context/GameContext"

const BankArea = styled.div`
  margin: 16px 0 8px;
  text-align: center;

  @media (max-width: 600px) {
    margin: 10px 0 6px;
  }
`

const BankRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
  padding: 10px;
  border-radius: 8px;
  background: #f0f0f0;
  min-height: 56px;
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;

  @media (max-width: 600px) {
    padding: 6px;
    gap: 6px;
    min-height: 44px;
  }
`

const BankChip = styled.div`
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
  transition: box-shadow 120ms ease;
  touch-action: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;

  @media (max-width: 600px) {
    min-width: 38px;
    height: 38px;
    font-size: 15px;
    padding: 0 10px;
  }
`

export function Bank() {
  const { bankItems } = useGameState()
  const dispatch = useGameDispatch()

  const unplacedItems = bankItems.filter(item => item.placedInSlot === null)

  return (
    <BankArea>
      <BankRow
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const tileId = e.dataTransfer.getData("text/plain")
          if (tileId) {
            const item = bankItems.find(i => i.id === tileId)
            if (item && item.placedInSlot !== null) {
              dispatch({ type: "REMOVE_TILE", slotIndex: item.placedInSlot })
            }
          }
        }}
      >
        {unplacedItems.map(item => (
          <BankTile key={item.id} item={item} />
        ))}
      </BankRow>
    </BankArea>
  )
}

function BankTile({ item }: { item: { id: string; value: number } }) {
  const { slotValues } = useGameState()
  const dispatch = useGameDispatch()

  function handleClick() {
    const nextEmpty = slotValues.findIndex(v => v === null)
    if (nextEmpty !== -1) {
      dispatch({ type: "PLACE_TILE", tileId: item.id, slotIndex: nextEmpty })
    }
  }

  return (
    <BankChip
      draggable
      onDragStart={(e) => {
        document.body.classList.add("dragging")
        e.dataTransfer.effectAllowed = "move"
        e.dataTransfer.setData("text/plain", item.id)
      }}
      onDragEnd={() => {
        document.body.classList.remove("dragging")
      }}
      onClick={handleClick}
    >
      {item.value}
    </BankChip>
  )
}
