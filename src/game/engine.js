// AstroBlaster game engine.
//
// Owns the imperative <canvas> world: a requestAnimationFrame loop that
// integrates the simulation in a FIXED timestep (frame-rate independent),
// mutates plain JS arrays for every entity, and repaints the canvas each
// frame. It never touches React state directly — UI values (score, lives,
// wave, game-over) are pushed out through throttled callbacks so the hot
// loop stays allocation- and React-free.

import A from './spriteEngine.js'
import {
  PHASE,
  FIXED_STEP,
  MAX_FRAME,
  PLAYER,
  LASER,
  ENEMY,
  PROGRESSION,
  FX,
  HUD_PUSH_INTERVAL,
} from './constants.js'

// Particle velocity damping & screen-shake decay, recomputed so that a
// 1/120s fixed step feels identical to the design's 60fps reference.
const PART_DAMP = Math.pow(0.92, FIXED_STEP * 60)
const SHAKE_DECAY = Math.pow(FX.shakeDecay, FIXED_STEP * 60)
const TAU = Math.PI * 2

const ENEMY_SPRITE = {
  straight: 'droneStraight',
  zigzag: 'droneZigzag',
  shooter: 'droneShooter',
}

export function createGame(canvas, options = {}) {
  return new Game(canvas, options)
}

class Game {
  constructor(canvas, { keys, callbacks } = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d', { alpha: false })
    this.keys = keys || { left: false, right: false, up: false, down: false, fire: false }
    this.callbacks = callbacks || {}

    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.w = 0
    this.h = 0
    this.phase = PHASE.MENU
    this.started = false

    this.vt = 0 // visual time (cosmetic anim) — frozen while paused
    this.st = 0 // sim time — only advances during PLAYING
    this.acc = 0 // fixed-step accumulator
    this.last = 0
    this.raf = 0
    this.running = false
    this.hudT = 0

    this.star = null
    this.baked = null
    this._lastHud = { score: -1, lives: -1, wave: -1 }

    this._bake()
    this._measure()
    this._resetState()

    this._onResize = () => this._measure()
    this._ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(this._onResize) : null
    if (this._ro) this._ro.observe(canvas)
    else window.addEventListener('resize', this._onResize)
  }

  // ---- lifecycle ----------------------------------------------------------
  start() {
    if (this.running) return
    this.running = true
    this.last = performance.now()
    const loop = (now) => {
      if (!this.running) return
      this.raf = requestAnimationFrame(loop)
      this._tick(now)
    }
    this.raf = requestAnimationFrame(loop)
  }

  destroy() {
    this.running = false
    cancelAnimationFrame(this.raf)
    if (this._ro) this._ro.disconnect()
    else window.removeEventListener('resize', this._onResize)
  }

  setPhase(p) {
    if (p === this.phase) return
    const prev = this.phase
    this.phase = p
    if (p === PHASE.PLAYING) {
      if (!this.started) {
        this._resetState()
        this.started = true
      }
      // resuming from pause just continues; reset wall-clock so the
      // accumulator doesn't fast-forward the time spent paused.
      this.last = performance.now()
      this.acc = 0
    } else if (p === PHASE.MENU) {
      this.started = false
    }
    // PAUSED / GAMEOVER: state is frozen, only rendering continues.
    void prev
  }

  // ---- sizing -------------------------------------------------------------
  _measure() {
    const rect = this.canvas.getBoundingClientRect()
    const w = Math.max(1, Math.round(rect.width))
    const h = Math.max(1, Math.round(rect.height))
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    if (w === this.w && h === this.h && dpr === this.dpr && this.star) return
    this.w = w
    this.h = h
    this.dpr = dpr
    this.canvas.width = Math.round(w * dpr)
    this.canvas.height = Math.round(h * dpr)
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.star = A.createStarfield(w, h, {})
    // keep the ship on-screen after a resize
    if (this.player) {
      this.player.x = clamp(this.player.x, PLAYER.marginX, w - PLAYER.marginX)
      this.player.y = clamp(this.player.y, h * PLAYER.marginTop, h - PLAYER.marginBottom)
    }
  }

  // ---- baking -------------------------------------------------------------
  _bake() {
    this.baked = {
      player: [A.bake('player', 1, 0, 0.0), A.bake('player', 1, 0, 0.085), A.bake('player', 1, 0, 0.17)],
      droneStraight: [A.bake('droneStraight', 1, 0, 0)],
      droneZigzag: [A.bake('droneZigzag', 1, 0, 0)],
      droneShooter: [A.bake('droneShooter', 1, 0, 0.2), A.bake('droneShooter', 1, 1, 0.2)],
      playerLaser: [A.bake('playerLaser', 1, 0, 0)],
      enemyShot: [A.bake('enemyShot', 1, 0, 0)],
      explosion: [0, 1, 2, 3, 4, 5].map((f) => A.bake('explosion', 1, f, 0)),
    }
  }

