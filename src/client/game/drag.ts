// ============================================================================
// Drag-and-drop: tile movement, snap animations, touch/pointer handling
// ============================================================================

import {
  SNAP_THRESHOLD, SNAP_ANIM_MS, TAP_MOVE_PX,
  pointerState, setPointerState, PointerDragState,
} from './state'
import { updateControls } from './lightboard'
import { suppressGhostClicks, lockPageScroll, unlockPageScroll } from './puzzle'

// ============================================================================
// Slot helpers
// ============================================================================

export function findNextEmptySlot(): HTMLElement | null {
  const slots = Array.from(document.querySelectorAll<HTMLElement>(".slot"))
  for (const slot of slots) {
    if (!slot.querySelector(".bank-item")) return slot
  }
  return null
}

function getDraggedElement(event: DragEvent): HTMLElement | null {
  const id = event.dataTransfer!.getData("text/plain")
  return id ? document.getElementById(id) : null
}

function findSlotUnderPoint(slots: HTMLElement[], x: number, y: number): HTMLElement | null {
  for (const slot of slots) {
    const rect = slot.getBoundingClientRect()
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      return slot
    }
  }
  return null
}

function findNearestEmptySlot(slots: HTMLElement[], x: number, y: number): { slot: HTMLElement | null, distance: number } {
  const emptySlots = slots.filter(slot => !slot.querySelector(".bank-item"))
  let nearestSlot: HTMLElement | null = null
  let nearestDistance = Infinity

  for (const slot of emptySlots) {
    const rect = slot.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const distance = Math.hypot(centerX - x, centerY - y)
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestSlot = slot
    }
  }

  return { slot: nearestSlot, distance: nearestDistance }
}

function returnTileToBank(tile: HTMLElement): void {
  const bank = document.getElementById("bank")
  if (bank) bank.appendChild(tile)
}

function displaceExistingTile(slot: HTMLElement): void {
  const existing = slot.querySelector(".bank-item") as HTMLElement | null
  if (existing) returnTileToBank(existing)
}

function clearSlotHighlights(): void {
  document.querySelectorAll<HTMLElement>(".slot").forEach(slot => slot.classList.remove("slot-highlight"))
}

// ============================================================================
// Native drag-and-drop handlers (mouse)
// ============================================================================

export function handleDropOnSlot(event: DragEvent): void {
  event.preventDefault()
  const tile = getDraggedElement(event)
  if (!tile) return

  const targetSlot = event.currentTarget as HTMLElement
  displaceExistingTile(targetSlot)
  animateSnapAndPlace(tile, targetSlot)
}

export function handleDropOnTemplate(event: DragEvent): void {
  event.preventDefault()
  const tile = getDraggedElement(event)
  if (!tile) return

  const allSlots = Array.from(document.querySelectorAll<HTMLElement>(".slot"))
  const dropX = event.clientX
  const dropY = event.clientY

  const directHit = findSlotUnderPoint(allSlots, dropX, dropY)
  if (directHit) {
    displaceExistingTile(directHit)
    animateSnapAndPlace(tile, directHit)
    return
  }

  const { slot: nearestEmpty, distance } = findNearestEmptySlot(allSlots, dropX, dropY)
  if (!nearestEmpty) {
    returnTileToBank(tile)
    updateControls()
    return
  }

  if (distance <= SNAP_THRESHOLD) {
    animateSnapAndPlace(tile, nearestEmpty)
  } else {
    returnTileToBank(tile)
    updateControls()
  }
}

// ============================================================================
// Visual clone factory
// ============================================================================

function createVisualClone(sourceElement: HTMLElement, className: string): HTMLElement {
  const clone = sourceElement.cloneNode(true) as HTMLElement
  clone.className = ""
  clone.classList.add(className)

  const computed = getComputedStyle(sourceElement)
  clone.style.background = computed.backgroundColor || computed.background
  clone.style.color = computed.color
  clone.style.padding = computed.padding
  clone.style.borderRadius = computed.borderRadius
  clone.style.fontWeight = computed.fontWeight
  clone.style.fontSize = computed.fontSize
  clone.style.display = "inline-flex"
  clone.style.alignItems = "center"
  clone.style.justifyContent = "center"
  clone.style.boxSizing = "border-box"
  clone.style.boxShadow = computed.boxShadow
  clone.style.userSelect = "none"
  clone.style.webkitUserSelect = "none"

  return clone
}

