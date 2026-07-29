// Regenerates public/icons/* for Manna. The mark is a vector trace of the
// Manna Finance brand mark (Manna.png at repo root, the same "reference file
// at repo root" convention TisWell uses for TisWell.png): a crossing M whose
// diagonals meet over a gold flame, with the right stroke rising into a
// growth arrow. Paths were extracted from that PNG with marching-squares
// contour tracing (see git history for the script) rather than hand-drawn,
// so they follow the source closely.
// Run with: pnpm icons
import { mkdir, writeFile } from "node:fs/promises";

import sharp from "sharp";

const BG = "#F1DECC";
const GREEN = "#183820";
const GOLD = "#B09860";
const CENTER = 140;

// Traced in a Y-down pixel space with (140, 140) at the mark's own bounding-
// box center; OUTER is half that bbox's longest side, i.e. the same
// "outermost painted radius" role OUTER plays in Tiswell's generator.
const GREEN_D =
  "M 320.58 279.77 L 314.58 280.47 L 308.58 279.11 L 303.33 274.77 L 300.67 267.77 L 300.75 66.77 L 300.35 61.77 L 298.58 59.60 L 295.58 58.87 L 289.58 62.58 L 163.71 152.77 L 180.87 176.77 L 190.00 192.77 L 195.91 208.77 L 197.81 222.77 L 195.98 239.77 L 190.01 254.77 L 180.89 266.77 L 168.58 276.10 L 157.99 279.77 L 170.82 263.77 L 177.25 244.77 L 177.05 226.77 L 169.04 205.77 L 156.83 188.77 L 140.58 172.50 L 131.58 179.38 L 120.22 191.77 L 107.20 212.77 L 103.21 225.77 L 102.04 237.77 L 107.12 259.77 L 121.58 280.18 L 106.58 272.99 L 93.19 259.77 L 85.21 243.77 L 82.34 227.77 L 84.20 208.77 L 90.39 191.77 L 100.28 174.77 L 117.00 152.77 L -0.42 61.51 L -6.42 57.59 L -12.42 56.05 L -17.84 57.77 L -20.37 63.77 L -20.47 267.77 L -23.16 274.77 L -28.42 279.08 L -35.42 280.57 L -43.42 278.31 L -49.54 270.77 L -50.32 261.77 L -50.26 56.77 L -48.62 46.77 L -44.70 38.77 L -35.42 29.48 L -23.42 24.51 L -7.42 24.53 L 7.58 29.39 L 33.58 47.50 L 140.58 130.72 L 275.10 33.77 L 252.80 24.77 L 318.58 -0.57 L 326.58 0.44 L 329.58 4.08 L 330.29 7.77 L 330.32 266.77 L 327.58 274.50 Z";

const GOLD_D =
  "M 139.58 272.88 L 131.58 267.87 L 124.37 259.77 L 119.52 248.77 L 118.20 238.77 L 119.48 228.77 L 124.34 215.77 L 133.42 202.77 L 139.58 197.31 L 143.47 199.77 L 148.84 205.77 L 155.58 215.77 L 159.81 225.77 L 161.81 237.77 L 159.70 250.77 L 154.84 260.77 L 150.58 265.79 L 145.58 269.97 Z";

const MARK = `<path d="${GREEN_D}" fill="${GREEN}" fill-rule="evenodd"/>\n    <path d="${GOLD_D}" fill="${GOLD}" fill-rule="evenodd"/>`;
const OUTER = 190.32;

// frac = fraction of the canvas the mark's outer diameter should span;
// bg: launcher icons must stay opaque (maskable requires full bleed; iOS
// fills transparency with black), and the favicon now paints its own bg so
// a browser tab doesn't show the mark floating on nothing; radius rounds
// that bg square's corners (favicon only — OS chrome masks the rest).
const svg = (size, frac, bg = BG, radius = 0) => {
  const k = (frac * 280) / (2 * OUTER);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 280 280">
  ${bg ? `<rect width="280" height="280" rx="${radius}" ry="${radius}" fill="${bg}"/>` : ""}
  <g transform="translate(140 140) scale(${k.toFixed(4)}) translate(-140 -140)">
    ${MARK}
  </g>
</svg>`;
};

await mkdir("public/icons", { recursive: true });
await writeFile("public/icons/mark.svg", `${svg(280, 0.72, "#FFFFFF", 56)}\n`);
await sharp(Buffer.from(svg(192, 0.72))).png().toFile("public/icons/icon-192.png");
await sharp(Buffer.from(svg(512, 0.72))).png().toFile("public/icons/icon-512.png");
// maskable: mark held inside the ~80% safe zone so circular masks don't clip
await sharp(Buffer.from(svg(512, 0.58))).png().toFile("public/icons/maskable-512.png");

console.log("wrote public/icons/{mark.svg, icon-192.png, icon-512.png, maskable-512.png}");
