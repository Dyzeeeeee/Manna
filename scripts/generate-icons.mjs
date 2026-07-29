// Regenerates public/icons/* for Manna. The mark is a vector trace of the
// Manna Finance brand mark (Manna.png at repo root, the same "reference file
// at repo root" convention TisWell uses for TisWell.png): two leaf strokes
// forming an M, rising into a growth arrow on the right, with a small gold
// flame in the gap between them. Paths were extracted from that PNG with
// marching-squares contour tracing (see git history for the script) rather
// than hand-drawn, so they follow the source closely.
// Run with: pnpm icons
import { mkdir, writeFile } from "node:fs/promises";

import sharp from "sharp";

const BG = "#F1DECC";
const GREEN = "#103018";
const GOLD = "#B09860";
const CENTER = 140;

// Traced in a Y-down pixel space with (140, 140) at the mark's own bounding-
// box center; OUTER is half that bbox's longest side, i.e. the same
// "outermost painted radius" role OUTER plays in Tiswell's generator.
const GREEN_D =
  "M 268.46 310.38 L 263.06 310.29 L 282.46 298.89 L 292.82 289.29 L 300.75 279.29 L 309.66 263.29 L 315.73 243.29 L 317.23 226.29 L 317.32 48.29 L 286.46 72.48 L 238.46 102.00 L 218.46 115.99 L 196.46 135.55 L 181.22 154.29 L 175.09 166.29 L 173.96 178.29 L 185.74 215.29 L 188.77 230.29 L 189.70 246.29 L 187.78 262.29 L 182.94 277.29 L 173.88 292.29 L 160.46 304.64 L 147.46 310.95 L 159.93 293.29 L 166.93 278.29 L 170.95 263.29 L 172.35 246.29 L 171.66 233.29 L 166.81 211.29 L 147.35 165.29 L 165.18 135.29 L 189.80 108.29 L 215.46 88.10 L 263.46 58.63 L 283.46 44.46 L 300.67 28.29 L 313.27 10.29 L 300.46 9.07 L 273.19 10.29 L 310.46 -13.09 L 345.46 -30.95 L 362.88 30.29 L 341.46 19.15 L 340.51 20.29 L 340.50 225.29 L 337.66 249.29 L 328.62 271.29 L 313.46 289.64 L 293.46 302.74 Z M -6.54 310.40 L -17.54 308.71 L -33.54 303.58 L -54.54 290.69 L -69.74 273.29 L -75.60 262.29 L -79.68 250.29 L -82.88 227.29 L -82.54 2.75 L -48.54 6.02 L -17.54 13.85 L 17.46 28.05 L 45.46 44.08 L 74.46 66.12 L 96.60 88.29 L 119.55 119.29 L 134.19 147.29 L 116.01 176.29 L 105.01 197.29 L 98.09 215.29 L 94.02 233.29 L 93.06 253.29 L 96.20 273.29 L 101.00 287.29 L 112.46 309.79 L 100.74 301.29 L 88.17 287.29 L 80.14 271.29 L 76.01 254.29 L 76.01 229.29 L 79.25 212.29 L 86.09 192.29 L 99.80 164.29 L 101.72 156.29 L 99.72 142.29 L 92.72 127.29 L 82.71 112.29 L 68.15 95.29 L 50.46 78.96 L 28.46 63.11 L 11.46 53.23 L -13.54 41.96 L -38.54 34.02 L -59.67 30.29 L -59.83 227.29 L -57.92 244.29 L -52.97 261.29 L -41.86 281.29 L -26.54 297.37 Z";

const GOLD_D =
  "M 131.46 298.54 L 129.32 296.29 L 125.31 289.29 L 120.35 276.29 L 120.01 272.29 L 119.15 271.29 L 118.16 266.29 L 118.09 247.29 L 120.17 235.29 L 124.28 223.29 L 129.22 213.29 L 133.18 207.29 L 134.46 206.96 L 139.67 216.29 L 145.64 233.29 L 147.65 246.29 L 147.77 256.29 L 145.66 270.29 L 141.66 282.29 L 135.62 293.29 Z";

const MARK = `<path d="${GREEN_D}" fill="${GREEN}" fill-rule="evenodd"/>\n    <path d="${GOLD_D}" fill="${GOLD}" fill-rule="evenodd"/>`;
const OUTER = 222.88;

// frac = fraction of the canvas the mark's outer diameter should span;
// bg: null renders on transparency (favicon) — launcher icons must stay
// opaque (maskable requires full bleed; iOS fills transparency with black)
const svg = (size, frac, bg = BG) => {
  const k = (frac * 280) / (2 * OUTER);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 280 280">
  ${bg ? `<rect width="280" height="280" fill="${bg}"/>` : ""}
  <g transform="translate(140 140) scale(${k.toFixed(4)}) translate(-140 -140)">
    ${MARK}
  </g>
</svg>`;
};

await mkdir("public/icons", { recursive: true });
await writeFile("public/icons/mark.svg", `${svg(280, 0.94, null)}\n`);
await sharp(Buffer.from(svg(192, 0.72))).png().toFile("public/icons/icon-192.png");
await sharp(Buffer.from(svg(512, 0.72))).png().toFile("public/icons/icon-512.png");
// maskable: mark held inside the ~80% safe zone so circular masks don't clip
await sharp(Buffer.from(svg(512, 0.58))).png().toFile("public/icons/maskable-512.png");

console.log("wrote public/icons/{mark.svg, icon-192.png, icon-512.png, maskable-512.png}");
