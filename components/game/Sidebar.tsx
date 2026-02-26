import type { GameUIState } from "@/engine/types";
import { MenuPanel } from "./MenuPanel";
import { GuidedPanel } from "./GuidedPanel";
import { FreePlayPanel } from "./FreePlayPanel";

interface Props {
  uiState: GameUIState;
  actions: {
    startLevel: (i: number) => void;
    startFreePlay: () => void;
    goMenu: () => void;
    toggleSpeed: () => void;
    toggleConjunctions: () => void;
    resetLevel: () => void;
    zoomIn: () => void;
    zoomOut: () => void;
  };
}

export function Sidebar({ uiState, actions }: Props) {
  return (
    <aside className="min-w-80 flex-[1_1_34%] max-w-[440px] bg-panel-bg border-l border-panel-border flex flex-col overflow-y-auto py-8 px-7 gap-6 max-md:w-full max-md:min-w-0 max-md:max-h-48 max-md:border-l-0 max-md:border-t max-md:border-panel-border">
      {uiState.mode === "menu" && <MenuPanel uiState={uiState} actions={actions} />}
      {uiState.mode === "guided" && <GuidedPanel uiState={uiState} />}
      {uiState.mode === "freeplay" && <FreePlayPanel uiState={uiState} />}
    </aside>
  );
}