  _blit(ctx, name, frame, x, y, scale) {
    const arr = this.baked[name]
    if (!arr) return
    const c = arr[frame] || arr[0]
    const s = scale || 1
    ctx.drawImage(c, x - (c.width * s) / 2, y - (c.height * s) / 2, c.width * s, c.height * s)
  }

  // ---- state --------------------------------------------------------------
  _resetState() {
    const w = this.w || 1
    const h = this.h || 1
    this.player = {
      x: w / 2,
      y: h - PLAYER.marginBottom,
      iTimer: 0,
      fireT: 0,
    }
    this.lives = PLAYER.lives
    this.score = 0
    this.shownScore = 0
    this.wave = 1
    this.waveT = 0
    this.spawnT = 0.6 // brief grace before the first enemy
    this.shake = 0
    this.over = false
    this.enemies = []
    this.lasers = []
    this.shots = []
    this.booms = []
    this.parts = []
    this._lastHud = { score: -1, lives: -1, wave: -1 }
    this._pushHud(true)
  }

  // ---- React boundary -----------------------------------------------------
  _pushHud(force) {
    const score = Math.round(this.shownScore)
    const last = this._lastHud
    if (!force && score === last.score && this.lives === last.lives && this.wave === last.wave) return
    last.score = score
    last.lives = this.lives
    last.wave = this.wave
    if (this.callbacks.onHud) this.callbacks.onHud({ score, lives: this.lives, wave: this.wave })
  }

  // ---- main tick ----------------------------------------------------------
  _tick(now) {
    let dt = (now - this.last) / 1000
    this.last = now
    if (dt > MAX_FRAME) dt = MAX_FRAME
    if (dt < 0) dt = 0

    if (this.phase === PHASE.PLAYING) {
      this.vt += dt
      this.star.update(dt)
      this.acc += dt
      let steps = 0
      while (this.acc >= FIXED_STEP && steps < 8) {
        this._step(FIXED_STEP)
        this.acc -= FIXED_STEP
        steps++
        if (this.over) {
          this.acc = 0 // stop accumulating once the run has ended
          break
        }
      }
      if (steps === 8) this.acc = 0 // shed backlog after a long stall
      this.hudT += dt
      if (this.hudT >= HUD_PUSH_INTERVAL) {
        this.hudT = 0
        this._pushHud(false)
      }
      this._renderGame()
    } else if (this.phase === PHASE.MENU) {
      this.vt += dt
      this.star.update(dt)
      this._renderMenu()
    } else {
      // PAUSED / GAMEOVER — freeze everything, repaint the last world.
      this._renderGame()
    }
  }

  // ---- simulation ---------------------------------------------------------
  _step(dt) {
    if (this.over) return // game ended mid-frame — don't advance the sim further
    this.st += dt
    const w = this.w
    const h = this.h
    const p = this.player

    // --- player movement ---
    let mvx = 0
    let mvy = 0
    if (this.keys.left) mvx -= 1
    if (this.keys.right) mvx += 1
    if (this.keys.up) mvy -= 1
    if (this.keys.down) mvy += 1
    if (mvx && mvy) {
      mvx *= Math.SQRT1_2
      mvy *= Math.SQRT1_2
    }
    p.x = clamp(p.x + mvx * PLAYER.speed * dt, PLAYER.marginX, w - PLAYER.marginX)
    p.y = clamp(p.y + mvy * PLAYER.speed * dt, h * PLAYER.marginTop, h - PLAYER.marginBottom)
    if (p.iTimer > 0) p.iTimer -= dt

    // --- player fire (auto while held) ---
    p.fireT -= dt
    if (this.keys.fire && p.fireT <= 0) {
      p.fireT = PLAYER.fireInterval
      this.lasers.push({ x: p.x - PLAYER.laserSpread, y: p.y - 22 }, { x: p.x + PLAYER.laserSpread, y: p.y - 22 })
    }
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const L = this.lasers[i]
      L.y -= PLAYER.laserSpeed * dt
      if (L.y < -28) this.lasers.splice(i, 1)
    }

    // --- spawning & waves ---
    this.waveT += dt
    if (this.waveT > PROGRESSION.waveInterval) {
      this.waveT = 0
      this.wave = Math.min(PROGRESSION.maxWave, this.wave + 1)
      this._pushHud(true)
    }
    this.spawnT -= dt
    if (this.spawnT <= 0) {
      this._spawn()
      const shaved = Math.min(PROGRESSION.spawnMinBase, this.wave * PROGRESSION.spawnPerWave)
      this.spawnT = (PROGRESSION.spawnBase - shaved) * (PROGRESSION.spawnRandLo + Math.random() * PROGRESSION.spawnRandHi)
    }

