// Regenerates public/icons/* for Manna. The mark is a vector trace of the
// Manna Finance brand mark (Manna.png at repo root, the same "reference file
// at repo root" convention TisWell uses for TisWell.png): a solid green M in
// two pieces — a plain left pillar and a right stroke that folds over into a
// wallet, the fold read as thin background-coloured reveal lines rather than
// drawn strokes, with a gold dot as the wallet's clasp.
// Paths were extracted from that PNG with marching-squares contour tracing
// rather than hand-drawn, so they follow the source closely.
// Run with: pnpm icons
import { mkdir, writeFile } from "node:fs/promises";

import sharp from "sharp";

const BG = "#F1DECC";
const GREEN = "#22382D";
const GOLD = "#BBA16A";

// Traced in a Y-down pixel space with (140, 140) at the mark's own bounding-
// box center; OUTER is half that bbox's longest side — here the width, since
// the mark is landscape — i.e. the same "outermost painted radius" role OUTER
// plays in Tiswell's generator.
const OUTER = 140;

// The clasp is a true circle in the source, so it is emitted as arcs rather
// than as its traced polygon: at 48px a 24-gon dot visibly flattens. The same
// circle is cut out of the green as a hole, and the gold is drawn a third of a
// unit wider so no background hairline shows through the seam.
const DOT = [229.34, 170.94];
const DOT_R = 13.15;
const circle = (cx, cy, r) =>
  `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;

// four subpaths: right stroke, left pillar, wallet body, clasp hole.
// The wallet body is its own island — the reveal lines fully separate it from
// the stroke above — and the hole is nested inside it, so evenodd is what
// makes the clasp punch through.
const GREEN_D = [
  "M 262.60 18.95 L 268.40 18.56 L 271.49 20.11 L 273.43 22.04 L 275.75 27.46 L 275.75 97.07 L 271.49 102.87 L 204.97 137.68 L 196.08 145.03 L 192.21 154.31 L 192.21 196.08 L 194.53 202.27 L 200.33 208.84 L 204.20 211.16 L 210.39 212.71 L 273.81 210.39 L 275.75 212.32 L 275.75 223.15 L 274.20 227.79 L 271.88 231.66 L 266.08 237.46 L 256.02 241.33 L 170.17 241.33 L 162.43 245.19 L 143.09 260.66 L 141.93 257.18 L 142.71 256.41 L 146.57 148.12 L 147.35 147.35 L 147.35 138.84 L 149.67 131.88 L 155.08 123.37 L 256.80 21.66 L 262.60 18.95 Z",
  "M 6.57 18.95 L 13.15 18.56 L 17.79 20.88 L 124.14 128.01 L 128.01 138.07 L 128.78 210.00 L 129.56 210.77 L 129.17 260.66 L 49.50 146.19 L 47.57 149.67 L 49.12 157.40 L 49.12 239.39 L 47.18 241.33 L 18.56 241.33 L 9.28 237.46 L 3.48 231.66 L -0.39 222.38 L -0.39 27.46 L 1.16 23.59 L 6.57 18.95 Z",
  "M 277.29 108.67 L 278.45 108.29 L 279.61 109.45 L 279.61 197.62 L 278.84 199.17 L 273.81 202.65 L 229.72 203.43 L 228.95 204.20 L 210.39 204.20 L 206.52 202.65 L 202.27 198.40 L 200.72 194.53 L 200.72 154.31 L 203.04 149.67 L 206.52 146.19 L 211.93 143.09 L 277.29 108.67 Z",
  circle(DOT[0], DOT[1], DOT_R),
].join(" ");

const GOLD_D = circle(DOT[0], DOT[1], DOT_R + 0.33);

const MARK = `<path d="${GREEN_D}" fill="${GREEN}" fill-rule="evenodd"/>\n    <path d="${GOLD_D}" fill="${GOLD}"/>`;

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
