// engine/menuSolar.ts — Self-contained N-body solar system for the menu screen

export interface SolarMoon {
  dist: number;
  size: number;
  color: string;
  speed: number;
  phase: number;
}

export interface SolarBody {
  name: string;
  mass: number;
  initOrb: number;
  size: number;
  color: string;
  rings?: boolean;
  moons?: SolarMoon[];
  x: number;
  y: number;
  vx: number;
  vy: number;
  trail: { x: number; y: number }[];
}

export interface MenuDrag {
  body: SolarBody | null; // null = dragging the Sun
  start: { x: number; y: number };
  current: { x: number; y: number };
}

export interface MenuSolarState {
  bodies: SolarBody[];
  maxR: number;
  drag: MenuDrag | null;
  perturbed: boolean;
  moonTime: number;
  speed: number;
  speedIdx: number;
}

const MENU_GM = 4000;
const MENU_DT = 0.0008;
const MENU_SUBSTEPS = 20;
export const MENU_SPEEDS = [1, 2, 4, 8, 16] as const;
export const MENU_TILT = 0.35;

// Real mass ratios relative to the Sun (M_planet / M_sun), NASA fact sheets
const SOLAR_BODIES = [
  { n: "Mercury", mass: 1.659e-7, orb: 0.11, sz: 3.5, c: "#b0a090", ph: 0.7 },
  { n: "Venus",   mass: 2.448e-6, orb: 0.18, sz: 5.5, c: "#e8d5a0", ph: 2.1 },
  { n: "Earth",   mass: 3.003e-6, orb: 0.25, sz: 6,   c: "#4488cc", ph: 0.0,
    moons: [{ d: 18, sz: 2.2, c: "#aaaaaa", spd: 12, ph: 0 }] },
  { n: "Mars",    mass: 3.227e-7, orb: 0.32, sz: 4.5, c: "#cc6644", ph: 4.2 },
  { n: "Jupiter", mass: 9.543e-4, orb: 0.49, sz: 18,  c: "#d4a55a", ph: 1.5,
    moons: [
      { d: 28, sz: 2.5, c: "#ddcc44", spd: 10, ph: 0 },
      { d: 35, sz: 2.2, c: "#ccbbaa", spd: 6, ph: 1.5 },
      { d: 44, sz: 2.8, c: "#aaaaaa", spd: 3.5, ph: 3 },
      { d: 53, sz: 2.5, c: "#888888", spd: 2, ph: 4.5 },
    ] },
  { n: "Saturn",  mass: 2.857e-4, orb: 0.64, sz: 15,  c: "#e8d088", ph: 3.8, rings: true,
    moons: [
      { d: 40, sz: 3, c: "#dd9944", spd: 2.5, ph: 1 },
      { d: 28, sz: 1.6, c: "#ddeeff", spd: 6, ph: 3 },
    ] },
  { n: "Uranus",  mass: 4.366e-5, orb: 0.82, sz: 10,  c: "#88ccdd", ph: 5.5 },
  { n: "Neptune", mass: 5.150e-5, orb: 1.0,  sz: 9,   c: "#4466dd", ph: 1.8,
    moons: [{ d: 26, sz: 2.2, c: "#99aacc", spd: 3, ph: 2 }] },
];

export function initSolarSystem(canvasW: number, canvasH: number): MenuSolarState {
  const maxR = Math.min(canvasW * 0.9, canvasH * 0.78 * 0.96);

  const bodies: SolarBody[] = SOLAR_BODIES.map((b) => {
    const r = b.orb * maxR;
    const v = Math.sqrt(MENU_GM / r);
    const a = b.ph;
    return {
      name: b.n,
      mass: b.mass * MENU_GM,
      initOrb: b.orb,
      size: b.sz,
      color: b.c,
      rings: b.rings,
      moons: b.moons?.map((m) => ({
        dist: m.d, size: m.sz, color: m.c, speed: m.spd, phase: m.ph,
      })),
      x: Math.cos(a) * r,
      y: Math.sin(a) * r,
      vx: -Math.sin(a) * v,
      vy: Math.cos(a) * v,
      trail: [],
    };
  });

  return { bodies, maxR, drag: null, perturbed: false, moonTime: 0, speed: 2, speedIdx: 1 };
}

