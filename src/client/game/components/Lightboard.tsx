import { useRef, useEffect } from "react"
import styled, { keyframes } from "styled-components"
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

const Section = styled.div`
  position: relative;
  margin-top: 10px;
  margin-bottom: 50px;

  @media (max-width: 600px) {
    body.menu-mode & {
      margin-top: 10px;
    }
  }
`

const Board = styled.div`
  position: relative;
  width: 96%;
  box-sizing: border-box;
  height: clamp(180px, 37.8vw, 340px);
  background: transparent;
  border-radius: 6px;
  border: 4px solid #40464c;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.9);
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to right,
      rgba(35, 35, 38, 0.8) 0%,
      rgba(98, 106, 115, 0.8) 70%,
      rgba(139, 149, 158, 0.55) 100%
    );
    border-radius: 2px;
    box-shadow: inset 0 0 250px rgba(0, 5, 40, 0.35);
    pointer-events: none;
    z-index: 2;
  }

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.03) 0%,
      transparent 60%
    );
    pointer-events: none;
    z-index: 5;
  }
`

const Tim = styled.img`
  position: absolute;
  right: 0;
  bottom: clamp(-75px, -8.3vw, -40px);
  height: clamp(159px, 33.3vw, 300px);
  width: 36%;
  object-fit: cover;
  object-position: right center;
  opacity: 0.9;
  filter: brightness(0.88) saturate(0.9);
  pointer-events: none;
`

const Surface = styled.div`
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  overflow: hidden;
`

const writeIn = keyframes`
  0%   { clip-path: inset(0 100% 0 0); }
  100% { clip-path: inset(0 -40px 0 0); }
`

const writeInHome = keyframes`
  0%   { clip-path: inset(0 100% 0 0); }
  100% { clip-path: inset(0 0% 0 0); }
`

const HomeSurface = styled.div`
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  overflow: visible;
`

const HomeCanvas = styled.canvas`
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
`

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
      el.style.position = "absolute"
      el.style.fontFamily = "'Caveat', cursive"
      el.style.fontSize = "clamp(16px, 4.5vw, 34px)"
      el.style.fontWeight = "600"
      el.style.whiteSpace = "nowrap"
      el.style.lineHeight = "1"
      el.style.padding = "0.4em 24px 0.3em 0"
      el.style.clipPath = "inset(0 100% 0 0)"
      el.style.animation = "lb-write-in-eq 1.1s cubic-bezier(0.4, 0, 0.2, 1) forwards"
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
    <Section>
      <Tim
        src="/static/images/Tim_three-quarter-full-RGB.svg"
        alt="Tim"
      />
      <Board>
        <Surface ref={surfaceRef} />
      </Board>
    </Section>
  )
}

export function HomeLightboard() {
  const { showMenu } = useGameState()

  if (!showMenu) return null

  return (
    <Section>
      <Tim
        src="/static/images/Tim_three-quarter-full-RGB.svg"
        alt="Tim"
      />
      <Board>
        <HomeSurface id="home-lb-surface" />
        <HomeCanvas id="home-lb-canvas" />
      </Board>
    </Section>
  )
}