    // --- enemies ---
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const en = this.enemies[i]
      en.y += en.vy * dt
      if (en.type === 'zigzag') {
        en.x = en.bx + Math.sin(this.st * ENEMY.zigzag.swayFreq + en.ph) * ENEMY.zigzag.swayAmp
      } else if (en.type === 'shooter') {
        en.fireT -= dt
        const def = ENEMY.shooter
        if (en.fireT < def.chargeTime && en.fireT > 0) en.frame = 1
        if (en.fireT <= 0 && en.y > def.fireBandTop && en.y < h * def.fireBandBottom) {
          en.frame = 0
          en.fireT = def.fireCooldownMin + Math.random() * def.fireCooldownRand
          const dx = p.x - en.x
          const dy = p.y - (en.y + 22)
          const d = Math.hypot(dx, dy) || 1
          this.shots.push({
            x: en.x,
            y: en.y + 22,
            vx: (dx / d) * def.shotSpeed,
            vy: (dy / d) * def.shotSpeed,
          })
        }
      }

      // off the bottom of the screen
      if (en.y > h + 36) {
        this.enemies.splice(i, 1)
        continue
      }

      // contact with the player (damages both)
      if (
        p.iTimer <= 0 &&
        Math.abs(en.x - p.x) < en.radius + PLAYER.radius * 0.4 &&
        Math.abs(en.y - p.y) < en.radius + PLAYER.radius * 0.4
      ) {
        this._boom(en.x, en.y)
        this.enemies.splice(i, 1)
        this._damagePlayer()
        if (this.over) return // that hit ended the game — bail out of this step
        continue
      }

