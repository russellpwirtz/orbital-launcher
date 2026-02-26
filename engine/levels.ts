// engine/levels.ts — Real exoplanet system data for guided mode
// Planet data from NASA Exoplanet Archive / pipeline configs
// Simulation units: GM=1, distances scaled so innermost planet SMA ~ 1

import type { Level, LevelPlanet, LevelResonance } from "./types";

interface RawPlanet {
  name: string;
  smaAU: number;
  radiusFactor?: number;
  massRatio?: number;
}

interface RawLevel {
  name: string;
  starTeff: number;
  starType: string;
  starRadius?: number;
  scaleFactor: number;
  planets: RawPlanet[];
  resonances?: LevelResonance[];
  funFact: string;
}

function buildLevel(raw: RawLevel): Level {
  const planets: LevelPlanet[] = raw.planets.map((p) => {
    const sma = p.smaAU / raw.scaleFactor;
    return {
      name: p.name,
      sma,
      period: 2 * Math.PI * Math.pow(sma, 1.5),
      radiusFactor: p.radiusFactor ?? 1,
      massRatio: p.massRatio ?? 1e-5,
    };
  });

  const maxSMA = Math.max(...planets.map((p) => p.sma));

  return {
    name: raw.name,
    starTeff: raw.starTeff,
    starType: raw.starType,
    starRadius: raw.starRadius ?? 0.04,
    escapeRadius: maxSMA * 3,
    planets,
    resonances: raw.resonances ?? [],
    funFact: raw.funFact,
  };
}

export const LEVELS: Level[] = [
  buildLevel({
    name: "Tutorial: Earth & Sun",
    starTeff: 5778,
    starType: "G2V (like our Sun)",
    starRadius: 0.05,
    scaleFactor: 1.0,
    planets: [{ name: "Earth", smaAU: 1.0, radiusFactor: 1 }],
    funFact:
      "Earth orbits the Sun once every 365.25 days at a distance of 150 million km. This distance is called 1 Astronomical Unit (AU).",
  }),

  buildLevel({
    name: "K2-24",
    starTeff: 5625,
    starType: "G9V dwarf",
    starRadius: 0.04,
    scaleFactor: 0.154,
    planets: [
      { name: "b", smaAU: 0.154, radiusFactor: 1.2 },
      { name: "c", smaAU: 0.247, radiusFactor: 1.3 },
    ],
    resonances: [{ pair: "b:c", ratio: "2:1" }],
    funFact:
      'K2-24 has two "sub-Saturn" planets in a perfect 2:1 resonance. When the inner planet completes 2 orbits, the outer one completes exactly 1. They give each other a gravitational "high five" at the same spot every cycle!',
  }),

  buildLevel({
    name: "HD 110067",
    starTeff: 5200,
    starType: "K0V dwarf",
    starRadius: 0.035,
    scaleFactor: 0.0709,
    planets: [
      { name: "b", smaAU: 0.0709, radiusFactor: 1.0 },
      { name: "c", smaAU: 0.0912, radiusFactor: 1.0 },
      { name: "d", smaAU: 0.1166, radiusFactor: 1.1 },
      { name: "e", smaAU: 0.1453, radiusFactor: 1.1 },
      { name: "f", smaAU: 0.1791, radiusFactor: 1.2 },
      { name: "g", smaAU: 0.2109, radiusFactor: 1.2 },
    ],
    resonances: [
      { pair: "b:c", ratio: "3:2" },
      { pair: "c:d", ratio: "3:2" },
      { pair: "d:e", ratio: "3:2" },
      { pair: "e:f", ratio: "4:3" },
      { pair: "f:g", ratio: "4:3" },
    ],
    funFact:
      "HD 110067 has the longest unbroken resonance chain ever found! All 6 planets are linked like gears. This means the system has been undisturbed since it formed billions of years ago.",
  }),

  buildLevel({
    name: "Kepler-80",
    starTeff: 4540,
    starType: "K5V dwarf",
    starRadius: 0.03,
    scaleFactor: 0.0372,
    planets: [
      { name: "f", smaAU: 0.0372, radiusFactor: 0.7 },
      { name: "d", smaAU: 0.0648, radiusFactor: 0.8 },
      { name: "e", smaAU: 0.0791, radiusFactor: 0.8 },
      { name: "b", smaAU: 0.0929, radiusFactor: 1.0 },
      { name: "c", smaAU: 0.1131, radiusFactor: 1.0 },
      { name: "g", smaAU: 0.1365, radiusFactor: 0.6 },
    ],
    resonances: [
      { pair: "d:e", ratio: "4:3" },
      { pair: "e:b", ratio: "4:3" },
      { pair: "b:c", ratio: "4:3" },
    ],
    funFact:
      'Kepler-80 has a chain of three 4:3 resonances — the planets orbit in near-perfect musical "fourths." This system helped astronomers understand how planets migrate inward during formation.',
  }),

  buildLevel({
    name: "TRAPPIST-1",
    starTeff: 2566,
    starType: "M8V ultra-cool dwarf",
    starRadius: 0.025,
    scaleFactor: 0.01154,
    planets: [
      { name: "b", smaAU: 0.01154, radiusFactor: 0.9 },
      { name: "c", smaAU: 0.0158, radiusFactor: 0.9 },
      { name: "d", smaAU: 0.02227, radiusFactor: 0.7 },
      { name: "e", smaAU: 0.02925, radiusFactor: 0.8 },
      { name: "f", smaAU: 0.03849, radiusFactor: 0.9 },
      { name: "g", smaAU: 0.04683, radiusFactor: 0.9 },
      { name: "h", smaAU: 0.06189, radiusFactor: 0.7 },
    ],
    resonances: [
      { pair: "b:c", ratio: "8:5" },
      { pair: "c:d", ratio: "5:3" },
      { pair: "d:e", ratio: "3:2" },
      { pair: "e:f", ratio: "3:2" },
      { pair: "f:g", ratio: "4:3" },
      { pair: "g:h", ratio: "3:2" },
    ],
    funFact:
      "TRAPPIST-1 is the most famous exoplanet system! Its tiny red star is barely bigger than Jupiter. Three of its seven planets are in the habitable zone — the region where liquid water could exist.",
  }),

  buildLevel({
    name: "Kepler-90",
    starTeff: 5930,
    starType: "G0V (Sun-like)",
    starRadius: 0.045,
    scaleFactor: 0.074,
    planets: [
      { name: "b", smaAU: 0.074, radiusFactor: 0.7 },
      { name: "c", smaAU: 0.089, radiusFactor: 0.7 },
      { name: "i", smaAU: 0.1234, radiusFactor: 0.7 },
      { name: "d", smaAU: 0.32, radiusFactor: 1.0 },
      { name: "e", smaAU: 0.42, radiusFactor: 1.0 },
      { name: "f", smaAU: 0.48, radiusFactor: 1.0 },
      { name: "g", smaAU: 0.71, radiusFactor: 1.5 },
      { name: "h", smaAU: 1.01, radiusFactor: 1.8 },
    ],
    resonances: [],
    funFact:
      'Kepler-90 was the first system found with 8 planets, just like our Solar System! Planet "i" was discovered by a machine learning algorithm — artificial intelligence hunting for alien worlds.',
  }),
];
