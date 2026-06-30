import { useEffect } from 'react'
import { PHASE } from '../game/constants.js'

// Keyboard binding. Movement + fire are written into a plain ref object that
// the game loop reads every frame (never through React state — that keeps the
// hot path off the React scheduler). Discrete actions (start / pause / retry)
// are dispatched as callbacks based on the current phase.

const LEFT = new Set(['ArrowLeft', 'KeyA'])
const RIGHT = new Set(['ArrowRight', 'KeyD'])
const UP = new Set(['ArrowUp', 'KeyW'])
const DOWN = new Set(['ArrowDown', 'KeyS'])

export function useGameInput({ keys, phaseRef, onStart, onTogglePause, onRetry }) {
  useEffect(() => {
    const onKeyDown = (e) => {
      const code = e.code
      if (LEFT.has(code)) { keys.left = true; e.preventDefault(); return }
      if (RIGHT.has(code)) { keys.right = true; e.preventDefault(); return }
      if (UP.has(code)) { keys.up = true; e.preventDefault(); return }
      if (DOWN.has(code)) { keys.down = true; e.preventDefault(); return }

      if (code === 'Space') {
        keys.fire = true
        e.preventDefault()
        if (!e.repeat) {
          const ph = phaseRef.current
          if (ph === PHASE.MENU) onStart()
          else if (ph === PHASE.GAMEOVER) onRetry()
        }
        return
      }

      if (code === 'Enter') {
        if (e.repeat) return
        e.preventDefault()
        const ph = phaseRef.current
        if (ph === PHASE.MENU) onStart()
        else if (ph === PHASE.GAMEOVER) onRetry()
        else if (ph === PHASE.PAUSED) onTogglePause()
        return
      }

      if (code === 'Escape' || code === 'KeyP') {
        if (e.repeat) return
        const ph = phaseRef.current
        if (ph === PHASE.PLAYING || ph === PHASE.PAUSED) {
          onTogglePause()
          e.preventDefault()
        }
      }
    }

    const onKeyUp = (e) => {
      const code = e.code
      if (LEFT.has(code)) keys.left = false
      else if (RIGHT.has(code)) keys.right = false
      else if (UP.has(code)) keys.up = false
      else if (DOWN.has(code)) keys.down = false
      else if (code === 'Space') keys.fire = false
    }

    // Releasing focus mid-press would otherwise leave a key "stuck".
    const clearAll = () => {
      keys.left = keys.right = keys.up = keys.down = keys.fire = false
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', clearAll)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', clearAll)
    }
  }, [keys, phaseRef, onStart, onTogglePause, onRetry])
}
