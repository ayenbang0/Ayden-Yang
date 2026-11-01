// Platform and portal data for all pages
// Positions use percentage-based x (responsive) and absolute y (from bottom)

export const PAGE_DATA = {
  home: {
    id: 'home',
    label: 'HOME',
    movementType: 'platformer',
    height: 3800,
    spawn: { xPct: 50, y: 3602 },
    platforms: [
      { xPct: 0, y: 0, widthPct: 100, height: 2 },
      { xPct: 50, y: 3600, widthPx: 200, height: 2, centered: true },
      { xPct: 78, y: 3300, widthPx: 80, height: 2 },
      { xPct: 10, y: 3000, widthPx: 100, height: 2 },
      { xPct: 10, y: 3130, widthPx: 150, height: 2 },
      { xPct: 22, y: 2800, widthPx: 90, height: 2 },
      { xPct: 58, y: 2600, widthPx: 90, height: 2 },
      { xPct: 32, y: 2400, widthPx: 90, height: 2 },
      { xPct: 64, y: 2380, widthPx: 150, height: 2 },
      { xPct: 48, y: 1950, widthPx: 90, height: 2 },
      { xPct: 10, y: 1780, widthPx: 150, height: 2 },
      { xPct: 68, y: 1750, widthPx: 90, height: 2 },
      { xPct: 64, y: 1530, widthPx: 170, height: 2 },
      { xPct: 12, y: 1350, widthPx: 90, height: 2 },
      { xPct: 38, y: 1150, widthPx: 110, height: 2 },
      { xPct: 64, y: 1180, widthPx: 150, height: 2 },
      { xPct: 50, y: 880, widthPx: 170, height: 2, centered: true },
      { xPct: 72, y: 950, widthPx: 90, height: 2 },
      { xPct: 18, y: 750, widthPx: 90, height: 2 },
      { xPct: 50, y: 580, widthPx: 150, height: 2, centered: true },
      { xPct: 58, y: 550, widthPx: 90, height: 2 },
      { xPct: 28, y: 350, widthPx: 90, height: 2 },
    ],
    portals: [
      { xPct: 10, y: 3150, widthPx: 150, target: 'about', label: 'ABOUT', icon: 'user' },
      { xPct: 64, y: 2400, widthPx: 150, target: 'music', label: 'MUSIC', icon: 'music' },
      { xPct: 10, y: 1800, widthPx: 150, target: 'projects', label: 'PROJECTS', icon: 'code' },
      { xPct: 64, y: 1200, widthPx: 150, target: 'gallery', label: 'GALLERY', icon: 'image' },
      { xPct: 50, y: 600, widthPx: 150, target: 'contact', label: 'CONTACT', icon: 'mail', centered: true },
    ],
  },
  about: {
    id: 'about',
    label: 'ABOUT',
    movementType: 'spaceship',
    height: 3500,
    spawn: { xPct: 50, y: 3202 },
    platforms: [
      { xPct: 0, y: 0, widthPct: 100, height: 2 },
      { xPct: 50, y: 3200, widthPx: 200, height: 2, centered: true },
      { xPct: 25, y: 300, widthPx: 80, height: 2 },
      { xPct: 60, y: 500, widthPx: 80, height: 2 },
      { xPct: 15, y: 700, widthPx: 80, height: 2 },
      { xPct: 45, y: 1000, widthPx: 100, height: 2 },
      { xPct: 75, y: 1200, widthPx: 80, height: 2 },
      { xPct: 30, y: 1500, widthPx: 100, height: 2 },
      { xPct: 55, y: 1700, widthPx: 80, height: 2 },
      { xPct: 20, y: 2000, widthPx: 80, height: 2 },
      { xPct: 65, y: 2200, widthPx: 80, height: 2 },
      { xPct: 40, y: 2400, widthPx: 80, height: 2 },
      { xPct: 70, y: 2600, widthPx: 80, height: 2 },
      { xPct: 50, y: 2780, widthPx: 170, height: 2, centered: true },
    ],
    portals: [
      { xPct: 50, y: 2800, widthPx: 150, target: 'home', label: 'HOME', icon: 'home', centered: true },
    ],
  },
  music: {
    id: 'music',
    label: 'MUSIC',
    movementType: 'asteroids',
    height: 4200,
    spawn: { xPct: 50, y: 3902 },
    platforms: [
      { xPct: 0, y: 0, widthPct: 100, height: 2 },
      { xPct: 50, y: 3900, widthPx: 200, height: 2, centered: true },
      { xPct: 20, y: 250, widthPx: 80, height: 2 },
      { xPct: 65, y: 450, widthPx: 80, height: 2 },
      { xPct: 35, y: 650, widthPx: 80, height: 2 },
      { xPct: 50, y: 850, widthPx: 100, height: 2 },
      { xPct: 15, y: 1050, widthPx: 80, height: 2 },
      { xPct: 75, y: 1250, widthPx: 80, height: 2 },
      { xPct: 40, y: 1450, widthPx: 100, height: 2 },
      { xPct: 60, y: 1650, widthPx: 80, height: 2 },
      { xPct: 25, y: 1850, widthPx: 80, height: 2 },
      { xPct: 70, y: 2050, widthPx: 80, height: 2 },
      { xPct: 45, y: 2250, widthPx: 80, height: 2 },
      { xPct: 15, y: 2450, widthPx: 80, height: 2 },
      { xPct: 65, y: 2650, widthPx: 80, height: 2 },
      { xPct: 35, y: 2850, widthPx: 80, height: 2 },
      { xPct: 55, y: 3050, widthPx: 80, height: 2 },
      { xPct: 50, y: 3180, widthPx: 170, height: 2, centered: true },
    ],

    portals: [
      { xPct: 50, y: 3200, widthPx: 150, target: 'home', label: 'HOME', icon: 'home', centered: true },
    ],
  },
  projects: {
    id: 'projects',
    label: 'PROJECTS',
    movementType: 'rpg',
    height: 3600,
    spawn: { xPct: 50, y: 3302 },
    platforms: [
      { xPct: 0, y: 0, widthPct: 100, height: 2 },
      { xPct: 50, y: 3300, widthPx: 200, height: 2, centered: true },
      { xPct: 25, y: 250, widthPx: 80, height: 2 },
      { xPct: 60, y: 450, widthPx: 80, height: 2 },
      { xPct: 15, y: 650, widthPx: 80, height: 2 },
      { xPct: 50, y: 850, widthPx: 100, height: 2 },
      { xPct: 75, y: 1050, widthPx: 80, height: 2 },
      { xPct: 30, y: 1250, widthPx: 80, height: 2 },
      { xPct: 45, y: 1450, widthPx: 100, height: 2 },
      { xPct: 65, y: 1650, widthPx: 80, height: 2 },
      { xPct: 20, y: 1850, widthPx: 80, height: 2 },
      { xPct: 55, y: 2050, widthPx: 80, height: 2 },
      { xPct: 40, y: 2250, widthPx: 80, height: 2 },
      { xPct: 70, y: 2450, widthPx: 80, height: 2 },
      { xPct: 15, y: 2650, widthPx: 80, height: 2 },
      { xPct: 60, y: 2850, widthPx: 80, height: 2 },
      { xPct: 50, y: 2980, widthPx: 170, height: 2, centered: true },
    ],
    portals: [
      { xPct: 50, y: 3000, widthPx: 150, target: 'home', label: 'HOME', icon: 'home', centered: true },
    ],
  },
  gallery: {
    id: 'gallery',
    label: 'GALLERY',
    movementType: 'grapple',
    height: 4400,
    spawn: { xPct: 50, y: 4110 },
    platforms: [
      { xPct: 0, y: 0, widthPct: 100, height: 2 },
      { xPct: 50, y: 4100, widthPx: 200, height: 10, centered: true },
      { xPct: 50, y: 3900, widthPx: 100, height: 10, centered: true },
      { xPct: 50, y: 3820, widthPx: 80, height: 10, centered: true },
      { xPct: 50, y: 3620, widthPx: 100, height: 10, centered: true },
      { xPct: 25, y: 3480, widthPx: 80, height: 10 },
      { xPct: 60, y: 3070, widthPx: 80, height: 10 },
      { xPct: 40, y: 2720, widthPx: 80, height: 10 },
      { xPct: 15, y: 2350, widthPx: 90, height: 10 },
      { xPct: 60, y: 2100, widthPx: 80, height: 10 },
      { xPct: 30, y: 1850, widthPx: 100, height: 10 },
      { xPct: 70, y: 1600, widthPx: 80, height: 10 },
      { xPct: 20, y: 1350, widthPx: 90, height: 10 },
      { xPct: 55, y: 1100, widthPx: 100, height: 10 },
      { xPct: 35, y: 850, widthPx: 80, height: 10 },
      { xPct: 65, y: 600, widthPx: 80, height: 10 },
      { xPct: 25, y: 350, widthPx: 80, height: 10 },
    ],

    portals: [
      { xPct: 50, y: 3648, widthPx: 150, target: 'home', label: 'HOME', icon: 'home', centered: true },
    ],
  },
  contact: {
    id: 'contact',
    label: 'CONTACT',
    movementType: 'snake',
    height: 3200,
    spawn: { xPct: 50, y: 2902 },
    platforms: [
      { xPct: 0, y: 0, widthPct: 100, height: 2 },
      { xPct: 50, y: 2900, widthPx: 200, height: 2, centered: true },
      { xPct: 25, y: 250, widthPx: 80, height: 2 },
      { xPct: 60, y: 500, widthPx: 80, height: 2 },
      { xPct: 35, y: 750, widthPx: 80, height: 2 },
      { xPct: 50, y: 1000, widthPx: 100, height: 2 },
      { xPct: 15, y: 1250, widthPx: 80, height: 2 },
      { xPct: 70, y: 1500, widthPx: 80, height: 2 },
      { xPct: 40, y: 1750, widthPx: 80, height: 2 },
      { xPct: 65, y: 2000, widthPx: 80, height: 2 },
      { xPct: 50, y: 2280, widthPx: 170, height: 2, centered: true },
    ],
    portals: [
      { xPct: 50, y: 2300, widthPx: 150, target: 'home', label: 'HOME', icon: 'home', centered: true },
    ],
  },
};

/**
 * Portal icon SVGs keyed by identifier used in PAGE_DATA portals.
 */
export const PORTAL_ICONS = {
  user: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-1">
      <circle cx="12" cy="7" r="4"/><path d="M5.5 21c0-4.5 3-7 6.5-7s6.5 2.5 6.5 7"/>
    </svg>
  ),
  music: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-1">
      <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
    </svg>
  ),
  code: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-1">
      <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
    </svg>
  ),
  image: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-1">
      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
    </svg>
  ),
  mail: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-1">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
  home: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-1">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
};
