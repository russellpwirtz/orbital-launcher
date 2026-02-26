// engine/resonance.ts — Period ratio classification, conjunction tracking

import type {
  Vec2,
  Planet,
  Resonance,
  Conjunction,
  DetectedResonance,
} from "./types";

export const KNOWN_RESONANCES: Omit<Resonance, "deviation">[] = [
  { p: 2, q: 1, label: "2:1", musical: "octave", color: "#ff6b6b" },
  { p: 3, q: 2, label: "3:2", musical: "fifth", color: "#ffd93d" },
  { p: 4, q: 3, label: "4:3", musical: "fourth", color: "#6bcb77" },
  { p: 5, q: 4, label: "5:4", musical: "major third", color: "#4ecdc4" },
  { p: 5, q: 3, label: "5:3", musical: "major sixth", color: "#a78bfa" },
  { p: 3, q: 1, label: "3:1", musical: "octave + fifth", color: "#f97316" },
  { p: 7, q: 5, label: "7:5", musical: "tritone", color: "#ec4899" },
  { p: 8, q: 5, label: "8:5", musical: "minor sixth", color: "#38bdf8" },
  { p: 5, q: 2, label: "5:2", musical: "octave + third", color: "#fb923c" },
  { p: 7, q: 4, label: "7:4", musical: "harmonic 7th", color: "#a3e635" },
  { p: 4, q: 1, label: "4:1", musical: "double octave", color: "#f472b6" },
  { p: 7, q: 3, label: "7:3", musical: "", color: "#94a3b8" },
  { p: 9, q: 5, label: "9:5", musical: "", color: "#94a3b8" },
  { p: 7, q: 2, label: "7:2", musical: "", color: "#94a3b8" },
];

/**
 * Find the nearest resonance for a period ratio.
 * Returns null if none within threshold.
 */
export function findNearestResonance(
  ratio: number,
  threshold = 0.05
): Resonance | null {
  let best: Resonance | null = null;
  let bestDev = Infinity;

  for (const res of KNOWN_RESONANCES) {
    const expected = res.p / res.q;
    const dev = Math.abs(ratio / expected - 1);
    if (dev < bestDev && dev < threshold) {
      bestDev = dev;
      best = { ...res, deviation: dev, color: res.color };
    }
  }
  return best;
}

interface ConjunctionTracker {
  prevSep: number | null;
  prevPrevSep: number | null;
  conjunctions: Conjunction[];
  update(p1: Planet, p2: Planet, time: number): void;
  reset(): void;
}

function createConjunctionTracker(): ConjunctionTracker {
  return {
    prevSep: null,
    prevPrevSep: null,
    conjunctions: [],

    update(p1: Planet, p2: Planet, time: number) {
      const angle1 = Math.atan2(p1.pos.y, p1.pos.x);
      const angle2 = Math.atan2(p2.pos.y, p2.pos.x);
      let sep = Math.abs(angle1 - angle2);
      if (sep > Math.PI) sep = 2 * Math.PI - sep;

      if (this.prevSep !== null && this.prevPrevSep !== null) {
        if (this.prevSep < this.prevPrevSep && this.prevSep < sep && this.prevSep < 0.3) {
          this.conjunctions.push({
            x: (p1.pos.x + p2.pos.x) / 2,
            y: (p1.pos.y + p2.pos.y) / 2,
            time,
          });
          if (this.conjunctions.length > 200) {
            this.conjunctions.shift();
          }
        }
      }

      this.prevPrevSep = this.prevSep;
      this.prevSep = sep;
    },

    reset() {
      this.prevSep = null;
      this.prevPrevSep = null;
      this.conjunctions = [];
    },
  };
}

export interface ResonanceManager {
  detectedResonances: DetectedResonance[];
  update(planets: Planet[], time: number): void;
  classifyResonances(
    planets: Planet[],
    measurePeriodFn: (p: Planet) => number | null
  ): DetectedResonance[];
  getAllConjunctions(): Conjunction[];
  reset(): void;
}

export function createResonanceManager(): ResonanceManager {
  const trackers = new Map<string, ConjunctionTracker>();
  const detectedResonances: DetectedResonance[] = [];

  return {
    detectedResonances,

    update(planets: Planet[], time: number) {
      for (let i = 0; i < planets.length; i++) {
        if (!planets[i].alive) continue;
        for (let j = i + 1; j < planets.length; j++) {
          if (!planets[j].alive) continue;
          const key = `${i}-${j}`;
          if (!trackers.has(key)) {
            trackers.set(key, createConjunctionTracker());
          }
          trackers.get(key)!.update(planets[i], planets[j], time);
        }
      }
    },

    classifyResonances(
      planets: Planet[],
      measurePeriodFn: (p: Planet) => number | null
    ): DetectedResonance[] {
      detectedResonances.length = 0;

      for (let i = 0; i < planets.length; i++) {
        if (!planets[i].alive) continue;
        const Ti = measurePeriodFn(planets[i]);
        if (Ti === null) continue;

        for (let j = i + 1; j < planets.length; j++) {
          if (!planets[j].alive) continue;
          const Tj = measurePeriodFn(planets[j]);
          if (Tj === null) continue;

          const ratio = Ti > Tj ? Ti / Tj : Tj / Ti;
          const res = findNearestResonance(ratio);
          if (res) {
            const innerName = Ti < Tj ? planets[i].name : planets[j].name;
            const outerName = Ti < Tj ? planets[j].name : planets[i].name;
            detectedResonances.push({
              pair: `${innerName}:${outerName}`,
              ratio: res.label,
              musical: res.musical,
              deviation: res.deviation,
              color: res.color,
            });
          }
        }
      }

      return detectedResonances;
    },

    getAllConjunctions(): Conjunction[] {
      const all: Conjunction[] = [];
      for (const tracker of trackers.values()) {
        all.push(...tracker.conjunctions);
      }
      return all;
    },

    reset() {
      trackers.clear();
      detectedResonances.length = 0;
    },
  };
}
