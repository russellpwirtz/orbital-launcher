import type { GameUIState } from "@/engine/types";

interface Props {
  uiState: GameUIState;
}

export function GuidedPanel({ uiState }: Props) {
  return (
    <>
      <div>
        <h2 className="text-2xl font-semibold text-text-bright">
          {uiState.levelName}
        </h2>
        <p className="text-base text-text-muted mt-1">{uiState.levelStarType}</p>
        {uiState.levelFunFact && (
          <p className="text-base text-text-muted leading-relaxed italic mt-3">
            {uiState.levelFunFact}
          </p>
        )}
      </div>

      <div>
        <h3 className="font-mono text-sm tracking-widest text-text-dim uppercase mb-3">
          Planets
        </h3>
        <ul className="flex flex-col gap-2.5">
          {uiState.levelPlanets.map((p, i) => {
            const isCurrent = i === uiState.currentPlanetIdx;
            return (
              <li
                key={i}
                className={`flex items-center gap-3 text-lg px-3 py-2.5 rounded-lg transition-colors ${
                  p.locked
                    ? "bg-success/10"
                    : isCurrent
                    ? "bg-white/[0.06]"
                    : "bg-white/[0.02]"
                }`}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0"
                  style={{
                    background: p.color,
                    opacity: p.locked ? 1 : isCurrent ? 0.8 : 0.3,
                  }}
                />
                <span
                  className={`font-medium text-lg ${
                    p.locked
                      ? "text-text-bright"
                      : isCurrent
                      ? "text-text-primary"
                      : "text-text-dim"
                  }`}
                >
                  {p.name}
                </span>
                <span
                  className={`ml-auto text-base ${
                    p.locked
                      ? "text-success"
                      : isCurrent
                      ? "text-text-muted"
                      : "text-text-dim"
                  }`}
                >
                  {p.locked ? "\u2713" : isCurrent ? "\u2192" : "\u00B7"}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {uiState.expectedResonances.length > 0 && (
        <div>
          <h3 className="font-mono text-sm tracking-widest text-text-dim uppercase mb-3">
            Resonances
          </h3>
          <ul className="flex flex-col gap-2.5">
            {uiState.expectedResonances.map((exp, i) => {
              const detected = uiState.detectedResonances.find(
                (d) => d.ratio === exp.ratio
              );
              return (
                <li
                  key={i}
                  className={`flex items-center gap-3 text-base px-3 py-2.5 rounded-lg bg-white/[0.03] transition-opacity ${
                    detected ? "" : "opacity-30"
                  }`}
                >
                  <span className="text-text-muted">{exp.pair}</span>
                  <span
                    className="font-mono font-bold text-base px-2 py-0.5 rounded"
                    style={{
                      color: detected?.color || "#8a8278",
                      backgroundColor: detected
                        ? `${detected.color}15`
                        : "transparent",
                    }}
                  >
                    {exp.ratio}
                  </span>
                  {detected?.musical && (
                    <span className="text-sm text-text-dim ml-auto">
                      {detected.musical}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

    </>
  );
}
