// engine/gameLoop.ts — Main game loop, mode management, snapshot for React

import type {
  GameMode,
  GameUIState,
  Planet,
  GhostPlanet,
  LockAnimation,
  WaitingPlanet,
  TargetRing,
  DetectedResonance,
  Level,
  Simulation,
} from "./types";
import { SPEEDS, MATCH_TOLERANCE, MIN_PERIAPSIS_PASSAGES, CLASSIFY_INTERVAL } from "./config";
import { PLANET_COLORS, sigFigs } from "@/lib/colors";
import { LEVELS } from "./levels";
import {
  createSimulation,
  stepSimulation,
  resetSimulation,
  createPlanet,
  measurePeriod,
  getPlanetOrbitalElements,
  circularVelocity,
} from "./physics";
import { createResonanceManager, findNearestResonance, type ResonanceManager } from "./resonance";
import { matchSystemFingerprint } from "./catalog";
import { createRenderer, type Renderer } from "./renderer";
import { createInput, type InputState } from "./input";
import { createCamera, type Camera } from "./camera";
import {
  initAudio,
  playLaunch,
  playCrash,
  playEscape,
  playLockSnap,
  playResonanceChime,
} from "./audio";
import {
  initSolarSystem,
  stepSolarSystem,
  hitTestPlanet,
  hitTestSun,
  applyPerturbation,
  applySunPerturbation,
  MENU_SPEEDS,
  type MenuSolarState,
} from "./menuSolar";

const GRAB_ZONE_PX = 40; // fling grab zone around waiting planet

export class GameLoop {
  private sim: Simulation;
  private renderer: Renderer;
  private input: InputState;
  private camera: Camera;
  private resonanceManager: ResonanceManager;
  private freePlayResonanceManager: ResonanceManager;

  private mode: GameMode = "menu";
  private levelIdx = 0;
  private currentLevel: Level | null = null;
  private currentPlanetIdx = 0;
  private activePlanet: Planet | null = null;
  private lockedPlanets: Planet[] = [];
  private levelComplete = false;
  private speedIdx = 3; // default to 10x
  private completedLevels = new Set<number>();

  private ghostPlanets: GhostPlanet[] = [];
  private lockAnimations: LockAnimation[] = [];
  private lastCrashTime = 0;
  private lastEscapeTime = 0;
  private lastClassifyTime = 0;

  private message = "";
  private rafId = 0;
  private running = false;
  private solar: MenuSolarState | null = null;

  // Free play UI state
  private fpPlanets: { name: string; color: string; period: number | null }[] = [];
  private fpResonances: string[] = [];
  private fpMatchText = "";

  // Guided resonance display
  private guidedDetectedResonances: DetectedResonance[] = [];

  private showConjunctions = true;
  private showResonanceLabels = true;
  private starTeff = 5778;
  private starRadius = 0.05;

  constructor(canvas: HTMLCanvasElement) {
    this.sim = createSimulation();
    this.renderer = createRenderer(canvas);
    this.camera = createCamera();
    this.resonanceManager = createResonanceManager();
    this.freePlayResonanceManager = createResonanceManager();

    this.input = createInput(
      canvas,
      (px) => this.renderer.canvasToSim(px),
      () => this.renderer.viewScale
    );
    this.input.enabled = false;

    this.input.onLaunch = (pos, vel) => this.handleLaunch(pos, vel);
    this.input.onPan = (dx, dy) => this.camera.panBy(dx, dy);
    this.input.onZoom = (pt, factor) =>
      this.camera.zoomAtPoint(pt, factor, (px) => this.renderer.canvasToSim(px));
    this.input.hitTestFling = (canvasPoint) => this.isNearWaitingPlanet(canvasPoint);

    // Init audio on first interaction
    canvas.addEventListener("pointerdown", () => initAudio(), { once: true });

    // Menu-mode planet/Sun drag (separate from game input system)
    canvas.addEventListener("pointerdown", (e) => {
      if (this.mode !== "menu" || !this.solar) return;
      const rect = canvas.getBoundingClientRect();
      const px = (e.clientX - rect.left) * (this.renderer.width / rect.width);
      const py = (e.clientY - rect.top) * (this.renderer.height / rect.height);
      const mcx = this.renderer.width / 2;
      const mcy = this.renderer.height * 0.54;
      // Check planets first (they overlap the Sun visually)
      const body = hitTestPlanet(this.solar, px, py, mcx, mcy);
      if (body) {
        this.solar.drag = { body, start: { x: px, y: py }, current: { x: px, y: py } };
      } else if (hitTestSun(px, py, mcx, mcy)) {
        this.solar.drag = { body: null, start: { x: px, y: py }, current: { x: px, y: py } };
      }
    });
    canvas.addEventListener("pointermove", (e) => {
      if (this.mode !== "menu" || !this.solar?.drag) return;
      const rect = canvas.getBoundingClientRect();
      const px = (e.clientX - rect.left) * (this.renderer.width / rect.width);
      const py = (e.clientY - rect.top) * (this.renderer.height / rect.height);
      this.solar.drag.current = { x: px, y: py };
    });
    canvas.addEventListener("pointerup", () => {
      if (this.mode !== "menu" || !this.solar?.drag) return;
      const d = this.solar.drag;
      const dx = d.start.x - d.current.x;
      const dy = d.start.y - d.current.y;
      if (d.body) {
        applyPerturbation(d.body, dx, dy);
      } else {
        applySunPerturbation(this.solar, dx, dy);
      }
      const speed = Math.sqrt(dx * dx + dy * dy) * 0.15;
      if (speed > 0.5 && !this.solar.perturbed) {
        this.solar.perturbed = true;
      }
      this.solar.drag = null;
    });
    canvas.addEventListener("pointerleave", () => {
      if (this.mode !== "menu" || !this.solar?.drag) return;
      this.solar.drag = null;
    });

    // Handle resize
    const onResize = () => this.renderer.resize();
    window.addEventListener("resize", onResize);
    this.renderer.resize();
  }

