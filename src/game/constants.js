// Central tuning for AstroBlaster's gameplay. All speeds are in
// canvas-pixels per second; the fixed-step integrator scales by dt so
// behaviour is identical regardless of the display refresh rate.

export const PHASE = {
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAMEOVER: 'gameover',
}

// Fixed simulation step (seconds). The loop accumulates real frame time
// and advances the sim in whole steps of this size — true "фиксированный шаг".
export const FIXED_STEP = 1 / 120
// Never advance more than this much wall-clock per frame (tab-switch guard).
export const MAX_FRAME = 0.05

export const PLAYER = {
  lives: 3,
  speed: 270, // px/s
  radius: 13, // collision half-size (AABB)
  scale: 0.62, // sprite blit scale
  fireInterval: 0.15, // s between auto-fire volleys while SPACE held
  laserSpread: 9, // px offset of the twin bolts from centre
  laserSpeed: 620, // px/s (upward)
  iframes: 1.5, // s of invulnerability after a hit
  marginX: 18, // keep ship this far from the side walls
  marginBottom: 26, // distance of ship from the bottom edge
  marginTop: 0.42, // ship cannot fly above this fraction of the height
}

export const LASER = {
  w: 7,
  h: 20,
  scale: 0.72,
}

// Per-type enemy definitions. `pts` and behaviour follow the spec + style guide.
export const ENEMY = {
  straight: {
    vy: 80,
    vyPerWave: 4, // accelerates as waves climb
    hp: 1,
    pts: 100,
    radius: 16,
    scale: 0.5,
  },
  zigzag: {
    vy: 62,
    hp: 1,
    pts: 150,
    radius: 22,
    scale: 0.5,
    swayAmp: 46, // px horizontal sway amplitude
    swayFreq: 3, // rad/s
  },
  shooter: {
    vy: 34,
    hp: 2,
    pts: 300,
    radius: 24,
    scale: 0.58,
    shotSpeed: 165, // px/s aimed bolt
    shotRadius: 7,
    fireCooldownMin: 1.5,
    fireCooldownRand: 1.0,
    chargeTime: 0.42, // s the eye glows before firing
    // only fires while inside this vertical band of the screen
    fireBandTop: 28,
    fireBandBottom: 0.6, // fraction of height
  },
}

// Wave / spawn pacing. Difficulty ramps purely with elapsed waves.
export const PROGRESSION = {
  waveInterval: 13, // s before the wave counter ticks up
  maxWave: 99,
  spawnBase: 0.8, // base seconds between spawns at wave 1
  spawnPerWave: 0.03, // shaved off the interval each wave
  spawnMinBase: 0.42, // cap on how much can be shaved
  spawnRandLo: 0.7, // spawn interval jitter multiplier range
  spawnRandHi: 0.6,
  shooterBase: 0.07, // base chance an enemy is a shooter
  shooterPerWave: 0.02,
  shooterMax: 0.32,
  zigzagChance: 0.33, // chance (of the remainder) an enemy is a zigzag
  spawnMargin: 40, // horizontal inset for spawn x
}

export const FX = {
  shakeOnKill: 5,
  shakeMax: 8,
  shakeDecay: 0.88,
  boomLife: 0.34, // s — 6 frames at ~0.057s
  boomFrameTime: 0.057,
  maxEnemies: 64,
  maxParticles: 220,
}

// Throttle for pushing HUD values into React state (the hot loop must not
// call setState every frame). Score is flushed at most this often.
export const HUD_PUSH_INTERVAL = 0.08 // s (~12 Hz)
