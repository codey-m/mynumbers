# 18.puzzle

A math puzzle game where you arrange numbers into equation templates to hit target values.

## Play Now

🎮 **[Play 18.puzzle](https://mynumbers.onrender.com/static/game.html)**

## Features

- **Practice Mode**: Solve puzzles at your own pace with 3 attempts per puzzle
- **Rush Mode**: Race against the clock (3-min or 5-min challenges)
- **Progressive Difficulty**: Puzzles automatically increase in complexity as you advance
- **Drag & Drop Interface**: Intuitive number placement with smooth animations

## How to Play

1. You're given a target number and an equation template with operators
2. Drag numbers from the bank into the empty slots
3. Make the equation equal the target number
4. In Rush Mode, solve as many as you can before time runs out!

## Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run the app
uvicorn app.main:app --reload