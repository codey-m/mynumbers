# app/main.py
# command-line: uvicorn app.main:app --reload
# open: http://localhost:8000/static/game.html

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from .puzzles import router as puzzles_router

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(
    title="Numbers Puzzle Game",
    description="Arithmetic puzzle game: combine given numbers to reach a target.",
    version="0.1.0",
)

# -----------------------
# Static frontend
# -----------------------
# Serves /static/game.html
app.mount(
    "/static",
    StaticFiles(directory=BASE_DIR / "static"),
    name="static",
)

# -----------------------
# API routes
# -----------------------
app.include_router(
    puzzles_router,
    prefix="/api",
    tags=["puzzles"],
)

# -----------------------
# Basic endpoints
# -----------------------
@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/")
def root():
    return {
        "app": "numbers-puzzle",
        "frontend": "/static/game.html",
        "api_docs": "/docs",
    }
