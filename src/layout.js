/**
 * Content-aware placement for platforms, portals and the spawn point.
 *
 * Platform/portal data is authored at fixed heights, but page content is laid
 * out by the browser and its height changes with the window width. Rather than
 * letting platforms paint over cards, the solver measures the real content
 * boxes and shifts each platform "group" (platform + the portal standing on it,
 * plus head-room for the spawn platform) to the nearest spot that overlaps
 * nothing.
 *
 * Coordinates inside the solver are y-down (top = distance from page top).
 */

const STEP_X = 24;
const STEP_Y = 8;
const MAX_DX = 600;
const MAX_DY = 900;
const SPAWN_HEADROOM = 34;
const EDGE = 6;

// Candidate shifts sorted by distance; generated once.
const CANDIDATES = (() => {
  const list = [];
  for (let dx = -MAX_DX; dx <= MAX_DX; dx += STEP_X) {
    for (let dy = -MAX_DY; dy <= MAX_DY; dy += STEP_Y) {
      list.push({ dx, dy, d: dx * dx * 0.6 + dy * dy });
    }
  }
  list.sort((a, b) => a.d - b.d);
  return list;
})();

function hits(a, b, pad) {
  return (
    a.l < b.r + pad && a.r > b.l - pad &&
    a.t < b.b + pad && a.b > b.t - pad
  );
}

/**
 * Measure the readable content boxes of a rendered page.
 * Returns rects {l, r, t, b} relative to the page-content element.
 * Decorative elements (faint, svg, dividers) are skipped.
 */
export function measureContentBlocks(root) {
  const rootRect = root.getBoundingClientRect();
  const blocks = [];
  const toRect = (r) => ({
    l: r.left - rootRect.left,
    r: r.right - rootRect.left,
    t: r.top - rootRect.top,
    b: r.bottom - rootRect.top,
  });

  for (const el of root.children) {
    if (el.tagName.toLowerCase() === 'svg') continue;
    if (el.classList.contains('divider')) continue;
    const style = getComputedStyle(el);
    if (style.display === 'none' || parseFloat(style.opacity) < 0.3) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;

    if (r.width >= rootRect.width - 2) {
      // Full-width wrapper (e.g. page header): use the boxes of its visible children
      for (const child of el.children) {
        if (child.classList.contains('divider')) continue;
        const cr = child.getBoundingClientRect();
        if (cr.width >= 4 && cr.height >= 1) blocks.push(toRect(cr));
      }
    } else {
      blocks.push(toRect(r));
    }
  }
  return blocks;
}

/**
 * @param platforms  resolved platforms {x, y(from bottom), width, height}
 * @param portals    resolved portals   {x, y(from bottom), width, height, ...}
 * @param spawnY     spawn y from bottom (player stands on the spawn platform)
 * @param blocks     content rects from measureContentBlocks
 * @returns {platforms, portals, spawn: {x, y} | null}
 */
export function solveLayout({ platforms, portals, spawnY, worldWidth, worldHeight, blocks }) {
  const H = worldHeight;
  const toTop = (y, h) => H - y - h;

  const platRects = platforms.map((p) => ({
    l: p.x, r: p.x + p.width, t: toTop(p.y, p.height), b: toTop(p.y, 0),
  }));
  const portalRects = portals.map((p) => ({
    l: p.x, r: p.x + p.width, t: toTop(p.y, p.height), b: toTop(p.y, 0),
  }));

  // Build groups: a platform with the portals standing on it, plus spawn head-room
  const groups = [];
  const portalTaken = new Set();
  platforms.forEach((p, i) => {
    if (p.y <= 0) return; // ground stays put
    const group = { plats: [i], portals: [], spawn: false };
    portals.forEach((q, j) => {
      const gap = q.y - (p.y + p.height);
      if (gap >= -2 && gap <= 20 && q.x < p.x + p.width && q.x + q.width > p.x) {
        group.portals.push(j);
        portalTaken.add(j);
      }
    });
    if (spawnY != null && Math.abs(p.y + p.height - spawnY) <= 3) { group.spawn = true; group.spawnOffset = spawnY - (p.y + p.height); }
    groups.push(group);
  });
  portals.forEach((_, j) => {
    if (!portalTaken.has(j)) groups.push({ plats: [], portals: [j], spawn: false });
  });

  const groupRect = (g) => {
    const rects = [...g.plats.map((i) => platRects[i]), ...g.portals.map((j) => portalRects[j])];
    const r = {
      l: Math.min(...rects.map((x) => x.l)),
      r: Math.max(...rects.map((x) => x.r)),
      t: Math.min(...rects.map((x) => x.t)),
      b: Math.max(...rects.map((x) => x.b)),
    };
    if (g.spawn) r.t = Math.min(r.t, platRects[g.plats[0]].t - SPAWN_HEADROOM);
    return r;
  };

  // Spawn first, then portals, then the rest top to bottom
  const order = groups
    .map((g) => ({ g, rect: groupRect(g) }))
    .sort((a, b) => {
      const pa = a.g.spawn ? 0 : a.g.portals.length ? 1 : 2;
      const pb = b.g.spawn ? 0 : b.g.portals.length ? 1 : 2;
      return pa - pb || a.rect.t - b.rect.t;
    });

  const placed = [];
  const shifts = new Map();

  for (const { g, rect } of order) {
    let found = null;
    for (const pad of [14, 6, 0]) {
      for (let k = 0; k < CANDIDATES.length; k++) {
        const { dx, dy } = CANDIDATES[k];
        const r = { l: rect.l + dx, r: rect.r + dx, t: rect.t + dy, b: rect.b + dy };
        if (r.l < EDGE || r.r > worldWidth - EDGE || r.t < EDGE || r.b > H - EDGE) continue;
        let clash = false;
        for (let i = 0; i < blocks.length && !clash; i++) clash = hits(r, blocks[i], pad);
        for (let i = 0; i < placed.length && !clash; i++) clash = hits(r, placed[i], 10);
        if (!clash) { found = { dx, dy }; break; }
      }
      if (found) break;
    }
    const s = found || { dx: 0, dy: 0 };
    shifts.set(g, s);
    placed.push({ l: rect.l + s.dx, r: rect.r + s.dx, t: rect.t + s.dy, b: rect.b + s.dy });
  }

  const outPlatforms = platforms.map((p) => ({ ...p }));
  const outPortals = portals.map((p) => ({ ...p }));
  let spawn = null;
  for (const [g, { dx, dy }] of shifts) {
    // dy is y-down; world y (from bottom) moves the opposite way
    g.plats.forEach((i) => { outPlatforms[i].x += dx; outPlatforms[i].y -= dy; });
    g.portals.forEach((j) => { outPortals[j].x += dx; outPortals[j].y -= dy; });
    if (g.spawn) {
      const sp = outPlatforms[g.plats[0]];
      spawn = { x: sp.x + sp.width / 2, y: sp.y + sp.height + g.spawnOffset };
    }
  }
  return { platforms: outPlatforms, portals: outPortals, spawn };
}