// ============================================================================
// Intro arc animation (tiles flying into slots on game start)
// ============================================================================

export function animateIntroTile(tile: HTMLElement, targetSlot: HTMLElement, durationMs: number): void {
  if (tile.parentElement === targetSlot) return

  tile.dataset.animating = "1"

  const startRect = tile.getBoundingClientRect()
  const endRect = targetSlot.getBoundingClientRect()

  const clone = createVisualClone(tile, "snap-clone")
  clone.style.position = "fixed"
  clone.style.left = `${startRect.left}px`
  clone.style.top = `${startRect.top}px`
  clone.style.width = `${startRect.width}px`
  clone.style.height = `${startRect.height}px`
  clone.style.margin = "0"
  clone.style.zIndex = "9999"
  clone.style.pointerEvents = "none"
  clone.style.transition = "none"
  clone.style.willChange = "left, top"
  document.body.appendChild(clone)
  tile.style.visibility = "hidden"

  const startX = startRect.left + startRect.width / 2
  const startY = startRect.top + startRect.height / 2
  const endX = endRect.left + endRect.width / 2
  const endY = endRect.top + endRect.height / 2

  const deltaX = endX - startX
  const deltaY = endY - startY
  const pathLength = Math.sqrt(deltaX * deltaX + deltaY * deltaY) || 1
  const arcDirection = Math.random() < 0.5 ? 1 : -1
  const arcMagnitude = Math.min(pathLength * 0.35, 90) * arcDirection
  const controlPointX = (startX + endX) / 2 + (-deltaY / pathLength) * arcMagnitude
  const controlPointY = (startY + endY) / 2 + (deltaX / pathLength) * arcMagnitude

  const halfWidth = startRect.width / 2
  const halfHeight = startRect.height / 2

  const animStartTime = performance.now()

  function easeInOut(t: number) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t }

  function quadraticBezier(t: number, p0: number, p1: number, p2: number) {
    const inv = 1 - t
    return inv * inv * p0 + 2 * inv * t * p1 + t * t * p2
  }

  function animationFrame(now: number) {
    const progress = Math.min((now - animStartTime) / durationMs, 1)
    const easedProgress = easeInOut(progress)

    clone.style.left = `${quadraticBezier(easedProgress, startX, controlPointX, endX) - halfWidth}px`
    clone.style.top = `${quadraticBezier(easedProgress, startY, controlPointY, endY) - halfHeight}px`

    if (progress < 1) {
      requestAnimationFrame(animationFrame)
    } else {
      finishIntroAnimation()
    }
  }

  requestAnimationFrame(animationFrame)

  function finishIntroAnimation() {
    try { clone.remove() } catch (_) {}

    displaceExistingTile(targetSlot)
    targetSlot.appendChild(tile)
    tile.style.visibility = ""
    tile.classList.add("placed")
    setTimeout(() => tile.classList.remove("placed"), durationMs + 40)

    delete tile.dataset.animating
    tile.draggable = false
    updateControls()
  }
}

// ============================================================================
// Snap animation (tile slides into slot)
// ============================================================================