  // --- Public API for React ---

  start(): void {
    if (this.running) return;
    this.running = true;
    this.tick(performance.now());
  }

  stop(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.input.destroy();
  }

  startLevel(idx: number): void {
    this.mode = "guided";
    this.levelIdx = idx;
    this.currentLevel = LEVELS[idx];
    this.currentPlanetIdx = 0;
    this.lockedPlanets = [];
    this.activePlanet = null;
    this.levelComplete = false;
    this.solar = null;

    this.resetSim();

    this.starTeff = this.currentLevel.starTeff;
    this.starRadius = this.currentLevel.starRadius;
    this.sim.starRadius = this.starRadius;
    this.sim.escapeRadius = this.currentLevel.escapeRadius;

    const maxSMA = Math.max(...this.currentLevel.planets.map((p) => p.sma)) * 1.3;
    this.camera.fitToLevel(maxSMA, this.renderer.width, this.renderer.height);
    this.renderer.syncCamera(this.camera);

    // Create ghost planets for all planets in this level
    this.ghostPlanets = this.currentLevel.planets.map((p, i) => ({
      name: p.name,
      sma: p.sma,
      period: p.period,
      angle: Math.random() * Math.PI * 2,
      color: PLANET_COLORS[i % PLANET_COLORS.length],
      radius: 0.015,
      state: i === 0 ? "active" : "ghost",
    }));

    const firstSMA = this.currentLevel.planets[0].sma;
    this.input.targetCircularVelocity = circularVelocity(firstSMA);
    this.input.enabled = true;
    this.input.freeplayMode = false;
    this.message = "Drag to launch the planet!";
    this.guidedDetectedResonances = [];
  }

  startFreePlay(): void {
    this.mode = "freeplay";
    this.currentLevel = null;
    this.solar = null;

    this.resetSim();

    this.starTeff = 5778;
    this.starRadius = 0.05;
    this.sim.starRadius = this.starRadius;
    this.sim.escapeRadius = 50;
    this.camera.fitToLevel(5, this.renderer.width, this.renderer.height);
    this.renderer.syncCamera(this.camera);
    this.input.targetCircularVelocity = null;
    this.input.enabled = true;
    this.input.freeplayMode = true;
    this.message = "Drag backward to launch a planet!";

    this.fpPlanets = [];
    this.fpResonances = [];
    this.fpMatchText = "Try to create resonant orbits. Can you match a real system?";
    this.freePlayResonanceManager.reset();
    this.ghostPlanets = [];
  }

  goMenu(): void {
    this.mode = "menu";
    this.resetSim();
    this.input.enabled = false;
    this.message = "";
    this.ghostPlanets = [];
    this.solar = initSolarSystem(this.renderer.width, this.renderer.height);
  }

  resetSolarSystem(): void {
    this.solar = initSolarSystem(this.renderer.width, this.renderer.height);
  }

