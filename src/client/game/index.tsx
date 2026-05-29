import { createRoot } from "react-dom/client"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { GameProvider } from "./context/GameContext"
import { App } from "./App"
import { ExplainerPage } from "./components/ExplainerPage"

const root = createRoot(document.getElementById("root")!)
root.render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={
        <GameProvider>
          <App />
        </GameProvider>
      } />
      <Route path="/explainer" element={<ExplainerPage />} />
    </Routes>
  </BrowserRouter>
)
