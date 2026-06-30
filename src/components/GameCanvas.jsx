import { useEffect, useRef } from 'react'
import { createGame } from '../game/engine.js'

// Bridges the imperative game engine to React. The <canvas> is owned by the
// engine; this component only:
//   - creates/destroys the engine once for its lifetime,
//   - forwards phase changes into the engine,
//   - relays the engine's throttled UI callbacks to the latest props.
export default function GameCanvas({ phase, keys, onHud, onGameOver }) {
  const canvasRef = useRef(null)
  const engineRef = useRef(null)
  const cbRef = useRef({ onHud, onGameOver })

  // Always point at the freshest callbacks without recreating the engine.
  useEffect(() => {
    cbRef.current = { onHud, onGameOver }
  })

  useEffect(() => {
    const engine = createGame(canvasRef.current, {
      keys,
      callbacks: {
        onHud: (h) => cbRef.current.onHud?.(h),
        onGameOver: (s) => cbRef.current.onGameOver?.(s),
      },
    })
    engineRef.current = engine
    engine.start()
    return () => {
      engine.destroy()
      engineRef.current = null
    }
  }, [keys])

  useEffect(() => {
    engineRef.current?.setPhase(phase)
  }, [phase])

  return <canvas ref={canvasRef} className="game-canvas" aria-hidden="true" />
}
