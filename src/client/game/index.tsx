import { createRoot } from "react-dom/client"
import { lazy, Suspense } from "react"
import { Router, Routes, Route } from "./router"
import { GameProvider } from "./context/GameContext"
import { App } from "./App"
import { GlobalStyles } from "./GlobalStyles"

const ExplainerPage = lazy(() => import("./components/ExplainerPage").then(m => ({ default: m.ExplainerPage })))

const root = createRoot(document.getElementById("root")!)
root.render(
  <Router>
    <GlobalStyles />
    <Routes>
      <Route path="/" element={
        <GameProvider>
          <App />
        </GameProvider>
      } />
      <Route path="/explainer" element={
        <Suspense fallback={<div />}>
          <ExplainerPage />
        </Suspense>
      } />
    </Routes>
  </Router>
)
