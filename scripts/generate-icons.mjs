// Regenerates public/icons/* for Manna. Same construction and palette as
// Tiswell's generator (../TisWell/scripts/generate-icons.mjs) so the two read
// as one family, but Manna's mark is the three-arc inward spiral that has been
// its favicon since the start — enough of a difference to tell the two apart
// on a home screen.
// Run with: pnpm icons
import { mkdir, writeFile } from "node:fs/promises";

import sharp from "sharp";

const BG = "#F1DECC";
const CENTER = 140;

const point = (r, deg) => {
  const rad = (deg * Math.PI) / 180;
  return `${(CENTER + r * Math.sin(rad)).toFixed(2)} ${(CENTER - r * Math.cos(rad)).toFixed(2)}`;
};

// Clockwise arc from a0 to a1, angles in degrees from 12 o'clock
const arc = (r, a0, a1, color, w) => {
  const sweep = (((a1 - a0) % 360) + 360) % 360;
  return `<path d="M ${point(r, a0)} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${point(r, a1)}" stroke="${color}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
};

// Three arcs winding inward to the umber smile — the open bowl, gathering.
const MARK = [
  arc(75.75, 20, 340, "#9F9A77", 7.9), // sage, wide gap at the top
  arc(34.74, 145, 55, "#A2886E", 7.4), // taupe, gap at the right
  arc(18.95, 110, 250, "#5E4634", 7.9), // umber smile
].join("\n    ");

const OUTER = 75.75 + 7.9 / 2; // outermost painted radius

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
