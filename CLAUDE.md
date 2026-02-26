# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

**Orbital Launcher** is a science-fair interactive game where users launch planets into stable orbits around real stars, discovering orbital resonances through gameplay. This directory is the **Next.js 15 + TypeScript migration** of the working vanilla JS implementation.

## Reference Implementations

Two working versions exist as the source of truth for game behavior:

- **`../orbital-fling/`** — Modular vanilla JS (12 modules, ~2,290 lines). This is the primary reference for migration — same architecture, just untyped.
- **`../orbital-fling-html/`** — Single-file HTML (838 lines). Original prototype, useful for understanding the design in one read.

The migration guide at `docs/NEXT_JS.md` maps every section of the original code to its target module. Follow it.

## Commands

```bash
npm run dev       # Development server (localhost:3000)
npm run build     # Production build
npm run start     # Serve production build locally
npm run lint      # ESLint
```

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · React 19

## Architecture

### The Bridge Pattern (Critical)

React and the physics engine live in separate worlds:

- **`engine/`** — Pure TypeScript, no React imports, no DOM globals (except the canvas it receives). Runs the 60fps physics loop imperatively. Mutates internal `GameState` freely.
- **`components/`** — Pure React. Reads frozen `GameUIState` snapshots, dispatches actions. No `requestAnimationFrame`, no mutation.
- **`hooks/useGameEngine.ts`** — The bridge. Mounts the engine on a canvas ref, syncs a `GameUIState` snapshot to React every ~200ms (5 updates/sec — fast enough for sidebar text, cheap enough for zero React overhead).

**Key rules:**
1. Engine never calls `setState`. React only sees frozen snapshots via `snapshot()`.
2. React never reads mutable `GameState` directly.
3. User actions (startLevel, toggleSpeed) flow synchronously through engine methods — no dispatch queue.
4. Canvas is owned by the engine. React creates the `<canvas>` element and hands it via ref, then never touches it.

### Module Dependency Graph

```
config.ts ← resonance.ts ← physics.ts ← simulation.ts ← gameLoop.ts
    ↑            ↑                                           ↑
 colors.ts    levels.ts                                  renderer.ts
              catalog.ts                                  input.ts
                                                          audio.ts
                                                          types.ts (imported by all)
```

No circular dependencies. `types.ts` is leaf-level.

### Directory Layout

```
app/                    # Next.js App Router pages
  game/page.tsx         # Client component — the game
  about/page.tsx        # Static — project info
  learn/[topic]/page.tsx # Static — educational pages
components/
  game/                 # GameCanvas, Sidebar, MenuPanel, GuidedPanel, FreePlayPanel, Topbar
  ui/                   # Shared UI primitives (Button, SectionTitle)
engine/                 # Pure TS — physics, rendering, audio, input, game loop
hooks/                  # useGameEngine (bridge)
lib/                    # Utilities (colors, helpers)
```

### SSR Safety

Engine code uses `window`, `AudioContext`, `requestAnimationFrame`, `canvas`. The `/game` page must be a client component. Use `next/dynamic` with `ssr: false` or guard engine imports inside `useEffect`.

## Physics

- **Integrator:** Velocity Verlet (symplectic, energy-conserving)
- **Timestep:** configurable base DT with 20 substeps per frame, speed multipliers up to 32x
- **Lock detection:** Planet locks after 3 periapsis passages if semi-major axis is within 22% of target
- **Resonance assist (guided mode only):** Small velocity nudge (0.12%) when within 18% of target resonance
- **Period measurement:** From periapsis-to-periapsis intervals, not Kepler's law — measures what the player achieved

## Levels

Real exoplanet systems with accurate orbital parameters from NASA Exoplanet Archive:
1. Tutorial (Earth/Sun), 2. K2-24 (2:1), 3. HD 110067 (3:2 chain), 4. Kepler-80, 5. TRAPPIST-1, 6. Kepler-90

Orbital periods computed from Kepler's 3rd law preserving real SMA ratios. Scaled so innermost planet ≈ 1 sim unit.

## Migration Phases

The full 7-phase migration plan is in `docs/NEXT_JS.md`. Phases are ordered by dependency — each produces a working (if incomplete) app:

1. **Scaffold** — Next.js project, fonts, Tailwind, Vercel deploy
2. **Engine Types + Pure Logic** — types.ts, config, resonance, levels, catalog, physics (testable immediately)
3. **Renderer + Audio + Input** — DOM-touching engine classes
4. **Simulation + Game Loop** — Wire engine together (canvas playable, no React UI yet)
5. **React Bridge** — useGameEngine hook + GameCanvas component
6. **UI Components** — Replace innerHTML with React components (visual parity with original)
7. **Multi-Page + Polish** — Landing, about, learn pages, OG metadata, mobile responsive

**Phase 4 is the critical checkpoint:** the game must be fully playable in canvas-only mode before adding React UI.

## Color Palette

```
--color-space-bg:      #080b10
--color-sidebar-bg:    #0d1117
--color-text-primary:  #c8c0b4
--color-text-muted:    #8a8278
--color-text-dim:      #6b6560
--color-border:        rgba(200, 195, 185, 0.08)
```

Star colors are spectral-type accurate (red M-dwarfs through blue-white hot stars). Planet colors use a fixed palette indexed per level.

## Parent Project

This lives inside the `orbital-signature` exoplanet pipeline repo but is fully standalone. The parent repo's Python environment and pipeline tooling are irrelevant here — this is a pure frontend project.
