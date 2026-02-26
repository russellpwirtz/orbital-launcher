// engine/catalog.ts — Real system fingerprints for "Real Systems Like Yours" matching

import type { CatalogSystem, CatalogMatch } from "./types";

export const SYSTEMS_CATALOG: CatalogSystem[] = [
  { name: "Jupiter's Galilean Moons", nPlanets: 3, ratios: [2.0, 2.0], funFact: "Io, Europa, and Ganymede in a 1:2:4 Laplace resonance — the most famous orbital resonance in our solar system.", source: "Galileo (1610)" },
  { name: "K2-24", nPlanets: 2, ratios: [2.0], funFact: "Two puffy sub-Saturns in a clean 2:1 lock.", source: "K2" },
  { name: "TOI-216", nPlanets: 2, ratios: [2.0], funFact: "A warm Jupiter and a companion in 2:1 resonance.", source: "TESS" },
  { name: "HD 73526", nPlanets: 2, ratios: [2.0], funFact: "Two giant planets in 2:1 resonance around a Sun-like star.", source: "RV" },
  { name: "GJ 876", nPlanets: 4, ratios: [2.0, 2.0, 4.0], funFact: "The first resonant chain discovered! Inner three planets in a Laplace 4:2:1 resonance, like Jupiter's moons.", source: "RV" },
  { name: "Kepler-51", nPlanets: 3, ratios: [2.0, 1.5], funFact: 'Three "super-puffs" — planets with the density of cotton candy! In a 1:2:3 resonance.', source: "Kepler" },
  { name: "HD 110067", nPlanets: 6, ratios: [1.286, 1.278, 1.246, 1.233, 1.178], funFact: "Pristine 6-planet resonance chain — the longest ever found.", source: "TESS/CHEOPS" },
  { name: "TOI-178", nPlanets: 6, ratios: [1.5, 2.0, 1.5, 1.33, 1.5], funFact: "5 outer planets in a resonance chain, but densities don't follow the expected pattern!", source: "TESS/CHEOPS" },
  { name: "Kepler-80", nPlanets: 6, ratios: [1.74, 1.22, 1.33, 1.33, 1.33], funFact: "Triple 4:3 resonance chain — the planets orbit like interlocking gears.", source: "Kepler" },
  { name: "Kepler-223", nPlanets: 4, ratios: [1.33, 1.25, 1.33], funFact: "Four planets in an 8:6:4:3 resonance chain — a Laplace resonance on steroids!", source: "Kepler" },
  { name: "TRAPPIST-1", nPlanets: 7, ratios: [1.60, 1.51, 1.34, 1.31, 1.21, 1.33], funFact: "7 Earth-sized planets around a tiny red star. 3 could have liquid water!", source: "Ground/Spitzer" },
  { name: "Kepler-90", nPlanets: 8, ratios: [1.20, 1.39, 2.59, 1.31, 1.14, 1.48, 1.42], funFact: "First 8-planet system found! Planet \"i\" was discovered by Google AI.", source: "Kepler" },
  { name: "Kepler-11", nPlanets: 6, ratios: [1.26, 1.32, 1.41, 1.21, 1.76], funFact: "A compact system of 6 low-density planets, all orbiting closer than Venus.", source: "Kepler" },
  { name: "Kepler-79", nPlanets: 4, ratios: [1.65, 1.52, 1.69], funFact: 'Contains one of the least-dense planets known — a "super-puff" with the density of styrofoam.', source: "Kepler" },
  { name: "Solar System (inner)", nPlanets: 4, ratios: [1.87, 1.63, 1.88], funFact: "Mercury, Venus, Earth, Mars — our home system! No strong resonances among inner planets.", source: "Home" },
  { name: "Solar System (outer)", nPlanets: 4, ratios: [1.83, 2.02, 1.96], funFact: "Jupiter, Saturn, Uranus, Neptune. Jupiter and Saturn are near a 5:2 resonance.", source: "Home" },
  { name: "WASP-47", nPlanets: 4, ratios: [8.8, 2.2, 7.6], funFact: "A hot Jupiter with nearby companions — extremely rare! Most hot Jupiters are alone.", source: "WASP/K2" },
  { name: "Kepler-730", nPlanets: 2, ratios: [1.50], funFact: "Two planets in a 3:2 resonance — one of the simplest resonant pairs.", source: "Kepler" },
  { name: "Kepler-36", nPlanets: 2, ratios: [1.17], funFact: "The two closest planets ever found! A rocky world and a puffy mini-Neptune, orbit only 0.013 AU apart.", source: "Kepler" },
  { name: "TOI-700", nPlanets: 4, ratios: [2.19, 1.62, 1.89], funFact: "TOI-700 d was the first Earth-sized planet found in the habitable zone by TESS!", source: "TESS" },
  { name: "LHS 1140", nPlanets: 2, ratios: [3.0], funFact: 'LHS 1140 b is a "super-Earth" in the habitable zone of a nearby red dwarf. JWST is studying its atmosphere!', source: "Ground" },
  { name: "K2-138", nPlanets: 6, ratios: [1.513, 1.518, 1.528, 1.544, 2.0], funFact: "Discovered by citizen scientists! Five planets in a near-3:2 chain.", source: "K2" },
  { name: "Kepler-60", nPlanets: 3, ratios: [1.32, 1.33], funFact: "Three planets in a 5:4:3 resonance chain.", source: "Kepler" },
  { name: "Kepler-29", nPlanets: 2, ratios: [1.17], funFact: "Two planets very close to a 9:7 resonance.", source: "Kepler" },
  { name: "HR 8799", nPlanets: 4, ratios: [2.0, 2.0, 2.0], funFact: "Four giant planets directly photographed! All in a 1:2:4:8 Laplace resonance chain.", source: "Direct imaging" },
  { name: "HIP 41378", nPlanets: 5, ratios: [2.80, 1.02, 4.55, 1.22], funFact: 'Contains a "super-puff" planet with an extremely long 542-day orbit — unusual for a transiting planet.', source: "K2" },
  { name: "Proxima Centauri", nPlanets: 2, ratios: [4.5], funFact: "The nearest star system to Earth, just 4.2 light years away. Proxima b might be habitable!", source: "RV" },
  { name: "55 Cancri", nPlanets: 5, ratios: [3.08, 5.72, 1.53, 12.2], funFact: 'One of the first multi-planet systems discovered. 55 Cancri e is a "diamond planet" — so hot its surface may be molten.', source: "RV" },
  { name: "HD 40307", nPlanets: 6, ratios: [1.42, 1.49, 1.38, 2.94, 1.66], funFact: "Six super-Earths! Planet g orbits in the habitable zone.", source: "RV" },
  { name: "Kepler-444", nPlanets: 5, ratios: [1.26, 1.17, 1.15, 1.17], funFact: "At 11.2 billion years old, these are among the most ancient planets known — formed when the universe was young!", source: "Kepler" },
  { name: "Kepler-20", nPlanets: 6, ratios: [1.60, 1.40, 1.79, 1.66, 1.89], funFact: "Unusual planet ordering: large and small planets alternate, unlike our Solar System.", source: "Kepler" },
];

