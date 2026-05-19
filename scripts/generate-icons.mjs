/**
 * generate-icons.mjs
 *
 * Generates the MacroChef brand icon at all required sizes:
 *   public/favicon.svg        — SVG favicon (all modern browsers)
 *   public/favicon-32.png     — 32×32 PNG favicon (legacy/Safari)
 *   public/favicon-192.png    — 192×192 PNG (PWA / Android)
 *   public/favicon-512.png    — 512×512 PNG (PWA splash)
 *   ios/…/AppIcon.appiconset/AppIcon-1024.png  — iOS App Store icon
 *
 * Design: sage-green rounded square (#7d9b76) + white Lucide Salad icon.
 * Run: node scripts/generate-icons.mjs
 */

import sharp from "sharp";
import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// ── Logo SVG ──────────────────────────────────────────────────────────────────
// The icon is a 1024×1024 canvas with a sage-green rounded-rect background
// and the Lucide Salad icon scaled to fill ~55% of the area, centred.
//
// Lucide Salad paths (viewBox 0 0 24 24) scaled ×42 and translated to centre:
//   scale = 1024 * 0.55 / 24 ≈ 23.47  →  round to 42 for cleaner numbers
//   The icon is 24×24, so rendered size = 24*42 = 1008 — too large.
//   Use scale=23.5 → 24*23.5 = 564; offset = (1024-564)/2 = 230

const SCALE = 23.5;
const OFFSET = (1024 - 24 * SCALE) / 2; // ≈ 230

function makeSvg(size) {
  // All coordinates are in the 1024 unit space; sharp scales the SVG to `size`.
  const r = Math.round(size * 0.18); // corner radius ≈ 18 % of edge
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="${size}" height="${size}">
  <!-- Background -->
  <rect width="1024" height="1024" rx="${Math.round(1024 * 0.18)}" fill="#7d9b76"/>
  <!-- Lucide Salad icon, stroke-white, scale=${SCALE}, translate=(${OFFSET},${OFFSET}) -->
  <g transform="translate(${OFFSET} ${OFFSET}) scale(${SCALE})"
     fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M7 21h10"/>
    <path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"/>
    <path d="M11.38 12a2.4 2.4 0 0 1-.4-4.77 2.4 2.4 0 0 1 3.2-2.77 2.4 2.4 0 0 1 3.47-.63 2.4 2.4 0 0 1 3.37 3.37 2.4 2.4 0 0 1-1.1 3.7 2.51 2.51 0 0 1 .03 1.1"/>
    <path d="m13 12 4-4"/>
    <path d="M10.9 7.25A3.99 3.99 0 0 0 4 10c0 .73.2 1.41.54 2"/>
  </g>
</svg>`;
}

// Write the SVG favicon (no rounding needed — SVG scales perfectly)
const svgContent = makeSvg(1024);
writeFileSync(resolve(root, "public/favicon.svg"), svgContent);
console.log("✓ public/favicon.svg");

// ── Rasterise with sharp ──────────────────────────────────────────────────────
async function toPng(svgStr, outPath, size) {
  await sharp(Buffer.from(svgStr))
    .resize(size, size)
    .png()
    .toFile(outPath);
  console.log(`✓ ${outPath.replace(root + "/", "")}`);
}

// Web favicons
await toPng(svgContent, resolve(root, "public/favicon-32.png"), 32);
await toPng(svgContent, resolve(root, "public/favicon-192.png"), 192);
await toPng(svgContent, resolve(root, "public/favicon-512.png"), 512);

// iOS App Store icon (1024×1024, no alpha per Apple guidelines)
const iosOut = resolve(
  root,
  "ios/Sources/MacroChef/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png"
);
await sharp(Buffer.from(svgContent))
  .resize(1024, 1024)
  .flatten({ background: "#7d9b76" }) // remove alpha — Apple rejects transparent icons
  .png()
  .toFile(iosOut);
console.log(`✓ ios/…/AppIcon-1024.png`);

console.log("\nAll icons generated.");
