import { useRef, useEffect, useLayoutEffect, useCallback, useState, useMemo } from 'react';
import { PORTAL_ICONS } from './pageData';
import { measureContentBlocks, solveLayout } from './layout';

// === Base physics constants ===
const GRAVITY = 0.5;
const JUMP_FORCE = 15;
const MOVE_SPEED = 8;
const MAX_FALL_SPEED = 125;
const MAX_JUMPS = 2;
const FRICTION = 0.7;
const PORTAL_HOLD_MS = 1000;
const FIXED_STEP = 1000 / 60;
const MAX_STEPS_PER_FRAME = 5;

// === Movement system constants ===
const SPACE_THRUST = 0.5;
const SPACE_MAX_SPEED = 8;
const SPACE_DRAG = 0.99;
const SPACE_BOUNCE = 0.3;

// Asteroids-style ship: rotate, thrust along the nose, floaty inertia
const SHIP_TURN = 0.065;
const SHIP_THRUST = 0.14;
const SHIP_BRAKE = 0.955;
const SHIP_DRAG = 0.9965;
const SHIP_MAX_SPEED = 9;
const SHIP_BOUNCE = 0.45;

// Top-down RPG grid movement
const RPG_CELL = 24;
const RPG_STEP = 7; // frames per tile

// Grappling hook
const GRAPPLE_GRAVITY = 0.4;
const GRAPPLE_HOOK_SPEED = 24;
const GRAPPLE_PULL_SPEED = 20;
const GRAPPLE_RANGE = 2400;
const GRAPPLE_ROPE_LEN = 170;
const GRAPPLE_ROPE_MIN = 70;
const GRAPPLE_PUMP = 0.2;

// Snake: grid-stepped, stops when it crashes
const SNAKE_CELL = 24;
const SNAKE_STEP = 5;
const SNAKE_LEN = 12;
const MAX_LAYOUT_WIDTH = 1400;


/**
 * Percentage-based x positions are laid out inside a centered column of at most
 * MAX_LAYOUT_WIDTH. Without the cap, horizontal gaps between platforms grow with
 * the window and exceed what a double jump can cross on wide screens.
 */
function layoutBox(worldWidth) {
  const width = Math.min(worldWidth, MAX_LAYOUT_WIDTH);
  return { left: (worldWidth - width) / 2, width };
}

/**
 * Resolve platform positions from percentage/pixel data to absolute pixels.
 */
function resolvePlatforms(platforms, worldWidth) {
  const box = layoutBox(worldWidth);
  return platforms.map(p => {
    let x, width;
    if (p.centered) {
      width = p.widthPx ?? ((p.widthPct / 100) * box.width);
      x = (worldWidth / 2) - (width / 2);
    } else if (p.xPct !== undefined) {
      if (p.xPct === 0 && p.widthPct === 100) {
        // Full-width floor spans the whole window
        x = 0;
        width = worldWidth;
      } else {
        x = box.left + (p.xPct / 100) * box.width;
        width = p.widthPx ?? ((p.widthPct / 100) * box.width);
      }
    } else {
      x = p.x ?? 0;
      width = p.width ?? worldWidth;
    }
    return { x, y: p.y, width, height: p.height ?? 2 };
  });
}

/**
 * Resolve portal positions from percentage/pixel data to absolute pixels.
 */
function resolvePortals(portals, worldWidth) {
  const box = layoutBox(worldWidth);
  return portals.map(p => {
    let x;
    const width = p.widthPx ?? ((p.widthPct / 100) * box.width);
    if (p.centered) {
      x = (worldWidth / 2) - (width / 2);
    } else {
      x = box.left + (p.xPct / 100) * box.width;
    }
    return { x, y: p.y, width, height: 65, target: p.target, label: p.label, icon: p.icon };
  });
}

// === Movement system physics ===

function clampToWorld(player, worldWidth, worldHeight) {
  player.x = Math.max(0, Math.min(player.x, worldWidth - player.width));

  const ceiling = worldHeight - player.height;
  if (player.y > ceiling) {
    player.y = ceiling;
    if (player.vy > 0) player.vy = 0;
  }

  if (player.y <= 0) {
    player.y = 0;
    player.vy = Math.max(player.vy, 0);
    player.onGround = true;
    if (player.jumpsLeft !== undefined) player.jumpsLeft = MAX_JUMPS;
  }
}

function overlapsAnyPortal(player, portals) {
  if (!portals) return false;
  const playerRight = player.x + player.width;
  const playerTop = player.y + player.height;
  for (let i = 0; i < portals.length; i++) {
    const p = portals[i];
    if (
      player.x < p.x + p.width &&
      playerRight > p.x &&
      player.y < p.y + p.height &&
      playerTop > p.y
    ) return true;
  }
  return false;
}

function applyPlatformCollisions(player, platforms, worldWidth, worldHeight, ignorePlatform = null) {
  // Horizontal bounds
  player.x = Math.max(0, Math.min(player.x, worldWidth - player.width));

  // Vertical platform landing — swept test, one-way (land from above only)
  if (player.vy <= 0) {
    const playerRight = player.x + player.width;
    for (let i = 0; i < platforms.length; i++) {
      const p = platforms[i];
      if (p === ignorePlatform) continue;
      const platTop = p.y + p.height;
      if (playerRight > p.x && player.x < p.x + p.width) {
        if (player.prevY >= platTop && player.y <= platTop) {
          player.y = platTop;
          player.vy = 0;
          player.onGround = true;
          if (player.jumpsLeft !== undefined) player.jumpsLeft = MAX_JUMPS;
          clampToWorld(player, worldWidth, worldHeight);
          return;
        }
      }
    }
  }

  clampToWorld(player, worldWidth, worldHeight);
}

function updatePlatformerPhysics(player, platforms, input, worldWidth, worldHeight) {
  // Gravity
  player.vy -= GRAVITY;
  if (player.vy < -MAX_FALL_SPEED) player.vy = -MAX_FALL_SPEED;

  // Horizontal input
  if (input.left) player.vx = -MOVE_SPEED;
  else if (input.right) player.vx = MOVE_SPEED;
  else player.vx *= FRICTION;

  // Jump — consume the press even when no jumps remain so it cannot fire later
  if (input.jumpPressed) {
    if (player.jumpsLeft > 0) {
      player.vy = JUMP_FORCE;
      player.jumpsLeft--;
    }
    input.jumpPressed = false;
  }

  player.prevY = player.y;
  player.x += player.vx;
  player.y += player.vy;
  player.onGround = false;

  applyPlatformCollisions(player, platforms, worldWidth, worldHeight);
}

