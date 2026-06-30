// Pause overlay shown over a darkened, frozen battlefield.
export default function PauseOverlay({ onResume, onMenu }) {
  return (
    <div className="screen pause-screen">
      <div className="pause-mark">II</div>
      <div className="pause-title">PAUSED</div>

      <button
        type="button"
        className="ab-btn"
        onClick={(e) => {
          e.currentTarget.blur()
          onResume()
        }}
      >
        RESUME
      </button>

      <div className="hint">ESC / P — resume</div>

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
