// engine/physics.ts — Velocity Verlet integrator, orbital mechanics

import type { Vec2, Planet, Simulation, OrbitalElements } from "./types";
import { TRAIL_LENGTH } from "./config";

// --- Vector operations (inline for performance in hot loop) ---

function vadd(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

function vsub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

function vscale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

function vlen(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

function vdot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

function vcross(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x;
}

// --- Kepler's laws ---

export function periodFromSMA(a: number): number {
  return 2 * Math.PI * Math.pow(a, 1.5);
}

export function circularVelocity(r: number): number {
  return Math.sqrt(1 / r);
}

// --- Orbital elements ---

export function orbitalElements(pos: Vec2, vel: Vec2): OrbitalElements {
  const r = vlen(pos);
  const v = vlen(vel);
  const v2 = v * v;
  const energy = v2 / 2 - 1 / r;

  if (energy >= 0) {
    return {
      a: Infinity,
      e: 1,
      period: Infinity,
      omega: 0,
      periapsis: r,
      apoapsis: Infinity,
      energy,
      bound: false,
    };
  }

  const a = -1 / (2 * energy);
  const L = vcross(pos, vel);
  const eSq = 1 - (L * L) / a;
  const e = Math.sqrt(Math.max(0, eSq));

  const rdotv = vdot(pos, vel);
  const eVec = {
    x: (v2 - 1 / r) * pos.x - rdotv * vel.x,
    y: (v2 - 1 / r) * pos.y - rdotv * vel.y,
  };
  const omega = Math.atan2(eVec.y, eVec.x);
  const period = 2 * Math.PI * Math.pow(a, 1.5);
  const periapsis = a * (1 - e);
  const apoapsis = a * (1 + e);

  return { a, e, period, omega, periapsis, apoapsis, energy, bound: true };
}

/**
 * Compute points along an elliptical orbit for preview.
 * Returns null for unbound orbits.
 */
export function computeOrbitPath(
  pos: Vec2,
  vel: Vec2,
  numPoints = 120
): Vec2[] | null {
  const elems = orbitalElements(pos, vel);
  if (!elems.bound || elems.a <= 0) return null;

  const { a, e, omega } = elems;
  const points: Vec2[] = [];
  for (let i = 0; i <= numPoints; i++) {
    const theta = (i / numPoints) * 2 * Math.PI;
    const denom = 1 + e * Math.cos(theta);
    if (Math.abs(denom) < 1e-6) continue;
    const r = (a * (1 - e * e)) / denom;
    if (r <= 0 || !isFinite(r)) continue;
    const angle = theta + omega;
    points.push({
      x: r * Math.cos(angle),
      y: r * Math.sin(angle),
    });
  }
  return points;
}

// --- Planet factory ---

export function createPlanet(
  x: number,
  y: number,
  vx: number,
  vy: number,
  opts: { mass?: number; radius?: number; color?: string; name?: string; locked?: boolean } = {}
): Planet {
  return {
    pos: { x, y },
    vel: { x: vx, y: vy },
    mass: opts.mass ?? 1e-5,
    radius: opts.radius ?? 0.02,
    color: opts.color ?? "#4A90D9",
    name: opts.name ?? "",
    locked: opts.locked ?? false,
    alive: true,
    trail: [],
    trailIdx: 0,
    periapsisPassages: [],
    prevR: null,
    prevPrevR: null,
  };
}

// --- Simulation factory ---

export function createSimulation(opts: {
  starRadius?: number;
  escapeRadius?: number;
} = {}): Simulation {
  return {
    GM: 1,
    starRadius: opts.starRadius ?? 0.05,
    escapeRadius: opts.escapeRadius ?? 15,
    planets: [],
    time: 0,
    dt: 0.002,
    substeps: 20,
    paused: false,
    speed: 1,
  };
}

// --- Gravitational acceleration ---

function acceleration(planet: Planet, sim: Simulation): Vec2 {
  const r = vlen(planet.pos);
  if (r < 1e-10) return { x: 0, y: 0 };

  const starAcc = vscale(planet.pos, -sim.GM / (r * r * r));

  let perturbation: Vec2 = { x: 0, y: 0 };
  for (const other of sim.planets) {
    if (other === planet || !other.alive || !other.locked) continue;
    const delta = vsub(other.pos, planet.pos);
    const d = vlen(delta);
    if (d < 1e-10) continue;
    const acc = vscale(delta, (sim.GM * other.mass) / (d * d * d));
    perturbation = vadd(perturbation, acc);
  }

  return vadd(starAcc, perturbation);
}

// --- Step simulation one visual frame ---

export function stepSimulation(sim: Simulation): void {
  if (sim.paused) return;

  const effectiveDt = sim.dt * sim.speed;
  const substeps = sim.substeps;
  const h = effectiveDt / substeps;

  for (const planet of sim.planets) {
    if (!planet.alive) continue;

    for (let s = 0; s < substeps; s++) {
      const a1 = acceleration(planet, sim);
      planet.vel = vadd(planet.vel, vscale(a1, h / 2));
      planet.pos = vadd(planet.pos, vscale(planet.vel, h));
      const a2 = acceleration(planet, sim);
      planet.vel = vadd(planet.vel, vscale(a2, h / 2));

      const r = vlen(planet.pos);
      if (r < sim.starRadius) {
        planet.alive = false;
        planet.deathCause = "crash";
        break;
      }
      if (r > sim.escapeRadius) {
        planet.alive = false;
        planet.deathCause = "escape";
        break;
      }

      if (planet.prevPrevR !== null && planet.prevR !== null) {
        if (planet.prevR < planet.prevPrevR && planet.prevR < r) {
          planet.periapsisPassages.push(sim.time + s * h);
        }
      }
      planet.prevPrevR = planet.prevR;
      planet.prevR = r;
    }

    if (planet.alive) {
      if (planet.trail.length < TRAIL_LENGTH) {
        planet.trail.push({ x: planet.pos.x, y: planet.pos.y });
      } else {
        planet.trail[planet.trailIdx] = { x: planet.pos.x, y: planet.pos.y };
      }
      planet.trailIdx = (planet.trailIdx + 1) % TRAIL_LENGTH;
    }
  }

  sim.time += effectiveDt;
}

// --- Period measurement ---

export function measurePeriod(planet: Planet): number | null {
  const passages = planet.periapsisPassages;
  if (passages.length < 3) return null;

  let totalInterval = 0;
  const n = passages.length - 1;
  for (let i = 0; i < n; i++) {
    totalInterval += passages[i + 1] - passages[i];
  }
  return totalInterval / n;
}

export function getPlanetOrbitalElements(planet: Planet): OrbitalElements {
  return orbitalElements(planet.pos, planet.vel);
}

export function resetSimulation(sim: Simulation): void {
  sim.planets = [];
  sim.time = 0;
  sim.paused = false;
  sim.speed = 1;
}