function overlapsRect(a, p) {
  return a.x < p.x + p.width && a.x + a.width > p.x && a.y < p.y + p.height && a.y + a.height > p.y;
}

/**
 * Solid movement: platforms block from every side (axis-separated), world
 * edges are walls. `restitution` scales the rebound velocity (0 = stop dead).
 * Sets onGround when resting on something below.
 */
function moveAndCollide(player, platforms, worldWidth, worldHeight, restitution) {
  player.onGround = false;
  player.prevY = player.y;

  player.x += player.vx;
  for (let i = 0; i < platforms.length; i++) {
    const p = platforms[i];
    if (!overlapsRect(player, p)) continue;
    if (player.vx > 0) player.x = p.x - player.width;
    else if (player.vx < 0) player.x = p.x + p.width;
    else continue;
    player.vx = -player.vx * restitution;
  }

  player.y += player.vy;
  for (let i = 0; i < platforms.length; i++) {
    const p = platforms[i];
    if (!overlapsRect(player, p)) continue;
    if (player.vy < 0) {
      player.y = p.y + p.height;
      player.onGround = true;
    } else if (player.vy > 0) {
      player.y = p.y - player.height;
    } else continue;
    player.vy = -player.vy * restitution;
  }

  const maxX = worldWidth - player.width;
  const maxY = worldHeight - player.height;
  if (player.x < 0) { player.x = 0; if (player.vx < 0) player.vx = -player.vx * restitution; }
  else if (player.x > maxX) { player.x = maxX; if (player.vx > 0) player.vx = -player.vx * restitution; }
  if (player.y < 0) {
    player.y = 0;
    if (player.vy < 0) player.vy = -player.vy * restitution;
    player.onGround = true;
  } else if (player.y > maxY) {
    player.y = maxY;
    if (player.vy > 0) player.vy = -player.vy * restitution;
  }
}

function updateSpaceshipPhysics(player, platforms, input, worldWidth, worldHeight) {
  let ax = 0;
  let ay = 0;
  if (input.left) ax -= 1;
  if (input.right) ax += 1;
  if (input.up) ay += 1;
  if (input.down) ay -= 1;
  if (ax !== 0 && ay !== 0) { ax *= Math.SQRT1_2; ay *= Math.SQRT1_2; }

  player.vx += ax * SPACE_THRUST;
  player.vy += ay * SPACE_THRUST;
  player.vx *= SPACE_DRAG;
  player.vy *= SPACE_DRAG;

  const speed = Math.hypot(player.vx, player.vy);
  if (speed > SPACE_MAX_SPEED) {
    player.vx = (player.vx / speed) * SPACE_MAX_SPEED;
    player.vy = (player.vy / speed) * SPACE_MAX_SPEED;
  }

  moveAndCollide(player, platforms, worldWidth, worldHeight, SPACE_BOUNCE);
  if (speed > 0.3) player.angle = Math.atan2(player.vy, player.vx);
}

function updateAsteroidsPhysics(player, platforms, input, worldWidth, worldHeight) {
  if (input.left) player.angle += SHIP_TURN;
  if (input.right) player.angle -= SHIP_TURN;

  player.thrusting = !!input.up;
  if (player.thrusting) {
    player.vx += Math.cos(player.angle) * SHIP_THRUST;
    player.vy += Math.sin(player.angle) * SHIP_THRUST;
  }
  if (input.down) {
    player.vx *= SHIP_BRAKE;
    player.vy *= SHIP_BRAKE;
    if (Math.hypot(player.vx, player.vy) < 0.05) { player.vx = 0; player.vy = 0; }
  }
  player.vx *= SHIP_DRAG;
  player.vy *= SHIP_DRAG;

  const speed = Math.hypot(player.vx, player.vy);
  if (speed > SHIP_MAX_SPEED) {
    player.vx = (player.vx / speed) * SHIP_MAX_SPEED;
    player.vy = (player.vy / speed) * SHIP_MAX_SPEED;
  }

  moveAndCollide(player, platforms, worldWidth, worldHeight, SHIP_BOUNCE);
}

// Top-down RPG: tile-to-tile movement. Hold a direction to keep walking; solids and the world edge block.
function rpgCellBlocked(x, y, platforms, worldWidth, worldHeight) {
  const C = RPG_CELL;
  if (x < 0 || y < 0 || x + C > worldWidth || y + C > worldHeight) return true;
  const cell = { x, y, width: C, height: C };
  for (let i = 0; i < platforms.length; i++) {
    if (overlapsRect(cell, platforms[i])) return true;
  }
  return false;
}

function updateRpgPhysics(player, platforms, input, worldWidth, worldHeight) {
  const C = RPG_CELL;
  let r = player.rpg;
  // (Re)initialise whenever something else moved the player: spawn, resize, debug teleport
  if (!r || r.lastX !== player.x || r.lastY !== player.y) {
    r = player.rpg = { x: player.x, y: player.y, fromX: player.x, fromY: player.y, t: 0, moving: false, dx: 0, dy: -1, lastX: 0, lastY: 0 };
  }

  if (r.moving && ++r.t >= RPG_STEP) {
    r.moving = false;
    r.fromX = r.x;
    r.fromY = r.y;
  }

  if (!r.moving) {
    let dx = 0;
    let dy = 0;
    if (input.up) dy = 1;
    else if (input.down) dy = -1;
    else if (input.left) dx = -1;
    else if (input.right) dx = 1;
    if (dx || dy) {
      r.dx = dx;
      r.dy = dy;
      if (!rpgCellBlocked(r.x + dx * C, r.y + dy * C, platforms, worldWidth, worldHeight)) {
        r.fromX = r.x;
        r.fromY = r.y;
        r.x += dx * C;
        r.y += dy * C;
        r.t = 0;
        r.moving = true;
      }
    }
  }

  const k = r.moving ? r.t / RPG_STEP : 1;
  player.x = r.fromX + (r.x - r.fromX) * k;
  player.y = r.fromY + (r.y - r.fromY) * k;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
  player.angle = Math.atan2(r.dy, r.dx);
  r.lastX = player.x;
  r.lastY = player.y;
}

