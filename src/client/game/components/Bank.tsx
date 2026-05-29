import { useGameState, useGameDispatch } from "../context/GameContext"

export function Bank() {
  const { bankItems } = useGameState()
  const dispatch = useGameDispatch()

  const unplacedItems = bankItems.filter(item => item.placedInSlot === null)

  return (
    <div className="bank-area" id="bankArea">
      <div
        id="bank"
        className="bank"
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
      </div>
    </div>
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
    <div
      className="bank-item"
      id={item.id}
      data-value={item.value}
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
    </div>
  )
}