  toggleMenuSpeed(): void {
    if (!this.solar) return;
    this.solar.speedIdx = (this.solar.speedIdx + 1) % MENU_SPEEDS.length;
    this.solar.speed = MENU_SPEEDS[this.solar.speedIdx];
  }

  toggleSpeed(): void {
    this.speedIdx = (this.speedIdx + 1) % SPEEDS.length;
    this.sim.speed = SPEEDS[this.speedIdx];
  }

  reset(): void {
    if (this.mode === "guided" && this.currentLevel) {
      this.startLevel(this.levelIdx);
    } else if (this.mode === "freeplay") {
      this.startFreePlay();
    }
  }

  zoomIn(): void {
    this.camera.zoomIn();
  }

  zoomOut(): void {
    this.camera.zoomOut();
  }

  toggleConjunctions(): void {
    this.showConjunctions = !this.showConjunctions;
  }

  toggleResonanceLabels(): void {
    this.showResonanceLabels = !this.showResonanceLabels;
  }

  nextLevel(): void {
    if (!this.levelComplete) return;
    if (this.levelIdx < LEVELS.length - 1) {
      this.startLevel(this.levelIdx + 1);
    } else {
      this.goMenu();
    }
  }

  snapshot(): GameUIState {
    const levelPlanets =
      this.mode === "guided" && this.currentLevel
        ? this.currentLevel.planets.map((p, i) => ({
            name: p.name,
            color: PLANET_COLORS[i % PLANET_COLORS.length],
            locked: i < this.currentPlanetIdx,
          }))
        : [];

    return {
      mode: this.mode,
      levelIdx: this.levelIdx,
      simSpeed: this.sim.speed,
      currentPlanetIdx: this.currentPlanetIdx,
      levelName: this.currentLevel?.name ?? "",
      levelStarType: this.currentLevel?.starType ?? "",
      levelFunFact: this.currentLevel?.funFact ?? "",
      levelDescription: this.getLevelDescription(),
      levelPlanets,
      detectedResonances: [...this.guidedDetectedResonances],
      expectedResonances: this.currentLevel?.resonances ?? [],
      freePlayPlanets: [...this.fpPlanets],
      freePlayResonances: [...this.fpResonances],
      freePlayMatchText: this.fpMatchText,
      message: this.message,
      completedLevels: [...this.completedLevels],
      levelComplete: this.levelComplete,
      hasNextLevel: this.levelIdx < LEVELS.length - 1,
      showConjunctions: this.showConjunctions,
      showResonanceLabels: this.showResonanceLabels,
      solarPerturbed: this.solar?.perturbed ?? false,
      menuSpeed: this.solar?.speed ?? 1,
    };
  }

  static initialUIState(): GameUIState {
    return {
      mode: "menu",
      levelIdx: 0,
      simSpeed: SPEEDS[3],
      currentPlanetIdx: 0,
      levelName: "",
      levelStarType: "",
      levelFunFact: "",
      levelDescription: "",
      levelPlanets: [],
      detectedResonances: [],
      expectedResonances: [],
      freePlayPlanets: [],
      freePlayResonances: [],
      freePlayMatchText: "",
      message: "",
      completedLevels: [],
      levelComplete: false,
      hasNextLevel: true,
      showConjunctions: true,
      showResonanceLabels: true,
      solarPerturbed: false,
      menuSpeed: 1,
    };
  }

  // --- Internal ---

  private getLevelDescription(): string {
    if (!this.currentLevel) return "";
    const nPlanets = this.currentLevel.planets.length;
    const nRes = this.currentLevel.resonances.length;
    if (nRes > 0) {
      return `${nPlanets} planets in resonance chain`;
    }
    return `${nPlanets} planet${nPlanets > 1 ? "s" : ""}`;
  }

  private isNearWaitingPlanet(canvasPoint: { x: number; y: number }): boolean {
    const waiting = this.getWaitingPlanet();
    if (!waiting) return false;
    const wp = this.renderer.simToCanvas(waiting.pos);
    const dx = canvasPoint.x - wp.x;
    const dy = canvasPoint.y - wp.y;
    return Math.sqrt(dx * dx + dy * dy) < GRAB_ZONE_PX;
  }

  private resetSim(): void {
    resetSimulation(this.sim);
    this.resonanceManager.reset();
    this.currentPlanetIdx = 0;
    this.lockAnimations = [];
    this.speedIdx = 3;
    this.sim.speed = SPEEDS[3];
  }