/**
 * Raycast from player center toward target, find first platform intersection.
 * Returns { x, y } on the platform surface, or null if no hit.
 */
function grappleRaycast(player, platforms, targetX, targetY, maxRange) {
  const px = player.x + player.width / 2;
  const py = player.y + player.height / 2;
  const dx = targetX - px;
  const dy = targetY - py;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return null;

  const nx = dx / dist;
  const ny = dy / dist;
  const range = Math.min(dist, maxRange);

  // Liáng–Barsky line-rectangle intersection — find closest platform hit
  let closestT = Infinity;

  for (let i = 0; i < platforms.length; i++) {
    const p = platforms[i];

    // Ignore the platform directly underfoot — otherwise any downward aim would
    // immediately latch onto our own platform edge and the grapple could not
    // reach the next platform below.
    if (
      player.onGround &&
      Math.abs((p.y + p.height) - player.y) < 1 &&
      player.x + player.width > p.x &&
      player.x < p.x + p.width
    ) continue;

    const edx = nx * range;
    const edy = ny * range;

    let t0 = 0, t1 = 1;
    let inside = true;

    // Left: p=-dx, q=x0-left
    let lp = -edx, lq = px - p.x;
    if (lp === 0) { if (lq < 0) inside = false; }
    else { let r = lq / lp; if (lp < 0) { if (r > t1) inside = false; else if (r > t0) t0 = r; } else { if (r < t0) inside = false; else if (r < t1) t1 = r; } }

    // Right: p=dx, q=right-x0
    let rp2 = edx, rq = (p.x + p.width) - px;
    if (rp2 === 0) { if (rq < 0) inside = false; }
    else { let r = rq / rp2; if (rp2 < 0) { if (r > t1) inside = false; else if (r > t0) t0 = r; } else { if (r < t0) inside = false; else if (r < t1) t1 = r; } }

    // Bottom: p=-dy, q=y0-bottom
    let bp = -edy, bq = py - p.y;
    if (bp === 0) { if (bq < 0) inside = false; }
    else { let r = bq / bp; if (bp < 0) { if (r > t1) inside = false; else if (r > t0) t0 = r; } else { if (r < t0) inside = false; else if (r < t1) t1 = r; } }

    // Top: p=dy, q=top-y0
    let tp2 = edy, tq = (p.y + p.height) - py;
    if (tp2 === 0) { if (tq < 0) inside = false; }
    else { let r = tq / tp2; if (tp2 < 0) { if (r > t1) inside = false; else if (r > t0) t0 = r; } else { if (r < t0) inside = false; else if (r < t1) t1 = r; } }

    if (inside && t0 < t1 && t0 < closestT) {
      closestT = t0;
    }
  }

  if (closestT < Infinity) {
    return {
      x: px + nx * closestT * range,
      y: py + ny * closestT * range,
    };
  }
  return null;
}

function updateGrapplePhysics(player, platforms, input, worldWidth, worldHeight) {
  const cx = player.x + player.width / 2;
  const cy = player.y + player.height / 2;

  // S / Down lets go
  if (input.down && input.hook) input.hook = null;

  if (input.hookFire) {
    const t = input.hookFire;
    input.hookFire = null;
    const dx = t.x - cx;
    const dy = t.y - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > 8) {
      const nx = dx / dist;
      const ny = dy / dist;
      const range = Math.min(dist, GRAPPLE_RANGE);
      const hit = grappleRaycast(player, platforms, cx + nx * range, cy + ny * range, range);
      // Latch onto the first solid in the way, otherwise anywhere the player clicked
      const reach = hit ? Math.hypot(hit.x - cx, hit.y - cy) : range;
      input.hook = {
        phase: 'flying',
        ox: cx, oy: cy, dx: nx, dy: ny,
        tip: 0, reach,
        ax: cx + nx * reach,
        ay: cy + ny * reach,
        len: 0,
        stuck: 0,
      };
    }
  }

  const hook = input.hook;

  if (hook && hook.phase === 'flying') {
    hook.tip = Math.min(hook.reach, hook.tip + GRAPPLE_HOOK_SPEED);
    if (hook.tip >= hook.reach) hook.phase = 'reeling';
  }

  if (input.hook && input.hook.phase === 'reeling') {
    // Reel in until the rope is at its swing length, then swing
    const dx = hook.ax - cx;
    const dy = hook.ay - cy;
    const dist = Math.hypot(dx, dy);
    if (dist <= GRAPPLE_ROPE_LEN + 2) {
      hook.phase = 'swinging';
      hook.len = Math.max(GRAPPLE_ROPE_MIN, dist);
    } else {
      const sp = Math.min(GRAPPLE_PULL_SPEED, (dist - GRAPPLE_ROPE_LEN) * 0.25 + 3);
      player.vx += ((dx / dist) * sp - player.vx) * 0.3;
      player.vy += ((dy / dist) * sp - player.vy) * 0.3;
      moveAndCollide(player, platforms, worldWidth, worldHeight, 0);
      // Blocked on the way: swing from where we are
      if (Math.hypot(player.vx, player.vy) < 0.4) hook.stuck++; else hook.stuck = 0;
      if (hook.stuck > 15) {
        hook.phase = 'swinging';
        hook.len = Math.hypot(hook.ax - (player.x + player.width / 2), hook.ay - (player.y + player.height / 2));
      }
      return;
    }
  }

  if (input.hook && input.hook.phase === 'swinging') {
    // Pendulum: gravity + optional pumping, then hold the player exactly one rope length from the anchor
    player.vy -= GRAPPLE_GRAVITY;
    if (input.left) player.vx -= GRAPPLE_PUMP;
    if (input.right) player.vx += GRAPPLE_PUMP;
    player.vx *= 0.999;
    player.vy *= 0.999;
    moveAndCollide(player, platforms, worldWidth, worldHeight, 0);
    const px = player.x + player.width / 2;
    const py = player.y + player.height / 2;
    const rx = px - hook.ax;
    const ry = py - hook.ay;
    const d = Math.hypot(rx, ry);
    if (d > 0) {
      const nx = rx / d;
      const ny = ry / d;
      player.x = hook.ax + nx * hook.len - player.width / 2;
      player.y = hook.ay + ny * hook.len - player.height / 2;
      const radial = player.vx * nx + player.vy * ny;
      player.vx -= radial * nx;
      player.vy -= radial * ny;
    }
    player.onGround = false;
    return;
  }

  // Free fall (no hook, or hook still flying)
  player.vy -= GRAPPLE_GRAVITY;
  player.vx *= player.onGround ? 0.8 : 0.99;
  moveAndCollide(player, platforms, worldWidth, worldHeight, 0);
}

