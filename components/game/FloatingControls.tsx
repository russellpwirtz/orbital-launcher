// components/game/FloatingControls.tsx — Maps-style floating pill controls

import type { GameUIState } from "@/engine/types";

interface Props {
  uiState: GameUIState;
  actions: {
    goMenu: () => void;
    resetLevel: () => void;
    toggleSpeed: () => void;
    toggleConjunctions: () => void;
    toggleResonanceLabels: () => void;
    zoomIn: () => void;
    zoomOut: () => void;
  };
}

export function FloatingControls({ uiState, actions }: Props) {
  return (
    <>
      {/* Top-left: Logo */}
      <div className="absolute top-4 left-4 z-20 pointer-events-none">
        <h1 className="font-mono text-lg tracking-widest text-text-primary opacity-80">
          ORBITAL LAUNCH
        </h1>
      </div>

      {/* Bottom-left: Speed / Reset / Menu pills */}
      <div className="absolute bottom-16 left-4 z-20 flex gap-2">
        <button
          onClick={actions.goMenu}
          className="bg-[#1a1d24]/80 backdrop-blur-sm border border-white/10 text-text-primary px-3 py-1.5 rounded-full text-[13px] cursor-pointer transition-all hover:bg-[#1a1d24] hover:border-white/20 shadow-lg"
        >
          Menu
        </button>
        <button
          onClick={actions.resetLevel}
          className="bg-[#1a1d24]/80 backdrop-blur-sm border border-white/10 text-text-primary px-3 py-1.5 rounded-full text-[13px] cursor-pointer transition-all hover:bg-[#1a1d24] hover:border-white/20 shadow-lg"
        >
          Reset
        </button>
        <button
          onClick={actions.toggleSpeed}
          className="bg-[#1a1d24]/80 backdrop-blur-sm border border-white/10 text-text-primary px-3 py-1.5 rounded-full text-[13px] cursor-pointer transition-all hover:bg-[#1a1d24] hover:border-white/20 shadow-lg font-mono min-w-[48px]"
        >
          {uiState.simSpeed}x
        </button>
        <button
          onClick={actions.toggleConjunctions}
          className={`bg-[#1a1d24]/80 backdrop-blur-sm border text-text-primary px-3 py-1.5 rounded-full text-[13px] cursor-pointer transition-all hover:bg-[#1a1d24] hover:border-white/20 shadow-lg ${
            uiState.showConjunctions ? "border-yellow-500/40" : "border-white/10 opacity-50"
          }`}
        >
          High Fives
        </button>
        <button
          onClick={actions.toggleResonanceLabels}
          className={`bg-[#1a1d24]/80 backdrop-blur-sm border text-text-primary px-3 py-1.5 rounded-full text-[13px] cursor-pointer transition-all hover:bg-[#1a1d24] hover:border-white/20 shadow-lg ${
            uiState.showResonanceLabels ? "border-yellow-500/40" : "border-white/10 opacity-50"
          }`}
        >
          Ratios
        </button>
      </div>

      {/* Bottom-right: Zoom +/- pill stack */}
      <div className="absolute bottom-16 right-4 z-20 flex flex-col shadow-lg rounded-full overflow-hidden">
        <button
          onClick={actions.zoomIn}
          className="bg-[#1a1d24]/80 backdrop-blur-sm border border-white/10 text-text-primary w-10 h-10 flex items-center justify-center text-lg cursor-pointer transition-all hover:bg-[#1a1d24] hover:border-white/20"
        >
          +
        </button>
        <button
          onClick={actions.zoomOut}
          className="bg-[#1a1d24]/80 backdrop-blur-sm border border-white/10 border-t-0 text-text-primary w-10 h-10 flex items-center justify-center text-lg cursor-pointer transition-all hover:bg-[#1a1d24] hover:border-white/20"
        >
          &minus;
        </button>
      </div>
    </>
  );
}