export function stepSolarSystem(state: MenuSolarState): void {
  const bodies = state.bodies;
  const n = bodies.length;
  const totalSubsteps = MENU_SUBSTEPS * state.speed;
  state.moonTime += MENU_DT * totalSubsteps;

  for (let sub = 0; sub < totalSubsteps; sub++) {
    // Compute accelerations (Sun at origin + planet-planet)
    const ax = new Float64Array(n);
    const ay = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const bi = bodies[i];
      const ri2 = bi.x * bi.x + bi.y * bi.y;
      const ri = Math.sqrt(ri2);
      const ai = -MENU_GM / ri2;
      ax[i] += ai * bi.x / ri;
      ay[i] += ai * bi.y / ri;
      for (let j = i + 1; j < n; j++) {
        const bj = bodies[j];
        const dx = bj.x - bi.x;
        const dy = bj.y - bi.y;
        const d2 = dx * dx + dy * dy + 1; // +1 softening
        const d = Math.sqrt(d2);
        const fj = bj.mass / d2;
        const fi = bi.mass / d2;
        ax[i] += fj * dx / d; ay[i] += fj * dy / d;
        ax[j] -= fi * dx / d; ay[j] -= fi * dy / d;
      }
    }

    // Verlet position update
    for (let i = 0; i < n; i++) {
      const b = bodies[i];
      b.x += b.vx * MENU_DT + 0.5 * ax[i] * MENU_DT * MENU_DT;
      b.y += b.vy * MENU_DT + 0.5 * ay[i] * MENU_DT * MENU_DT;
    }

    // Recompute accelerations at new positions
    const ax2 = new Float64Array(n);
    const ay2 = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const bi = bodies[i];
      const ri2 = bi.x * bi.x + bi.y * bi.y;
      const ri = Math.sqrt(ri2);
      const ai = -MENU_GM / ri2;
      ax2[i] += ai * bi.x / ri;
      ay2[i] += ai * bi.y / ri;
      for (let j = i + 1; j < n; j++) {
        const bj = bodies[j];
        const dx = bj.x - bi.x;
        const dy = bj.y - bi.y;
        const d2 = dx * dx + dy * dy + 1;
        const d = Math.sqrt(d2);
        const fj = bj.mass / d2;
        const fi = bi.mass / d2;
        ax2[i] += fj * dx / d; ay2[i] += fj * dy / d;
        ax2[j] -= fi * dx / d; ay2[j] -= fi * dy / d;
      }
    }

    // Verlet velocity update
    for (let i = 0; i < n; i++) {
      const b = bodies[i];
      b.vx += 0.5 * (ax[i] + ax2[i]) * MENU_DT;
      b.vy += 0.5 * (ay[i] + ay2[i]) * MENU_DT;
    }
  }

  // Trails only after perturbation
  if (state.perturbed) {
    for (const b of bodies) {
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 400) b.trail.shift();
    }
  }
}

/** Hit-test planets in canvas coordinates. Returns body or null. */
export function hitTestPlanet(
  state: MenuSolarState,
  px: number,
  py: number,
  cx: number,
  cy: number,
): SolarBody | null {
  for (const b of state.bodies) {
    const bpx = b.x + cx;
    const bpy = b.y * MENU_TILT + cy;
    const dx = px - bpx;
    const dy = py - bpy;
    if (Math.sqrt(dx * dx + dy * dy) < Math.max(b.size * 2, 20)) {
      return b;
    }
  }
  return null;
}

const SUN_HIT_RADIUS = 30; // px — generous grab zone around the Sun

/** Hit-test the Sun at canvas center. Returns true if near Sun. */
export function hitTestSun(
  px: number,
  py: number,
  cx: number,
  cy: number,
): boolean {
  const dx = px - cx;
  const dy = py - cy;
  return Math.sqrt(dx * dx + dy * dy) < SUN_HIT_RADIUS;
}

/** Apply velocity impulse on drag release (undo tilt on Y component) */
export function applyPerturbation(body: SolarBody, dx: number, dy: number): void {
  const speed = Math.sqrt(dx * dx + dy * dy) * 0.15;
  if (speed > 0.5) {
    const angle = Math.atan2(dy, dx);
    body.vx += Math.cos(angle) * speed;
    body.vy += Math.sin(angle) * speed / MENU_TILT;
  }
}

/**
 * Apply Sun perturbation: opposite impulse to all planets.
 * Physically equivalent to kicking the Sun in the center-of-mass frame.
 */
export function applySunPerturbation(state: MenuSolarState, dx: number, dy: number): void {
  const speed = Math.sqrt(dx * dx + dy * dy) * 0.15;
  if (speed > 0.5) {
    const angle = Math.atan2(dy, dx);
    const dvx = -Math.cos(angle) * speed;
    const dvy = -Math.sin(angle) * speed / MENU_TILT;
    for (const b of state.bodies) {
      b.vx += dvx;
      b.vy += dvy;
    }
  }
}