const SNAKE_DIRS = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];

// True when the head cannot enter cell (nx, ny): world edge, platform, or its own body.
// The tail cell is vacated on the step, so it is not an obstacle.
function snakeCellBlocked(s, nx, ny, platforms, worldWidth, worldHeight) {
  const C = SNAKE_CELL;
  if (nx < 0 || ny < 0 || nx + C > worldWidth || ny + C > worldHeight) return true;
  const cell = { x: nx, y: ny, width: C, height: C };
  for (let i = 0; i < platforms.length; i++) {
    if (overlapsRect(cell, platforms[i])) return true;
  }
  for (let i = s.body.length >= SNAKE_LEN - 1 ? 1 : 0; i < s.body.length; i++) {
    if (s.body[i].x === nx + C / 2 && s.body[i].y === ny + C / 2) return true;
  }
  return false;
}

function updateSnakePhysics(player, platforms, input, worldWidth, worldHeight, portals) {
  const C = SNAKE_CELL;
  let s = player.snake;
  // (Re)initialise whenever something else moved the player: spawn, resize, debug teleport
  if (!s || s.lastX !== player.x || s.lastY !== player.y) {
    const col = Math.min(Math.round(player.x / C), Math.max(0, Math.floor((worldWidth - C) / C)));
    s = player.snake = {
      x: col * C, y: Math.ceil(player.y / C) * C,
      dir: { x: 0, y: 1 }, next: null, state: 'idle', timer: 0, body: [],
      lastX: 0, lastY: 0,
    };
    input.turn = null;
  }

  // Turn on key press (latched so a quick tap is never missed), never straight back into the body
  let turn = null;
  if (input.turn === 'up') turn = { x: 0, y: 1 };
  else if (input.turn === 'down') turn = { x: 0, y: -1 };
  else if (input.turn === 'left') turn = { x: -1, y: 0 };
  else if (input.turn === 'right') turn = { x: 1, y: 0 };
  input.turn = null;
  if (turn && !(s.body.length && turn.x === -s.dir.x && turn.y === -s.dir.y)) {
    s.next = turn;
    if (s.state !== 'moving') { s.state = 'moving'; s.timer = SNAKE_STEP; }
  }

  if (s.state === 'moving' && ++s.timer >= SNAKE_STEP) {
    s.timer = 0;
    if (s.next) { s.dir = s.next; s.next = null; }
    const nx = s.x + s.dir.x * C;
    const ny = s.y + s.dir.y * C;
    const cell = { x: nx, y: ny, width: C, height: C };

    if (snakeCellBlocked(s, nx, ny, platforms, worldWidth, worldHeight)) {
      s.state = 'crashed';
      // Fully walled in on every side: no way out
      s.trapped = SNAKE_DIRS.every((d) =>
        snakeCellBlocked(s, s.x + d.x * C, s.y + d.y * C, platforms, worldWidth, worldHeight));
    } else {
      const wasInPortal = overlapsAnyPortal({ x: s.x, y: s.y, width: C, height: C }, portals);
      s.body.push({ x: s.x + C / 2, y: s.y + C / 2 });
      if (s.body.length > SNAKE_LEN - 1) s.body.shift();
      s.x = nx;
      s.y = ny;
      // Stop on entering a portal so it can be held
      if (!wasInPortal && overlapsAnyPortal(cell, portals)) s.state = 'docked';
    }
  }

  player.x = s.x;
  player.y = s.y;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
  player.angle = Math.atan2(s.dir.y, s.dir.x);
  s.lastX = player.x;
  s.lastY = player.y;
}

function updatePhysics(player, platforms, input, worldWidth, worldHeight, movementType, portals) {
  switch (movementType) {
    case 'spaceship': return updateSpaceshipPhysics(player, platforms, input, worldWidth, worldHeight);
    case 'asteroids': return updateAsteroidsPhysics(player, platforms, input, worldWidth, worldHeight);
    case 'rpg': return updateRpgPhysics(player, platforms, input, worldWidth, worldHeight);
    case 'grapple': return updateGrapplePhysics(player, platforms, input, worldWidth, worldHeight);
    case 'snake': return updateSnakePhysics(player, platforms, input, worldWidth, worldHeight, portals);
    default: return updatePlatformerPhysics(player, platforms, input, worldWidth, worldHeight);
  }
}

// === Nav hints ===
const NAV_HINTS = {
  platformer: 'WASD to move · Hold in portals to navigate',
  spaceship: 'WASD to thrust · Hold in portals to navigate',
  asteroids: 'W / ↑ thrust · S / ↓ brake · A D / ← → rotate · Hold in portals to navigate',
  rpg: 'WASD / arrows to walk, one tile at a time · solid blocks stop you · Hold in portals to navigate',
  grapple: 'Click anywhere to throw the hook · you reel in, then swing on the rope · A D to pump the swing · S to let go · Hold in portals to navigate',
  snake: 'WASD / arrows to steer the snake · it stops when it hits a wall, platform or itself — press a direction to move again · it stops in portals, wait to travel',
};

const TOUCH_HINTS = {
  platformer: 'D-pad to move · JUMP to jump · Hold in portals',
  spaceship: 'D-pad to thrust · Hold in portals',
  asteroids: 'Left/right rotate · Up thrust · Down brake · Hold in portals',
  rpg: 'D-pad to walk · Hold in portals',
  grapple: 'Tap anywhere to throw the hook · Hold in portals',
  snake: 'D-pad steers the snake · it stops when it crashes — press a direction to move again · wait in portals',
};