      // player lasers vs this enemy
      for (let j = this.lasers.length - 1; j >= 0; j--) {
        const L = this.lasers[j]
        if (Math.abs(L.x - en.x) < en.radius && Math.abs(L.y - en.y) < en.radius) {
          this.lasers.splice(j, 1)
          en.hp -= 1
          this._spark(en.x, L.y, 4, '#22d3ee')
          if (en.hp <= 0) {
            this._boom(en.x, en.y)
            this.score += en.pts
            this.shake = Math.min(FX.shakeMax, this.shake + FX.shakeOnKill)
            this.enemies.splice(i, 1)
            break
          }
        }
      }
    }

    // --- enemy shots ---
    const shotHitR = PLAYER.radius + ENEMY.shooter.shotRadius // AABB sums both half-extents
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i]
      s.x += s.vx * dt
      s.y += s.vy * dt
      if (s.y > h + 24 || s.y < -24 || s.x < -24 || s.x > w + 24) {
        this.shots.splice(i, 1)
        continue
      }
      if (p.iTimer <= 0 && Math.abs(s.x - p.x) < shotHitR && Math.abs(s.y - p.y) < shotHitR) {
        this.shots.splice(i, 1)
        this._damagePlayer()
        if (this.over) return
      }
    }

    // --- booms & particles ---
    for (let i = this.booms.length - 1; i >= 0; i--) {
      this.booms[i].age += dt
      if (this.booms[i].age > FX.boomLife) this.booms.splice(i, 1)
    }
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const pt = this.parts[i]
      pt.x += pt.vx * dt
      pt.y += pt.vy * dt
      pt.vx *= PART_DAMP
      pt.vy *= PART_DAMP
      pt.life -= dt
      if (pt.life <= 0) this.parts.splice(i, 1)
    }

    // --- soft caps so a long session can't grow unbounded ---
    // Trim from the BACK (newest, just spawned near the top) so the
    // most-progressed enemies near the player are never silently dropped.
    if (this.enemies.length > FX.maxEnemies) this.enemies.length = FX.maxEnemies
    // Particles are cosmetic; dropping the oldest (most-faded) is fine.
    if (this.parts.length > FX.maxParticles) this.parts.splice(0, this.parts.length - FX.maxParticles)

    this.shake *= SHAKE_DECAY
    this.shownScore += (this.score - this.shownScore) * Math.min(1, dt * 7)
  }

  _spawn() {
    const w = this.w
    const x = PROGRESSION.spawnMargin + Math.random() * (w - PROGRESSION.spawnMargin * 2)
    const roll = Math.random()
    const shooterP = Math.min(PROGRESSION.shooterMax, PROGRESSION.shooterBase + this.wave * PROGRESSION.shooterPerWave)
    let type
    if (roll < shooterP) type = 'shooter'
    else if (roll < shooterP + PROGRESSION.zigzagChance) type = 'zigzag'
    else type = 'straight'

    if (type === 'straight') {
      const d = ENEMY.straight
      this.enemies.push({ type, x, y: -34, vy: d.vy + this.wave * d.vyPerWave, radius: d.radius, hp: d.hp, pts: d.pts, frame: 0 })
    } else if (type === 'zigzag') {
      const d = ENEMY.zigzag
      this.enemies.push({ type, x, bx: x, ph: Math.random() * TAU, y: -34, vy: d.vy, radius: d.radius, hp: d.hp, pts: d.pts, frame: 0 })
    } else {
      const d = ENEMY.shooter
      this.enemies.push({
        type,
        x,
        y: -38,
        vy: d.vy,
        radius: d.radius,
        hp: d.hp,
        pts: d.pts,
        frame: 0,
        fireT: 0.7 + Math.random() * d.fireCooldownRand,
      })
    }
  }

  _damagePlayer() {
    const p = this.player
    if (p.iTimer > 0 || this.over) return
    this.lives -= 1
    p.iTimer = PLAYER.iframes
    this.shake = Math.min(FX.shakeMax, this.shake + 6)
    this._boom(p.x, p.y)
    this._spark(p.x, p.y, 12, '#a5f3fc')
    this._pushHud(true)
    if (this.lives <= 0) {
      this.over = true
      this.lives = 0
      this.phase = PHASE.GAMEOVER // freeze the sim immediately this frame
      this.started = false
      this.shownScore = this.score // snap the rolling counter to the exact final
      const final = this.score
      this._pushHud(true)
      if (this.callbacks.onGameOver) this.callbacks.onGameOver(final)
    }
  }

  _boom(x, y) {
    this.booms.push({ x, y, age: 0 })
    this._spark(x, y, 10, '#a5f3fc')
  }

  _spark(x, y, n, col) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU
      const sp = 40 + Math.random() * 120
      this.parts.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.3 + Math.random() * 0.4,
        max: 0.7,
        col,
      })
    }
  }

  // ---- rendering ----------------------------------------------------------
  _renderGame() {
    const ctx = this.ctx
    const w = this.w
    const h = this.h
    ctx.save()
    // Only jitter while the sim is live — a frozen pause/over frame stays still.
    if (this.phase === PHASE.PLAYING && this.shake > 0.3) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake)
    }
    A.drawBackdrop(ctx, w, h, this.vt)
    this.star.draw(ctx, this.vt)

    for (let i = 0; i < this.lasers.length; i++) {
      this._blit(ctx, 'playerLaser', 0, this.lasers[i].x, this.lasers[i].y, LASER.scale)
    }
    for (let i = 0; i < this.enemies.length; i++) {
      const en = this.enemies[i]
      const def = ENEMY[en.type]
      this._blit(ctx, ENEMY_SPRITE[en.type], en.frame || 0, en.x, en.y, def.scale)
    }
    for (let i = 0; i < this.shots.length; i++) {
      this._blit(ctx, 'enemyShot', 0, this.shots[i].x, this.shots[i].y, 0.78)
    }

    // player — hidden on alternate beats while invulnerable (blink)
    const p = this.player
    const blinkVisible = p.iTimer <= 0 || Math.floor(this.st * 14) % 2 === 0
    if (!this.over && blinkVisible) {
      this._blit(ctx, 'player', Math.floor(this.vt * 16) % 3, p.x, p.y, PLAYER.scale)
    }

    for (let i = 0; i < this.booms.length; i++) {
      const b = this.booms[i]
      this._blit(ctx, 'explosion', Math.min(5, Math.floor(b.age / FX.boomFrameTime)), b.x, b.y, 0.72)
    }

    // particles in additive blend
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < this.parts.length; i++) {
      const pt = this.parts[i]
      const al = Math.max(0, pt.life / pt.max)
      ctx.globalAlpha = al
      ctx.fillStyle = pt.col
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, 1.8 * al + 0.5, 0, TAU)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    ctx.restore()

    ctx.restore()
  }

  _renderMenu() {
    const ctx = this.ctx
    const w = this.w
    const h = this.h
    const ft = this.vt
    A.drawBackdrop(ctx, w, h, ft)
    this.star.draw(ctx, ft)
    // a couple of decorative ships drifting behind the menu UI
    this._blit(ctx, 'droneZigzag', 0, w * 0.5 + Math.sin(ft * 0.6) * w * 0.22, h * 0.2, 0.42)
    this._blit(ctx, 'droneStraight', 0, w * 0.78, ((ft * 30) % (h + 120)) - 60, 0.42)
    this._blit(ctx, 'player', Math.floor(ft * 16) % 3, w * 0.5, h * 0.78 + Math.sin(ft * 1.6) * 8, 0.66)
  }
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v
}
