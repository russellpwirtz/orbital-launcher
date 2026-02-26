// engine/input.ts — Mouse + touch slingshot gesture, pan, zoom

import type { Vec2 } from "./types";

export interface InputState {
  isDragging: boolean;
  isPanning: boolean;
  dragStart: Vec2 | null;
  dragCurrent: Vec2 | null;
  simStart: Vec2 | null;
  simCurrent: Vec2 | null;
  launchVelocity: Vec2 | null;
  launchPosition: Vec2 | null;
  targetCircularVelocity: number | null;
  enabled: boolean;
  onLaunch: ((pos: Vec2, vel: Vec2) => void) | null;
  onPan: ((dx: number, dy: number) => void) | null;
  onZoom: ((canvasPoint: Vec2, factor: number) => void) | null;
  /** Return true if canvasPoint is near the waiting planet (fling grab zone) */
  hitTestFling: ((canvasPoint: Vec2) => boolean) | null;
  /** In freeplay mode, every drag = fling (no pan via drag) */
  freeplayMode: boolean;
  destroy(): void;
}

export function createInput(
  canvas: HTMLCanvasElement,
  canvasToSim: (px: Vec2) => Vec2,
  viewScaleGetter: () => number
): InputState {
  const state: InputState = {
    isDragging: false,
    isPanning: false,
    dragStart: null,
    dragCurrent: null,
    simStart: null,
    simCurrent: null,
    launchVelocity: null,
    launchPosition: null,
    targetCircularVelocity: null,
    enabled: true,
    onLaunch: null,
    onPan: null,
    onZoom: null,
    hitTestFling: null,
    freeplayMode: false,
    destroy() {
      canvas.removeEventListener("pointerdown", handleStart);
      canvas.removeEventListener("pointermove", handleMove);
      canvas.removeEventListener("pointerup", handleEnd);
      canvas.removeEventListener("pointercancel", handleEnd);
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("contextmenu", preventContext);
    },
  };

  const velocityScale = 0.375;
  let panPrev: Vec2 | null = null;

  function getPointerPos(e: PointerEvent): Vec2 {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function updateLaunchVelocity(): void {
    if (!state.dragStart || !state.dragCurrent) return;

    const dx = state.dragStart.x - state.dragCurrent.x;
    const dy = state.dragStart.y - state.dragCurrent.y;
    const dragPixels = Math.sqrt(dx * dx + dy * dy);

    let scale: number;
    if (state.targetCircularVelocity && dragPixels > 0) {
      const REFERENCE_DRAG = 200;
      scale = state.targetCircularVelocity / REFERENCE_DRAG;
    } else {
      scale = velocityScale / viewScaleGetter();
    }

    state.launchVelocity = {
      x: dx * scale,
      y: -dy * scale,
    };
  }

  function handleStart(e: PointerEvent): void {
    if (!state.enabled) return;
    e.preventDefault();
    const pos = getPointerPos(e);

    // Decide: fling or pan?
    if (state.freeplayMode) {
      // Freeplay: always fling
      startFling(pos);
    } else if (state.hitTestFling && state.hitTestFling(pos)) {
      // Guided mode: near waiting planet = fling
      startFling(pos);
    } else {
      // Guided mode: elsewhere = pan
      state.isPanning = true;
      panPrev = pos;
    }
  }

  function startFling(pos: Vec2): void {
    state.isDragging = true;
    state.isPanning = false;
    state.dragStart = pos;
    state.dragCurrent = pos;
    state.simStart = canvasToSim(pos);
    state.simCurrent = state.simStart;
    state.launchPosition = state.simStart;
    updateLaunchVelocity();
  }

  function handleMove(e: PointerEvent): void {
    if (state.isPanning) {
      e.preventDefault();
      const pos = getPointerPos(e);
      if (panPrev && state.onPan) {
        state.onPan(pos.x - panPrev.x, pos.y - panPrev.y);
      }
      panPrev = pos;
      return;
    }

    if (!state.isDragging) return;
    e.preventDefault();
    const pos = getPointerPos(e);
    state.dragCurrent = pos;
    state.simCurrent = canvasToSim(pos);
    updateLaunchVelocity();
  }

  function handleEnd(e: PointerEvent): void {
    if (state.isPanning) {
      e.preventDefault();
      state.isPanning = false;
      panPrev = null;
      return;
    }

    if (!state.isDragging) return;
    e.preventDefault();
    state.isDragging = false;

    if (state.launchVelocity && state.onLaunch) {
      const speed = Math.sqrt(
        state.launchVelocity.x ** 2 + state.launchVelocity.y ** 2
      );
      if (speed > 0.01) {
        state.onLaunch(state.launchPosition!, state.launchVelocity);
      }
    }

    state.dragStart = null;
    state.dragCurrent = null;
    state.simStart = null;
    state.simCurrent = null;
    state.launchVelocity = null;
    state.launchPosition = null;
  }

  function handleWheel(e: WheelEvent): void {
    e.preventDefault();
    if (!state.onZoom) return;
    const rect = canvas.getBoundingClientRect();
    const canvasPoint: Vec2 = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    state.onZoom(canvasPoint, factor);
  }

  const preventContext = (e: Event) => e.preventDefault();

  canvas.addEventListener("pointerdown", handleStart);
  canvas.addEventListener("pointermove", handleMove);
  canvas.addEventListener("pointerup", handleEnd);
  canvas.addEventListener("pointercancel", handleEnd);
  canvas.addEventListener("wheel", handleWheel, { passive: false });
  canvas.addEventListener("contextmenu", preventContext);

  return state;
}