  private handleLaunch(pos: { x: number; y: number }, vel: { x: number; y: number }): void {
    if (this.mode === "menu") return;

    let spawnPos = pos;
    if (this.mode === "guided") {
      const waiting = this.getWaitingPlanet();
      if (waiting) spawnPos = waiting.pos;
    }

    const color = PLANET_COLORS[this.currentPlanetIdx % PLANET_COLORS.length];
    const name =
      this.mode === "guided" && this.currentLevel && this.currentPlanetIdx < this.currentLevel.planets.length
        ? this.currentLevel.planets[this.currentPlanetIdx].name
        : String.fromCharCode(98 + this.currentPlanetIdx);

    const planet = createPlanet(spawnPos.x, spawnPos.y, vel.x, vel.y, {
      color,
      name,
      radius: 0.02,
    });

    this.sim.planets.push(planet);
    this.currentPlanetIdx++;
    playLaunch();

    if (this.mode === "guided") {
      this.activePlanet = planet;
      // Transition ghost states
      for (const ghost of this.ghostPlanets) {
        if (ghost.name === name) {
          ghost.state = "active"; // Will become "locked" after lock-in
        }
      }
      // Mark next ghost as active
      if (this.currentLevel && this.currentPlanetIdx < this.currentLevel.planets.length) {
        const nextGhost = this.ghostPlanets[this.currentPlanetIdx];
        if (nextGhost) nextGhost.state = "active";
      }
    }
  }

  private getWaitingPlanet(): WaitingPlanet | null {
    if (!this.currentLevel || this.levelComplete) return null;
    if (this.currentPlanetIdx >= this.currentLevel.planets.length) return null;
    if (this.activePlanet && this.activePlanet.alive) return null;

    const target = this.currentLevel.planets[this.currentPlanetIdx];
    const color = PLANET_COLORS[this.currentPlanetIdx % PLANET_COLORS.length];
    return {
      pos: { x: target.sma, y: 0 },
      sma: target.sma,
      color,
      name: target.name,
    };
  }

  private getTargetRings(): TargetRing[] {
    if (!this.currentLevel) return [];
    return this.currentLevel.planets.map((p, i) => {
      const isPlaced = i < this.currentPlanetIdx;
      const isCurrent = i === this.currentPlanetIdx;

      let ringColor: string;
      if (isPlaced) {
        ringColor = "rgba(80,200,120,0.2)";
      } else if (isCurrent) {
        const hex = PLANET_COLORS[i % PLANET_COLORS.length];
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        ringColor = `rgba(${r},${g},${b},0.35)`;
      } else {
        ringColor = "rgba(255,255,255,0.08)";
      }

      return {
        sma: p.sma,
        color: ringColor,
        dashed: !isPlaced && !isCurrent,
      };
    });
  }

  private updateGuided(timestamp: number): void {
    if (this.levelComplete || !this.currentLevel) return;

    // Advance ghost planet angles
    const effectiveDt = this.sim.dt * this.sim.speed;
    for (const ghost of this.ghostPlanets) {
      if (ghost.state === "ghost" || ghost.state === "active") {
        const omega = (2 * Math.PI) / ghost.period;
        ghost.angle += omega * effectiveDt;
      }
    }

    if (this.activePlanet && !this.activePlanet.alive) {
      this.activePlanet = null;
      return;
    }
    if (!this.activePlanet) return;

    const period = measurePeriod(this.activePlanet);
    if (period === null) return;

    const target = this.currentLevel.planets[this.currentPlanetIdx - 1];
    if (!target) return;

    const ratio = period / target.period;
    const match = Math.abs(ratio - 1) < MATCH_TOLERANCE;

    if (match && this.activePlanet.periapsisPassages.length >= MIN_PERIAPSIS_PASSAGES) {
      this.activePlanet.locked = true;
      this.activePlanet.name = target.name;
      this.lockedPlanets.push(this.activePlanet);

      // Mark ghost as locked
      for (const ghost of this.ghostPlanets) {
        if (ghost.name === target.name) {
          ghost.state = "locked";
        }
      }

      this.lockAnimations.push({
        sma: getPlanetOrbitalElements(this.activePlanet).a,
        color: this.activePlanet.color,
        startTime: performance.now(),
      });

      playLockSnap();

      // Check for resonances among locked planets
      if (this.lockedPlanets.length >= 2) {
        this.guidedDetectedResonances = [
          ...this.resonanceManager.classifyResonances(this.lockedPlanets, measurePeriod),
        ];
        if (this.guidedDetectedResonances.length > 0) {
          const lastRes = this.guidedDetectedResonances[this.guidedDetectedResonances.length - 1];
          const parts = lastRes.ratio.split(":");
          const chimeRatio = parseInt(parts[0]) / parseInt(parts[1]);
          playResonanceChime(chimeRatio);
        }
      }

      this.activePlanet = null;

      if (this.currentPlanetIdx < this.currentLevel.planets.length) {
        this.input.targetCircularVelocity = circularVelocity(
          this.currentLevel.planets[this.currentPlanetIdx].sma
        );
        this.message = `Now launch planet ${this.currentLevel.planets[this.currentPlanetIdx].name}!`;
      } else {
        this.levelComplete = true;
        this.completedLevels.add(this.levelIdx);
        this.input.enabled = false;
        this.message = "";
      }
    }
  }

