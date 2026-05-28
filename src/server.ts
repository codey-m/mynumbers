// src/server.ts
// Run: npm start
// Dev: npm run dev
// Open: http://localhost:8000/

import express, { Request, Response } from 'express';
import path from 'path';
import { puzzleNew, puzzleRush, puzzleCheck, puzzleReveal } from './puzzles';

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());

// -----------------------
// Static frontend
// -----------------------
app.use('/static', express.static(path.join(__dirname, '..', 'app', 'static')));

// -----------------------
// Basic endpoints
// -----------------------
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.get('/api/status', (_req: Request, res: Response) => {
  res.json({
    app: 'numbers-puzzle',
    frontend: '/',
    explainer: '/explainer',
  });
});

// -----------------------
// API routes
// -----------------------
app.get('/api/puzzle/new', (req: Request, res: Response) => {
  try {
    const result = puzzleNew({
      numOperands: parseInt(req.query.num_operands as string) || 5,
      decoys: parseInt(req.query.decoys as string) || 1,
      showSolution: req.query.show_solution === 'true',
      targetMin: parseInt(req.query.target_min as string) || 10,
      targetMax: parseInt(req.query.target_max as string) || 150,
      requireParensProb: parseFloat(req.query.require_parens_prob as string) || 0.6,
    });
    res.json(result);
  } catch (e: any) {
    res.status(e.status || 500).json({ detail: e.detail || 'Internal error' });
  }
});

app.get('/api/puzzle/rush', (req: Request, res: Response) => {
  try {
    const result = puzzleRush({
      difficulty: parseInt(req.query.difficulty as string) || 1,
      decoys: parseInt(req.query.decoys as string) || 2,
    });
    res.json(result);
  } catch (e: any) {
    res.status(e.status || 500).json({ detail: e.detail || 'Internal error' });
  }
});

app.post('/api/puzzle/check', (req: Request, res: Response) => {
  try {
    const result = puzzleCheck(req.body);
    res.json(result);
  } catch (e: any) {
    res.status(e.status || 500).json({ detail: e.detail || 'Internal error' });
  }
});

app.get('/api/puzzle/reveal', (req: Request, res: Response) => {
  try {
    const result = puzzleReveal(req.query.round_id as string);
    res.json(result);
  } catch (e: any) {
    res.status(e.status || 500).json({ detail: e.detail || 'Internal error' });
  }
});

// -----------------------
// HTML entry points
// -----------------------
app.get('/', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '..', 'app', 'static', 'game.html'));
});

app.get('/explainer', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '..', 'app', 'static', 'explainer.html'));
});

app.listen(PORT, () => {
  console.log(`Numbers Puzzle Game running at http://localhost:${PORT}/`);
});
