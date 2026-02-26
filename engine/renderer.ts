// engine/renderer.ts — Canvas drawing: star, planets, trails, UI overlays

import type { Vec2, Planet, GhostPlanet } from "./types";
import type { MenuSolarState } from "./menuSolar";
import { MENU_TILT } from "./menuSolar";
import { starColorFromTeff, hexToRgba, darkenColor } from "@/lib/colors";
import { orbitalElements, computeOrbitPath, measurePeriod } from "./physics";
import type { Camera } from "./camera";

/** Static star for the background starfield */
interface BgStar {
  x: number;
  y: number;
  r: number;
  alpha: number;
}

export interface Renderer {
  canvas: HTMLCanvasElement;
  viewScale: number;
  viewCenter: Vec2;
  resize(): void;
  readonly width: number;
  readonly height: number;
  syncCamera(cam: Camera): void;
  simToCanvas(pos: Vec2): Vec2;
  canvasToSim(px: Vec2): Vec2;
  simToPixels(d: number): number;
  clear(): void;
  drawStar(teff: number, radius: number, isGasGiant?: boolean): void;
  drawTargetRing(sma: number, color: string, lineWidth: number, dashed: boolean): void;
  drawTrail(planet: Planet): void;
  drawPlanet(planet: Planet, measuredPeriod?: number | null): void;
  drawOrbitPreview(pos: Vec2, vel: Vec2, starRadius: number): void;
  drawSlingshot(planetPos: Vec2, cursorPos: Vec2, launchVel: Vec2 | null, color: string, starRadius: number): void;
  drawConjunctionMarker(pos: Vec2, color: string): void;
  drawLockAnimation(sma: number, progress: number, color: string): void;
  drawWaitingPlanet(pos: Vec2, color: string, name: string): void;
  drawGhostPlanet(ghost: GhostPlanet, isActive: boolean): void;
  drawLockProgress(planetPos: Vec2, passages: number, required: number, quality: "good" | "close" | "bad", color: string): void;
  drawMapLabel(text: string, x: number, y: number, font: string, color: string): void;
  drawResonanceLabel(sma1: number, sma2: number, ratio: string, musical: string, color: string): void;
  drawMenuSolarSystem(state: MenuSolarState, canvasW: number, canvasH: number): void;
}

