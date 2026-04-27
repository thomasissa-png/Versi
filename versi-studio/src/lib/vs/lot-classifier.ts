/**
 * Module 5/5 — Identification lots vs communs (s27 refonte pipeline plan-extractor).
 *
 * Verbatim Thomas s27 : « On doit être capable d'analyser les différences entre
 * espaces communs et lots. »
 *
 * Pipeline d'entrée :
 *   M4 (`wall-graph.ts`) → Polygon[] (pièces détectées par face traversal)
 *
 * Étapes M5 :
 *   1. OCR labels Tesseract sur le PNG rasterisé (pattern `label-snap.ts`).
 *   2. Pour chaque pièce, trouver le label le plus proche du centroïde.
 *   3. Classification par mot pivot métier :
 *        COMMUN si label ∈ {escalier, palier, hall, ascenseur, LT, ...}
 *        LOT    si label ∈ {T1..T5, studio, appartement, RDC, R+1, ...}
 *        sinon  → INDETERMINE → règle topologique (entouré de communs ?).
 *   4. Groupement lots : union-find sur graphe d'adjacence (mur partagé ⇒ même
 *      lot SAUF si les labels lots distincts type "T2 R+1" / "T3 R+2").
 *   5. Calcul envelope : edge-graph filtering — les arêtes appartenant à 1 seule
 *      room du lot = murs externes → polygone enveloppe.
 *
 * Anti-pattern P0 s27 : aucun fallback silencieux. OCR fail → throw
 * `LotClassifierError`. Pas de fallback sur GPT-4.1 Vision.
 *
 * Spec : docs/ia/s27-vs-pipeline-refonte-architecture.md (Module 5).
 */

import type { Polygon } from "./wall-graph";

// ─── Types ───────────────────────────────────────────────────────

export type OcrLabelLite = {
  text: string;
  /** Centre du bbox label en coordonnées pixel (espace raster). */
  x: number;
  y: number;
  confidence: number;
};

export type OcrFn = (pageImageBuffer: Buffer) => Promise<OcrLabelLite[]>;

export type RoomClassification = "LOT" | "COMMUN" | "INDETERMINE";

export type ClassifiedRoom = {
  polygon: Polygon;
  label: string | null;
  classification: RoomClassification;
  /** Index dans le tableau d'origine — utile pour traçabilité. */
  index: number;
};

export type Lot = {
  id: string;
  name: string;
  rooms: Polygon[];
  /** Enveloppe externe du lot (murs externes uniquement, exclut les murs intérieurs entre rooms). */
  envelope: Polygon;
  label?: string;
};

export type LotClassificationResult = {
  lots: Lot[];
  communs: Polygon[];
  /** Détail debug : pour chaque room, label trouvé + classification. */
  classified: ClassifiedRoom[];
};

export type LotClassifierErrorCode = "ocr_failed" | "no_rooms";

export class LotClassifierError extends Error {
  constructor(
    public readonly code: LotClassifierErrorCode,
    message: string,
  ) {
    super(`[${code}] ${message}`);
    this.name = "LotClassifierError";
  }
}

// ─── Mots pivots métier (s24 — règles claires, normalisées) ──────

const COMMUN_REGEX =
  /escalier|palier|hall|ascenseur|local\s+technique|cage\s+d'?escalier|couloir\s+commun|local\s+poubelle|local\s+v[eé]lo|circulation\s+commune|vide-?ordures|gaine|\blt\b/i;

const LOT_REGEX =
  /\bT\d\b|studio|appart|\bRDC\b|\bR\+\d\b|[ée]tage|appartement|\blot\s*\d+/i;

// ─── Utils géométriques ──────────────────────────────────────────

function centroid(points: Array<{ x: number; y: number }>): { x: number; y: number } {
  let cx = 0;
  let cy = 0;
  for (const p of points) {
    cx += p.x;
    cy += p.y;
  }
  return { x: cx / points.length, y: cy / points.length };
}

/** Clé canonique d'une arête (paire ordonnée de nodeIds). */
function edgeKey(a: number, b: number): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Liste les arêtes (paires de nodeIds successifs) d'un polygone. */
function polygonEdges(p: Polygon): string[] {
  const out: string[] = [];
  const n = p.nodeIds.length;
  for (let i = 0; i < n; i++) {
    out.push(edgeKey(p.nodeIds[i], p.nodeIds[(i + 1) % n]));
  }
  return out;
}

// ─── OCR par défaut (Tesseract dynamique, pattern label-snap.ts) ─

