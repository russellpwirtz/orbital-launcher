// components/game/MenuPanel.tsx — Level select and free play for sidebar/menu

import { LEVELS } from "@/engine/levels";
import type { GameUIState } from "@/engine/types";

interface Props {
  uiState: GameUIState;
  actions: {
    startLevel: (idx: number) => void;
    startFreePlay: () => void;
  };
}

export function MenuPanel({ uiState, actions }: Props) {
  return (
    <>
      <div>
        <h2 className="font-mono text-xl tracking-widest text-text-bright mb-1">
          ORBITAL LAUNCH
        </h2>
        <p className="text-base text-text-muted">
          Launch planets into orbit around real stars
        </p>
      </div>

      <div>
        <h3 className="font-mono text-sm tracking-widest text-text-dim uppercase mb-3">
          Guided Levels
        </h3>
        <ul className="flex flex-col gap-2.5">
          {LEVELS.map((level, i) => {
            const completed = uiState.completedLevels.includes(i);
            return (
              <li key={i}>
                <button
                  onClick={() => actions.startLevel(i)}
                  className="w-full text-left bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3.5 cursor-pointer transition-all hover:bg-white/[0.06] hover:border-white/[0.12] group"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-text-dim w-5">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-lg text-text-bright font-medium truncate">
                        {level.name}
                      </div>
                      <div className="text-sm text-text-muted mt-0.5">
                        {level.planets.length} planet{level.planets.length > 1 ? "s" : ""}
                        {level.resonances.length > 0 && (
                          <span className="text-text-dim">
                            {" "}&middot; {level.resonances.length} resonance{level.resonances.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    {completed && (
                      <span className="text-success text-lg">&#10003;</span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-2">
        <h3 className="font-mono text-sm tracking-widest text-text-dim uppercase mb-3">
          Sandbox
        </h3>
        <button
          onClick={actions.startFreePlay}
          className="w-full text-left bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3.5 cursor-pointer transition-all hover:bg-white/[0.06] hover:border-white/[0.12]"
        >
          <div className="text-lg text-text-bright font-medium">
            Free Play
          </div>
          <div className="text-sm text-text-muted mt-0.5">
            Discover resonances on your own
          </div>
        </button>
      </div>
    </>
  );
}