function TouchButton({ label, className = '', onPress, onRelease, children }) {
  return (
    <button
      type="button"
      className={`touch-btn ${className}`}
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onPress();
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        onRelease();
      }}
      onPointerLeave={onRelease}
      onPointerCancel={onRelease}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </button>
  );
}

/**
 * Check if player overlaps a portal and update hold progress.
 * Returns the portal target when hold completes, or null.
 */
function resetInputState(input) {
  Object.keys(input).forEach((key) => {
    if (typeof input[key] === 'boolean') input[key] = false;
  });
}

function checkPortals(player, portals, portalHolds, now) {
  const playerRight = player.x + player.width;
  const playerBottom = player.y + player.height;

  for (let i = 0; i < portals.length; i++) {
    const p = portals[i];
    const overlapping =
      player.x < p.x + p.width &&
      playerRight > p.x &&
      player.y < p.y + p.height &&
      playerBottom > p.y;

    if (overlapping) {
      if (!portalHolds.has(i)) {
        portalHolds.set(i, { startTime: now });
      }
      const hold = portalHolds.get(i);
      const progress = Math.min((now - hold.startTime) / PORTAL_HOLD_MS, 1);
      if (progress >= 1.0) {
        return p.target;
      }
    } else {
      portalHolds.delete(i);
    }
  }
  return null;
}

/**
 * GameWorld — manages physics, input, camera, and renders the game.
 */
