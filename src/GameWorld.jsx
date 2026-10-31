import { useRef, useEffect, useLayoutEffect, useCallback, useState, useMemo } from 'react';
import { PORTAL_ICONS } from './pageData';

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
const TANK_ROT_SPEED = 0.06;
const TANK_MOVE_SPEED = 3.5;
const TANK_BACK_SPEED = 1.8;
const TANK_FRICTION = 0.85;
const TANK_GRAVITY = 0.3;

const SPACE_THRUST = 0.5;
const SPACE_MAX_SPEED = 8;
const SPACE_DRAG = 0.99;

const FLIGHT_SPEED = 4;
const FLIGHT_BOOST_SPEED = 8;
const FLIGHT_TURN_RATE = 0.06;
const FLIGHT_DRAG = 0.995;

const GRAPPLE_PULL = 0.8;
const GRAPPLE_MAX_SPEED = 12;
const GRAPPLE_DRAG = 0.99;
const GRAPPLE_GRAVITY = 0.25;
const GRAPPLE_RANGE = 500;
const GRAPPLE_RETRACT_SPEED = 20;

const BOUNCE_DASH_SPEED = 8;
const BOUNCE_GRAVITY = 0.35;
const BOUNCE_DRAG = 0.985;
const BOUNCE_FACTOR = 0.6;
const BOUNCE_AIR_CONTROL = 0.3;
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

function updateTankPhysics(player, platforms, input, worldWidth, worldHeight) {
  // Rotation: A/D or Left/Right
  if (input.left) player.angle -= TANK_ROT_SPEED;
  if (input.right) player.angle += TANK_ROT_SPEED;

  // Movement in facing direction
  if (input.up) {
    player.vx = Math.cos(player.angle) * TANK_MOVE_SPEED;
    player.vy = Math.sin(player.angle) * TANK_MOVE_SPEED;
  } else if (input.down) {
    player.vx = -Math.cos(player.angle) * TANK_BACK_SPEED;
    player.vy = -Math.sin(player.angle) * TANK_BACK_SPEED;
  } else {
    player.vx *= TANK_FRICTION;
    player.vy *= TANK_FRICTION;
  }

  player.prevY = player.y;
  player.x += player.vx;
  player.y += player.vy;

  // Drives freely, but stays inside the world bounds
  player.onGround = false;
  clampToWorld(player, worldWidth, worldHeight);
}

function updateSpaceshipPhysics(player, platforms, input, worldWidth, worldHeight) {
  // Thrust from WASD — applies force in the direction pressed
  if (input.thrustUp) player.vy += SPACE_THRUST;
  if (input.thrustDown) player.vy -= SPACE_THRUST;
  if (input.thrustLeft) player.vx -= SPACE_THRUST;
  if (input.thrustRight) player.vx += SPACE_THRUST;

  // No gravity — pure zero-g

  // Drag — very slight to prevent infinite acceleration
  player.vx *= SPACE_DRAG;
  player.vy *= SPACE_DRAG;

  // Speed cap
  const speed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
  if (speed > SPACE_MAX_SPEED) {
    const scale = SPACE_MAX_SPEED / speed;
    player.vx *= scale;
    player.vy *= scale;
  }

  // Angle faces velocity direction for visual rotation
  if (Math.abs(player.vx) > 0.5 || Math.abs(player.vy) > 0.5) {
    player.angle = Math.atan2(player.vy, player.vx);
  }

  player.prevY = player.y;
  player.x += player.vx;
  player.y += player.vy;

  // No platform collision in zero-g, but stay inside the world bounds
  player.onGround = false;
  clampToWorld(player, worldWidth, worldHeight);
}

