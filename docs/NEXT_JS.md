# Migrating Orbital Fling to Next.js 15

Guide for turning the single-file `orbital-fling.html` (838 lines) into a typed, multi-page Next.js app deployable on Vercel.

**Stack:** Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 + React 19
**Principle:** React owns the DOM and UI state; Canvas stays imperative for the 60fps physics loop. They meet through a thin bridge of mutable refs and periodic snapshots.

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Module Decomposition](#2-module-decomposition)
3. [Key Types](#3-key-types)
4. [The Bridge Pattern](#4-the-bridge-pattern)
5. [Component Hierarchy](#5-component-hierarchy)
6. [Multi-Page Structure](#6-multi-page-structure)
7. [Migration Phases](#7-migration-phases)
8. [Deployment](#8-deployment)
9. [Risks and Mitigations](#9-risks-and-mitigations)

---

## 1. Project Structure

```
orbital-fling/
├── app/
│   ├── layout.tsx              # Root layout (fonts, metadata, dark background)
│   ├── page.tsx                # Landing page (/)
│   ├── game/
│   │   └── page.tsx            # The game (/game) — client component
│   ├── about/
│   │   └── page.tsx            # About the project (/about)
│   └── learn/
│       └── [topic]/
│           └── page.tsx        # Educational pages (/learn/resonance, etc.)
├── components/
│   ├── game/
│   │   ├── GameCanvas.tsx      # Canvas wrapper + bridge hook
│   │   ├── Sidebar.tsx         # Switches between panel components
│   │   ├── Topbar.tsx          # Logo + speed/reset/menu buttons
│   │   ├── MenuPanel.tsx       # Level select + free-play button
│   │   ├── GuidedPanel.tsx     # Planet checklist, resonances, fun fact
│   │   └── FreePlayPanel.tsx   # Orbit list, period ratios, system matches
│   └── ui/
│       ├── Button.tsx          # Styled button (replaces .btn)
│       └── SectionTitle.tsx    # Uppercase label (replaces .sec-title)
├── engine/
│   ├── types.ts                # All game/physics types
│   ├── config.ts               # Constants (GM, DT, SUBSTEPS, etc.)
│   ├── levels.ts               # LEVELS array
│   ├── catalog.ts              # SYSTEMS_CATALOG + matchSystems()
│   ├── resonance.ts            # RESONANCES + findResonance()
│   ├── physics.ts              # Verlet integrator, orbital mechanics
│   ├── simulation.ts           # Main physics loop (one tick)
│   ├── renderer.ts             # All canvas drawing
│   ├── audio.ts                # Web Audio tone generation
│   ├── input.ts                # Mouse/touch drag handling
│   └── gameLoop.ts             # Game flow (start, reset, menu) + rAF loop
├── hooks/
│   └── useGameEngine.ts        # Mounts engine on canvas ref, returns UI state
├── lib/
│   └── colors.ts               # PLANET_COLORS, starColor()
├── public/
│   └── og-image.png            # Open Graph image for social sharing
├── tailwind.config.ts
├── tsconfig.json
├── next.config.ts
└── package.json
```

### Why this layout

- **`engine/`** is pure TypeScript — no React imports, no DOM globals (except the canvas it receives). This means the physics are testable in isolation and could be reused (e.g., a future WebGL renderer, a node-based simulation).
- **`components/`** is pure React — reads snapshots, dispatches actions. No `requestAnimationFrame`, no mutation.
- **`hooks/useGameEngine.ts`** is the bridge between the two worlds.

---

## 2. Module Decomposition

How the monolith maps to modules:

| HTML Section (lines) | Target Module | What Moves |
|---|---|---|
| CONFIG (94–120) | `engine/config.ts` + `engine/resonance.ts` + `lib/colors.ts` | Constants, `RESONANCES`, `findResonance()`, `PLANET_COLORS`, `starColor()` |
| LEVELS (122–183) | `engine/levels.ts` | `LEVELS` array (typed as `Level[]`) |
| SYSTEMS CATALOG (185–215) | `engine/catalog.ts` | `SYSTEMS_CATALOG`, `matchSystems()` |
| AUDIO (217–244) | `engine/audio.ts` | `AudioManager` class wrapping Web Audio |
| STATE (246–265) | `engine/types.ts` + `engine/gameLoop.ts` | `GameState` type; mutable state lives inside `GameLoop` class |
| PHYSICS (267–292) | `engine/physics.ts` | `accel()`, `stepVerlet()`, `predictOrbit()`, `orbitalEnergy()`, `semiMajorAxis()`, `periodFromA()` |
| CANVAS + RENDERING (294–517) | `engine/renderer.ts` | `Renderer` class that takes a `CanvasRenderingContext2D` |
| SIMULATION (519–656) | `engine/simulation.ts` | `simulate()`, `checkLocks()` — the per-tick logic |
| INPUT (658–690) | `engine/input.ts` | `InputHandler` class binding mouse/touch to a canvas element |
| GAME FLOW (692–707) | `engine/gameLoop.ts` | `startLevel()`, `startFreePlay()`, `goMenu()` |
| DOM UI (709–820) | `components/game/*.tsx` | React components replace innerHTML string building |
| MAIN LOOP (822–834) | `engine/gameLoop.ts` | `requestAnimationFrame` loop, periodic sidebar sync |
| CSS (8–80) | Tailwind classes | All styles become utility classes or `@apply` blocks |

### Module dependency graph

```
config.ts ← resonance.ts ← physics.ts ← simulation.ts ← gameLoop.ts
    ↑            ↑                                           ↑
 colors.ts    levels.ts                                  renderer.ts
              catalog.ts                                  input.ts
                                                          audio.ts
                                                          types.ts (imported by all)
```

No circular dependencies. `types.ts` is leaf-level (imported by everything, imports nothing).

---

## 3. Key Types

```typescript
// engine/types.ts

export interface Planet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  name: string;
  color: string;
  colorIdx: number;
  trail: TrailPoint[];
  alive: boolean;
  locked: boolean;
  lockTime: number;
  periCount: number;
  lastR: number;
  lastLastR: number;
  periTimes: number[];
  measuredPeriod: number | null;
  totalTime: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  onTarget: number; // 0–1
}

export interface LevelPlanetDef {
  name: string;
  radius: number;
  colorIdx: number;
  funFact: string;
}

export interface ResonancePair {
  pair: [number, number];
  ratio: string; // e.g. "3:2"
}

export interface Level {
  id: string;
  name: string;
  subtitle: string;
  starName: string;
  spectralType: string;
  teff: number;
  starRadius: number;
  planets: LevelPlanetDef[];
  resonances: ResonancePair[];
  orbitRadii: number[];
  description: string;
  funFact: string;
}

export interface Resonance {
  p: number;
  q: number;
  name: string;
  color: string;
}

export interface CatalogSystem {
  name: string;
  ratios: number[];
  fact: string;
}

export interface Conjunction {
  x: number;
  y: number;
  age: number;
  color: string;
}

export interface LockAnim {
  x: number;
  y: number;
  t: number;
  color: string;
}

export type GameMode = "menu" | "guided" | "freeplay";

/** Mutable internal state — lives inside the engine, never passed to React directly. */
export interface GameState {
  mode: GameMode;
  levelIdx: number;
  planets: Planet[];
  currentPlanetIdx: number;
  dragging: boolean;
  dragStart: { x: number; y: number } | null;
  dragCurrent: { x: number; y: number } | null;
  spawnPos: { x: number; y: number } | null;
  time: number;
  simSpeed: number;
  lockAnims: LockAnim[];
  conjunctions: Conjunction[];
  message: string | null;
  messageTimer: number;
  completedLevels: Set<number>;
  freePlayCount: number;
  flash: number;
  cx: number;
  cy: number;
}

/** Read-only snapshot React receives every ~200ms. */
export interface GameUIState {
  mode: GameMode;
  levelIdx: number;
  simSpeed: number;
  currentPlanetIdx: number;
  completedLevels: number[];
  lockedPlanets: LockedPlanetInfo[];
  periodRatios: PeriodRatioInfo[];
  systemMatches: SystemMatchInfo[];
  message: string | null;
}

export interface LockedPlanetInfo {
  name: string;
  color: string;
  measuredPeriod: number | null;
}

export interface PeriodRatioInfo {
  a: string;
  b: string;
  ratio: number;
  resonance: Resonance | null;
}

export interface SystemMatchInfo {
  name: string;
  fact: string;
  score: number;
}
```

---

## 4. The Bridge Pattern

This is the architectural crux. The physics engine mutates state at 60fps (and within each frame, `SUBSTEPS * simSpeed` sub-steps). React cannot re-render at that rate, and shouldn't try.

### How it works

```
┌─────────────────────────────────┐    snapshot every    ┌──────────────────────┐
│         Engine (imperative)      │ ───── ~200ms ─────→ │   React (declarative) │
│                                  │                      │                       │
│  GameState (mutable)             │                      │  GameUIState (frozen)  │
│  Canvas rendering (rAF)          │  ← user actions ──  │  Sidebar, Topbar       │
│  Physics simulation              │                      │  Overlays              │
│  Input handling                  │                      │                       │
└─────────────────────────────────┘                      └──────────────────────┘
```

### Implementation: `useGameEngine`

```typescript
// hooks/useGameEngine.ts

import { useRef, useState, useEffect, useCallback } from "react";
import { GameLoop } from "@/engine/gameLoop";
import type { GameUIState } from "@/engine/types";

const SYNC_INTERVAL = 200; // ms — React gets a new snapshot 5x/sec

export function useGameEngine(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const engineRef = useRef<GameLoop | null>(null);
  const [uiState, setUIState] = useState<GameUIState>(GameLoop.initialUIState());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GameLoop(canvas);
    engineRef.current = engine;
    engine.start();

    // Periodic sync: engine → React
    const interval = setInterval(() => {
      setUIState(engine.snapshot());
    }, SYNC_INTERVAL);

    return () => {
      clearInterval(interval);
      engine.stop();
      engineRef.current = null;
    };
  }, [canvasRef]);

  // Actions: React → engine (called immediately, no waiting for next render)
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

  return {
    uiState,
    actions: { startLevel, startFreePlay, goMenu, toggleSpeed, resetLevel },
  };
}
```

### Key rules

1. **Engine never calls `setState`.** It mutates its own `GameState` freely. React only sees frozen snapshots.
2. **React never reads `GameState` directly.** It only reads `GameUIState`, which is a shallow copy made inside `snapshot()`.
3. **Actions flow synchronously.** When a user clicks "Level 2", React calls `engineRef.current.startLevel(1)` immediately — no async, no dispatch queue. Then it pulls a fresh snapshot so the sidebar updates without waiting 200ms.
4. **Canvas is owned by the engine.** React creates the `<canvas>` element and hands it to the engine via ref. After that, React never touches the canvas — no React-managed canvas state, no reconciliation.

### Why 200ms?

The sidebar shows text (planet names, periods, resonance labels). Humans can't read faster than ~5 updates/sec. 200ms keeps React work near zero while feeling responsive. The canvas runs at full 60fps independently.

---

## 5. Component Hierarchy

```
app/game/page.tsx                     ← "use client"
└── GameCanvas                        ← canvas ref + useGameEngine
    ├── <canvas>                      ← engine draws here (imperative)
    ├── Topbar                        ← logo, speed/reset/menu buttons
    └── Sidebar                       ← switches based on uiState.mode
        ├── MenuPanel                 ← level select buttons + free-play
        ├── GuidedPanel               ← planet checklist + resonances + fun fact
        └── FreePlayPanel             ← orbit list + ratios + system matches
```

### GameCanvas

```tsx
// components/game/GameCanvas.tsx
"use client";

import { useRef } from "react";
import { useGameEngine } from "@/hooks/useGameEngine";
import { Topbar } from "./Topbar";
import { Sidebar } from "./Sidebar";

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { uiState, actions } = useGameEngine(canvasRef);

  return (
    <div className="flex w-full h-screen bg-[#080b10]">
      <div className="relative flex-1 min-w-0">
        <canvas ref={canvasRef} className="block w-full h-full touch-none" />
        <Topbar uiState={uiState} actions={actions} />
      </div>
      <Sidebar uiState={uiState} actions={actions} />
    </div>
  );
}
```

### Sidebar

```tsx
// components/game/Sidebar.tsx

import { MenuPanel } from "./MenuPanel";
import { GuidedPanel } from "./GuidedPanel";
import { FreePlayPanel } from "./FreePlayPanel";
import type { GameUIState } from "@/engine/types";

interface Props {
  uiState: GameUIState;
  actions: { startLevel: (i: number) => void; startFreePlay: () => void; /* ... */ };
}

export function Sidebar({ uiState, actions }: Props) {
  return (
    <aside className="w-[260px] min-w-[260px] bg-[#0d1117] border-l border-white/[0.08] flex flex-col overflow-y-auto p-4 max-md:w-full max-md:min-w-0 max-md:max-h-[35vh] max-md:border-l-0 max-md:border-t max-md:border-white/[0.08]">
      {uiState.mode === "menu" && <MenuPanel uiState={uiState} actions={actions} />}
      {uiState.mode === "guided" && <GuidedPanel uiState={uiState} />}
      {uiState.mode === "freeplay" && <FreePlayPanel uiState={uiState} />}
    </aside>
  );
}
```

Each panel is a pure function of `GameUIState` — no hooks, no side effects, no refs. Just props in, JSX out.

---

## 6. Multi-Page Structure

| Route | Content | Server/Client |
|---|---|---|
| `/` | Landing page — title, description, "Play" button linking to `/game`, science fair poster summary | Server component |
| `/game` | The game (everything that's currently in `orbital-fling.html`) | Client component |
| `/about` | About the project — methodology, tech stack, credits, link to orbital-signature repo | Server component |
| `/learn/resonance` | What is orbital resonance? Interactive explainer | Server component (mostly static) |
| `/learn/kepler` | Kepler's laws, period-radius relationship | Server component |
| `/learn/systems` | Gallery of real exoplanet systems featured in the game | Server component |

### Root layout

```tsx
// app/layout.tsx

import type { Metadata } from "next";
import { DM_Mono, DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });
const dmMono = DM_Mono({ subsets: ["latin"], weight: ["300", "400", "500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Orbital Fling — Discover Exoplanet Resonances",
  description: "Fling planets into orbit around real stars. A science fair game about orbital mechanics and resonance.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmMono.variable}`}>
      <body className="bg-[#080b10] text-[#c8c0b4] font-sans">{children}</body>
    </html>
  );
}
```

The `/game` page renders a single `<GameCanvas />`. Other pages are standard server-rendered content.

---

## 7. Migration Phases

Seven phases, ordered by dependency. Each phase produces a working (if incomplete) app.

### Phase 1: Scaffold

Set up the Next.js project and verify it builds/deploys.

- `npx create-next-app@latest orbital-fling --typescript --tailwind --app --src=no`
- Configure fonts (DM Sans, DM Mono) via `next/font/google`
- Set up Tailwind with the game's color palette as CSS custom properties
- Create placeholder pages (`/`, `/game`, `/about`)
- Verify `next dev` and `next build` work
- Deploy to Vercel (empty shell — proves the pipeline works)

### Phase 2: Engine Types + Pure Logic

Extract all non-DOM code into typed modules.

- `engine/types.ts` — all interfaces from [Section 3](#3-key-types)
- `engine/config.ts` — constants (`GM`, `DT`, `SUBSTEPS`, tolerances)
- `engine/resonance.ts` — `RESONANCES` array + `findResonance()`
- `engine/levels.ts` — `LEVELS` array typed as `Level[]`
- `engine/catalog.ts` — `SYSTEMS_CATALOG` + `matchSystems()`
- `engine/physics.ts` — `accel()`, `stepVerlet()`, `predictOrbit()`, `orbitalEnergy()`, `semiMajorAxis()`, `periodFromA()`
- `lib/colors.ts` — `PLANET_COLORS`, `starColor()`, `hexToRgb()`

All of these are pure functions with zero DOM dependency. They can have unit tests immediately.

**Verification:** Import from a test file, call `stepVerlet()` with known inputs, assert output.

### Phase 3: Renderer + Audio + Input

Extract the DOM-touching engine modules.

- `engine/renderer.ts` — `Renderer` class
  - Constructor takes `CanvasRenderingContext2D` + dimensions
  - `resize(w, h)` method
  - `render(state: GameState)` method containing all drawing logic from lines 318–517
  - `drawMenu(state: GameState)` for the menu animation
  - Internally generates star field once (constructor)
- `engine/audio.ts` — `AudioManager` class
  - Lazily initializes `AudioContext` on first user interaction
  - Methods: `playLock()`, `playCrash()`, `playEscape()`, `playResonance(name)`, `playFling()`
- `engine/input.ts` — `InputHandler` class
  - Constructor takes canvas element + callback for fling events
  - Binds mouse/touch listeners
  - `destroy()` method removes all listeners

### Phase 4: Simulation + Game Loop

Wire the engine together.

- `engine/simulation.ts` — `simulate(state, level, W, H)` and `checkLocks(state, level)` as pure-ish functions that mutate the passed `GameState`
- `engine/gameLoop.ts` — `GameLoop` class
  - Constructor takes canvas element
  - Owns `GameState`, `Renderer`, `AudioManager`, `InputHandler`
  - `start()` / `stop()` manage the `requestAnimationFrame` loop
  - `snapshot(): GameUIState` — creates a frozen copy for React
  - `startLevel(idx)` / `startFreePlay()` / `goMenu()` / `toggleSpeed()` / `reset()`
  - Static `initialUIState()` for the hook's initial `useState`

At this point the game is fully playable in the browser with zero React UI — just canvas.

**Verification:** Open `/game`, the canvas should show the menu and respond to input.

### Phase 5: React Bridge

Connect the engine to React.

- `hooks/useGameEngine.ts` — as described in [Section 4](#4-the-bridge-pattern)
- `components/game/GameCanvas.tsx` — canvas + hook + layout

The sidebar is empty at this stage, but the game runs in the canvas and actions work.

### Phase 6: UI Components

Replace the innerHTML string building with React components.

- `components/game/Topbar.tsx` — logo + buttons
- `components/game/Sidebar.tsx` — mode switch
- `components/game/MenuPanel.tsx` — level buttons, free-play button
- `components/game/GuidedPanel.tsx` — planet checklist, resonances, fun fact
- `components/game/FreePlayPanel.tsx` — orbits, ratios, system matches
- `components/ui/Button.tsx` — shared styled button
- `components/ui/SectionTitle.tsx` — section header

Map the existing CSS classes to Tailwind utilities. The visual design stays identical.

**Verification:** Side-by-side comparison with the original HTML file — should look the same.

### Phase 7: Multi-Page + Polish

- Landing page (`/`) — hero section, "Play" CTA, science fair summary
- About page (`/about`) — project description, methodology, credits
- Learn pages (`/learn/[topic]`) — educational content about resonance, Kepler's laws, real systems
- Metadata and OG tags for social sharing
- Mobile responsive adjustments (the original already handles this via the media query)
- Loading state for the `/game` page (dynamic import of the client component)

---

## 8. Deployment

Standard Vercel deployment. No special configuration needed.

```bash
# Install
npm install

# Dev
npm run dev

# Build (also runs as Vercel build command)
npm run build

# Preview production build locally
npm run start
```

**Vercel settings:**
- Framework preset: Next.js (auto-detected)
- Build command: `next build` (default)
- Output directory: `.next` (default)
- No environment variables needed — the game is fully client-side
- No serverless functions — all pages are either static or client components

The `/game` page will be client-rendered (because of the canvas and Web Audio). All other pages can be statically generated at build time.

---

## 9. Risks and Mitigations

### SSR Safety

The engine uses `window`, `AudioContext`, `requestAnimationFrame`, `canvas`. These don't exist on the server.

**Mitigation:** The `/game` page is a client component (`"use client"`). Engine code is only imported inside `useEffect`, which only runs in the browser. Alternatively, use `next/dynamic` with `ssr: false`:

```tsx
const GameCanvas = dynamic(() => import("@/components/game/GameCanvas").then(m => m.GameCanvas), {
  ssr: false,
  loading: () => <div className="w-full h-screen bg-[#080b10]" />,
});
```

### Performance

The current game does `SUBSTEPS * simSpeed` Verlet steps per frame (up to 200 at 10x speed). This is fine — Verlet is cheap arithmetic.

**Key rule:** React never re-renders during `requestAnimationFrame`. The 200ms snapshot interval means React does ~5 renders/sec for the sidebar, which is negligible.

If profiling ever shows the sidebar as a bottleneck, add `React.memo` to the panel components. They already receive simple props (no deep objects that change identity each render).

### Audio Autoplay

Browsers block `AudioContext` creation until a user gesture.

**Mitigation:** Same as the current code — `AudioManager` lazily creates the context on the first pointer event. The `initAudio()` call in the current `onDown` handler moves into `InputHandler`'s first interaction.

### Tailwind Theming

The current CSS uses specific colors (`#080b10`, `#0d1117`, `rgba(200,195,185,0.06)`, etc.). These are design tokens, not arbitrary one-offs.

**Mitigation:** Define them as CSS custom properties in `globals.css` and reference via Tailwind:

```css
/* globals.css */
@theme {
  --color-space-bg: #080b10;
  --color-sidebar-bg: #0d1117;
  --color-text-primary: #c8c0b4;
  --color-text-muted: #8a8278;
  --color-text-dim: #6b6560;
  --color-border: rgba(200, 195, 185, 0.08);
}
```

Then use `bg-space-bg`, `text-text-primary`, etc. throughout components.

### Canvas Sizing

The current code uses `devicePixelRatio` for crisp rendering on Retina displays. The `resize()` function sets canvas dimensions to `clientWidth * dpr` by `clientHeight * dpr` and applies a CSS transform.

**Mitigation:** Move the resize logic into the `Renderer` class. Use a `ResizeObserver` on the canvas wrapper instead of a `window.resize` listener — this handles sidebar open/close and container changes more reliably.

### State Persistence

The current game stores `completedLevels` in the `S` object, which resets on page reload.

**Future opportunity:** Save `completedLevels` to `localStorage`. This is a post-migration enhancement, not a migration concern. The `GameLoop.snapshot()` already includes `completedLevels` — adding persistence is a one-line `useEffect` in the hook.
