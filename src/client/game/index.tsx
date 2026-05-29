import { createRoot } from "react-dom/client"
import { GameProvider } from "./context/GameContext"
import { App } from "./App"

const root = createRoot(document.getElementById("root")!)
root.render(
  <GameProvider>
    <App />
  </GameProvider>
)