/**
 * Match player's period ratios against the catalog.
 * Returns top 3 matches with similarity scores.
 */
export function matchSystemFingerprint(playerRatios: number[]): CatalogMatch[] {
  if (playerRatios.length === 0) return [];

  const scores: CatalogMatch[] = [];

  for (const sys of SYSTEMS_CATALOG) {
    const score = computeMatchScore(playerRatios, sys.ratios);
    scores.push({ ...sys, score });
  }

  scores.sort((a, b) => a.score - b.score);
  return scores.slice(0, 3);
}

/**
 * Compute match score between two ratio sequences.
 * Lower = better match. Uses best sliding window alignment.
 */
function computeMatchScore(playerRatios: number[], sysRatios: number[]): number {
  const pLen = playerRatios.length;
  const sLen = sysRatios.length;

  if (pLen === 0 || sLen === 0) return 100;

  const shorter = pLen <= sLen ? playerRatios : sysRatios;
  const longer = pLen <= sLen ? sysRatios : playerRatios;

  let bestScore = Infinity;

  for (let offset = 0; offset <= longer.length - shorter.length; offset++) {
    let sum = 0;
    for (let i = 0; i < shorter.length; i++) {
      const diff = Math.abs(shorter[i] / longer[offset + i] - 1);
      sum += diff * diff;
    }
    const avgScore = Math.sqrt(sum / shorter.length);
    const lenPenalty = Math.abs(pLen - sLen) * 0.1;
    const total = avgScore + lenPenalty;
    if (total < bestScore) bestScore = total;
  }

  return bestScore;
}
