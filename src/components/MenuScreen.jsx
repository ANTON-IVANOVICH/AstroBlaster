// Start screen: title, tagline, Play button and control hints.
export default function MenuScreen({ onPlay }) {
  return (
    <div className="screen menu-screen">
      <div className="screen-kicker">NEW GAME</div>
      <h1 className="title">
        <span className="title-cyan">ASTRO</span>
        <span className="title-light">BLASTER</span>
      </h1>
      <p className="menu-tagline">Уворачивайся. Стреляй. Выживай в бесконечных волнах.</p>

      <button
        type="button"
        className="ab-btn"
        onClick={(e) => {
          e.currentTarget.blur()
          onPlay()
        }}
      >
        ▶ PLAY
      </button>

      <div className="controls">
        <div className="control-row">
          <span className="key">W</span>
          <span className="key">A</span>
          <span className="key">S</span>
          <span className="key">D</span>
          <span className="control-label">ДВИЖЕНИЕ</span>
        </div>
        <div className="control-row">
          <span className="key key-wide key-accent">SPACE</span>
          <span className="control-label">ОГОНЬ</span>
        </div>
        <div className="control-row">
          <span className="key key-wide">ESC</span>
          <span className="control-label">ПАУЗА</span>
        </div>
      </div>

      <p className="touch-hint">
        Веди пальцем по полю — корабль летит за пальцем и ведёт огонь автоматически. Кнопка «II» сверху — пауза.
      </p>
    </div>
  )
}
