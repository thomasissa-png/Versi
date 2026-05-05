/**
 * Génère un PNG plan synthétique pour les screenshots E2E.
 *
 * Plan 800x500 représentant un appartement T2 RDC avec :
 *  - Cadre extérieur (murs porteurs)
 *  - 3 pièces : Salon (gauche), Chambre (haut droit), SDB (bas droit)
 *  - Murs intérieurs visibles
 *  - Cotation textuelle
 *
 * Output : tests/e2e/fixtures/synthetic-plan.png
 *
 * Usage : npx tsx tests/e2e/fixtures/generate-synthetic-plan.ts
 */

import sharp from "sharp";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const W = 800;
const H = 500;

// Lot 1 zone (5%, 10%, 45% width, 80% height) → pixels du plan global
// Lot 1 dans le plan : x=40 (5%*800), y=50 (10%*500), w=360 (45%*800), h=400 (80%*500)
// Polygones pièces sont en LOT-LOCAL %, projetés via lotLocalToPlanGlobalPercent
//
// Mais le SVG dessine en absolu (px du plan global). Donc on dessine les pièces
// dans les coords plan-global = lot-zone-px + (lot-local% × lot-zone-w-px / 100).

// Polygones pièces en LOT-LOCAL % (cohérents avec la fixture qu'on créera) :
// Salon : (5%, 10%) → (50%, 60%) du lot
// Chambre : (55%, 10%) → (95%, 50%) du lot
// SDB : (55%, 55%) → (90%, 90%) du lot
const LOT_X = 40;
const LOT_Y = 50;
const LOT_W = 360;
const LOT_H = 400;

function lotPctToPx(xPct: number, yPct: number): { x: number; y: number } {
  return {
    x: LOT_X + (xPct / 100) * LOT_W,
    y: LOT_Y + (yPct / 100) * LOT_H,
  };
}

const salon = [
  lotPctToPx(5, 10),
  lotPctToPx(50, 10),
  lotPctToPx(50, 60),
  lotPctToPx(5, 60),
];
const chambre = [
  lotPctToPx(55, 10),
  lotPctToPx(95, 10),
  lotPctToPx(95, 50),
  lotPctToPx(55, 50),
];
const sdb = [
  lotPctToPx(55, 55),
  lotPctToPx(90, 55),
  lotPctToPx(90, 90),
  lotPctToPx(55, 90),
];

function poly(points: { x: number; y: number }[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(" ");
}

function centroid(points: { x: number; y: number }[]) {
  const sx = points.reduce((a, p) => a + p.x, 0) / points.length;
  const sy = points.reduce((a, p) => a + p.y, 0) / points.length;
  return { x: sx, y: sy };
}

const cSalon = centroid(salon);
const cChambre = centroid(chambre);
const cSdb = centroid(sdb);

// SVG plan synthétique
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <!-- Fond beige clair (papier plan) -->
  <rect x="0" y="0" width="${W}" height="${H}" fill="#FAF7F0" />

  <!-- Titre cartouche -->
  <rect x="20" y="15" width="200" height="28" fill="#FFFFFF" stroke="#333333" stroke-width="1" />
  <text x="120" y="34" font-family="Helvetica, Arial, sans-serif" font-size="13" fill="#333333" text-anchor="middle" font-weight="bold">PLAN T2 RDC — Lot 1</text>

  <!-- Cadre extérieur du lot (murs porteurs épais) -->
  <rect x="${LOT_X}" y="${LOT_Y}" width="${LOT_W}" height="${LOT_H}" fill="#FFFFFF" stroke="#1a1a1a" stroke-width="6" />

  <!-- Pièces (contours intérieurs fins) -->
  <polygon points="${poly(salon)}" fill="#F5F1E8" stroke="#444444" stroke-width="2" />
  <polygon points="${poly(chambre)}" fill="#F5F1E8" stroke="#444444" stroke-width="2" />
  <polygon points="${poly(sdb)}" fill="#EFF3F8" stroke="#444444" stroke-width="2" />

  <!-- Labels pièces (style plan d'architecte) -->
  <text x="${cSalon.x}" y="${cSalon.y - 8}" font-family="Helvetica, Arial, sans-serif" font-size="16" fill="#222222" text-anchor="middle" font-weight="bold">SALON</text>
  <text x="${cSalon.x}" y="${cSalon.y + 12}" font-family="Helvetica, Arial, sans-serif" font-size="11" fill="#555555" text-anchor="middle">28 m²</text>

  <text x="${cChambre.x}" y="${cChambre.y - 8}" font-family="Helvetica, Arial, sans-serif" font-size="16" fill="#222222" text-anchor="middle" font-weight="bold">CHAMBRE</text>
  <text x="${cChambre.x}" y="${cChambre.y + 12}" font-family="Helvetica, Arial, sans-serif" font-size="11" fill="#555555" text-anchor="middle">12 m²</text>

  <text x="${cSdb.x}" y="${cSdb.y - 4}" font-family="Helvetica, Arial, sans-serif" font-size="13" fill="#222222" text-anchor="middle" font-weight="bold">SDB</text>
  <text x="${cSdb.x}" y="${cSdb.y + 12}" font-family="Helvetica, Arial, sans-serif" font-size="10" fill="#555555" text-anchor="middle">4 m²</text>

  <!-- Portes (arcs simulés par des petits traits) -->
  <line x1="${LOT_X + LOT_W * 0.50}" y1="${LOT_Y + LOT_H * 0.30}" x2="${LOT_X + LOT_W * 0.55}" y2="${LOT_Y + LOT_H * 0.30}" stroke="#888888" stroke-width="2" />
  <line x1="${LOT_X + LOT_W * 0.50}" y1="${LOT_Y + LOT_H * 0.70}" x2="${LOT_X + LOT_W * 0.55}" y2="${LOT_Y + LOT_H * 0.70}" stroke="#888888" stroke-width="2" />

  <!-- Échelle/cotation en bas -->
  <line x1="${LOT_X}" y1="${LOT_Y + LOT_H + 20}" x2="${LOT_X + 100}" y2="${LOT_Y + LOT_H + 20}" stroke="#333333" stroke-width="1" />
  <line x1="${LOT_X}" y1="${LOT_Y + LOT_H + 15}" x2="${LOT_X}" y2="${LOT_Y + LOT_H + 25}" stroke="#333333" stroke-width="1" />
  <line x1="${LOT_X + 100}" y1="${LOT_Y + LOT_H + 15}" x2="${LOT_X + 100}" y2="${LOT_Y + LOT_H + 25}" stroke="#333333" stroke-width="1" />
  <text x="${LOT_X + 50}" y="${LOT_Y + LOT_H + 38}" font-family="Helvetica, Arial, sans-serif" font-size="10" fill="#555555" text-anchor="middle">5 mètres</text>

  <!-- Légende Nord -->
  <g transform="translate(${W - 60}, 50)">
    <circle cx="0" cy="0" r="20" fill="#FFFFFF" stroke="#333333" stroke-width="1" />
    <line x1="0" y1="-15" x2="0" y2="15" stroke="#333333" stroke-width="1" />
    <polygon points="0,-15 -4,-8 4,-8" fill="#333333" />
    <text x="0" y="3" font-family="Helvetica, Arial, sans-serif" font-size="11" fill="#333333" text-anchor="middle" font-weight="bold">N</text>
  </g>
</svg>`;

async function main() {
  const outPath = join(__dirname, "synthetic-plan.png");
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  writeFileSync(outPath, buf);
  console.log(`Plan PNG généré : ${outPath} (${buf.length} bytes)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
