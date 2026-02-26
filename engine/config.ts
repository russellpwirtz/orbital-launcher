// engine/config.ts — Simulation constants

export const GM = 1;
export const DT = 0.002;
export const SUBSTEPS = 20;
export const TRAIL_LENGTH = 600;

export const SPEEDS = [1, 3, 6, 10, 20, 40, 80, 160] as const;

export const MATCH_TOLERANCE = 0.15; // ±15% period match for guided lock-in
export const MIN_PERIAPSIS_PASSAGES = 3;
export const CLASSIFY_INTERVAL = 500; // ms between resonance classification
export const SYNC_INTERVAL = 200; // ms between React UI snapshots

// Camera / zoom
export const ZOOM_MIN = 20;
export const ZOOM_MAX = 2000;
export const ZOOM_STEP = 1.4;
