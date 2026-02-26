import type { GameUIState } from "@/engine/types";
import { sigFigs } from "@/lib/colors";

interface Props {
  uiState: GameUIState;
}

export function FreePlayPanel({ uiState }: Props) {
  return (
    <>
      <div>
        <h2 className="text-2xl font-semibold text-text-bright">Free Play</h2>
        <p className="text-base text-text-muted mt-1">Launch planets freely!</p>
      </div>

      {uiState.freePlayPlanets.length > 0 && (
        <div>
          <h3 className="font-mono text-sm tracking-widest text-text-dim uppercase mb-3">
            Planets
          </h3>
          <ul className="flex flex-col gap-2.5">
            {uiState.freePlayPlanets.map((p, i) => (
              <li
                key={i}
                className="flex items-center gap-3 text-lg px-3 py-2.5 rounded-lg bg-white/[0.03]"
              >
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0"
                  style={{ background: p.color }}
                />
                <span className="text-text-primary font-medium text-lg">{p.name}</span>
                <span className="ml-auto font-mono text-sm text-text-muted">
                  {p.period !== null ? `T=${sigFigs(p.period)}` : "..."}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {uiState.freePlayResonances.length > 0 && (
        <div>
          <h3 className="font-mono text-sm tracking-widest text-text-dim uppercase mb-3">
            Resonances
          </h3>
          <ul className="flex flex-col gap-2.5">
            {uiState.freePlayResonances.map((r, i) => (
              <li
                key={i}
                className="text-base px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]"
              >
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-auto">
        <p className="text-base text-text-muted leading-relaxed italic whitespace-pre-line">
          {uiState.freePlayMatchText}
        </p>
      </div>
    </>
  );
}
