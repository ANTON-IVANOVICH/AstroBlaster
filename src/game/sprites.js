/* ============================================================
   AstroBlaster — sprite engine  (Cyberpunk-Cool neon vector)
   ------------------------------------------------------------
   Pure <canvas> 2D drawing. No deps. Used by the style-guide
   mockups AND baked to a PNG sheet by the asset exporter.

   Every draw fn is authored in origin-centred design units and
   draws the sprite centred at (0,0). Use AstroSprites.draw(...)
   / .bake(...) which handle translate + scale + glow padding.

   Coordinate convention:
     - Player faces UP  (nose at -y)
     - Enemies face DOWN (nose at +y)
   ============================================================ */
(function () {
  'use strict';

  // ---- palette -------------------------------------------------
  var P = {
    void:    '#06060f',
    bg:      '#0a0a1a',
    panel:   '#10102a',
    grid:    '#1a2046',
    blue:    '#3b82f6',
    blueDk:  '#1e3a8a',
    purple:  '#8b5cf6',
    purpleDk:'#5b21b6',
    cyan:    '#22d3ee',
    cyanHot: '#a5f3fc',
    cyanDk:  '#0e7490',
    light:   '#e2e8f0',
    muted:   '#7c83a8',
    enemy:   '#a855f7',  // hostile body accent
    enemyHot:'#e879f9',  // hostile fire
    hull:    '#46568a',  // metal blue-grey
    hullLt:  '#9fb0d8',
    hullDk:  '#161d36',
    amber:   '#fbbf24',  // gunner eye warning
    red:     '#fb5b78'
  };

  // ---- low-level helpers --------------------------------------
  function trace(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
  }
  function mirrorX(pts) { return pts.map(function (p) { return [-p[0], p[1]]; }); }
  function grad(ctx, x0, y0, x1, y1, stops) {
    var g = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(function (s) { g.addColorStop(s[0], s[1]); });
    return g;
  }
  function rgrad(ctx, x, y, r, stops) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    stops.forEach(function (s) { g.addColorStop(s[0], s[1]); });
    return g;
  }
  // filled shape with an outer neon edge stroke
  function neon(ctx, pts, fill, edge, ew, blur) {
    trace(ctx, pts);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (edge) {
      ctx.save();
      ctx.shadowColor = edge; ctx.shadowBlur = (blur == null ? 10 : blur);
      ctx.strokeStyle = edge; ctx.lineWidth = (ew == null ? 1.5 : ew);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();
    }
  }
  function dot(ctx, x, y, r, color, blur) {
    ctx.save();
    ctx.shadowColor = color; ctx.shadowBlur = blur == null ? 8 : blur;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.restore();
  }

  // ---- engine flame (used by player) --------------------------
  function flame(ctx, x, y, w, len, t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowColor = P.cyan; ctx.shadowBlur = 16;
    ctx.fillStyle = grad(ctx, 0, y, 0, y + len, [
      [0, 'rgba(34,211,238,0.85)'], [0.45, 'rgba(59,130,246,0.45)'], [1, 'rgba(59,130,246,0)']
    ]);
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.quadraticCurveTo(x, y + len * 0.62, x, y + len);
    ctx.quadraticCurveTo(x, y + len * 0.62, x + w, y);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 6;
    ctx.fillStyle = grad(ctx, 0, y, 0, y + len * 0.7, [
      [0, 'rgba(240,253,255,0.95)'], [1, 'rgba(165,243,252,0)']
    ]);
    ctx.beginPath();
    ctx.moveTo(x - w * 0.5, y);
    ctx.quadraticCurveTo(x, y + len * 0.46, x, y + len * 0.72);
    ctx.quadraticCurveTo(x, y + len * 0.46, x + w * 0.5, y);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // =============================================================
  //  PLAYER  — streamlined aggressive fighter (cyan / blue)
  // =============================================================
  function drawPlayer(ctx, frame, t) {
    t = t || 0;
    var flick = 0.82 + 0.32 * Math.abs(Math.sin(t * 16 + (frame || 0)));
    flame(ctx, -6.5, 30, 5, 26 * flick, t);
    flame(ctx, 6.5, 30, 5, 26 * flick, t);

    // ---- wings (swept delta, behind fuselage) ----
    var wing = [[-9, 1], [-47, 20], [-44, 31], [-26, 27], [-10, 15]];
    var wingFill = grad(ctx, -47, 0, -9, 0, [[0, P.hullDk], [1, P.hull]]);
    neon(ctx, wing, wingFill, P.blue, 1.4, 9);
    neon(ctx, mirrorX(wing), grad(ctx, 9, 0, 47, 0, [[0, P.hull], [1, P.hullDk]]), P.blue, 1.4, 9);
    // wing-tip cannons + lights
    ctx.fillStyle = P.hullDk;
    ctx.fillRect(-45, 8, 3, 16); ctx.fillRect(42, 8, 3, 16);
    dot(ctx, -43.5, 9, 1.8, P.cyan, 8); dot(ctx, 43.5, 9, 1.8, P.cyan, 8);

    // ---- fuselage ----
    var body = [[0, -46], [5.5, -30], [7, -8], [11, 7], [9, 23], [5, 31],
                [-5, 31], [-9, 23], [-11, 7], [-7, -8], [-5.5, -30]];
    neon(ctx, body, grad(ctx, -11, 0, 11, 0,
      [[0, P.hullDk], [0.42, P.hullLt], [0.58, P.hull], [1, P.hullDk]]), P.cyan, 1.7, 13);

    // panel lines
    ctx.save();
    ctx.strokeStyle = 'rgba(6,9,22,0.55)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -28); ctx.lineTo(0, 28);
    ctx.moveTo(-6, -4); ctx.lineTo(-8.5, 22);
    ctx.moveTo(6, -4); ctx.lineTo(8.5, 22);
    ctx.stroke();
    ctx.restore();

    // cockpit
    ctx.save();
    ctx.shadowColor = P.cyan; ctx.shadowBlur = 12;
    ctx.fillStyle = rgrad(ctx, 0, -22, 11, [[0, '#ecfeff'], [0.45, P.cyan], [1, '#0b3346']]);
    ctx.beginPath(); ctx.ellipse(0, -20, 4.6, 10, 0, 0, 7); ctx.fill();
    ctx.restore();
    dot(ctx, -1.3, -24, 1.3, '#ffffff', 4);

    // nose tip + engine nozzles
    dot(ctx, 0, -45, 1.6, P.cyanHot, 10);
    ctx.fillStyle = P.hullDk; ctx.fillRect(-7.5, 29, 5, 4); ctx.fillRect(2.5, 29, 5, 4);
    dot(ctx, -5, 31, 1.7, P.cyan, 9); dot(ctx, 5, 31, 1.7, P.cyan, 9);
  }

  // =============================================================
  //  ENEMY 1 — STRAIGHT drone "Штык" (cheap dart, blue)
  // =============================================================
  function drawDroneStraight(ctx, frame, t) {
    t = t || 0;
    var body = [[0, 36], [12, 7], [17, -8], [9, -23], [-9, -23], [-17, -8], [-12, 7]];
    neon(ctx, body, grad(ctx, 0, -23, 0, 36,
      [[0, P.hull], [0.5, P.hullDk], [1, '#0c1124']]), P.blue, 1.5, 11);
    // shoulder fins
    ctx.fillStyle = P.hullDk;
    neon(ctx, [[-17, -8], [-23, -2], [-16, 4]], P.hullDk, P.blue, 1.1, 6);
    neon(ctx, [[17, -8], [23, -2], [16, 4]], P.hullDk, P.blue, 1.1, 6);
    // panel
    ctx.strokeStyle = 'rgba(6,9,22,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-7, -16); ctx.lineTo(7, -16); ctx.stroke();
    // sensor eye
    dot(ctx, 0, -6, 3.4, P.cyan, 12);
    dot(ctx, 0, -6, 1.4, '#ecfeff', 4);
  }

  // =============================================================
  //  ENEMY 2 — ZIGZAG drone "Шершень" (winged weaver, purple)
  // =============================================================
  function drawDroneZigzag(ctx, frame, t) {
    t = t || 0;
    // swept wings
    var wing = [[6, -3], [46, -15], [52, 3], [40, 15], [11, 11]];
    neon(ctx, wing, grad(ctx, 6, 0, 52, 0, [[0, P.hull], [1, P.purpleDk]]), P.purple, 1.4, 10);
    neon(ctx, mirrorX(wing), grad(ctx, -52, 0, -6, 0, [[0, P.purpleDk], [1, P.hull]]), P.purple, 1.4, 10);
    dot(ctx, 49, -6, 1.7, P.enemyHot, 8); dot(ctx, -49, -6, 1.7, P.enemyHot, 8);
    // central pod
    var pod = [[0, 30], [7, 16], [8, -10], [0, -26], [-8, -10], [-7, 16]];
    neon(ctx, pod, grad(ctx, -8, 0, 8, 0,
      [[0, P.hullDk], [0.5, P.hullLt], [1, P.hullDk]]), P.purple, 1.5, 11);
    // core
    dot(ctx, 0, 0, 3.6, P.enemyHot, 13);
    dot(ctx, 0, 0, 1.5, '#ffffff', 4);
  }

  // =============================================================
  //  ENEMY 3 — SHOOTER drone "Турель" (heavy gunner, amber eye)
  //  frame 0 = idle, frame 1 = charging shot
  // =============================================================
  function drawDroneShooter(ctx, frame, t) {
    t = t || 0;
    var charging = (frame === 1);
    // gun barrels (behind body, pointing down)
    ctx.fillStyle = P.hullDk;
    neon(ctx, [[-17, 18], [-9, 18], [-10, 40], [-16, 40]], P.hullDk, P.purple, 1.2, 7);
    neon(ctx, [[9, 18], [17, 18], [16, 40], [10, 40]], P.hullDk, P.purple, 1.2, 7);
    var mz = charging ? P.enemyHot : P.purple;
    dot(ctx, -13, 39, 2.2, mz, charging ? 14 : 7);
    dot(ctx, 13, 39, 2.2, mz, charging ? 14 : 7);

    // armoured octagon body
    var body = [[14, -30], [30, -13], [30, 13], [16, 27], [-16, 27],
                [-30, 13], [-30, -13], [-14, -30]];
    neon(ctx, body, grad(ctx, 0, -30, 0, 27,
      [[0, P.hull], [0.5, P.hullDk], [1, '#0c1124']]), P.purple, 1.8, 13);
    // armour plate seams
    ctx.save();
    ctx.strokeStyle = 'rgba(6,9,22,0.55)'; ctx.lineWidth = 1.1;
    trace(ctx, [[10, -22], [22, -10], [22, 10], [11, 20], [-11, 20], [-22, 10], [-22, -10], [-10, -22]]);
    ctx.stroke();
    ctx.restore();
    // shoulder lights
    dot(ctx, -27, -6, 1.6, P.purple, 7); dot(ctx, 27, -6, 1.6, P.purple, 7);

    // menacing central eye
    var pulse = charging ? (0.7 + 0.3 * Math.abs(Math.sin(t * 22))) : (0.55 + 0.18 * Math.abs(Math.sin(t * 5)));
    ctx.save();
    ctx.shadowColor = charging ? P.enemyHot : P.amber;
    ctx.shadowBlur = 18 * pulse + 6;
    ctx.fillStyle = rgrad(ctx, 0, -3, 13,
      charging
        ? [[0, '#ffffff'], [0.4, P.enemyHot], [1, 'rgba(168,85,247,0)']]
        : [[0, '#fff7d6'], [0.4, P.amber], [1, 'rgba(251,191,36,0)']]);
    ctx.beginPath(); ctx.arc(0, -3, 12 * pulse, 0, 7); ctx.fill();
    ctx.restore();
    dot(ctx, 0, -3, 3.4, '#ffffff', 4);
  }

  // =============================================================
  //  PROJECTILES
  // =============================================================
  function drawPlayerLaser(ctx, frame, t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // outer glow capsule
    ctx.shadowColor = P.cyan; ctx.shadowBlur = 14;
    ctx.fillStyle = 'rgba(34,211,238,0.6)';
    roundCap(ctx, 0, -24, 0, 24, 5);
    // bright core
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#ecfeff';
    roundCap(ctx, 0, -22, 0, 22, 2);
    // leading flash
    dot(ctx, 0, -24, 2.6, '#ffffff', 10);
    ctx.restore();
  }
  function drawEnemyShot(ctx, frame, t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // trailing streak (points up, since travelling down)
    ctx.fillStyle = grad(ctx, 0, -18, 0, 6,
      [[0, 'rgba(232,121,249,0)'], [1, 'rgba(232,121,249,0.55)']]);
    ctx.beginPath();
    ctx.moveTo(-2.5, 4); ctx.lineTo(0, -18); ctx.lineTo(2.5, 4); ctx.closePath(); ctx.fill();
    // orb
    ctx.shadowColor = P.enemyHot; ctx.shadowBlur = 13;
    ctx.fillStyle = rgrad(ctx, 0, 4, 7, [[0, '#ffffff'], [0.4, P.enemyHot], [1, 'rgba(168,85,247,0)']]);
    ctx.beginPath(); ctx.arc(0, 4, 6.5, 0, 7); ctx.fill();
    ctx.restore();
  }
  function roundCap(ctx, x0, y0, x1, y1, r) {
    ctx.beginPath();
    ctx.moveTo(x0 - r, y0); ctx.lineTo(x1 - r, y1);
    ctx.arc(x1, y1, r, Math.PI, 0, true);
    ctx.lineTo(x0 + r, y0);
    ctx.arc(x0, y0, r, 0, Math.PI, true);
    ctx.closePath(); ctx.fill();
  }

  // =============================================================
  //  EXPLOSION  — progress 0..1  (6 baked frames)
  // =============================================================
  var SPARK_ANG = [0.2, 0.95, 1.7, 2.5, 3.3, 4.0, 4.8, 5.6];
  function easeOut(x) { return 1 - Math.pow(1 - x, 2.4); }
  function drawExplosion(ctx, frame, t, frames) {
    var n = frames || 6;
    var e = n > 1 ? (frame || 0) / (n - 1) : 0;
    var eo = easeOut(e);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // core flash
    var coreA = Math.max(0, 1 - e * 1.3);
    if (coreA > 0) {
      ctx.shadowColor = P.cyan; ctx.shadowBlur = 24;
      ctx.fillStyle = rgrad(ctx, 0, 0, 6 + eo * 26,
        [[0, 'rgba(255,255,255,' + coreA + ')'], [0.5, 'rgba(34,211,238,' + (coreA * 0.8) + ')'], [1, 'rgba(59,130,246,0)']]);
      ctx.beginPath(); ctx.arc(0, 0, 6 + eo * 26, 0, 7); ctx.fill();
    }
    // shockwave ring
    var ringA = Math.max(0, 1 - e);
    ctx.shadowColor = P.cyanHot; ctx.shadowBlur = 14;
    ctx.strokeStyle = 'rgba(165,243,252,' + ringA + ')';
    ctx.lineWidth = Math.max(0.8, 5 * (1 - e));
    ctx.beginPath(); ctx.arc(0, 0, 6 + eo * 56, 0, 7); ctx.stroke();
    // spikes
    ctx.strokeStyle = 'rgba(34,211,238,' + (ringA * 0.9) + ')';
    ctx.lineWidth = 2 * (1 - e) + 0.5;
    for (var i = 0; i < 6; i++) {
      var a = i * (Math.PI / 3) + 0.3;
      var r0 = 8 + eo * 22, r1 = 12 + eo * 50;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
      ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.stroke();
    }
    // sparks
    ctx.shadowColor = P.cyan; ctx.shadowBlur = 8;
    for (var j = 0; j < SPARK_ANG.length; j++) {
      var ang = SPARK_ANG[j];
      var rr = 10 + eo * (40 + (j % 3) * 12);
      ctx.fillStyle = 'rgba(' + (j % 2 ? '236,254,255,' : '165,243,252,') + ringA + ')';
      ctx.beginPath();
      ctx.arc(Math.cos(ang) * rr, Math.sin(ang) * rr, 2.2 * (1 - e) + 0.6, 0, 7);
      ctx.fill();
    }
    ctx.restore();
  }

  // ---- registry -----------------------------------------------
  var SPRITES = {
    player:        { draw: drawPlayer,        size: [104, 100], frames: 1 },
    droneStraight: { draw: drawDroneStraight, size: [50, 76],   frames: 1 },
    droneZigzag:   { draw: drawDroneZigzag,   size: [110, 66],  frames: 1 },
    droneShooter:  { draw: drawDroneShooter,  size: [64, 78],   frames: 2 },
    playerLaser:   { draw: drawPlayerLaser,   size: [18, 58],   frames: 1 },
    enemyShot:     { draw: drawEnemyShot,     size: [22, 36],   frames: 1 },
    explosion:     { draw: drawExplosion,     size: [130, 130], frames: 6 }
  };
  var PAD = 22; // glow bleed padding for baking

  // draw centred at (cx,cy) scaled by `scale`
  function drawSprite(ctx, name, cx, cy, scale, frame, t) {
    var s = SPRITES[name]; if (!s) return;
    ctx.save();
    ctx.translate(cx, cy);
    if (scale && scale !== 1) ctx.scale(scale, scale);
    s.draw(ctx, frame || 0, t || 0, s.frames);
    ctx.restore();
  }

  // bake a single sprite/frame to its own transparent canvas
  function bake(name, scale, frame, t) {
    scale = scale || 1;
    var s = SPRITES[name];
    var w = Math.ceil(s.size[0] * scale + PAD * 2);
    var h = Math.ceil(s.size[1] * scale + PAD * 2);
    var cv = (typeof createCanvas === 'function')
      ? createCanvas(w, h)
      : Object.assign(document.createElement('canvas'), { width: w, height: h });
    cv.width = w; cv.height = h;
    var ctx = cv.getContext('2d');
    drawSprite(ctx, name, w / 2, h / 2, scale, frame || 0, t || 0);
    return cv;
  }

  // ---- parallax starfield (stateful) --------------------------
  function createStarfield(w, h, opts) {
    opts = opts || {};
    var layers = [
      { n: Math.round(w * h / 9000), spd: 14, r: [0.5, 1.0], a: 0.45, col: '#6b7bb5' },
      { n: Math.round(w * h / 14000), spd: 32, r: [0.7, 1.5], a: 0.7, col: '#aab6e8' },
      { n: Math.round(w * h / 30000), spd: 64, r: [1.0, 2.1], a: 1.0, col: '#e6ecff' }
    ];
    var stars = [];
    layers.forEach(function (L, li) {
      for (var i = 0; i < L.n; i++) {
        stars.push({
          x: Math.random() * w, y: Math.random() * h,
          r: L.r[0] + Math.random() * (L.r[1] - L.r[0]),
          spd: L.spd * (opts.speed || 1), a: L.a, col: L.col,
          tw: Math.random() * 6.28, bright: li === 2 && Math.random() < 0.25
        });
      }
    });
    return {
      stars: stars,
      update: function (dt) {
        for (var i = 0; i < stars.length; i++) {
          stars[i].y += stars[i].spd * dt;
          if (stars[i].y > h + 4) { stars[i].y = -4; stars[i].x = Math.random() * w; }
        }
      },
      draw: function (ctx, time) {
        for (var i = 0; i < stars.length; i++) {
          var s = stars[i];
          var tw = 0.7 + 0.3 * Math.sin((time || 0) * 3 + s.tw);
          ctx.globalAlpha = s.a * tw;
          if (s.bright) { ctx.shadowColor = '#bcd0ff'; ctx.shadowBlur = 6; }
          ctx.fillStyle = s.col;
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
          if (s.bright) ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1;
      }
    };
  }

  // paint the deep-space backdrop (void + faint nebula veils)
  function drawBackdrop(ctx, w, h, time) {
    time = time || 0;
    ctx.fillStyle = P.void;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var veil = ctx.createRadialGradient(w * 0.28, h * 0.22, 0, w * 0.28, h * 0.22, h * 0.7);
    veil.addColorStop(0, 'rgba(59,130,246,0.10)');
    veil.addColorStop(1, 'rgba(59,130,246,0)');
    ctx.fillStyle = veil; ctx.fillRect(0, 0, w, h);
    var veil2 = ctx.createRadialGradient(w * 0.78, h * 0.7, 0, w * 0.78, h * 0.7, h * 0.6);
    veil2.addColorStop(0, 'rgba(139,92,246,0.09)');
    veil2.addColorStop(1, 'rgba(139,92,246,0)');
    ctx.fillStyle = veil2; ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  var API = {
    palette: P,
    SPRITES: SPRITES,
    PAD: PAD,
    draw: drawSprite,
    bake: bake,
    createStarfield: createStarfield,
    drawBackdrop: drawBackdrop,
    // expose primitives for ad-hoc use
    _dot: dot, _neon: neon
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof globalThis !== 'undefined') globalThis.AstroSprites = API;
  if (typeof window !== 'undefined') window.AstroSprites = API;
})();
