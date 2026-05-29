import { useMemo } from "react"

// Dot-matrix letter patterns (11 rows tall)
const LETTERS: Record<string, string[]> = {
  A: [
    "...XXXXX...",
    "..XXXXXXX..",
    "..XXX.XXX..",
    ".XXX...XXX.",
    "XXX.....XXX",
    "XXXXXXXXXXX",
    "XXXXXXXXXXX",
    "XXX.....XXX",
    "XXX.....XXX",
    "XXX.....XXX",
    "XXX.....XXX",
  ],
  R: [
    "XXXXXXXXXXX",
    "XXXXXXXXXXX",
    "XXX.....XXX",
    "XXX.....XXX",
    "XXXXXXXXXXX",
    "XXXXXXXXXXX",
    "XXX.XXX....",
    "XXX..XXX...",
    "XXX...XXX..",
    "XXX....XXX.",
    "XXX.....XXX",
  ],
  I: ["XXX","XXX","XXX","XXX","XXX","XXX","XXX","XXX","XXX","XXX","XXX"],
  T: [
    "XXXXXXXXXXX",
    "XXXXXXXXXXX",
    "....XXX....",
    "....XXX....",
    "....XXX....",
    "....XXX....",
    "....XXX....",
    "....XXX....",
    "....XXX....",
    "....XXX....",
    "....XXX....",
  ],
  H: [
    "XXX.....XXX",
    "XXX.....XXX",
    "XXX.....XXX",
    "XXX.....XXX",
    "XXX.....XXX",
    "XXXXXXXXXXX",
    "XXXXXXXXXXX",
    "XXX.....XXX",
    "XXX.....XXX",
    "XXX.....XXX",
    "XXX.....XXX",
  ],
  M: [
    "XXX.....XXX",
    "XXXX...XXXX",
    "XXXXX.XXXXX",
    "XXX.X.X.XXX",
    "XXX..X..XXX",
    "XXX.....XXX",
    "XXX.....XXX",
    "XXX.....XXX",
    "XXX.....XXX",
    "XXX.....XXX",
    "XXX.....XXX",
  ],
  X: [
    "XXX.....XXX",
    ".XXX...XXX.",
    "..XXX.XXX..",
    "...XXXXX...",
    "....XXX....",
    "....XXX....",
    "....XXX....",
    "...XXXXX...",
    "..XXX.XXX..",
    ".XXX...XXX.",
    "XXX.....XXX",
  ],
}

const WORD = "ARITHMIX"
const ROWS = 11
const LETTER_GAP = 3
const D = 6
const STEP = D + 1
const R = D / 2
const PAD = 6
const RED = "#A31F34"
const ACCENTS = ["#00C853", "#1E63D8", "#FFC107"]

function mulberry32(seed: number) {
  let s = seed
  return () => {
    s |= 0
    s = s + 0x6D2B79F5 | 0
    let t = Math.imul(s ^ s >>> 15, 1 | s)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

interface DotData {
  cx: number
  cy: number
  color: string
  accentOffset: number | null
}

function buildDots(): { dots: DotData[]; width: number; height: number } {
  const rand = mulberry32(0x9e3779b1)
  const cells: [number, number][] = []
  let col = 0

  for (let i = 0; i < WORD.length; i++) {
    const pat = LETTERS[WORD[i]]
    const w = pat[0].length
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < w; c++) {
        if (pat[r][c] === "X") cells.push([col + c, r])
      }
    }
    col += w + (i < WORD.length - 1 ? LETTER_GAP : 0)
  }

  const COLS = col
  const W = (COLS - 1) * STEP + D + PAD * 2
  const H = (ROWS - 1) * STEP + D + PAD * 2

  const cellMap = new Map<string, number>()
  cells.forEach(([x, y], i) => cellMap.set(`${x},${y}`, i))
  const colorOf = new Array(cells.length).fill(RED)
  const accentOffsets: (number | null)[] = new Array(cells.length).fill(null)

  function neighborAccents(x: number, y: number, color: string): number {
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]]
    let count = 0
    for (const [dx, dy] of dirs) {
      const idx = cellMap.get(`${x+dx},${y+dy}`)
      if (idx !== undefined && colorOf[idx] === color) count++
    }
    return count
  }

  const targetAccents = Math.round(cells.length * 0.15)
  let placed = 0, attempts = 0
  while (placed < targetAccents && attempts < cells.length * 6) {
    attempts++
    const i = Math.floor(rand() * cells.length)
    if (colorOf[i] !== RED) continue
    const color = ACCENTS[Math.floor(rand() * ACCENTS.length)]
    const [x, y] = cells[i]
    if (neighborAccents(x, y, color) >= 2) continue
    colorOf[i] = color
    accentOffsets[i] = Math.floor(rand() * 3)
    placed++
  }

  const dots: DotData[] = cells.map(([x, y], i) => ({
    cx: PAD + x * STEP + R,
    cy: PAD + y * STEP + R,
    color: colorOf[i],
    accentOffset: accentOffsets[i],
  }))

  return { dots, width: W, height: H }
}

export function Logo() {
  const { dots, width, height } = useMemo(buildDots, [])

  return (
    <h1 className="logo-banner logo-dotmatrix" aria-label="ARITHMIX">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        {dots.map((dot, i) => (
          <circle
            key={i}
            cx={dot.cx}
            cy={dot.cy}
            r={R}
            fill={dot.color}
          />
        ))}
      </svg>
    </h1>
  )
}