function updateFlightPhysics(player, platforms, input, worldWidth, worldHeight) {
  // Turn: A/D or Left/Right rotates the facing angle
  if (input.left) player.angle -= FLIGHT_TURN_RATE;
  if (input.right) player.angle += FLIGHT_TURN_RATE;

  // Forward: W/Up applies thrust in facing direction
  const thrusting = input.up || input.thrustUp;
  const speed = input.boost ? FLIGHT_BOOST_SPEED : FLIGHT_SPEED;

  if (thrusting) {
    player.vx += Math.cos(player.angle) * speed * 0.08;
    player.vy += Math.sin(player.angle) * speed * 0.08;
  }

  // Drag
  player.vx *= FLIGHT_DRAG;
  player.vy *= FLIGHT_DRAG;

  // Clamp speed
  const maxSpd = input.boost ? FLIGHT_BOOST_SPEED : FLIGHT_SPEED;
  const spd = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
  if (spd > maxSpd) {
    const s = maxSpd / spd;
    player.vx *= s;
    player.vy *= s;
  }

  // No gravity

  player.prevY = player.y;
  player.x += player.vx;
  player.y += player.vy;
  player.onGround = false;

  applyPlatformCollisions(player, platforms, worldWidth, worldHeight);
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
  // Gravity
  player.vy -= GRAPPLE_GRAVITY;

  // Grapple: shoot ray toward target on click, attach to platform
  if (input.grappleFirePressed) {
    const hit = grappleRaycast(player, platforms, input.grappleTargetX, input.grappleTargetY, GRAPPLE_RANGE);
    if (hit) {
      input.grappleActive = true;
      input.grappleAttachX = hit.x;
      input.grappleAttachY = hit.y;
      // Allow the pull to carry us off the platform we fired from.
      input.grappleIgnorePlatform = player.onGround
        ? platforms.find((p) =>
            Math.abs((p.y + p.height) - player.y) < 1 &&
            player.x + player.width > p.x &&
            player.x < p.x + p.width
          ) || null
        : null;
    }
    input.grappleFirePressed = false;
  }

  // Release grapple on second click
  if (input.grappleReleasePressed) {
    input.grappleActive = false;
    input.grappleIgnorePlatform = null;
    input.grappleReleasePressed = false;
  }

  // Pull toward attachment point
  if (input.grappleActive && input.grappleAttachX !== undefined) {
    const dx = input.grappleAttachX - (player.x + player.width / 2);
    const dy = input.grappleAttachY - (player.y + player.height / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 8) {
      player.vx += (dx / dist) * GRAPPLE_PULL;
      player.vy += (dy / dist) * GRAPPLE_PULL;
    } else {
      // Reached attachment point, release
      input.grappleActive = false;
    }
  }

  // Drag
  player.vx *= GRAPPLE_DRAG;
  player.vy *= GRAPPLE_DRAG;

  // Speed cap
  const speed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
  if (speed > GRAPPLE_MAX_SPEED) {
    const scale = GRAPPLE_MAX_SPEED / speed;
    player.vx *= scale;
    player.vy *= scale;
  }

  player.prevY = player.y;
  player.x += player.vx;
  player.y += player.vy;
  player.onGround = false;

  applyPlatformCollisions(
    player,
    platforms,
    worldWidth,
    worldHeight,
    input.grappleActive ? input.grappleIgnorePlatform : null
  );

  // Landing ends the pull so the player doesn't stay tethered to the platform
  if (player.onGround && input.grappleActive) {
    input.grappleActive = false;
    input.grappleIgnorePlatform = null;
    player.vx = 0;
    player.vy = 0;
  }
}

function updateBouncePhysics(player, platforms, input, worldWidth, worldHeight, portals) {
  // Gravity
  player.vy -= BOUNCE_GRAVITY;

  // Dash on click
  if (input.dashPressed && input.dashTargetX !== undefined) {
    const dx = input.dashTargetX - (player.x + player.width / 2);
    const dy = input.dashTargetY - (player.y + player.height / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 5) {
      player.vx = (dx / dist) * BOUNCE_DASH_SPEED;
      player.vy = (dy / dist) * BOUNCE_DASH_SPEED;
    }
    input.dashPressed = false;
  }

  // Air control — gentle steering with arrow keys
  if (input.left) player.vx -= BOUNCE_AIR_CONTROL;
  if (input.right) player.vx += BOUNCE_AIR_CONTROL;
  if (input.up) player.vy += BOUNCE_AIR_CONTROL;
  if (input.down) player.vy -= BOUNCE_AIR_CONTROL;

  // Drag
  player.vx *= BOUNCE_DRAG;
  player.vy *= BOUNCE_DRAG;

  // Angle follows velocity
  if (Math.abs(player.vx) > 0.5 || Math.abs(player.vy) > 0.5) {
    player.angle = Math.atan2(player.vy, player.vx);
  }

  player.prevY = player.y;
  player.x += player.vx;
  player.y += player.vy;
  player.onGround = false;

  applyPlatformCollisions(player, platforms, worldWidth, worldHeight);

  // Bouncy platforms — gentle bounce after collision resolves, but let the
  // player settle inside a portal so it can be held.
  if (player.onGround && !overlapsAnyPortal(player, portals)) {
    const fallDist = Math.abs(player.prevY - player.y);
    if (fallDist > 10) {
      player.vy = fallDist * BOUNCE_FACTOR;
      player.onGround = false;
    }
  }
}