async function defaultOcrFn(pageImageBuffer: Buffer): Promise<OcrLabelLite[]> {
  // Import dynamique pour éviter le crash Turbopack au load.
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("fra", 1, {
    logger: () => {},
  });
  try {
    const { data } = await worker.recognize(
      pageImageBuffer,
      {},
      { blocks: true, text: true },
    );
    const labels: OcrLabelLite[] = [];
    const blocks = data.blocks || [];
    for (const block of blocks) {
      for (const paragraph of block.paragraphs || []) {
        for (const line of paragraph.lines || []) {
          for (const word of line.words || []) {
            const text = (word.text || "").trim();
            if (!text) continue;
            const conf = word.confidence ?? 0;
            if (conf < 50) continue;
            const bbox = word.bbox;
            if (!bbox) continue;
            const cx = (bbox.x0 + bbox.x1) / 2;
            const cy = (bbox.y0 + bbox.y1) / 2;
            labels.push({ text, x: cx, y: cy, confidence: conf });
          }
        }
      }
    }
    return labels;
  } finally {
    try {
      await worker.terminate();
    } catch {
      // ignore
    }
  }
}

// ─── Classification par mot pivot ────────────────────────────────

function classifyByLabel(label: string | null): RoomClassification {
  if (!label) return "INDETERMINE";
  if (COMMUN_REGEX.test(label)) return "COMMUN";
  if (LOT_REGEX.test(label)) return "LOT";
  return "INDETERMINE";
}

// ─── Adjacence rooms (mur partagé) ───────────────────────────────

/**
 * Construit la map roomIndex → indices des rooms adjacentes (≥ 1 arête commune).
 */
function buildAdjacency(rooms: Polygon[]): number[][] {
  const edgeSets = rooms.map((r) => new Set(polygonEdges(r)));
  const adj: number[][] = rooms.map(() => []);
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      let shared = false;
      for (const e of edgeSets[i]) {
        if (edgeSets[j].has(e)) {
          shared = true;
          break;
        }
      }
      if (shared) {
        adj[i].push(j);
        adj[j].push(i);
      }
    }
  }
  return adj;
}

// ─── Règle topologique pour INDETERMINE ─────────────────────────

/**
 * Si > 50 % des voisins d'une pièce INDETERMINE sont COMMUN → COMMUN.
 * Sinon → LOT (par défaut conservateur : on préfère intégrer une pièce
 * inconnue dans un lot plutôt que la perdre en commun).
 */
function resolveIndetermine(
  classified: ClassifiedRoom[],
  adj: number[][],
): void {
  for (let i = 0; i < classified.length; i++) {
    if (classified[i].classification !== "INDETERMINE") continue;
    const neighbors = adj[i];
    if (neighbors.length === 0) {
      classified[i].classification = "LOT";
      continue;
    }
    const communCount = neighbors.filter(
      (n) => classified[n].classification === "COMMUN",
    ).length;
    classified[i].classification =
      communCount / neighbors.length > 0.5 ? "COMMUN" : "LOT";
  }
}

// ─── Union-find pour groupement lots ─────────────────────────────

class UnionFind {
  private parent: number[];
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
  }
  find(x: number): number {
    if (this.parent[x] !== x) this.parent[x] = this.find(this.parent[x]);
    return this.parent[x];
  }
  union(a: number, b: number): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent[ra] = rb;
  }
}

// ─── Calcul envelope du lot (edge-graph filtering) ───────────────

/**
 * Enveloppe externe d'un groupe de pièces : on liste toutes les arêtes
 * de toutes les pièces, on garde celles qui n'apparaissent QUE 1 fois
 * (= mur externe), puis on chaîne les arêtes restantes en polygone.
 *
 * Si le chaînage échoue (cas pathologique : groupe non simplement connexe
 * type donut), on retombe sur la première pièce du lot comme envelope —
 * pas idéal mais évite un crash. Documenté pour M5+1.
 */
function computeEnvelope(rooms: Polygon[]): Polygon {
  if (rooms.length === 1) return rooms[0];

  // Compte des arêtes (par clé canonique) + map vers (nodeA, nodeB) physique.
  const edgeCount = new Map<string, number>();
  const edgePair = new Map<string, [number, number]>();
  // Coordonnées : on doit aussi récupérer (x,y) pour chaque nodeId.
  const nodeCoord = new Map<number, { x: number; y: number }>();
  for (const r of rooms) {
    for (let i = 0; i < r.nodeIds.length; i++) {
      nodeCoord.set(r.nodeIds[i], r.points[i]);
      const a = r.nodeIds[i];
      const b = r.nodeIds[(i + 1) % r.nodeIds.length];
      const k = edgeKey(a, b);
      edgeCount.set(k, (edgeCount.get(k) ?? 0) + 1);
      if (!edgePair.has(k)) edgePair.set(k, [a, b]);
    }
  }

  // Arêtes externes = celles présentes 1 seule fois.
  const externalEdges: Array<[number, number]> = [];
  for (const [k, count] of edgeCount.entries()) {
    if (count === 1) externalEdges.push(edgePair.get(k)!);
  }

  if (externalEdges.length === 0) {
    return rooms[0];
  }

  // Chaînage des arêtes : on construit une adjacence node→nodes voisins.
  const neigh = new Map<number, number[]>();
  for (const [a, b] of externalEdges) {
    if (!neigh.has(a)) neigh.set(a, []);
    if (!neigh.has(b)) neigh.set(b, []);
    neigh.get(a)!.push(b);
    neigh.get(b)!.push(a);
  }

  // Walk : démarrer depuis n'importe quel node ayant ≥ 2 voisins externes.
  const start = externalEdges[0][0];
  const orderedNodeIds: number[] = [start];
  const visitedEdges = new Set<string>();
  let prev = -1;
  let cur = start;
  while (true) {
    const ns = neigh.get(cur) ?? [];
    let next = -1;
    for (const n of ns) {
      const k = edgeKey(cur, n);
      if (visitedEdges.has(k)) continue;
      if (n === prev && ns.length > 1) continue;
      next = n;
      break;
    }
    if (next === -1) break;
    visitedEdges.add(edgeKey(cur, next));
    if (next === start) break;
    orderedNodeIds.push(next);
    prev = cur;
    cur = next;
    if (orderedNodeIds.length > externalEdges.length + 2) break; // safeguard
  }

  const points = orderedNodeIds.map((id) => nodeCoord.get(id)!);
  const signedArea = computeSignedArea(points);

  return {
    nodeIds: orderedNodeIds,
    points,
    signedArea,
    area: Math.abs(signedArea),
  };
}

