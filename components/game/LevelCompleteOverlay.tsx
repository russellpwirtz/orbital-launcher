// components/game/LevelCompleteOverlay.tsx — Celebration overlay for guided-mode level completion

import type { GameUIState } from "@/engine/types";

interface Props {
  uiState: GameUIState;
  onNext: () => void;
  onDismiss: () => void;
}

const CONFETTI_COLORS = [
  "#5B9BD5", "#6BC5E8", "#45B7A0", "#7ED87E", "#F5C242",
  "#E8A838", "#D4735E", "#C75B9B", "#9B6BC5", "#6bcb77",
];

function ConfettiParticles() {
  // Generate 60 particles with staggered positions and timings
  const particles = Array.from({ length: 60 }, (_, i) => {
    const left = Math.random() * 100;
    const delay = Math.random() * 2;
    const duration = 2.5 + Math.random() * 2;
    const size = 4 + Math.random() * 6;
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    return (
      <div
        key={i}
        className="absolute animate-confetti-fall"
        style={{
          left: `${left}%`,
          top: 0,
          width: size,
          height: size,
          backgroundColor: color,
          borderRadius: Math.random() > 0.5 ? "50%" : "1px",
          "--delay": `${delay}s`,
          "--duration": `${duration}s`,
        } as React.CSSProperties}
      />
    );
  });
  return <>{particles}</>;
}

function Checkmark() {
  return (
    <div className="animate-bounce-once mx-auto w-16 h-16 rounded-full bg-success/20 border-2 border-success flex items-center justify-center">
      <svg
        className="w-8 h-8 text-success"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );
}

export function LevelCompleteOverlay({ uiState, onNext, onDismiss }: Props) {
  const planetsPlaced = uiState.levelPlanets.length;
  const resonancesFound = uiState.detectedResonances.length;

  return (
    <div className="absolute inset-0 z-30 animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-space-bg/80 backdrop-blur-sm" />

      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <ConfettiParticles />
      </div>

      {/* Card */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="animate-scale-up bg-panel-bg border border-success/30 rounded-2xl px-10 py-8 max-w-md w-[90%] text-center shadow-[0_0_60px_rgba(107,203,119,0.1)] relative">
          {/* Close button */}
          <button
            onClick={onDismiss}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full text-text-dim hover:text-text-bright hover:bg-white/10 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <Checkmark />

          <h2 className="text-4xl font-bold text-text-bright mt-4 tracking-tight">
            System Complete!
          </h2>
          <p className="text-xl text-text-muted mt-1 font-mono">
            {uiState.levelName}
          </p>

          {/* Stats row */}
          <div className="flex justify-center gap-10 mt-6">
            <div>
              <div className="text-3xl font-bold text-text-bright font-mono">{planetsPlaced}</div>
              <div className="text-xs text-text-dim uppercase tracking-wider mt-1">
                {planetsPlaced === 1 ? "Planet" : "Planets"}
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-text-bright font-mono">{resonancesFound}</div>
              <div className="text-xs text-text-dim uppercase tracking-wider mt-1">
                {resonancesFound === 1 ? "Resonance" : "Resonances"}
              </div>
            </div>
          </div>

          {/* Resonance badges */}
          {resonancesFound > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {uiState.detectedResonances.map((r) => (
                <span
                  key={r.pair}
                  className="px-3 py-1 rounded-full text-sm font-mono text-text-bright border"
                  style={{
                    backgroundColor: `${r.color || "#ffd93d"}20`,
                    borderColor: `${r.color || "#ffd93d"}50`,
                  }}
                >
                  {r.pair.replace(":", "/")} {r.ratio}{r.musical ? ` ${r.musical}` : ""}
                </span>
              ))}
            </div>
          )}

          {/* Fun fact */}
          {uiState.levelFunFact && (
            <p className="text-sm text-text-muted italic mt-5 leading-relaxed">
              {uiState.levelFunFact}
            </p>
          )}

          {/* CTA button */}
          <button
            onClick={onNext}
            className="mt-6 px-10 py-4 text-xl font-semibold rounded-xl text-white cursor-pointer transition-transform duration-150 hover:scale-105 active:scale-95 bg-gradient-to-r from-emerald-600 to-blue-600 shadow-lg shadow-emerald-900/30"
          >
            {uiState.hasNextLevel ? "Next System \u2192" : "Back to Menu"}
          </button>
          <button
            onClick={onDismiss}
            className="mt-3 text-sm text-text-dim hover:text-text-muted transition-colors cursor-pointer"
          >
            Keep exploring this system
          </button>
        </div>
      </div>
    </div>
  );
}