// === Physics dispatcher ===
function updatePhysics(player, platforms, input, worldWidth, worldHeight, movementType, portals) {
  switch (movementType) {
    case 'tank': return updateTankPhysics(player, platforms, input, worldWidth, worldHeight);
    case 'spaceship': return updateSpaceshipPhysics(player, platforms, input, worldWidth, worldHeight);
    case 'flight': return updateFlightPhysics(player, platforms, input, worldWidth, worldHeight);
    case 'grapple': return updateGrapplePhysics(player, platforms, input, worldWidth, worldHeight);
    case 'bounce': return updateBouncePhysics(player, platforms, input, worldWidth, worldHeight, portals);
    default: return updatePlatformerPhysics(player, platforms, input, worldWidth, worldHeight);
  }
}

// === Nav hints ===
const NAV_HINTS = {
  platformer: 'WASD to move · Hold in portals to navigate',
  tank: '← → to rotate · ↑ ↓ to move · Hold in portals to navigate',
  spaceship: 'WASD to thrust · Hold in portals to navigate',
  flight: 'W to thrust · A/D to turn · Shift to boost · Hold in portals to navigate',
  grapple: 'Click to grapple · Momentum carries · Hold in portals to navigate',
  bounce: 'Click to dash · Bounce on platforms · Hold in portals to navigate',
};

