// lib/colors.ts — Planet colors, star color from Teff, color utilities

export const PLANET_COLORS = [
  "#5B9BD5", // soft blue
  "#6BC5E8", // sky
  "#45B7A0", // teal
  "#7ED87E", // green
  "#F5C242", // gold
  "#E8A838", // amber
  "#E07B4C", // orange
  "#D45B5B", // coral
  "#C77DBA", // lavender
  "#8E7CC3", // purple
];

/**
 * Star color from effective temperature (simplified blackbody).
 * Returns CSS rgb() string.
 */
export function starColorFromTeff(teff: number): string {
  let r: number, g: number, b: number;
  if (teff < 3500) {
    r = 255;
    g = 120 + (teff - 2500) * 0.06;
    b = 60;
  } else if (teff < 5000) {
    const t = (teff - 3500) / 1500;
    r = 255;
    g = 180 + t * 55;
    b = 60 + t * 100;
  } else if (teff < 6000) {
    const t = (teff - 5000) / 1000;
    r = 255;
    g = 235 + t * 20;
    b = 160 + t * 80;
  } else if (teff < 7500) {
    const t = (teff - 6000) / 1500;
    r = 255 - t * 40;
    g = 255 - t * 15;
    b = 240 + t * 15;
  } else {
    r = 200;
    g = 220;
    b = 255;
  }
  return `rgb(${Math.round(r)},${Math.round(Math.max(0, Math.min(255, g)))},${Math.round(Math.max(0, Math.min(255, b)))})`;
}

/** Convert hex color to rgba string */
export function hexToRgba(color: string, alpha: number): string {
  if (color.startsWith("#")) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return color.replace("rgb", "rgba").replace(")", `,${alpha})`);
}

/** Darken a hex color by a factor (0-1) */
export function darkenColor(hex: string, factor: number): string {
  if (!hex.startsWith("#")) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * factor)},${Math.round(g * factor)},${Math.round(b * factor)})`;
}

/** Format a number to n significant figures */
export function sigFigs(num: number, n = 3): string {
  if (num === 0) return "0";
  return Number(num.toPrecision(n)).toString();
}
