import { formatScore } from '../format.js'

// Game-over screen: final score, session best, and a retry action.
export default function GameOverScreen({ score, best, onRetry, onMenu }) {
  return (
    <div className="screen over-screen">
      <div className="over-kicker">SHIP DESTROYED</div>
      <div className="over-title">GAME OVER</div>

      <div className="over-stats">
        <div className="stat">
          <div className="stat-label">SCORE</div>
          <div className="stat-value stat-cyan">{formatScore(score)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">BEST</div>
          <div className="stat-value stat-purple">{formatScore(best)}</div>
        </div>
      </div>

      <button
        type="button"
        className="ab-btn"
        onClick={(e) => {
          e.currentTarget.blur()
          onRetry()
        }}
      >
        ↻ RETRY
      </button>

      <div className="hint">ENTER — retry</div>

      <button
        type="button"
        className="link-btn"
        onClick={(e) => {
          e.currentTarget.blur()
          onMenu()
        }}
      >
        MENU
      </button>
    </div>
  )
}