export function animateSnapAndPlace(tile: HTMLElement, targetSlot: HTMLElement, durationMs = SNAP_ANIM_MS): void {
  document.body.classList.remove("dragging")
  if (tile.parentElement === targetSlot) return

  tile.dataset.animating = "1"

  const startRect = tile.getBoundingClientRect()
  const endRect = targetSlot.getBoundingClientRect()

  const clone = createVisualClone(tile, "snap-clone")
  clone.style.position = "fixed"
  clone.style.left = `${startRect.left}px`
  clone.style.top = `${startRect.top}px`
  clone.style.width = `${startRect.width}px`
  clone.style.height = `${startRect.height}px`
  clone.style.margin = "0"
  clone.style.zIndex = "9999"
  clone.style.pointerEvents = "none"
  clone.style.transform = "translate(0px, 0px) scale(1)"
  clone.style.opacity = "1"
  clone.style.transition = "none"
  clone.style.willChange = "transform, opacity"

  document.body.appendChild(clone)
  tile.style.visibility = "hidden"

  const translateX = endRect.left + endRect.width / 2 - (startRect.left + startRect.width / 2)
  const translateY = endRect.top + endRect.height / 2 - (startRect.top + startRect.height / 2)

  requestAnimationFrame(() => {
    clone.style.transition = `transform ${durationMs}ms cubic-bezier(.2,.9,.2,1), opacity ${durationMs}ms ease`
    clone.style.transform = `translate(${translateX}px, ${translateY}px) scale(1.01)`
    clone.style.opacity = "0.99"
  })

  const finishSnap = () => {
    clone.removeEventListener("transitionend", finishSnap)
    try { clone.remove() } catch (_) {}

    displaceExistingTile(targetSlot)
    targetSlot.appendChild(tile)
    tile.style.visibility = ""
    tile.classList.add("placed")
    setTimeout(() => tile.classList.remove("placed"), durationMs + 40)

    delete tile.dataset.animating
    tile.draggable = false
    updateControls()
  }

  clone.addEventListener("transitionend", finishSnap)
  setTimeout(finishSnap, durationMs + 220)
}

// ============================================================================
// Touch/pointer drag handling
// ============================================================================

export function pointerDownHandler(event: PointerEvent): void {
  if (event.pointerType === "mouse") return
  if (typeof event.button === "number" && event.button !== 0) return

  event.preventDefault()
  suppressGhostClicks()
  lockPageScroll()

  const tile = event.currentTarget as HTMLElement

  if (pointerState) finishPointerDrag({ showOriginal: true, destroyClone: true })

  if (typeof tile.setPointerCapture === "function") {
    try { tile.setPointerCapture(event.pointerId) } catch (_) {}
  }

  const tileRect = tile.getBoundingClientRect()
  const dragClone = createVisualClone(tile, "drag-clone")

  dragClone.style.position = "fixed"
  dragClone.style.left = `${tileRect.left}px`
  dragClone.style.top = `${tileRect.top}px`
  dragClone.style.width = `${tileRect.width}px`
  dragClone.style.height = `${tileRect.height}px`
  dragClone.style.zIndex = "9999"
  dragClone.style.pointerEvents = "none"
  dragClone.style.margin = "0"

  document.body.appendChild(dragClone)
  tile.style.visibility = "hidden"
  document.body.classList.add("dragging")

  setPointerState({
    pointerId: event.pointerId,
    originEl: tile,
    clone: dragClone,
    offsetX: event.clientX - tileRect.left,
    offsetY: event.clientY - tileRect.top,
    startX: event.clientX,
    startY: event.clientY,
    lastX: event.clientX,
    lastY: event.clientY,
    startT: performance.now(),
  })

  window.addEventListener("pointermove", handlePointerMove, { passive: false })
  window.addEventListener("pointerup", handlePointerUp, { passive: false })
  window.addEventListener("pointercancel", handlePointerCancel, { passive: false })
}

function handlePointerMove(event: PointerEvent): void {
  if (!pointerState) return
  if (event.pointerId !== pointerState.pointerId) return

  event.preventDefault()

  const state = pointerState
  setPointerState({ ...state, lastX: event.clientX, lastY: event.clientY })

  pointerState!.clone.style.left = `${event.clientX - state.offsetX}px`
  pointerState!.clone.style.top = `${event.clientY - state.offsetY}px`

  const allSlots = Array.from(document.querySelectorAll<HTMLElement>(".slot"))
  clearSlotHighlights()

  const { slot: nearestEmpty, distance } = findNearestEmptySlot(allSlots, event.clientX, event.clientY)
  if (nearestEmpty && distance <= SNAP_THRESHOLD) {
    nearestEmpty.classList.add("slot-highlight")
  }
}

