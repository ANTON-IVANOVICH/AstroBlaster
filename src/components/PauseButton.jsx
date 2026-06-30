// Small always-on pause control (top-centre of the cabinet). Gives touch
// players a way to pause without a physical Esc key; also works with a mouse.
export default function PauseButton({ onPause }) {
  return (
    <button
      type="button"
      className="pause-button"
      aria-label="Пауза"
      onClick={(e) => {
        e.currentTarget.blur()
        onPause()
      }}
    >
      <span className="pause-button-bars" aria-hidden="true">
        <span />
        <span />
      </span>
    </button>
  )
}
