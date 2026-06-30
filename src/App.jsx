import { useEffect, useRef, useState } from 'react'
import GameCanvas from './components/GameCanvas.jsx'
import Hud from './components/Hud.jsx'
import PauseButton from './components/PauseButton.jsx'
import MenuScreen from './components/MenuScreen.jsx'
import PauseOverlay from './components/PauseOverlay.jsx'
import GameOverScreen from './components/GameOverScreen.jsx'
import { useGameInput } from './hooks/useGameInput.js'
import { PHASE, PLAYER } from './game/constants.js'
import './App.css'

const FRESH_HUD = { score: 0, lives: PLAYER.lives, wave: 1 }

export default function App() {
  const [phase, setPhase] = useState(PHASE.MENU)
  const [hud, setHud] = useState(FRESH_HUD)
  const [best, setBest] = useState(0)

  // Shared input refs the game loop reads each frame (never via state).
  const keysRef = useRef({ left: false, right: false, up: false, down: false, fire: false })
  const pointerRef = useRef({ active: false, x: 0, y: 0 })

  // Latest phase, readable from the (stable) keyboard listener.
  const phaseRef = useRef(phase)
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  // The React Compiler memoizes these automatically — no useCallback needed.
  const onHud = (h) => setHud(h)
  const onGameOver = (finalScore) => {
    setBest((b) => Math.max(b, finalScore))
    setPhase(PHASE.GAMEOVER)
  }

  const startGame = () => {
    setHud(FRESH_HUD)
    setPhase(PHASE.PLAYING)
  }

  const togglePause = () => {
    setPhase((p) => (p === PHASE.PLAYING ? PHASE.PAUSED : p === PHASE.PAUSED ? PHASE.PLAYING : p))
  }

  const toMenu = () => setPhase(PHASE.MENU)

  // Pass the refs themselves (not `.current`) so App never reads a ref during
  // render — that keeps App eligible for React Compiler memoization.
  useGameInput({
    keysRef,
    phaseRef,
    onStart: startGame,
    onTogglePause: togglePause,
    onRetry: startGame,
  })

  return (
    <div className="app">
      <div className="cabinet">
        <GameCanvas
          phase={phase}
          keysRef={keysRef}
          pointerRef={pointerRef}
          onHud={onHud}
          onGameOver={onGameOver}
        />

        {(phase === PHASE.PLAYING || phase === PHASE.PAUSED) && (
          <Hud score={hud.score} lives={hud.lives} wave={hud.wave} />
        )}
        {phase === PHASE.PLAYING && <PauseButton onPause={togglePause} />}
        {phase === PHASE.MENU && <MenuScreen onPlay={startGame} />}
        {phase === PHASE.PAUSED && <PauseOverlay onResume={togglePause} onMenu={toMenu} />}
        {phase === PHASE.GAMEOVER && (
          <GameOverScreen score={hud.score} best={best} onRetry={startGame} onMenu={toMenu} />
        )}
      </div>

      <p className="footnote">WASD / arrows · SPACE — fire · ESC — pause</p>
    </div>
  )
}
