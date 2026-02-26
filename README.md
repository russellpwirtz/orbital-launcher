# Orbital Launcher

A science-fair interactive game where you launch planets into stable orbits around real stars, discovering orbital resonances through gameplay.

Built with Next.js 15, TypeScript, Tailwind CSS v4, and React 19.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Commands

```bash
npm run dev       # Development server
npm run build     # Production build
npm run start     # Serve production build
npm run lint      # ESLint
```

## Architecture

The game uses a **bridge pattern** separating the physics engine from React:

- **`engine/`** — Pure TypeScript physics loop (Velocity Verlet integrator, 60fps). No React imports.
- **`components/`** — React UI. Reads frozen state snapshots, dispatches actions.
- **`hooks/useGameEngine.ts`** — Bridge between engine and React, syncing UI state at ~5Hz.

Canvas rendering is owned entirely by the engine. React creates the `<canvas>` element and hands it off via ref.

## Levels

Real exoplanet systems with accurate orbital parameters from the NASA Exoplanet Archive:

1. **Tutorial** — Earth & Sun
2. **K2-24** — 2:1 resonance
3. **HD 110067** — 3:2 resonance chain (6 planets)
4. **Kepler-80** — 4:3 resonance chain
5. **TRAPPIST-1** — 7 planets, mixed resonances
6. **Kepler-90** — 8 planets, Sun-like star

## License

Private.
