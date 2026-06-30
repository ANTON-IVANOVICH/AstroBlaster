import { formatScore } from '../format.js'

// Heads-up display: score (top-left) and remaining lives + wave (top-right).
// Rendered as plain DOM over the canvas; updates are throttled by the engine.
export default function Hud({ score, lives, wave }) {
  const hearts = Math.max(0, lives)
  return (
    <div className="hud" aria-hidden="true">
      <div className="hud-gradient" />
      <div className="hud-score">
        <div className="hud-label">SCORE</div>
        <div className="hud-score-value">{formatScore(score)}</div>
      </div>
      <div className="hud-right">
        <div className="hud-label">LIVES</div>
        <div className="hud-lives">
          {Array.from({ length: hearts }, (_, i) => (
            <span key={i} className="life" />
          ))}
        </div>
        <div className="hud-wave">WAVE {String(wave).padStart(2, '0')}</div>
      </div>
    </div>
  )
}