  private updateFreePlay(timestamp: number): void {
    const alivePlanets = this.sim.planets.filter((p) => p.alive);
    this.freePlayResonanceManager.update(alivePlanets, this.sim.time);

    if (timestamp - this.lastClassifyTime > CLASSIFY_INTERVAL) {
      this.lastClassifyTime = timestamp;
      this.freePlayResonanceManager.classifyResonances(alivePlanets, measurePeriod);

      this.fpPlanets = alivePlanets.map((p) => ({
        name: p.name,
        color: p.color,
        period: measurePeriod(p),
      }));

      const withPeriod = this.fpPlanets.filter((p) => p.period !== null);
      withPeriod.sort((a, b) => a.period! - b.period!);

      const ratios: number[] = [];
      for (let i = 1; i < withPeriod.length; i++) {
        ratios.push(withPeriod[i].period! / withPeriod[i - 1].period!);
      }

      this.fpResonances = this.freePlayResonanceManager.detectedResonances.map(
        (r) => `${r.pair}: ${r.ratio}${r.musical ? ` (${r.musical})` : ""}`
      );

      if (ratios.length > 0) {
        const matches = matchSystemFingerprint(ratios);
        if (matches.length > 0 && matches[0].score < 0.5) {
          this.fpMatchText = "Real systems like yours:\n";
          for (const m of matches) {
            if (m.score < 0.5) {
              const pct = Math.max(0, Math.round((1 - m.score) * 100));
              this.fpMatchText += `${m.name} (${pct}% match) \u2014 ${m.funFact}\n`;
            }
          }
        } else {
          this.fpMatchText = "Keep adding planets to match real systems!";
        }
      }
    }
  }

  private drawResonanceLabels(): void {
    const resonances = this.mode === "guided"
      ? this.guidedDetectedResonances
      : this.freePlayResonanceManager.detectedResonances;

    if (!resonances || resonances.length === 0) return;

    // For each detected resonance, find the SMAs of the two planets
    const planets = this.mode === "guided" ? this.lockedPlanets : this.sim.planets.filter(p => p.alive);

    for (const res of resonances) {
      const names = res.pair.split(":");
      const p1 = planets.find(p => p.name === names[0]);
      const p2 = planets.find(p => p.name === names[1]);
      if (!p1 || !p2) continue;

      const elems1 = getPlanetOrbitalElements(p1);
      const elems2 = getPlanetOrbitalElements(p2);
      const color = res.color || "#ffd93d";

      this.renderer.drawResonanceLabel(elems1.a, elems2.a, res.ratio, res.musical, color);
    }
  }

