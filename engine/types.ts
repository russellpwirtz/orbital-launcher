// engine/types.ts — All game/physics types (leaf-level, imported by everything)

export interface Vec2 {
  x: number;
  y: number;
}

export interface TrailPoint {
  x: number;
  y: number;
}

export interface Planet {
  pos: Vec2;
  vel: Vec2;
  mass: number;
  radius: number;
  color: string;
  name: string;
  locked: boolean;
  alive: boolean;
  deathCause?: "crash" | "escape";
  trail: TrailPoint[];
  trailIdx: number;
  periapsisPassages: number[];
  prevR: number | null;
  prevPrevR: number | null;
}

export interface GhostPlanet {
  name: string;
  sma: number;
  period: number;
  angle: number;
  color: string;
  radius: number;
  state: "ghost" | "active" | "locked";
}

export interface OrbitalElements {
  a: number;
  e: number;
  period: number;
  omega: number;
  periapsis: number;
  apoapsis: number;
  energy: number;
  bound: boolean;
}

export interface Simulation {
  GM: number;
  starRadius: number;
  escapeRadius: number;
  planets: Planet[];
  time: number;
  dt: number;
  substeps: number;
  paused: boolean;
  speed: number;
}

export interface LevelPlanet {
  name: string;
  sma: number;
  period: number;
  radiusFactor: number;
  massRatio: number;
}

export interface LevelResonance {
  pair: string;
  ratio: string;
}

export interface Level {
  name: string;
  starTeff: number;
  starType: string;
  starRadius: number;
  escapeRadius: number;
  planets: LevelPlanet[];
  resonances: LevelResonance[];
  funFact: string;
}

export interface Resonance {
  p: number;
  q: number;
  label: string;
  musical: string;
  deviation: number;
  color?: string;
}

export interface CatalogSystem {
  name: string;
  nPlanets: number;
  ratios: number[];
  funFact: string;
  source: string;
}

export interface CatalogMatch extends CatalogSystem {
  score: number;
}

export interface Conjunction {
  x: number;
  y: number;
  time: number;
}

export interface DetectedResonance {
  pair: string;
  ratio: string;
  musical: string;
  deviation: number;
  color?: string;
}

export interface LockAnimation {
  sma: number;
  color: string;
  startTime: number;
}

export interface WaitingPlanet {
  pos: Vec2;
  sma: number;
  color: string;
  name: string;
}

export interface TargetRing {
  sma: number;
  color: string;
  dashed: boolean;
}

export type GameMode = "menu" | "guided" | "freeplay";

export interface GameUIState {
  mode: GameMode;
  levelIdx: number;
  simSpeed: number;
  currentPlanetIdx: number;
  levelName: string;
  levelStarType: string;
  levelFunFact: string;
  levelDescription: string;
  levelPlanets: { name: string; color: string; locked: boolean }[];
  detectedResonances: DetectedResonance[];
  expectedResonances: LevelResonance[];
  freePlayPlanets: { name: string; color: string; period: number | null }[];
  freePlayResonances: string[];
  freePlayMatchText: string;
  message: string;
  completedLevels: number[];
  showConjunctions: boolean;
  showResonanceLabels: boolean;
  levelComplete: boolean;
  hasNextLevel: boolean;
  solarPerturbed: boolean;
  menuSpeed: number;
}
