"use client";

import { useRef, useState, useEffect } from "react";
import { useGameEngine } from "@/hooks/useGameEngine";
import { FloatingControls } from "./FloatingControls";
import { LevelCompleteOverlay } from "./LevelCompleteOverlay";
import { Sidebar } from "./Sidebar";

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { uiState, actions } = useGameEngine(canvasRef);

  const [overlayDismissed, setOverlayDismissed] = useState(false);

  // Reset dismissed state when a new level starts
  useEffect(() => {
    if (!uiState.levelComplete) setOverlayDismissed(false);
  }, [uiState.levelComplete]);

  const showOverlay = uiState.mode === "guided" && uiState.levelComplete && !overlayDismissed;

  const isPlaying = uiState.mode === "guided" || uiState.mode === "freeplay";
  const isMenu = uiState.mode === "menu";

  const pillClass =
    "px-4 py-2 text-sm font-mono bg-[rgba(200,195,185,0.06)] border border-[rgba(200,195,185,0.12)] text-[#a09888] rounded-md cursor-pointer transition-all duration-150 hover:bg-[rgba(200,195,185,0.12)] hover:text-[#d0c8bc]";

  return (
    <div className="flex w-full h-screen bg-space-bg">
      <div className="relative flex-1 min-w-0">
        <canvas
          ref={canvasRef}
          className="block w-full h-full touch-none cursor-crosshair"
        />
        {/* Floating controls: only in guided/freeplay */}
        {isPlaying && (
          <FloatingControls uiState={uiState} actions={actions} />
        )}
        {/* Menu controls: speed + reset (top-right) */}
        {isMenu && (
          <div className="absolute top-4 right-4 flex gap-2 z-20">
            <button
              onClick={actions.toggleMenuSpeed}
              className={`${pillClass} min-w-[52px]`}
            >
              {uiState.menuSpeed}x
            </button>
            {uiState.solarPerturbed && (
              <button
                onClick={actions.resetSolarSystem}
                className={pillClass}
              >
                Reset
              </button>
            )}
          </div>
        )}
        {/* Level complete overlay (guided mode) */}
        {showOverlay && (
          <LevelCompleteOverlay uiState={uiState} onNext={actions.nextLevel} onDismiss={() => setOverlayDismissed(true)} />
        )}
        {/* Message above bottom controls */}
        {uiState.message && !uiState.levelComplete && (
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 text-text-muted text-[15px] text-center pointer-events-none [text-shadow:0_1px_4px_rgba(0,0,0,0.8)] max-w-[80%]">
            {uiState.message}
          </div>
        )}
      </div>
      {/* Sidebar always visible */}
      <Sidebar uiState={uiState} actions={actions} />

      {/* Portrait mode: rotate device prompt */}
      <div className="portrait-overlay">
        <svg className="portrait-overlay-icon" width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="16" y="8" width="32" height="48" rx="4" stroke="#8a8278" strokeWidth="2" fill="none" />
          <circle cx="32" cy="50" r="2" fill="#8a8278" />
          <path d="M52 20 C58 20 58 32 52 32L50 32" stroke="#c8c0b4" strokeWidth="2" strokeLinecap="round" />
          <path d="M50 28 L54 32 L50 36" stroke="#c8c0b4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
        <p className="text-text-bright text-lg font-sans">Rotate your device</p>
        <p className="text-text-muted text-sm font-sans">This game is best in landscape</p>
      </div>
    </div>
  );
}