const TOUCH_HINTS = {
  platformer: 'D-pad to move · JUMP to jump · Hold in portals',
  tank: 'D-pad to rotate & drive · Hold in portals',
  spaceship: 'D-pad to thrust · Hold in portals',
  flight: 'D-pad to turn & thrust · BOOST to speed up · Hold in portals',
  grapple: 'Tap to grapple · Tap again to release · Hold in portals',
  bounce: 'Tap to dash · Bounce on platforms · Hold in portals',
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
  transitioning,
}) {
  const worldRef = useRef(null);
  const playerRef = useRef(null);
  const portalRingsRef = useRef([]);
  const containerRef = useRef(null);
  const trailRef = useRef([]);
  const grappleLineRef = useRef(null);
  const grappleHookRef = useRef(null);
  const grappleDotRef = useRef(null);
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
    grappleActive: false, grappleTargetX: 0, grappleTargetY: 0,
    grappleFirePressed: false, grappleReleasePressed: false,
    grappleAttachX: 0, grappleAttachY: 0, grappleIgnorePlatform: null,
    dashPressed: false, dashTargetX: 0, dashTargetY: 0,
    mouseWorldX: 0, mouseWorldY: 0,
  });

  const cameraY = useRef(0);
  const portalHolds = useRef(new Map());
  const prevPageIdRef = useRef(null);
  const prevWorldWidthRef = useRef(worldWidth);

  // Resolved platforms/portals — memoized so references are stable
  const resolvedPlatforms = useMemo(
    () => resolvePlatforms(pageData.platforms, worldWidth),
    [pageData.platforms, worldWidth]
  );
  const resolvedPortals = useMemo(
    () => resolvePortals(pageData.portals, worldWidth),
    [pageData.portals, worldWidth]
  );

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
  const pageDataRef = useRef(pageData);
  pageDataRef.current = pageData;
  const movementTypeRef = useRef(movementType);
  movementTypeRef.current = movementType;

  // Touch controls — mirror keyboard input flags
  const pressDirection = (dir) => {
    const inp = input.current;
    if (dir === 'left') { inp.left = true; inp.thrustLeft = true; }
    if (dir === 'right') { inp.right = true; inp.thrustRight = true; }
    if (dir === 'up') {
      inp.up = true; inp.thrustUp = true;
      if (movementTypeRef.current === 'platformer') inp.jumpPressed = true;
    }
    if (dir === 'down') { inp.down = true; inp.thrustDown = true; }
  };
  const releaseDirection = (dir) => {
    const inp = input.current;
    if (dir === 'left') { inp.left = false; inp.thrustLeft = false; }
    if (dir === 'right') { inp.right = false; inp.thrustRight = false; }
    if (dir === 'up') { inp.up = false; inp.thrustUp = false; }
    if (dir === 'down') { inp.down = false; inp.thrustDown = false; }
  };
  const pressAction = () => {
    const inp = input.current;
    if (movementTypeRef.current === 'platformer') inp.jumpPressed = true;
    else if (movementTypeRef.current === 'flight') inp.boost = true;
  };
  const releaseAction = () => {
    if (movementTypeRef.current === 'flight') input.current.boost = false;
  };

  // Reset player on page change; preserve the player's position on resize
  useLayoutEffect(() => {
    const pageChanged = prevPageIdRef.current !== pageData.id;
    const prevWidth = prevWorldWidthRef.current;
    const widthChanged = prevWidth !== worldWidth;

    if (pageChanged) {
      const spawn = pageData.spawn;
      const spawnBox = layoutBox(worldWidth);
      player.current.x = spawnBox.left + (spawn.xPct / 100) * spawnBox.width - player.current.width / 2;
      player.current.y = spawn.y;
      player.current.vx = 0;
      player.current.vy = 0;
      player.current.onGround = false;
      player.current.jumpsLeft = MAX_JUMPS;
      player.current.angle = Math.PI / 2;
      player.current.prevY = spawn.y;
      cameraY.current = 0;
      portalHolds.current.clear();
      trailRef.current = [];
      trailDotsRef.current = [];
      resetInputState(input.current);
      input.current.grappleIgnorePlatform = null;
      setPageIndicator(pageData.label);
      setNavHint((isTouch ? TOUCH_HINTS : NAV_HINTS)[pageData.movementType] || NAV_HINTS.platformer);
    } else if (widthChanged) {
      const scale = worldWidth / Math.max(1, prevWidth);
      const p = player.current;

      // Platform widths are partly fixed-pixel, so scaling x alone can slide a
      // standing player off their platform. Keep the same offset from the
      // platform's left edge instead.
      let newX = p.x * scale;
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

      p.x = Math.max(0, Math.min(newX, worldWidth - p.width));
      p.prevY = p.y;

      const inp = input.current;
      inp.grappleAttachX *= scale;
      inp.grappleTargetX *= scale;
      inp.dashTargetX *= scale;
      trailRef.current = trailRef.current.map((dot) => ({ ...dot, x: dot.x * scale }));
    }

    prevPageIdRef.current = pageData.id;
    prevWorldWidthRef.current = worldWidth;
  }, [pageData, worldWidth, isTouch]);

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
          inp.left = true; inp.thrustLeft = true;
          if (shouldPreventDefault) e.preventDefault();
          break;
        case 'd': case 'ArrowRight':
          inp.right = true; inp.thrustRight = true;
          if (shouldPreventDefault) e.preventDefault();
          break;
        case 'w': case 'ArrowUp':
          inp.up = true; inp.thrustUp = true;
          if (!e.repeat) inp.jumpPressed = true;
          if (shouldPreventDefault) e.preventDefault();
          break;
        case 's': case 'ArrowDown':
          inp.down = true; inp.thrustDown = true;
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

  // Mouse tracking — convert screen coords to world coords
  const updateMouseWorld = useCallback((clientX, clientY) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    input.current.mouseWorldX = clientX - rect.left;
    input.current.mouseWorldY = pageDataRef.current.height - (clientY - rect.top) - container.scrollTop;
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => updateMouseWorld(e.clientX, e.clientY);
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [updateMouseWorld]);

  // Click handling for grapple and bounce
  useEffect(() => {
    const handleClick = (e) => {
      if (transitioningRef.current) return;
      const mt = movementTypeRef.current;
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const worldX = e.clientX - rect.left;
      const worldY = pageDataRef.current.height - (e.clientY - rect.top) - container.scrollTop;

      if (mt === 'grapple') {
        if (input.current.grappleActive) {
          // Second click releases grapple
          input.current.grappleReleasePressed = true;
        } else {
          // First click fires grapple toward click point
          input.current.grappleFirePressed = true;
          input.current.grappleTargetX = worldX;
          input.current.grappleTargetY = worldY;
        }
      } else if (mt === 'bounce') {
        input.current.dashPressed = true;
        input.current.dashTargetX = worldX;
        input.current.dashTargetY = worldY;
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

      // Update trail for spaceship, flight, bounce
      if (mt === 'spaceship' || mt === 'flight' || mt === 'bounce') {
        const t = trailRef.current;
        t.push({ x: player.current.x + player.current.width / 2, y: player.current.y + player.current.height / 2 });
        if (t.length > 20) t.shift();
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
        el.style.transform = `rotate(${player.current.angle - Math.PI / 2}rad)`;
      }

      // Update trail DOM using cached refs
      const trail = trailRef.current;
      const dots = trailDotsRef.current;
      for (let i = 0; i < trail.length; i++) {
        const dot = dots[i];
        if (dot) {
          dot.style.left = trail[i].x + 'px';
          dot.style.bottom = trail[i].y + 'px';
          dot.style.opacity = String((i / trail.length) * 0.4);
        }
      }

      // Update grapple line DOM
      const gl = grappleLineRef.current;
      const hook = grappleHookRef.current;
      const dot = grappleDotRef.current;
      if (gl) {
        const showLine = input.current.grappleActive || (input.current.grappleFirePressed && input.current.grappleTargetX);
        const targetX = input.current.grappleActive ? input.current.grappleAttachX : input.current.grappleTargetX;
        const targetY = input.current.grappleActive ? input.current.grappleAttachY : input.current.grappleTargetY;
        if (showLine && targetX !== undefined) {
          const worldHeight = pageDataRef.current.height;
          const px = player.current.x + player.current.width / 2;
          const py = player.current.y + player.current.height / 2;
          const svgTargetY = worldHeight - targetY;
          gl.setAttribute('x1', px);
          gl.setAttribute('y1', worldHeight - py);
          gl.setAttribute('x2', targetX);
          gl.setAttribute('y2', svgTargetY);
          gl.style.opacity = input.current.grappleActive ? '1' : '0.3';
          gl.style.display = '';
          // Position hook at target
          if (hook) { hook.setAttribute('cx', targetX); hook.setAttribute('cy', svgTargetY); hook.style.display = ''; }
          if (dot) { dot.setAttribute('cx', targetX); dot.setAttribute('cy', svgTargetY); dot.style.display = ''; }
        } else {
          gl.style.display = 'none';
          if (hook) hook.style.display = 'none';
          if (dot) dot.style.display = 'none';
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
      const targetScroll = charTop - viewportHeight / 2;
      const clamped = Math.max(0, Math.min(targetScroll, pd.height - viewportHeight));

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
  const showTrail = movementType === 'spaceship' || movementType === 'flight' || movementType === 'bounce';
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
      {isTouch && (
        <>
          <div className="touch-dpad">
            <TouchButton label="Move up" className="touch-up" onPress={() => pressDirection('up')} onRelease={() => releaseDirection('up')}>▲</TouchButton>
            <TouchButton label="Move left" className="touch-left" onPress={() => pressDirection('left')} onRelease={() => releaseDirection('left')}>◀</TouchButton>
            <TouchButton label="Move down" className="touch-down" onPress={() => pressDirection('down')} onRelease={() => releaseDirection('down')}>▼</TouchButton>
            <TouchButton label="Move right" className="touch-right" onPress={() => pressDirection('right')} onRelease={() => releaseDirection('right')}>▶</TouchButton>
          </div>
          {(movementType === 'platformer' || movementType === 'flight') && (
            <TouchButton
              label={movementType === 'platformer' ? 'Jump' : 'Boost'}
              className="touch-action"
              onPress={pressAction}
              onRelease={releaseAction}
            >
              {movementType === 'platformer' ? 'JUMP' : 'BOOST'}
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
        <div className="page-content">{children}</div>

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
            className="absolute w-2 h-2 rounded-full bg-white pointer-events-none -translate-x-1/2 translate-y-1/2"
            style={{ left: 0, bottom: 0, opacity: 0 }}
          />
        ))}

        {/* Grapple line */}
        <svg
          ref={grappleLineRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ display: 'none' }}
        >
          <line
            x1="0" y1="0" x2="0" y2="0"
            stroke="rgba(180,120,255,0.9)"
            strokeWidth="4"
            strokeDasharray="8 4"
            strokeLinecap="round"
          />
          {/* Hook endpoint */}
          <circle
            ref={grappleHookRef}
            cx="0" cy="0" r="6"
            fill="none"
            stroke="rgba(180,120,255,0.9)"
            strokeWidth="2.5"
          />
          <circle
            ref={grappleDotRef}
            cx="0" cy="0" r="2"
            fill="rgba(180,120,255,0.6)"
          />
        </svg>

        {/* Player */}
        <div
          ref={playerRef}
          id="character"
          className="absolute w-6 h-6 bg-white rounded-full"
          data-movement={movementType}
          style={{ left: 0, bottom: 0 }}
        />
      </div>
    </div>
  );
}