export default function GameWorld({
  pageData,
  children,
  onNavigate,
  onRestart,
  respawnKey,
  transitioning,
}) {
  const worldRef = useRef(null);
  const playerRef = useRef(null);
  const portalRingsRef = useRef([]);
  const containerRef = useRef(null);
  const trailRef = useRef([]);
  const grappleSvgRef = useRef(null);
  const grappleLineRef = useRef(null);
  const grappleHookRef = useRef(null);
  const contentRootRef = useRef(null);
  const pendingSpawnRef = useRef(false);
  const trailDotsRef = useRef([]);

  const [worldWidth, setWorldWidth] = useState(window.innerWidth);
  const [isTouch, setIsTouch] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  );
  const [pageIndicator, setPageIndicator] = useState(pageData.label);
  const [navHint, setNavHint] = useState(
    (isTouch ? TOUCH_HINTS : NAV_HINTS)[pageData.movementType] || NAV_HINTS.platformer
  );

  const movementType = pageData.movementType || 'platformer';

  // Player state (ref for 60fps updates without React re-renders)
  const player = useRef({
    x: 0, y: 0, vx: 0, vy: 0,
    width: 24, height: 24,
    onGround: false, jumpsLeft: MAX_JUMPS,
    angle: Math.PI / 2, // facing up
    prevY: 0,
  });

  // Input state — expanded for all movement types
  const input = useRef({
    left: false, right: false, jumpPressed: false,
    up: false, down: false,
    thrustUp: false, thrustDown: false, thrustLeft: false, thrustRight: false,
    boost: false,
    hook: null, hookFire: null,
  });

  const cameraY = useRef(0);
  const portalHolds = useRef(new Map());
  const prevPageIdRef = useRef(null);
  const prevRespawnKeyRef = useRef(respawnKey);
  const prevWorldWidthRef = useRef(worldWidth);

  const baseplatforms = useMemo(
    () => resolvePlatforms(pageData.platforms, worldWidth),
    [pageData.platforms, worldWidth]
  );
  const basePortals = useMemo(
    () => resolvePortals(pageData.portals, worldWidth),
    [pageData.portals, worldWidth]
  );

  // Content-aware layout: platforms/portals/spawn are shifted off the cards.
  // The home page is hand-tuned platforming and keeps its authored layout.
  const needsSolve = (pageData.movementType || 'platformer') !== 'platformer';
  const [solved, setSolved] = useState(null);
  useLayoutEffect(() => {
    if (!needsSolve) { setSolved(null); return undefined; }
    const root = contentRootRef.current;
    if (!root) return undefined;
    let raf = 0;
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      const blocks = measureContentBlocks(root);
      const result = solveLayout({
        platforms: baseplatforms,
        portals: basePortals,
        spawnY: pageData.spawn.y,
        worldWidth,
        worldHeight: pageData.height,
        blocks,
      });
      const sig = JSON.stringify(result);
      setSolved((prev) => (prev && prev.sig === sig && prev.pageId === pageData.id && prev.width === worldWidth
        ? prev
        : { ...result, sig, pageId: pageData.id, width: worldWidth }));
    };
    run();
    const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(run); };
    const ro = new ResizeObserver(schedule);
    ro.observe(root);
    for (const child of root.children) ro.observe(child);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
    return () => { cancelled = true; cancelAnimationFrame(raf); ro.disconnect(); };
  }, [needsSolve, pageData, worldWidth, baseplatforms, basePortals]);

  const layout = needsSolve && solved && solved.pageId === pageData.id && solved.width === worldWidth ? solved : null;
  const resolvedPlatforms = layout ? layout.platforms : baseplatforms;
  const resolvedPortals = layout ? layout.portals : basePortals;

  // Sync refs for the game loop (updated synchronously during render)
  const platformsRef = useRef(resolvedPlatforms);
  const portalsRef = useRef(resolvedPortals);
  platformsRef.current = resolvedPlatforms;
  portalsRef.current = resolvedPortals;
  const worldWidthRef = useRef(worldWidth);
  worldWidthRef.current = worldWidth;

  // Dev-only test handle (dead-code eliminated in production)
  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;
    window.__AYDEN_DEBUG__ = {
      player,
      input,
      cameraY,
      portalHolds,
      platformsRef,
      portalsRef,
      get pageData() { return pageDataRef.current; },
      get movementType() { return movementTypeRef.current; },
      get transitioning() { return transitioningRef.current; },
      get worldWidth() { return worldWidth; },
      setPlayer(props) { Object.assign(player.current, props); },
      setInput(props) { Object.assign(input.current, props); },
      resetInput() {
        Object.keys(input.current).forEach((k) => {
          if (typeof input.current[k] === 'boolean') input.current[k] = false;
        });
      },
    };
    return () => { delete window.__AYDEN_DEBUG__; };
  }, [worldWidth]);

  // Mutable refs for values the game loop needs (avoid stale closures)
  const transitioningRef = useRef(transitioning);
  transitioningRef.current = transitioning;
  const onNavigateRef = useRef(onNavigate);
  onNavigateRef.current = onNavigate;
  const onRestartRef = useRef(onRestart);
  onRestartRef.current = onRestart;
  const pageDataRef = useRef(pageData);
  pageDataRef.current = pageData;
  const movementTypeRef = useRef(movementType);
  movementTypeRef.current = movementType;

  // Touch controls — mirror keyboard input flags
  const pressDirection = (dir) => {
    const inp = input.current;
    if (dir === 'left') { inp.left = true; inp.thrustLeft = true; inp.turn = 'left'; }
    if (dir === 'right') { inp.right = true; inp.thrustRight = true; inp.turn = 'right'; }
    if (dir === 'up') {
      inp.up = true; inp.thrustUp = true; inp.turn = 'up';
      if (movementTypeRef.current === 'platformer') inp.jumpPressed = true;
    }
    if (dir === 'down') { inp.down = true; inp.thrustDown = true; inp.turn = 'down'; }
  };
  const releaseDirection = (dir) => {
    const inp = input.current;
    if (dir === 'left') { inp.left = false; inp.thrustLeft = false; }
    if (dir === 'right') { inp.right = false; inp.thrustRight = false; }
    if (dir === 'up') { inp.up = false; inp.thrustUp = false; }
    if (dir === 'down') { inp.down = false; inp.thrustDown = false; }
  };
  const pressAction = () => {
    if (movementTypeRef.current === 'platformer') input.current.jumpPressed = true;
  };
  const releaseAction = () => {};

  // Reset player on page change; preserve the player's position on resize
  useLayoutEffect(() => {
    // A respawn (snake trapped) replays the page-entry reset without changing page
    const respawned = prevRespawnKeyRef.current !== respawnKey;
    prevRespawnKeyRef.current = respawnKey;
    const pageChanged = prevPageIdRef.current !== pageData.id || respawned;
    const prevWidth = prevWorldWidthRef.current;
    const widthChanged = prevWidth !== worldWidth;

    if (pageChanged) {
      pendingSpawnRef.current = true;
      player.current.vx = 0;
      player.current.vy = 0;
      player.current.onGround = false;
      player.current.jumpsLeft = MAX_JUMPS;
      player.current.angle = Math.PI / 2;
      player.current.thrusting = false;
      cameraY.current = 0;
      portalHolds.current.clear();
      trailRef.current = [];
      trailDotsRef.current = [];
      resetInputState(input.current);
      input.current.hook = null;
      input.current.hookFire = null;
      setPageIndicator(pageData.label);
      setNavHint((isTouch ? TOUCH_HINTS : NAV_HINTS)[pageData.movementType] || NAV_HINTS.platformer);
    }

    // Place the player once the content-aware layout is ready (immediately
    // on pages that keep their authored layout).
    if (pendingSpawnRef.current && (!needsSolve || layout)) {
      const spawn = pageData.spawn;
      const spawnBox = layoutBox(worldWidth);
      const p = player.current;
      if (layout && layout.spawn) {
        p.x = layout.spawn.x - p.width / 2;
        p.y = layout.spawn.y;
      } else {
        p.x = spawnBox.left + (spawn.xPct / 100) * spawnBox.width - p.width / 2;
        p.y = spawn.y;
      }
      p.prevY = p.y;
      pendingSpawnRef.current = false;
    } else if (!pageChanged && widthChanged) {
      const scale = worldWidth / Math.max(1, prevWidth);
      const p = player.current;

      // Platform widths are partly fixed-pixel, so scaling x alone can slide a
      // standing player off their platform. Keep the same offset from the
      // platform's left edge instead (authored layouts only).
      let newX = p.x * scale;
      if (!needsSolve) {
        const oldPlatforms = resolvePlatforms(pageData.platforms, prevWidth);
        const supportIndex = oldPlatforms.findIndex((op) =>
          Math.abs((op.y + op.height) - p.y) < 1 &&
          p.x + p.width > op.x &&
          p.x < op.x + op.width
        );
        if (supportIndex !== -1) {
          const np = resolvedPlatforms[supportIndex];
          const offset = Math.min(p.x - oldPlatforms[supportIndex].x, Math.max(0, np.width - p.width));
          newX = np.x + offset;
        }
      }

      p.x = Math.max(0, Math.min(newX, worldWidth - p.width));
      p.prevY = p.y;

      const inp = input.current;
      inp.hook = null;
      trailRef.current = trailRef.current.map((dot) => ({ ...dot, x: dot.x * scale }));
    }

    prevPageIdRef.current = pageData.id;
    prevWorldWidthRef.current = worldWidth;
  }, [pageData, worldWidth, isTouch, layout, needsSolve, respawnKey]);

  // Track coarse-pointer devices so touch controls only appear on touch screens
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const handleChange = () => setIsTouch(mq.matches);
    handleChange();
    if (mq.addEventListener) mq.addEventListener('change', handleChange);
    else mq.addListener(handleChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', handleChange);
      else mq.removeListener(handleChange);
    };
  }, []);

  // Handle resize
  useEffect(() => {
    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => setWorldWidth(window.innerWidth), 100);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  // Keyboard input — supports all movement types
  useEffect(() => {
    const isTypingTarget = (target) => {
      if (!target) return false;
      const tag = target.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
    };

    const handleKeyDown = (e) => {
      if (isTypingTarget(e.target)) return;
      const inp = input.current;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const shouldPreventDefault = !e.ctrlKey && !e.metaKey && !e.altKey;

      switch (key) {
        case 'a': case 'ArrowLeft':
          inp.left = true; inp.thrustLeft = true; if (!e.repeat) inp.turn = 'left';
          if (shouldPreventDefault) e.preventDefault();
          break;
        case 'd': case 'ArrowRight':
          inp.right = true; inp.thrustRight = true; if (!e.repeat) inp.turn = 'right';
          if (shouldPreventDefault) e.preventDefault();
          break;
        case 'w': case 'ArrowUp':
          inp.up = true; inp.thrustUp = true; if (!e.repeat) inp.turn = 'up';
          if (!e.repeat) inp.jumpPressed = true;
          if (shouldPreventDefault) e.preventDefault();
          break;
        case 's': case 'ArrowDown':
          inp.down = true; inp.thrustDown = true; if (!e.repeat) inp.turn = 'down';
          if (shouldPreventDefault) e.preventDefault();
          break;
        case 'Shift': inp.boost = true; break;
        case ' ':
          if (!e.repeat) inp.jumpPressed = true;
          if (shouldPreventDefault) e.preventDefault();
          break;
      }
    };
    const handleKeyUp = (e) => {
      const inp = input.current;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      switch (key) {
        case 'a': case 'ArrowLeft': inp.left = false; inp.thrustLeft = false; break;
        case 'd': case 'ArrowRight': inp.right = false; inp.thrustRight = false; break;
        case 'w': case 'ArrowUp': inp.up = false; inp.thrustUp = false; break;
        case 's': case 'ArrowDown': inp.down = false; inp.thrustDown = false; break;
        case 'Shift': inp.boost = false; break;
      }
    };
    const handleBlur = () => resetInputState(input.current);
    const handleVisibility = () => {
      if (document.hidden) resetInputState(input.current);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);


  // Click handling for grapple
  useEffect(() => {
    const handleClick = (e) => {
      if (transitioningRef.current) return;
      // Real controls (mailto link, form fields, buttons) must not fire the game
      if (e.target.closest && e.target.closest('a, button, input, textarea, select, label, [data-no-game-click]')) return;
      const mt = movementTypeRef.current;
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const worldX = e.clientX - rect.left;
      const worldY = pageDataRef.current.height - (e.clientY - rect.top) - container.scrollTop;

      if (mt === 'grapple') {
        input.current.hookFire = { x: worldX, y: worldY };
      }
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Game loop — fixed 60Hz simulation keeps physics identical at any refresh rate
  useEffect(() => {
    let running = true;
    let frameId = 0;
    let last = performance.now();
    let accumulator = 0;

    const simulate = (now) => {
      const mt = movementTypeRef.current;
      const pd = pageDataRef.current;


      updatePhysics(
        player.current,
        platformsRef.current,
        input.current,
        worldWidthRef.current,
        pd.height,
        mt,
        portalsRef.current
      );

      // Update trail for the spaceship (the snake keeps its own body)
      if (mt === 'spaceship') {
        const t = trailRef.current;
        t.push({ x: player.current.x + player.current.width / 2, y: player.current.y + player.current.height / 2 });
        if (t.length > 20) t.shift();
      }

      // Snake walled in on all sides: send the player back to the top of the page
      if (mt === 'snake' && player.current.snake && player.current.snake.trapped) {
        player.current.snake.trapped = false;
        onRestartRef.current();
        transitioningRef.current = true;
        return;
      }

      // Check portals
      const target = checkPortals(
        player.current, portalsRef.current, portalHolds.current, now
      );
      if (target) {
        portalHolds.current.clear();
        onNavigateRef.current(target);
        // Pause immediately; React will confirm the transition state next render
        transitioningRef.current = true;
      }
    };

    const loop = (now) => {
      if (!running) return;

      const frameDt = Math.min(now - last, 100);
      last = now;

      if (!transitioningRef.current) {
        accumulator += frameDt;
        if (accumulator > FIXED_STEP * MAX_STEPS_PER_FRAME) {
          accumulator = FIXED_STEP * MAX_STEPS_PER_FRAME;
        }

        let steps = 0;
        while (accumulator >= FIXED_STEP && steps < MAX_STEPS_PER_FRAME) {
          simulate(now);
          accumulator -= FIXED_STEP;
          steps++;
          if (transitioningRef.current) break;
        }
        if (transitioningRef.current) accumulator = 0;
      } else {
        accumulator = 0;
      }

      // Update player DOM
      const el = playerRef.current;
      if (el) {
        el.style.left = player.current.x + 'px';
        el.style.bottom = player.current.y + 'px';
        // CSS rotation is clockwise; the physics angle is counter-clockwise from +x
        el.style.transform = `rotate(${Math.PI / 2 - player.current.angle}rad)`;
        el.dataset.thrust = movementTypeRef.current === 'asteroids' && player.current.thrusting ? '1' : '0';
        el.dataset.snake = movementTypeRef.current === 'snake' && player.current.snake ? player.current.snake.state : '';
      }

      // Update trail DOM using cached refs
      const snakeMode = movementTypeRef.current === 'snake';
      const trail = snakeMode ? (player.current.snake ? player.current.snake.body : []) : trailRef.current;
      const dots = trailDotsRef.current;
      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];
        if (!dot) continue;
        if (i < trail.length) {
          dot.style.left = trail[i].x + 'px';
          dot.style.bottom = trail[i].y + 'px';
          dot.style.opacity = snakeMode ? String(0.35 + 0.55 * ((i + 1) / trail.length)) : String((i / trail.length) * 0.4);
        } else if (snakeMode) {
          dot.style.opacity = '0';
        }
      }

      // Update grappling hook DOM
      const hookSvg = grappleSvgRef.current;
      if (hookSvg) {
        const hk = input.current.hook;
        if (hk) {
          const H = pageDataRef.current.height;
          const px = player.current.x + player.current.width / 2;
          const py = H - (player.current.y + player.current.height / 2);
          const tx = hk.ox + hk.dx * hk.tip;
          const ty = H - (hk.oy + hk.dy * hk.tip);
          const rope = grappleLineRef.current;
          if (rope) {
            rope.setAttribute('x1', px);
            rope.setAttribute('y1', py);
            rope.setAttribute('x2', tx);
            rope.setAttribute('y2', ty);
          }
          const head = grappleHookRef.current;
          if (head) {
            const deg = (Math.atan2(-hk.dy, hk.dx) * 180) / Math.PI;
            head.setAttribute('transform', `translate(${tx} ${ty}) rotate(${deg})`);
          }
          hookSvg.dataset.phase = hk.phase;
          hookSvg.style.display = '';
        } else {
          hookSvg.style.display = 'none';
        }
      }

      // Update portal ring progress
      portalsRef.current.forEach((p, i) => {
        const ring = portalRingsRef.current[i];
        if (!ring) return;
        const hold = portalHolds.current.get(i);
        if (hold) {
          const progress = Math.min((now - hold.startTime) / PORTAL_HOLD_MS, 1);
          ring.setAttribute('stroke-dashoffset', 100 - progress * 100);
        } else {
          ring.setAttribute('stroke-dashoffset', '100');
        }
      });

      // Camera: smooth follow player vertically
      const pd = pageDataRef.current;
      const charTop = pd.height - player.current.y - player.current.height;
      const viewportHeight = window.innerHeight;
      const maxScroll = Math.max(0, pd.height - viewportHeight);
      const targetScroll = charTop - viewportHeight / 2;
      const clamped = Math.max(0, Math.min(targetScroll, maxScroll));
      // Frame-rate independent camera smoothing
      const smoothing = 1 - Math.pow(1 - 0.15, frameDt / FIXED_STEP);
      cameraY.current += (clamped - cameraY.current) * smoothing;

      const container = containerRef.current;
      if (container) {
        container.scrollTop = cameraY.current;
      }


      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(frameId);
    };
  }, [worldWidth]);

  // Register portal ring refs
  const registerPortalRing = useCallback((el, index) => {
    portalRingsRef.current[index] = el;
  }, []);
  // Register trail dot refs
  const registerTrailDot = useCallback((el, index) => {
    trailDotsRef.current[index] = el;
  }, []);

  // Trail dots for certain movement types
  const showTrail = movementType === 'spaceship' || movementType === 'snake';
  const trailDots = showTrail ? Array.from({ length: 20 }, (_, i) => i) : [];

  return (
    <div
      ref={containerRef}
      className="world-container relative w-full h-screen overflow-y-auto overflow-x-hidden"
    >
      {/* Page indicator */}
      <div className="page-indicator">{pageIndicator}</div>
      {/* Nav hint */}
      <div className="nav-hint" style={isTouch ? { bottom: 150 } : undefined}>{navHint}</div>

      {/* Touch controls */}
      {isTouch && movementType !== 'grapple' && (
        <>
          <div className="touch-dpad">
            <TouchButton label="Move up" className="touch-up" onPress={() => pressDirection('up')} onRelease={() => releaseDirection('up')}>▲</TouchButton>
            <TouchButton label="Move left" className="touch-left" onPress={() => pressDirection('left')} onRelease={() => releaseDirection('left')}>◀</TouchButton>
            <TouchButton label="Move down" className="touch-down" onPress={() => pressDirection('down')} onRelease={() => releaseDirection('down')}>▼</TouchButton>
            <TouchButton label="Move right" className="touch-right" onPress={() => pressDirection('right')} onRelease={() => releaseDirection('right')}>▶</TouchButton>
          </div>
          {movementType === 'platformer' && (
            <TouchButton
              label="Jump"
              className="touch-action"
              onPress={pressAction}
              onRelease={releaseAction}
            >
              JUMP
            </TouchButton>
          )}
        </>
      )}

      {/* World container */}
      <div
        ref={worldRef}
        className="relative w-full"
        style={{ height: pageData.height }}
      >
        {/* Page content */}
        <div ref={contentRootRef} className="page-content">{children}</div>

        {/* Platforms */}
        {resolvedPlatforms.map((p, i) => (
          <div
            key={`plat-${i}`}
            className="platform absolute"
            style={{
              left: p.x,
              bottom: p.y,
              width: p.width,
              height: p.height,
            }}
          />
        ))}

        {/* Portals */}
        {resolvedPortals.map((p, i) => (
          <div
            key={`portal-${i}`}
            className="portal absolute"
            style={{
              left: p.x,
              bottom: p.y,
              width: p.width,
              height: p.height,
            }}
          >
            {/* SVG ring progress */}
            <svg
              className="portal-ring"
              viewBox="0 0 36 36"
              aria-hidden="true"
            >
              <circle
                className="portal-ring-bg"
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="2"
              />
              <circle
                ref={(el) => registerPortalRing(el, i)}
                className="portal-ring-progress"
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke="rgba(255,255,255,0.9)"
                strokeWidth="2"
                strokeDasharray="100"
                strokeDashoffset="100"
                strokeLinecap="round"
                transform="rotate(-90 18 18)"
              />
            </svg>
            {/* Portal icon and label */}
            {PORTAL_ICONS[p.icon]}
            <span className="text-[0.6rem] tracking-[0.2em] opacity-60">{p.label}</span>
          </div>
        ))}

        {/* Trail dots */}
        {trailDots.map(i => (
          <div
            key={`trail-${i}`}
            ref={(el) => registerTrailDot(el, i)}
            data-trail={i}
            className={`absolute pointer-events-none -translate-x-1/2 translate-y-1/2 ${movementType === 'snake' ? 'snake-seg' : 'w-2 h-2 rounded-full bg-white'}`}
            style={{ left: 0, bottom: 0, opacity: 0 }}
          />
        ))}

        {/* Grappling hook: rope from the player to the flying/attached hook head */}
        <svg
          ref={grappleSvgRef}
          className="grapple-svg absolute inset-0 w-full h-full pointer-events-none"
          style={{ display: 'none' }}
          aria-hidden="true"
        >
          <line
            ref={grappleLineRef}
            x1="0" y1="0" x2="0" y2="0"
            stroke="rgba(200,160,255,0.95)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <g
            ref={grappleHookRef}
            fill="none"
            stroke="rgba(230,210,255,1)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M-12,0 L4,0 M4,0 Q-2,-10 -10,-9 M4,0 Q-2,10 -10,9" />
            <circle cx="-12" cy="0" r="2.5" fill="rgba(230,210,255,1)" />
          </g>
        </svg>


        {/* Player */}
        <div
          ref={playerRef}
          id="character"
          className="absolute w-6 h-6 bg-white rounded-full"
          data-movement={movementType}
          data-thrust="0"
          style={{ left: 0, bottom: 0 }}
        >
          {movementType === 'asteroids' && (
            <svg className="ship-svg" viewBox="0 0 24 24" aria-hidden="true">
              <polygon className="ship-flame" points="9.5,18 12,25 14.5,18" />
              <polygon className="ship-hull" points="12,2 20,21 12,17 4,21" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
