import { useEffect, useRef } from 'react'
import { createGame } from '../game/engine.js'
import { PHASE } from '../game/constants.js'

// Bridges the imperative game engine to React. The <canvas> is owned by the
// engine; this component only:
//   - creates/destroys the engine once for its lifetime,
//   - forwards phase changes into the engine,
//   - relays the engine's throttled UI callbacks to the latest props,
//   - translates touch drags into the shared `pointer` input.
export default function GameCanvas({ phase, keys, pointer, onHud, onGameOver }) {
  const canvasRef = useRef(null)
  const engineRef = useRef(null)
  const cbRef = useRef({ onHud, onGameOver })
  const phaseRef = useRef(phase)
  const dragRef = useRef({ id: null, ax: 0, ay: 0, sx: 0, sy: 0 })

  // Always point at the freshest callbacks without recreating the engine.
  useEffect(() => {
    cbRef.current = { onHud, onGameOver }
  })

  useEffect(() => {
    const engine = createGame(canvasRef.current, {
      keys,
      pointer,
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
  }, [keys, pointer])

  useEffect(() => {
    phaseRef.current = phase
    engineRef.current?.setPhase(phase)
    // Leaving play (pause / game over) cancels any in-progress drag.
    if (phase !== PHASE.PLAYING) {
      dragRef.current.id = null
      pointer.active = false
    }
  }, [phase, pointer])

  // Touch drag → pointer. Ship tracks the finger relative to where the drag
  // began (no teleport), and auto-fires while a finger is down.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const local = (touch) => {
      const rect = canvas.getBoundingClientRect()
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
    }

    const onStart = (e) => {
      if (phaseRef.current !== PHASE.PLAYING || dragRef.current.id !== null) return
      const engine = engineRef.current
      if (!engine) return
      const t = e.changedTouches[0]
      const lp = local(t)
      const ship = engine.getPlayerPos()
      dragRef.current = { id: t.identifier, ax: lp.x, ay: lp.y, sx: ship.x, sy: ship.y }
      pointer.x = ship.x
      pointer.y = ship.y
      pointer.active = true
      e.preventDefault()
    }

    const findTouch = (e) => {
      const id = dragRef.current.id
      for (const t of e.changedTouches) if (t.identifier === id) return t
      return null
    }

    const onMove = (e) => {
      if (dragRef.current.id === null) return
      const t = findTouch(e)
      if (!t) return
      const lp = local(t)
      const d = dragRef.current
      pointer.x = d.sx + (lp.x - d.ax)
      pointer.y = d.sy + (lp.y - d.ay)
      e.preventDefault()
    }

    const onEnd = (e) => {
      if (dragRef.current.id === null || !findTouch(e)) return
      dragRef.current.id = null
      pointer.active = false
      e.preventDefault()
    }

    const opts = { passive: false }
    canvas.addEventListener('touchstart', onStart, opts)
    canvas.addEventListener('touchmove', onMove, opts)
    canvas.addEventListener('touchend', onEnd, opts)
    canvas.addEventListener('touchcancel', onEnd, opts)
    return () => {
      canvas.removeEventListener('touchstart', onStart)
      canvas.removeEventListener('touchmove', onMove)
      canvas.removeEventListener('touchend', onEnd)
      canvas.removeEventListener('touchcancel', onEnd)
    }
  }, [pointer])

  return <canvas ref={canvasRef} className="game-canvas" aria-hidden="true" />
}
