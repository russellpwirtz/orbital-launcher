// engine/camera.ts — Smooth zoom/pan camera controller (Google Maps-style)

import type { Vec2 } from "./types";
import { ZOOM_MIN, ZOOM_MAX, ZOOM_STEP } from "./config";

export interface Camera {
  /** Current interpolated scale (pixels per sim unit) */
  scale: number;
  /** Current interpolated center (sim coords) */
  center: Vec2;

  /** Animate toward these targets each frame */
  targetScale: number;
  targetCenter: Vec2;

  /** Exponential smoothing per frame */
  update(): void;

  /** Zoom in by ZOOM_STEP */
  zoomIn(): void;
  /** Zoom out by ZOOM_STEP */
  zoomOut(): void;

  /**
   * Google Maps-style zoom: the sim point under `canvasPoint` stays fixed.
   * `canvasToSim` converts canvas px -> sim coords at current scale/center.
   */
  zoomAtPoint(canvasPoint: Vec2, factor: number, canvasToSim: (px: Vec2) => Vec2): void;

  /** Shift view center by (dx, dy) in canvas pixels */
  panBy(dx: number, dy: number): void;

  /** Fit so `simRadius` fills 42% of the smaller canvas dimension */
  fitToLevel(simRadius: number, canvasW: number, canvasH: number): void;
}

export function createCamera(): Camera {
  const cam: Camera = {
    scale: 100,
    center: { x: 0, y: 0 },
    targetScale: 100,
    targetCenter: { x: 0, y: 0 },

    update() {
      const lerp = 0.15;
      cam.scale += (cam.targetScale - cam.scale) * lerp;
      cam.center.x += (cam.targetCenter.x - cam.center.x) * lerp;
      cam.center.y += (cam.targetCenter.y - cam.center.y) * lerp;
    },

    zoomIn() {
      cam.targetScale = Math.min(ZOOM_MAX, cam.targetScale * ZOOM_STEP);
    },

    zoomOut() {
      cam.targetScale = Math.max(ZOOM_MIN, cam.targetScale / ZOOM_STEP);
    },

    zoomAtPoint(canvasPoint: Vec2, factor: number, canvasToSim: (px: Vec2) => Vec2) {
      const simPoint = canvasToSim(canvasPoint);
      const newScale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, cam.targetScale * factor));
      const ratio = 1 - cam.targetScale / newScale;
      cam.targetCenter = {
        x: cam.targetCenter.x + (simPoint.x - cam.targetCenter.x) * ratio,
        y: cam.targetCenter.y + (simPoint.y - cam.targetCenter.y) * ratio,
      };
      cam.targetScale = newScale;
    },

    panBy(dx: number, dy: number) {
      cam.targetCenter = {
        x: cam.targetCenter.x - dx / cam.scale,
        y: cam.targetCenter.y + dy / cam.scale,
      };
    },

    fitToLevel(simRadius: number, canvasW: number, canvasH: number) {
      const minDim = Math.min(canvasW, canvasH);
      const newScale = (minDim * 0.42) / simRadius;
      cam.targetScale = newScale;
      cam.scale = newScale;
      cam.targetCenter = { x: 0, y: 0 };
      cam.center = { x: 0, y: 0 };
    },
  };

  return cam;
}
