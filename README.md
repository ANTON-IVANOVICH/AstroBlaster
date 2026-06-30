# AstroBlaster

A vertical neon scroll-shooter (shmup) in the spirit of Galaga / 1942 — built with **React 19 + the React Compiler** for the UI shell and a single imperative **`<canvas>`** for the gameplay.

▶ **Play:** https://ANTON-IVANOVICH.github.io/AstroBlaster/

![React 19](https://img.shields.io/badge/React-19-22d3ee) ![React Compiler](https://img.shields.io/badge/React_Compiler-on-8b5cf6) ![Vite](https://img.shields.io/badge/Vite-8-646cff)

## Controls

| Key | Action |
| --- | --- |
| `W` `A` `S` `D` / Arrows | Move the ship |
| `Space` (hold) | Auto-fire |
| `Esc` / `P` | Pause / resume |
| `Enter` / `Space` | Confirm on menu & game-over |

## Gameplay

- **3 lives.** Taking a hit costs a life, grants ~1.5 s of blinking invulnerability, then you respawn in place. Zero lives → game over.
- **Three enemy types:** _Штык_ (straight dart, +100), _Шершень_ (zig-zag weaver, +150), _Циклоп_ (slow turret that charges and fires an aimed bolt, 2 HP, +300).
- **Endless waves** with rising difficulty — spawn rate climbs and the share of dangerous enemies grows over time.
- **Score + session best** shown on the HUD and the game-over screen.

## Architecture

A deliberate **React-shell / canvas-core hybrid**:

- **React owns the shell** — menu, HUD, pause and game-over are ordinary components driven by a small phase state machine (`menu → playing → paused → gameover`).
- **The game lives in [`src/game/engine.js`](src/game/engine.js)** — a `requestAnimationFrame` loop that mutates plain JS arrays (enemies, lasers, enemy shots, explosions, particles) and repaints the canvas every frame. **It never touches React state in the hot loop.**
- **The React ↔ game boundary is tiny:** the loop pushes only UI values (score, lives, wave, game-over) out through *throttled* callbacks. Keyboard input is read each frame from a shared `ref` object, not from React.
- **Fixed timestep.** The sim integrates in fixed `1/120 s` steps with an accumulator, so behaviour is identical regardless of display refresh rate.
- **AABB collisions**, naive pulse-by-pulse — more than fast enough for v1 with the soft entity caps in place.

Art is fully **vector** — [`src/game/sprites.js`](src/game/sprites.js) is the design kit's canvas sprite engine (ship, drones, projectiles, explosions, parallax starfield, nebula backdrop). Sprites are baked once to offscreen canvases on init and blitted each frame.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build to dist/
npm run preview  # preview the production build
```

The React Compiler is wired through `@rolldown/plugin-babel` + `reactCompilerPreset` in [`vite.config.js`](vite.config.js).

## Deploy

Pushes to `main` are built and published to GitHub Pages by [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). The Vite `base` is set to `/AstroBlaster/` to match the project-pages path.

## Not in v1 (backlog)

Power-ups / weapon upgrades, shields, bosses, levels, audio, cross-session high-score persistence, and touch controls — all intentionally out of scope, layered on later over the working core.
