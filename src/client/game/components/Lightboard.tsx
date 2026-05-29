import { useRef, useEffect } from "react"
import { useGameState } from "../context/GameContext"

const LIGHTBOARD_COLORS = [
  { color: "#ff6ec7", glow: "rgba(255,110,199,0.5)" },
  { color: "#39ff14", glow: "rgba(57,255,20,0.5)" },
  { color: "#ffe033", glow: "rgba(255,224,51,0.5)" },
  { color: "#00d4ff", glow: "rgba(0,212,255,0.5)" },
  { color: "#ff9d00", glow: "rgba(255,157,0,0.5)" },
  { color: "#c77dff", glow: "rgba(199,125,255,0.5)" },
]

const LIGHTBOARD_ZONES: number[][] = [
  [2, 5],  [34, 5],  [67, 5],
  [2, 32], [34, 32], [67, 32],
  [2, 59], [34, 59], [67, 59],
  [2, 79], [34, 79], [67, 79],
]

interface LightboardProps {
  equations: string[]
}

export function Lightboard({ equations }: LightboardProps) {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const shuffledZonesRef = useRef<number[][]>(
    [...LIGHTBOARD_ZONES].sort(() => Math.random() - 0.5)
  )

  useEffect(() => {
    if (!surfaceRef.current) return
    surfaceRef.current.innerHTML = ""

    equations.forEach((expr, i) => {
      const zone = shuffledZonesRef.current[i % shuffledZonesRef.current.length]
      const palette = LIGHTBOARD_COLORS[i % LIGHTBOARD_COLORS.length]

      const el = document.createElement("div")
      el.className = "lightboard-eq"
      el.textContent = expr + "\u00A0"
      el.dataset.expr = expr
      el.style.left = zone[0] + "%"
      el.style.top = zone[1] + "%"
      el.style.color = palette.color
      el.style.textShadow = `0 0 8px ${palette.glow}, 0 0 18px ${palette.glow}`

      surfaceRef.current!.appendChild(el)
    })
  }, [equations])

  return (
    <div id="lightboard-section" className="lightboard-section">
      <img
        className="lightboard-tim"
        src="/static/images/Tim_three-quarter-full-RGB.svg"
        alt="Tim"
      />
      <div className="lightboard" id="lightboard">
        <div className="lightboard-surface" id="lightboard-surface" ref={surfaceRef} />
      </div>
    </div>
  )
}

export function HomeLightboard() {
  const { showMenu } = useGameState()
  const containerRef = useRef<HTMLDivElement>(null)

  if (!showMenu) return null

  return (
    <div
      id="home-lightboard-section"
      className="lightboard-section"
      ref={containerRef}
    >
      <img
        className="lightboard-tim"
        src="/static/images/Tim_three-quarter-full-RGB.svg"
        alt="Tim"
      />
      <div className="lightboard" id="home-lightboard">
        <div className="home-lb-surface" id="home-lb-surface" />
        <canvas className="home-lb-canvas" id="home-lb-canvas" />
      </div>
    </div>
  )
}
