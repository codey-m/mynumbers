# app/main.py
# command-line: uvicorn app.main:app --reload
# open: http://localhost:8000/static/game.html

# build MIT dome?
# show chalkboard summary of solved puzzles?

## COMPLETE
# center the equation for gameplay
# center the target in the top-bar
# break the bar into 3 elements
# add feature to click out of endgame focus screen
# add some explainer text: simple instructions that will stay on-screen
# explore some fun fonts for the target, time, and level "text"
# lightboard background? -> learn about this picture
# hand-drawn border?
# Tim drawing on the lightboard
# have equations show up on the lightboard as they are solved, 
# placed randomly under the puzzle
# Tim is centered in the lower space, not actively drawing


## TODO
# give Tim a marker in one of the standard poses
# elements on the board can move on the home screen
# tim blinks, etc
# include a hand in the animation
# add a quick intro before the animation
# frame the lightboard with a border?

# use a standard MIT gray background
# target is most important, make it larger
# add a pause (cover the screen)

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