function handlePointerUp(event: PointerEvent): void {
  if (!pointerState) return
  if (event.pointerId !== pointerState.pointerId) return

  event.preventDefault()
  suppressGhostClicks()

  const { originEl: tile, clone: dragClone, startX, startY, lastX, lastY, startT } = pointerState
  clearSlotHighlights()

  const dragDistance = Math.hypot(lastX - startX, lastY - startY)
  const dragDuration = performance.now() - startT
  const wasTap = dragDistance <= TAP_MOVE_PX && dragDuration < 600

  if (wasTap) {
    finishPointerDrag({ showOriginal: true, destroyClone: true })

    const nextEmpty = findNextEmptySlot()
    if (nextEmpty) {
      animateSnapAndPlace(tile, nextEmpty)
    } else {
      returnTileToBank(tile)
    }

    unlockPageScroll()
    updateControls()
    return
  }

  const dropX = event.clientX
  const dropY = event.clientY
  const allSlots = Array.from(document.querySelectorAll<HTMLElement>(".slot"))

  let dropTarget = findSlotUnderPoint(allSlots, dropX, dropY)

  if (!dropTarget) {
    const { slot: nearestEmpty, distance } = findNearestEmptySlot(allSlots, dropX, dropY)
    if (nearestEmpty && distance <= SNAP_THRESHOLD) dropTarget = nearestEmpty
  }

  if (!dropTarget) {
    finishPointerDrag({ showOriginal: true, destroyClone: true })
    returnTileToBank(tile)
    unlockPageScroll()
    updateControls()
    return
  }

  displaceExistingTile(dropTarget)
  animateCloneIntoSlot(dragClone, tile, dropTarget)
}

function handlePointerCancel(event: PointerEvent): void {
  if (!pointerState) return
  if (event.pointerId !== pointerState.pointerId) return

  suppressGhostClicks()
  finishPointerDrag({ showOriginal: true, destroyClone: true })
  unlockPageScroll()
  updateControls()
}

export function cancelActiveDrag(): void {
  if (!pointerState) return
  window.removeEventListener("pointermove", handlePointerMove)
  window.removeEventListener("pointerup", handlePointerUp)
  window.removeEventListener("pointercancel", handlePointerCancel)
  document.body.classList.remove("dragging")
  clearSlotHighlights()
  if (pointerState.clone) try { pointerState.clone.remove() } catch (_) {}
  if (pointerState.originEl) pointerState.originEl.style.visibility = ""
  setPointerState(null)
}

function finishPointerDrag({ showOriginal, destroyClone }: { showOriginal: boolean, destroyClone: boolean }): void {
  if (!pointerState) return

  window.removeEventListener("pointermove", handlePointerMove)
  window.removeEventListener("pointerup", handlePointerUp)
  window.removeEventListener("pointercancel", handlePointerCancel)

  document.body.classList.remove("dragging")
  clearSlotHighlights()

  if (destroyClone && pointerState.clone) {
    try { pointerState.clone.remove() } catch (_) {}
  }

  if (showOriginal && pointerState.originEl) pointerState.originEl.style.visibility = ""

  setPointerState(null)
}

function animateCloneIntoSlot(dragClone: HTMLElement, tile: HTMLElement, targetSlot: HTMLElement): void {
  finishPointerDrag({ showOriginal: false, destroyClone: false })

  const cloneRect = dragClone.getBoundingClientRect()
  const slotRect = targetSlot.getBoundingClientRect()

  const translateX = slotRect.left + slotRect.width / 2 - (cloneRect.left + cloneRect.width / 2)
  const translateY = slotRect.top + slotRect.height / 2 - (cloneRect.top + cloneRect.height / 2)

  dragClone.style.willChange = "transform, opacity"
  dragClone.style.transition = `transform ${SNAP_ANIM_MS}ms cubic-bezier(.2,.9,.2,1), opacity ${SNAP_ANIM_MS}ms ease`
  dragClone.style.transform = `translate(${translateX}px, ${translateY}px) scale(1.01)`
  dragClone.style.opacity = "0.99"

  const finishPlacement = () => {
    dragClone.removeEventListener("transitionend", finishPlacement)
    try { dragClone.remove() } catch (_) {}

    targetSlot.appendChild(tile)
    tile.style.visibility = ""
    tile.classList.add("placed")
    setTimeout(() => tile.classList.remove("placed"), SNAP_ANIM_MS + 40)

    tile.draggable = false

    unlockPageScroll()
    updateControls()
  }

  dragClone.addEventListener("transitionend", finishPlacement)
  setTimeout(finishPlacement, SNAP_ANIM_MS + 220)
}