/** Draw a banded gas giant (Jupiter) instead of a glowing star */
function drawJupiter(ctx: CanvasRenderingContext2D, center: Vec2, r: number): void {
  // Soft warm ambient glow (much dimmer than a star)
  const glow = ctx.createRadialGradient(center.x, center.y, r * 0.5, center.x, center.y, r * 2);
  glow.addColorStop(0, "rgba(210,180,140,0.15)");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(center.x, center.y, r * 2, 0, Math.PI * 2);
  ctx.fill();

  // Base body — warm tan
  ctx.fillStyle = "#c4a882";
  ctx.beginPath();
  ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
  ctx.fill();

  // Horizontal bands clipped to the disk
  ctx.save();
  ctx.beginPath();
  ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
  ctx.clip();

  const bands = [
    { yFrac: -0.85, height: 0.18, color: "#d4c4a0" }, // pale cream (north polar)
    { yFrac: -0.67, height: 0.14, color: "#b08050" }, // dark brown (NTB)
    { yFrac: -0.53, height: 0.16, color: "#d8c8a4" }, // cream (NTZ)
    { yFrac: -0.37, height: 0.12, color: "#a06838" }, // rusty brown (NEB)
    { yFrac: -0.25, height: 0.18, color: "#e0d0b0" }, // light cream (EZ)
    { yFrac: -0.07, height: 0.14, color: "#b87840" }, // orange-brown (SEB)
    { yFrac:  0.07, height: 0.16, color: "#d0b888" }, // tan (STrZ)
    { yFrac:  0.23, height: 0.12, color: "#a07048" }, // brown (STB)
    { yFrac:  0.35, height: 0.18, color: "#c8b890" }, // cream (STZ)
    { yFrac:  0.53, height: 0.15, color: "#987050" }, // dark tan (SPR)
    { yFrac:  0.68, height: 0.17, color: "#bca878" }, // muted cream (south polar)
  ];

  for (const band of bands) {
    const y = center.y + band.yFrac * r;
    const h = band.height * r;
    ctx.fillStyle = band.color;
    ctx.fillRect(center.x - r, y, r * 2, h);
  }

  // Great Red Spot — small ellipse in the southern hemisphere
  const spotX = center.x + r * 0.2;
  const spotY = center.y + r * 0.15;
  ctx.fillStyle = "rgba(180,80,50,0.55)";
  ctx.beginPath();
  ctx.ellipse(spotX, spotY, r * 0.15, r * 0.09, -0.1, 0, Math.PI * 2);
  ctx.fill();
  // Spot highlight
  ctx.fillStyle = "rgba(200,110,70,0.35)";
  ctx.beginPath();
  ctx.ellipse(spotX - r * 0.02, spotY - r * 0.01, r * 0.08, r * 0.04, -0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Lighting overlay — brighter on the left, darker limb on the right
  const lighting = ctx.createLinearGradient(center.x - r, center.y, center.x + r, center.y);
  lighting.addColorStop(0, "rgba(255,255,240,0.12)");
  lighting.addColorStop(0.4, "rgba(255,255,240,0.04)");
  lighting.addColorStop(0.7, "rgba(0,0,0,0.08)");
  lighting.addColorStop(1, "rgba(0,0,0,0.25)");
  ctx.fillStyle = lighting;
  ctx.beginPath();
  ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
  ctx.fill();

  // Subtle edge darkening (limb effect)
  const limb = ctx.createRadialGradient(center.x, center.y, r * 0.7, center.x, center.y, r);
  limb.addColorStop(0, "transparent");
  limb.addColorStop(1, "rgba(0,0,0,0.3)");
  ctx.fillStyle = limb;
  ctx.beginPath();
  ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function createRenderer(canvas: HTMLCanvasElement): Renderer {
  const ctx = canvas.getContext("2d")!;

  let viewScale = 100;
  const viewCenter: Vec2 = { x: 0, y: 0 };

  // Generate starfield
  const bgStars: BgStar[] = [];
  for (let i = 0; i < 200; i++) {
    bgStars.push({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.2 + 0.3,
      alpha: Math.random() * 0.5 + 0.1,
    });
  }

  const renderer: Renderer = {
    canvas,
    viewScale,
    viewCenter,

    resize() {
      const container = canvas.parentElement!;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * devicePixelRatio;
      canvas.height = rect.height * devicePixelRatio;
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    },

    get width() {
      return canvas.width / devicePixelRatio;
    },
    get height() {
      return canvas.height / devicePixelRatio;
    },

    syncCamera(cam: Camera) {
      viewScale = cam.scale;
      viewCenter.x = cam.center.x;
      viewCenter.y = cam.center.y;
      renderer.viewScale = viewScale;
      renderer.viewCenter = viewCenter;
    },

    simToCanvas(pos: Vec2): Vec2 {
      return {
        x: this.width / 2 + (pos.x - viewCenter.x) * viewScale,
        y: this.height / 2 - (pos.y - viewCenter.y) * viewScale,
      };
    },

    canvasToSim(px: Vec2): Vec2 {
      return {
        x: (px.x - this.width / 2) / viewScale + viewCenter.x,
        y: -(px.y - this.height / 2) / viewScale + viewCenter.y,
      };
    },

    simToPixels(d: number): number {
      return d * viewScale;
    },

    clear() {
      const w = this.width;
      const h = this.height;

      // Three-stop warm gradient background
      const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
      grad.addColorStop(0, "#0d1117");
      grad.addColorStop(0.5, "#080b10");
      grad.addColorStop(1, "#040608");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Static starfield
      for (const star of bgStars) {
        ctx.fillStyle = `rgba(200,195,185,${star.alpha})`;
        ctx.beginPath();
        ctx.arc(star.x * w, star.y * h, star.r, 0, Math.PI * 2);
        ctx.fill();
      }
    },

    drawStar(teff = 5778, radius = 0.05, isGasGiant = false) {
      const center = this.simToCanvas({ x: 0, y: 0 });
      const r = Math.max(8, this.simToPixels(radius));

      if (isGasGiant) {
        drawJupiter(ctx, center, r);
        return;
      }

      const color = starColorFromTeff(teff);

      const glow = ctx.createRadialGradient(center.x, center.y, r * 0.5, center.x, center.y, r * 4);
      glow.addColorStop(0, color.replace("rgb", "rgba").replace(")", ",0.3)"));
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(center.x, center.y, r * 4, 0, Math.PI * 2);
      ctx.fill();

      const bodyGrad = ctx.createRadialGradient(center.x - r * 0.2, center.y - r * 0.2, 0, center.x, center.y, r);
      bodyGrad.addColorStop(0, "#ffffff");
      bodyGrad.addColorStop(0.4, color);
      bodyGrad.addColorStop(1, color.replace("rgb", "rgba").replace(")", ",0.8)"));
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
      ctx.fill();
    },

    drawTargetRing(sma: number, color = "rgba(255,255,255,0.15)", lineWidth = 1.5, dashed = false) {
      const center = this.simToCanvas({ x: 0, y: 0 });
      const r = this.simToPixels(sma);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      if (dashed) ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    },

    drawTrail(planet: Planet) {
      const trail = planet.trail;
      if (trail.length < 2) return;

      const n = trail.length;
      const startIdx = planet.trailIdx;

      ctx.lineWidth = 1.5;
      ctx.lineCap = "round";

      for (let i = 1; i < n; i++) {
        const idx = (startIdx + i) % n;
        const prevIdx = (startIdx + i - 1) % n;
        const p1 = this.simToCanvas(trail[prevIdx]);
        const p2 = this.simToCanvas(trail[idx]);

        const alpha = (i / n) * 0.6;
        ctx.strokeStyle = hexToRgba(planet.color, alpha);

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    },

    drawPlanet(planet: Planet, measuredPeriod?: number | null) {
      if (!planet.alive) return;

      const center = this.simToCanvas(planet.pos);
      const r = Math.max(4, this.simToPixels(planet.radius));

      const grad = ctx.createRadialGradient(center.x - r * 0.3, center.y - r * 0.3, 0, center.x, center.y, r);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.3, planet.color);
      grad.addColorStop(1, darkenColor(planet.color, 0.5));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
      ctx.fill();

      // Planet name label (map style)
      if (planet.name) {
        this.drawMapLabel(planet.name, center.x, center.y - r - 6, "bold 12px 'DM Sans', sans-serif", "#e8e0d4");
      }

      // Period label below locked planets
      if (planet.locked && measuredPeriod != null) {
        const periodText = `T = ${measuredPeriod.toFixed(2)}`;
        this.drawMapLabel(periodText, center.x, center.y + r + 14, "11px 'DM Mono', monospace", "#8a8278");
      }
    },

    drawOrbitPreview(pos: Vec2, vel: Vec2, starRadius: number) {
      const path = computeOrbitPath(pos, vel);
      if (!path || path.length < 2) return;

      const elems = orbitalElements(pos, vel);
      const crashes = elems.periapsis < starRadius;
      const escapes = !elems.bound;
      const tooEccentric = elems.e > 0.8;

      const color = crashes || escapes || tooEccentric ? "rgba(255,80,80,0.4)" : "rgba(80,255,120,0.4)";

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      for (let i = 0; i < path.length; i++) {
        const p = this.simToCanvas(path[i]);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
    },

    drawSlingshot(planetPos: Vec2, cursorPos: Vec2, launchVel: Vec2 | null, color: string, starRadius: number) {
      const pp = this.simToCanvas(planetPos);
      const cp = this.simToCanvas(cursorPos);
      const r = Math.max(6, this.simToPixels(0.02));

      const bandDx = cp.x - pp.x;
      const bandDy = cp.y - pp.y;
      const bandLen = Math.sqrt(bandDx * bandDx + bandDy * bandDy);

      if (bandLen > 3) {
        const bandGrad = ctx.createLinearGradient(pp.x, pp.y, cp.x, cp.y);
        bandGrad.addColorStop(0, hexToRgba(color, 0.6));
        bandGrad.addColorStop(1, hexToRgba(color, 0.15));
        ctx.strokeStyle = bandGrad;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(pp.x, pp.y);
        ctx.lineTo(cp.x, cp.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (launchVel) {
        const vx = launchVel.x;
        const vy = launchVel.y;
        const speed = Math.sqrt(vx * vx + vy * vy);

        if (speed > 0.005) {
          const angle = Math.atan2(-vy, vx);
          const tearLen = Math.min(r * 4, r + bandLen * 0.3);

          ctx.save();
          ctx.translate(pp.x, pp.y);
          ctx.rotate(angle);

          ctx.beginPath();
          ctx.arc(0, 0, r, Math.PI * 0.55, -Math.PI * 0.55, false);
          ctx.quadraticCurveTo(tearLen * 0.6, -r * 0.2, tearLen, 0);
          ctx.quadraticCurveTo(tearLen * 0.6, r * 0.2, r * Math.cos(Math.PI * 0.55), r * Math.sin(Math.PI * 0.55));
          ctx.closePath();

          const tearGrad = ctx.createRadialGradient(-r * 0.2, 0, 0, 0, 0, r * 1.5);
          tearGrad.addColorStop(0, hexToRgba(color, 0.9));
          tearGrad.addColorStop(1, hexToRgba(color, 0.4));
          ctx.fillStyle = tearGrad;
          ctx.fill();

          ctx.restore();

          const elems = orbitalElements(planetPos, launchVel);
          let label: string, labelColor: string;
          if (!elems.bound) {
            label = "escape!";
            labelColor = "#ff5050";
          } else if (elems.periapsis < starRadius) {
            label = "crash!";
            labelColor = "#ff5050";
          } else if (elems.e > 0.6) {
            label = "eccentric";
            labelColor = "#ffaa44";
          } else {
            label = "stable orbit";
            labelColor = "#50ff88";
          }

          ctx.font = "bold 12px sans-serif";
          ctx.textAlign = "center";
          ctx.fillStyle = labelColor;
          ctx.fillText(label, pp.x, pp.y + r + 16);
        } else {
          ctx.fillStyle = hexToRgba(color, 0.7);
          ctx.beginPath();
          ctx.arc(pp.x, pp.y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },

    drawConjunctionMarker(pos: Vec2, color = "rgba(255,255,100,0.6)") {
      const p = this.simToCanvas(pos);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    },

    drawLockAnimation(sma: number, progress: number, color: string) {
      if (progress >= 1) return;
      const center = this.simToCanvas({ x: 0, y: 0 });
      const r = this.simToPixels(sma);
      const alpha = 1 - progress;
      const expand = 1 + progress * 0.3;

      ctx.strokeStyle = hexToRgba(color, alpha);
      ctx.lineWidth = 3 * alpha;
      ctx.beginPath();
      ctx.arc(center.x, center.y, r * expand, 0, Math.PI * 2);
      ctx.stroke();
    },

    drawWaitingPlanet(pos: Vec2, color: string, name: string) {
      const center = this.simToCanvas(pos);
      const r = Math.max(6, this.simToPixels(0.02));

      // Pulsing ring
      const pulsePhase = (performance.now() / 1000) % 1;
      const pulseAlpha = 0.3 + 0.3 * Math.sin(pulsePhase * Math.PI * 2);

      ctx.strokeStyle = hexToRgba(color, pulseAlpha);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(center.x, center.y, r + 6 + Math.sin(pulsePhase * Math.PI * 2) * 2, 0, Math.PI * 2);
      ctx.stroke();

      const grad = ctx.createRadialGradient(center.x - r * 0.2, center.y - r * 0.2, 0, center.x, center.y, r);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.4, color);
      grad.addColorStop(1, hexToRgba(color, 0.6));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = "13px 'DM Sans', sans-serif";
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(200,195,185,0.7)";
      ctx.fillText("drag to launch \u2192", center.x + r + 10, center.y + 4);

      if (name) {
        this.drawMapLabel(name, center.x, center.y - r - 8, "bold 12px 'DM Sans', sans-serif", hexToRgba(color, 0.9));
      }
    },

    drawGhostPlanet(ghost: GhostPlanet, isActive: boolean) {
      const x = ghost.sma * Math.cos(ghost.angle);
      const y = ghost.sma * Math.sin(ghost.angle);
      const center = this.simToCanvas({ x, y });
      const r = Math.max(3, this.simToPixels(ghost.radius));

      if (isActive) {
        // Active ghost: brighter, pulsing glow
        const pulsePhase = (performance.now() / 800) % 1;
        const glowAlpha = 0.15 + 0.15 * Math.sin(pulsePhase * Math.PI * 2);

        ctx.fillStyle = hexToRgba(ghost.color, glowAlpha);
        ctx.beginPath();
        ctx.arc(center.x, center.y, r + 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = hexToRgba(ghost.color, 0.8);
        ctx.beginPath();
        ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
        ctx.fill();

        this.drawMapLabel(ghost.name, center.x, center.y - r - 6, "bold 11px 'DM Sans', sans-serif", hexToRgba(ghost.color, 0.9));
      } else if (ghost.state === "ghost") {
        // Dim ghost: 30% opacity
        ctx.fillStyle = hexToRgba(ghost.color, 0.3);
        ctx.beginPath();
        ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
        ctx.fill();

        this.drawMapLabel(ghost.name, center.x, center.y - r - 5, "10px 'DM Sans', sans-serif", hexToRgba(ghost.color, 0.3));
      }
      // "locked" ghosts are not drawn here — the real planet draws instead
    },

    drawLockProgress(planetPos: Vec2, passages: number, required: number, quality: "good" | "close" | "bad", color: string) {
      const center = this.simToCanvas(planetPos);
      const ringR = 18; // px outside planet center
      const arcWidth = 2.5;
      const gapDeg = 8; // degrees gap between segments
      const gapRad = (gapDeg * Math.PI) / 180;

      // Total arc = 2π minus gaps
      const segAngle = (2 * Math.PI - required * gapRad) / required;
      // Start from top (-π/2)
      const startOffset = -Math.PI / 2;

      const qualityColor =
        quality === "good" ? "rgba(80,220,120,0.9)" :
        quality === "close" ? "rgba(255,180,50,0.9)" :
        "rgba(255,80,80,0.9)";
      const dimColor = "rgba(255,255,255,0.1)";

      for (let i = 0; i < required; i++) {
        const a0 = startOffset + i * (segAngle + gapRad);
        const a1 = a0 + segAngle;
        const filled = i < passages;

        ctx.strokeStyle = filled ? qualityColor : dimColor;
        ctx.lineWidth = arcWidth;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(center.x, center.y, ringR, a0, a1);
        ctx.stroke();
      }

      // Label below planet
      const label =
        passages >= required
          ? (quality === "good" ? "Locking..." : "Off course")
          : quality === "bad"
            ? "Off course"
            : `Orbit ${passages}/${required}`;

      this.drawMapLabel(label, center.x, center.y + ringR + 12, "bold 10px 'DM Sans', sans-serif", qualityColor);
    },

    drawMapLabel(text: string, x: number, y: number, font: string, color: string) {
      ctx.font = font;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Dark outline for readability (4 offsets)
      ctx.fillStyle = "rgba(4,6,8,0.8)";
      const offsets = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [ox, oy] of offsets) {
        ctx.fillText(text, x + ox, y + oy);
      }

      // Main text
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
      ctx.textBaseline = "alphabetic";
    },

    drawResonanceLabel(sma1: number, sma2: number, ratio: string, musical: string, color: string) {
      // Draw colored ratio badge halfway between two orbits at 45deg
      const midSMA = (sma1 + sma2) / 2;
      const angle = Math.PI / 4; // 45 degrees
      const pos = this.simToCanvas({
        x: midSMA * Math.cos(angle),
        y: midSMA * Math.sin(angle),
      });

      // Badge background
      const label = ratio;
      ctx.font = "bold 13px 'DM Mono', monospace";
      const textWidth = ctx.measureText(label).width;
      const padX = 6;
      const padY = 4;
      const bw = textWidth + padX * 2;
      const bh = 18 + padY;

      ctx.fillStyle = hexToRgba(color, 0.2);
      ctx.beginPath();
      const cornerR = 4;
      ctx.roundRect(pos.x - bw / 2, pos.y - bh / 2, bw, bh, cornerR);
      ctx.fill();

      ctx.strokeStyle = hexToRgba(color, 0.5);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(pos.x - bw / 2, pos.y - bh / 2, bw, bh, cornerR);
      ctx.stroke();

      this.drawMapLabel(label, pos.x, pos.y, "bold 13px 'DM Mono', monospace", color);

      // Musical name below
      if (musical) {
        this.drawMapLabel(musical, pos.x, pos.y + bh / 2 + 10, "10px 'DM Sans', sans-serif", hexToRgba(color, 0.7));
      }
    },

    drawMenuSolarSystem(state: MenuSolarState, canvasW: number, canvasH: number) {
      const mcx = canvasW / 2;
      const mcy = canvasH * 0.54;
      const tilt = MENU_TILT;
      const maxR = state.maxR;

      // Title
      ctx.fillStyle = "#e8e0d4";
      ctx.font = "bold 48px 'DM Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText("ORBITAL LAUNCH", canvasW / 2, canvasH * 0.10);
      ctx.fillStyle = "rgba(200,195,185,0.6)";
      ctx.font = "20px 'DM Sans', sans-serif";
      ctx.fillText("Launch planets into orbit around real stars", canvasW / 2, canvasH * 0.17);

      // Ghost orbit ellipses (original circular orbits)
      for (const b of state.bodies) {
        const r = b.initOrb * maxR;
        ctx.beginPath();
        ctx.ellipse(mcx, mcy, r, r * tilt, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Perturbation trails
      if (state.perturbed) {
        for (const b of state.bodies) {
          if (b.trail.length < 2) continue;
          const r = parseInt(b.color.slice(1, 3), 16);
          const g = parseInt(b.color.slice(3, 5), 16);
          const bl = parseInt(b.color.slice(5, 7), 16);
          for (let i = 1; i < b.trail.length; i++) {
            const fade = (i / b.trail.length) * 0.5;
            const t = b.trail[i];
            const tp = b.trail[i - 1];
            ctx.strokeStyle = `rgba(${r},${g},${bl},${fade})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(tp.x + mcx, tp.y * tilt + mcy);
            ctx.lineTo(t.x + mcx, t.y * tilt + mcy);
            ctx.stroke();
          }
        }
      }

      // Sun glow
      const sunR = 26;
      const glow = ctx.createRadialGradient(mcx, mcy, sunR * 0.3, mcx, mcy, sunR * 4);
      glow.addColorStop(0, "rgba(255,240,180,0.4)");
      glow.addColorStop(0.5, "rgba(255,200,100,0.12)");
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(mcx, mcy, sunR * 4, 0, Math.PI * 2);
      ctx.fill();

      // Sun body
      const sg = ctx.createRadialGradient(mcx - sunR * 0.2, mcy - sunR * 0.2, 0, mcx, mcy, sunR);
      sg.addColorStop(0, "#ffffff");
      sg.addColorStop(0.4, "#fff4d6");
      sg.addColorStop(1, "rgba(255,200,100,0.8)");
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(mcx, mcy, sunR, 0, Math.PI * 2);
      ctx.fill();

      // Highlight Sun when being dragged (body === null means Sun drag)
      if (state.drag && state.drag.body === null) {
        ctx.strokeStyle = "rgba(255,220,140,0.5)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(mcx, mcy, sunR + 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Planets and moons
      const mt = state.moonTime;
      for (const b of state.bodies) {
        const px = b.x + mcx;
        const py = b.y * tilt + mcy;

        // Planet glow halo
        const pg = ctx.createRadialGradient(px, py, 0, px, py, b.size * 2.5);
        pg.addColorStop(0, hexToRgba(b.color, 0.25));
        pg.addColorStop(1, "transparent");
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.arc(px, py, b.size * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Saturn rings (behind body)
        if (b.rings) {
          ctx.strokeStyle = hexToRgba(b.color, 0.31);
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(px, py, b.size * 2.8, b.size * 0.9, 0.3, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = hexToRgba(b.color, 0.19);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(px, py, b.size * 2.2, b.size * 0.7, 0.3, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Planet body gradient
        const pb = ctx.createRadialGradient(px - b.size * 0.3, py - b.size * 0.3, 0, px, py, b.size);
        pb.addColorStop(0, "#ffffff");
        pb.addColorStop(0.3, b.color);
        pb.addColorStop(1, hexToRgba(b.color, 0.67));
        ctx.fillStyle = pb;
        ctx.beginPath();
        ctx.arc(px, py, b.size, 0, Math.PI * 2);
        ctx.fill();

        // Highlight ring when dragging this planet
        if (state.drag && state.drag.body === b) {
          ctx.strokeStyle = "rgba(255,255,255,0.5)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(px, py, b.size + 4, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Planet name label
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.font = "12px 'DM Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(b.name, px, py + b.size + 14);

        // Moons
        if (b.moons) {
          for (const m of b.moons) {
            const ma = mt * m.speed + m.phase;
            const mx = px + Math.cos(ma) * m.dist;
            const my = py + Math.sin(ma) * m.dist * tilt;
            ctx.fillStyle = m.color;
            ctx.beginPath();
            ctx.arc(mx, my, m.size, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Drag arrow + slingshot line
      if (state.drag && state.drag.current) {
        const b = state.drag.body;
        // Sun drag: arrow from Sun center; planet drag: arrow from planet position
        const bpx = b ? b.x + mcx : mcx;
        const bpy = b ? b.y * tilt + mcy : mcy;
        const dx = state.drag.start.x - state.drag.current.x;
        const dy = state.drag.start.y - state.drag.current.y;
        const speed = Math.sqrt(dx * dx + dy * dy);
        if (speed > 5) {
          const angle = Math.atan2(dy, dx);
          const aLen = Math.min(speed * 1.2, 160);
          const ax = bpx + Math.cos(angle) * aLen;
          const ay = bpy + Math.sin(angle) * aLen;
          // Arrow core
          ctx.strokeStyle = "rgba(255,150,80,0.7)";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(bpx, bpy);
          ctx.lineTo(ax, ay);
          ctx.stroke();
          // Arrowhead
          const hl = 12;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(ax - hl * Math.cos(angle - 0.4), ay - hl * Math.sin(angle - 0.4));
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(ax - hl * Math.cos(angle + 0.4), ay - hl * Math.sin(angle + 0.4));
          ctx.stroke();
          // Slingshot line
          ctx.strokeStyle = "rgba(255,255,255,0.2)";
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(bpx, bpy);
          ctx.lineTo(state.drag.current.x, state.drag.current.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Hint text at bottom
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      if (state.perturbed) {
        ctx.fillStyle = "rgba(200,195,185,0.35)";
        ctx.font = "14px 'DM Sans', sans-serif";
        ctx.fillText("Drag any planet to perturb it", canvasW / 2, canvasH * 0.93);
      } else {
        const pulse = 0.3 + Math.sin(performance.now() * 0.003) * 0.1;
        ctx.fillStyle = `rgba(200,195,185,${pulse})`;
        ctx.font = "14px 'DM Sans', sans-serif";
        ctx.fillText("Try dragging a planet to see what happens!", canvasW / 2, canvasH * 0.93);
      }
    },
  };

  return renderer;
}