  private tick = (timestamp: number): void => {
    if (!this.running) return;

    // Update camera smoothing
    this.camera.update();
    this.renderer.syncCamera(this.camera);

    if (this.mode === "menu") {
      if (!this.solar) {
        this.solar = initSolarSystem(this.renderer.width, this.renderer.height);
      }
      stepSolarSystem(this.solar);
      this.renderer.clear();
      this.renderer.drawMenuSolarSystem(this.solar, this.renderer.width, this.renderer.height);
      this.rafId = requestAnimationFrame(this.tick);
      return;
    }

    // Physics
    stepSimulation(this.sim);

    // Check crashes/escapes
    for (const planet of this.sim.planets) {
      if (!planet.alive) {
        if (planet.deathCause === "crash" && timestamp - this.lastCrashTime > 500) {
          this.message = "Crashed into the star! Try again.";
          this.lastCrashTime = timestamp;
          playCrash();
        } else if (planet.deathCause === "escape" && timestamp - this.lastEscapeTime > 500) {
          this.message = "Planet escaped! Try a slower launch.";
          this.lastEscapeTime = timestamp;
          playEscape();
        }
      }
    }
    this.sim.planets = this.sim.planets.filter((p) => p.alive);

    // Conjunction tracking
    const alivePlanets = this.sim.planets.filter((p) => p.alive);
    this.resonanceManager.update(alivePlanets, this.sim.time);

    // Mode updates
    if (this.mode === "guided") this.updateGuided(timestamp);
    if (this.mode === "freeplay") this.updateFreePlay(timestamp);

    // --- Render ---
    this.renderer.clear();

    // Target rings (guided)
    if (this.mode === "guided") {
      for (const t of this.getTargetRings()) {
        this.renderer.drawTargetRing(t.sma, t.color, 1.5, t.dashed);
      }
    }

    // Ghost planets (guided, behind real planets)
    if (this.mode === "guided") {
      for (const ghost of this.ghostPlanets) {
        if (ghost.state !== "locked") {
          const isActive = ghost.state === "active" && !this.activePlanet?.alive;
          this.renderer.drawGhostPlanet(ghost, isActive);
        }
      }
    }

    // Star
    this.renderer.drawStar(this.starTeff, this.starRadius);

    // Conjunctions
    if (this.showConjunctions) {
      const conjunctions = this.resonanceManager.getAllConjunctions();
      for (const c of conjunctions) {
        this.renderer.drawConjunctionMarker(c, "rgba(255,255,100,0.4)");
      }
      if (this.mode === "freeplay") {
        for (const c of this.freePlayResonanceManager.getAllConjunctions()) {
          this.renderer.drawConjunctionMarker(c, "rgba(255,255,100,0.4)");
        }
      }
    }

    // Trails
    for (const planet of this.sim.planets) {
      this.renderer.drawTrail(planet);
    }

    // Planets (with period labels for locked ones)
    for (const planet of this.sim.planets) {
      const period = planet.locked ? measurePeriod(planet) : null;
      this.renderer.drawPlanet(planet, period);
    }

    // Lock progress indicator (guided mode, active planet orbiting)
    if (this.mode === "guided" && this.activePlanet?.alive && this.currentLevel) {
      const target = this.currentLevel.planets[this.currentPlanetIdx - 1];
      if (target) {
        const elems = getPlanetOrbitalElements(this.activePlanet);
        const smaDeviation = Math.abs(elems.a / target.sma - 1);
        const quality: "good" | "close" | "bad" =
          smaDeviation < 0.10 ? "good" :
          smaDeviation < 0.25 ? "close" :
          "bad";
        this.renderer.drawLockProgress(
          this.activePlanet.pos,
          this.activePlanet.periapsisPassages.length,
          MIN_PERIAPSIS_PASSAGES,
          quality,
          this.activePlanet.color,
        );
      }
    }

    // Resonance labels on canvas
    if (this.showResonanceLabels) this.drawResonanceLabels();

    // Lock animations
    const now = performance.now();
    this.lockAnimations = this.lockAnimations.filter((a) => {
      const progress = (now - a.startTime) / 1000;
      if (progress < 1) {
        this.renderer.drawLockAnimation(a.sma, progress, a.color);
        return true;
      }
      return false;
    });

    // Waiting planet (guided)
    const waitingPlanet = this.mode === "guided" ? this.getWaitingPlanet() : null;
    if (waitingPlanet && !this.input.isDragging) {
      this.renderer.drawWaitingPlanet(waitingPlanet.pos, waitingPlanet.color, waitingPlanet.name);
    }

    // Drag visualization
    if (this.input.isDragging && this.input.simStart) {
      const launchPos = waitingPlanet ? waitingPlanet.pos : this.input.launchPosition!;
      const launchVel = this.input.launchVelocity;
      const cursorSim = this.input.simCurrent!;
      const color = waitingPlanet
        ? waitingPlanet.color
        : PLANET_COLORS[this.currentPlanetIdx % PLANET_COLORS.length];

      if (launchVel) {
        this.renderer.drawOrbitPreview(launchPos, launchVel, this.sim.starRadius);
      }
      this.renderer.drawSlingshot(launchPos, cursorSim, launchVel, color, this.sim.starRadius);
    }

    this.rafId = requestAnimationFrame(this.tick);
  };
}
