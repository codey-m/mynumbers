import express, { Request, Response } from 'express'
import path from 'path'

const app = express()
const PORT = process.env.PORT || 8000

// Static frontend
app.use('/static', express.static(path.join(__dirname, '..', '..', 'app', 'static')))

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' })
})

// SPA — serve game.html for all client routes
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '..', '..', 'app', 'static', 'game.html'))
})

app.listen(PORT, () => {
  console.log(`Numbers Puzzle Game running at http://localhost:${PORT}/`)
})