function computeSignedArea(points: Array<{ x: number; y: number }>): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

// ─── Helper : label le plus proche d'un centroïde ───────────────

function findClosestLabel(
  c: { x: number; y: number },
  labels: OcrLabelLite[],
): OcrLabelLite | null {
  if (labels.length === 0) return null;
  let best: OcrLabelLite | null = null;
  let bestD = Infinity;
  for (const l of labels) {
    const d = Math.hypot(c.x - l.x, c.y - l.y);
    if (d < bestD) {
      bestD = d;
      best = l;
    }
  }
  return best;
}

// ─── Entry point ─────────────────────────────────────────────────

export type ClassifyOptions = {
  ocrFn?: OcrFn;
};

/**
 * Classifie les pièces d'un plan en LOTS et COMMUNS.
 *
 * @throws LotClassifierError("no_rooms") si rooms vide.
 * @throws LotClassifierError("ocr_failed") si l'OCR plante.
 */
export async function classifyRooms(
  rooms: Polygon[],
  pageImageBuffer: Buffer,
  options: ClassifyOptions = {},
): Promise<LotClassificationResult> {
  if (!rooms || rooms.length === 0) {
    throw new LotClassifierError("no_rooms", "Aucune pièce à classifier");
  }
  if (!pageImageBuffer || pageImageBuffer.length === 0) {
    throw new LotClassifierError("ocr_failed", "pageImageBuffer vide ou invalide");
  }

  const ocrFn = options.ocrFn ?? defaultOcrFn;
  let labels: OcrLabelLite[];
  try {
    labels = await ocrFn(pageImageBuffer);
  } catch (e) {
    throw new LotClassifierError(
      "ocr_failed",
      `OCR a échoué : ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  // Étape 1+2 : labels par room + classification primaire.
  const classified: ClassifiedRoom[] = rooms.map((polygon, index) => {
    const c = centroid(polygon.points);
    const closest = findClosestLabel(c, labels);
    const label = closest?.text ?? null;
    return {
      polygon,
      label,
      classification: classifyByLabel(label),
      index,
    };
  });

  // Étape 3 : adjacence + résolution INDETERMINE.
  const adj = buildAdjacency(rooms);
  resolveIndetermine(classified, adj);

  // Étape 4 : groupement lots via union-find.
  // Règle : 2 rooms LOT adjacentes ⇒ même lot SAUF si labels distincts non vides.
  const uf = new UnionFind(rooms.length);
  for (let i = 0; i < classified.length; i++) {
    if (classified[i].classification !== "LOT") continue;
    for (const j of adj[i]) {
      if (classified[j].classification !== "LOT") continue;
      const li = classified[i].label?.trim() ?? "";
      const lj = classified[j].label?.trim() ?? "";
      // Si les 2 labels sont identifiés ET différents → 2 lots distincts.
      if (li && lj && li !== lj) continue;
      uf.union(i, j);
    }
  }

  // Regrouper par racine union-find.
  const groups = new Map<number, number[]>();
  for (let i = 0; i < classified.length; i++) {
    if (classified[i].classification !== "LOT") continue;
    const root = uf.find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(i);
  }

  // Étape 5 : construction des Lot[] avec envelope.
  let lotCounter = 1;
  const lots: Lot[] = [];
  for (const [, indices] of groups) {
    const lotRooms = indices.map((idx) => classified[idx].polygon);
    const envelope = computeEnvelope(lotRooms);
    // Label représentatif : premier label non vide trouvé dans le groupe.
    const repLabel = indices
      .map((idx) => classified[idx].label)
      .find((l): l is string => !!l && l.trim().length > 0);
    const id = `lot_${lotCounter++}`;
    lots.push({
      id,
      name: repLabel ?? id,
      rooms: lotRooms,
      envelope,
      label: repLabel,
    });
  }

  const communs = classified
    .filter((c) => c.classification === "COMMUN")
    .map((c) => c.polygon);

  return { lots, communs, classified };
}
