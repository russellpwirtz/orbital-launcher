// hooks/useGameEngine.ts — Bridge between imperative engine and React

import { useRef, useState, useEffect, useCallback } from "react";
import { GameLoop } from "@/engine/gameLoop";
import type { GameUIState } from "@/engine/types";
import { SYNC_INTERVAL } from "@/engine/config";

export function useGameEngine(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const engineRef = useRef<GameLoop | null>(null);
  const [uiState, setUIState] = useState<GameUIState>(GameLoop.initialUIState());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GameLoop(canvas);
    engineRef.current = engine;
    engine.start();

    const interval = setInterval(() => {
      setUIState(engine.snapshot());
    }, SYNC_INTERVAL);

    return () => {
      clearInterval(interval);
      engine.stop();
      engineRef.current = null;
    };
  }, [canvasRef]);

  const startLevel = useCallback((idx: number) => {
    engineRef.current?.startLevel(idx);
    setUIState(engineRef.current?.snapshot() ?? GameLoop.initialUIState());
  }, []);

  const startFreePlay = useCallback(() => {
    engineRef.current?.startFreePlay();
    setUIState(engineRef.current?.snapshot() ?? GameLoop.initialUIState());
  }, []);

  const goMenu = useCallback(() => {
    engineRef.current?.goMenu();
    setUIState(engineRef.current?.snapshot() ?? GameLoop.initialUIState());
  }, []);

  const toggleSpeed = useCallback(() => {
    engineRef.current?.toggleSpeed();
    setUIState(engineRef.current?.snapshot() ?? GameLoop.initialUIState());
  }, []);

  const resetLevel = useCallback(() => {
    engineRef.current?.reset();
    setUIState(engineRef.current?.snapshot() ?? GameLoop.initialUIState());
  }, []);

  const zoomIn = useCallback(() => {
    engineRef.current?.zoomIn();
  }, []);

  const zoomOut = useCallback(() => {
    engineRef.current?.zoomOut();
  }, []);

  const toggleConjunctions = useCallback(() => {
    engineRef.current?.toggleConjunctions();
    setUIState(engineRef.current?.snapshot() ?? GameLoop.initialUIState());
  }, []);

  const toggleResonanceLabels = useCallback(() => {
    engineRef.current?.toggleResonanceLabels();
    setUIState(engineRef.current?.snapshot() ?? GameLoop.initialUIState());
  }, []);

  const resetSolarSystem = useCallback(() => {
    engineRef.current?.resetSolarSystem();
    setUIState(engineRef.current?.snapshot() ?? GameLoop.initialUIState());
  }, []);

  const toggleMenuSpeed = useCallback(() => {
    engineRef.current?.toggleMenuSpeed();
    setUIState(engineRef.current?.snapshot() ?? GameLoop.initialUIState());
  }, []);

  const nextLevel = useCallback(() => {
    engineRef.current?.nextLevel();
    setUIState(engineRef.current?.snapshot() ?? GameLoop.initialUIState());
  }, []);

  return {
    uiState,
    actions: { startLevel, startFreePlay, goMenu, toggleSpeed, resetLevel, zoomIn, zoomOut, toggleConjunctions, toggleResonanceLabels, resetSolarSystem, toggleMenuSpeed, nextLevel },
  };
}
