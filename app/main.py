# app/main.py
# command-line: uvicorn app.main:app --reload
# open: http://localhost:8000/

## TODO
# add a pause (cover the screen)
# give Tim a marker
# tim blinks, waves, wags tail sprites

from fastapi import FastAPI
from fastapi.responses import FileResponse
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
# Serves CSS/JS/image assets. The HTML entry points live on dedicated routes
# below (/ and /explainer). Old bookmarks to /static/game.html still resolve
# to the underlying file via this mount.
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

@app.get("/api/status")
def api_status():
    return {
        "app": "numbers-puzzle",
        "frontend": "/",
        "explainer": "/explainer",
        "api_docs": "/docs",
    }

@app.get("/")
def root():
    return FileResponse(BASE_DIR / "static" / "game.html")

@app.get("/explainer")
def explainer():
    return FileResponse(BASE_DIR / "static" / "explainer.html")
