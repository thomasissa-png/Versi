/**
 * Session s23 — Snap-to-Label post-processing.
 *
 * Problème adressé :
 * GPT-4.1 vision retourne des polygones room avec un drift positionnel
 * systémique ~10% en y (constaté 5 itérations prompt, non-fixable).
 * Score Position P00 = 0.26/3.
 *
 * Solution :
 * 1. OCR (Tesseract) extrait les labels textuels imprimés sur le plan
 *    ("SdB", "Chambre", "Séjour / cuisine", "Entrée", "Couloir", "ECS", ...)
 *    avec leurs coordonnées en % de l'image.
 * 2. Matching fuzzy (Levenshtein + normalisation accent/casse) entre
 *    chaque room.name_raw et les labels OCR.
 * 3. Translation du polygone : offset tel que centroid(polygon) = label.
 *    La forme est préservée, seule la position bouge.
 * 4. Fallback : pas de label → polygone original conservé.
 *
 * Usage dans extract/route.ts : APRES visual-verifier + hard-clip
 * building_outline, AVANT recalcul envelope.
 *
 * Performance : Tesseract fra ~3-5s/plan. Acceptable pour un pipeline
 * qui fait déjà 3 passes GPT-4.1 vision (~30-60s).
 */

// s24 — Type import statique uniquement (pas d'exécution au load).
// createWorker est importé dynamiquement dans getWorker pour éviter le crash
// Turbopack "Cannot find module tesseract.js/src/worker-script/node/index.js".
import type { Worker } from "tesseract.js";

// ─── Types ───────────────────────────────────────────────────────

export type OcrLabel = {
  text: string;
  /** Centre du bbox label en % de la largeur image */
  x_percent: number;
  /** Centre du bbox label en % de la hauteur image */
  y_percent: number;
  /** Confiance Tesseract 0-100 */
  confidence: number;
};

export type PolygonPoint = { x_percent: number; y_percent: number };

export type RoomForSnap = {
  id: string;
  name_raw: string;
  bounding_polygon: PolygonPoint[] | null;
};

export type SnapMatch = {
  room_id: string;
  room_name: string;
  label_text: string;
  distance: number; // Levenshtein distance entre noms normalisés
  drift_before: number; // Distance centroid→label AVANT snap (en % image)
  offset_x: number;
  offset_y: number;
};

export type SnapResult = {
  /** Rooms avec polygones éventuellement translatés */
  snapped: RoomForSnap[];
  /** Rooms sans label OCR matché (polygone inchangé) */
  unmatched: string[];
  /** Détail des snaps appliqués */
  matches: SnapMatch[];
  /** Labels OCR non utilisés (debug) */
  unusedLabels: OcrLabel[];
};

// ─── Worker singleton ────────────────────────────────────────────

let workerPromise: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      // s24 — import dynamique (voir header du fichier).
      const { createWorker } = await import("tesseract.js");
      const w = await createWorker("fra", 1, {
        // Silent logs (Tesseract.js est bruyant par défaut)
        logger: () => {},
      });
      return w;
    })();
  }
  return workerPromise;
}

/** À appeler en fin de pipeline si on veut libérer le worker. Non-bloquant. */
export async function terminateSnapWorker(): Promise<void> {
  if (workerPromise) {
    try {
      const w = await workerPromise;
      await w.terminate();
    } catch {
      // ignore
    }
    workerPromise = null;
  }
}

// ─── Normalisation et matching ───────────────────────────────────

/**
 * Normalise un texte pour matching : NFD → strip accents, lowercase,
 * strip ponctuation/espaces. "Séjour / cuisine" → "sejourcuisine".
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * Normalisation préservant les espaces (pour tokenization).
 * "Séjour / cuisine" → "sejour cuisine".
 */
function normalizeTokenized(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Levenshtein distance classique (itérative, DP O(mn)). */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const m = a.length;
  const n = b.length;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1, // insert
        prev[j] + 1, // delete
        prev[j - 1] + cost // substitute
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/**
 * Retourne la "similarité" d'un room name vs un label OCR.
 * Plus la valeur est basse, mieux c'est.
 *
 * Règles (par priorité, la première qui matche gagne) :
 * 1. Egalité normalisée → 0
 * 2. Substring (l'un contient l'autre) → 0.5
 * 3. Levenshtein normalisé ≤ 2 → distance réelle
 * 4. Tokens : au moins un token commun significatif (≥ 3 chars) → 1
 * 5. Sinon → Infinity (pas de match)
 *
 * Spéciaux : "sdb", "wc", "ecs" matchent exactement (abréviations).
 */
export function nameMatchScore(roomName: string, labelText: string): number {
  const rn = normalize(roomName);
  const ln = normalize(labelText);
  if (!rn || !ln) return Infinity;

  // 1. Egalité stricte
  if (rn === ln) return 0;

  // 2. Abréviations courtes (≤ 3 chars) : exigent match exact
  if (rn.length <= 3 || ln.length <= 3) {
    // "sdb" matche si label contient "sdb" comme token
    if (rn.length <= 3 && ln.includes(rn)) return 0.5;
    if (ln.length <= 3 && rn.includes(ln)) return 0.5;
    return Infinity;
  }

  // 3. Substring (room dans label ou label dans room)
  if (rn.includes(ln) || ln.includes(rn)) return 0.5;

  // 4. Levenshtein ≤ 2
  const lev = levenshtein(rn, ln);
  if (lev <= 2) return lev;

  // 5. Tokens communs significatifs (≥ 4 chars pour éviter bruit "sur", "avec", "et")
  //    Utiliser la version tokenisée (avec espaces préservés) pour splitter.
  const rnTok = normalizeTokenized(roomName);
  const lnTok = normalizeTokenized(labelText);
  const roomTokens = rnTok.split(/\s+/).filter((t) => t.length >= 4);
  const labelTokens = lnTok.split(/\s+/).filter((t) => t.length >= 4);
  for (const rt of roomTokens) {
    for (const lt of labelTokens) {
      if (rt === lt) return 1;
      // Levenshtein sur tokens ≤ 1 pour absorber OCR micro-erreurs
      if (Math.abs(rt.length - lt.length) <= 1 && levenshtein(rt, lt) <= 1) return 1;
    }
  }

  return Infinity;
}

// ─── Centroid utils ──────────────────────────────────────────────

export function centroid(p: PolygonPoint[]): { cx: number; cy: number } {
  let cx = 0;
  let cy = 0;
  for (const v of p) {
    cx += v.x_percent;
    cy += v.y_percent;
  }
  return { cx: cx / p.length, cy: cy / p.length };
}

function translate(p: PolygonPoint[], dx: number, dy: number): PolygonPoint[] {
  return p.map((pt) => ({
    x_percent: Math.max(0, Math.min(100, pt.x_percent + dx)),
    y_percent: Math.max(0, Math.min(100, pt.y_percent + dy)),
  }));
}

// ─── OCR ─────────────────────────────────────────────────────────

/** Vocabulaire des labels de pièce attendus (normalisés, sans accents). */
const ROOM_LABEL_VOCAB = new Set<string>([
  "chambre",
  "sejour",
  "cuisine",
  "salon",
  "entree",
  "couloir",
  "palier",
  "degagement",
  "sdb",
  "salledebain",
  "wc",
  "toilettes",
  "ecs",
  "tgbt",
  "cellier",
  "buanderie",
  "rangement",
  "dressing",
  "placard",
  "loggia",
  "terrasse",
  "balcon",
  "jardin",
  "garage",
  "bureau",
  "suite",
  "lingerie",
  "atelier",
]);

/**
 * Lance Tesseract sur imageBuffer et retourne les labels avec coords %.
 *
 * Stratégie :
 * - Niveau **word** (pas line) pour bbox précis et isolation du texte.
 *   Les lignes Tesseract sur plans d'architecture sont souvent bruitées
 *   (cotes, flèches, légendes fusionnées). Les mots individuels sont plus fiables.
 * - Filtres :
 *   * confidence < 60 → rejeté
 *   * purement numérique → rejeté (cote du plan)
 *   * contient "m²"/"m2" → rejeté (surface affichée)
 *   * ratio chiffres/lettres > 50% → rejeté
 *   * mot connu dans ROOM_LABEL_VOCAB → priorité (gardé même à conf basse 50-60)
 * - Le texte renvoyé est le MOT brut (pas la ligne). Le matching via
 *   nameMatchScore gère ensuite fuzzy / substring.
 */
export async function detectLabels(
  imageBuffer: Buffer,
  imgW: number,
  imgH: number
): Promise<OcrLabel[]> {
  const worker = await getWorker();
  // Demande explicite des `blocks` (arborescence Block → Paragraph → Line → Word).
  // Par défaut tesseract.js v7 ne retourne que `text` sur la page.
  const { data } = await worker.recognize(
    imageBuffer,
    {},
    { blocks: true, text: true },
  );

  const labels: OcrLabel[] = [];
  const blocks = data.blocks || [];

  for (const block of blocks) {
    for (const paragraph of block.paragraphs || []) {
      for (const line of paragraph.lines || []) {
        for (const word of line.words || []) {
          const text = (word.text || "").trim();
          if (!text) continue;
          const conf = word.confidence ?? 0;

          const digitCount = (text.match(/\d/g) || []).length;
          const letterCount = (
            text.match(/[a-zA-ZàâäéèêëïîôöùûüçÀÂÄÉÈÊËÏÎÔÖÙÛÜÇ]/g) || []
          ).length;
          if (letterCount < 2) continue; // rejette "A", "."
          if (/m\s*[²2]/.test(text)) continue; // "25m2", "10m²"
          if (digitCount > letterCount) continue; // "R+1", "3.20"

          // Seuil de confiance adaptatif : mot-clé connu → seuil 40,
          // sinon → seuil 60.
          const norm = normalize(text);
          const isVocab = ROOM_LABEL_VOCAB.has(norm);
          const minConf = isVocab ? 40 : 60;
          if (conf < minConf) continue;

          const bbox = word.bbox;
          if (!bbox) continue;
          const cxPx = (bbox.x0 + bbox.x1) / 2;
          const cyPx = (bbox.y0 + bbox.y1) / 2;
          labels.push({
            text,
            x_percent: (cxPx / imgW) * 100,
            y_percent: (cyPx / imgH) * 100,
            confidence: conf,
          });
        }
      }
    }
  }

  return labels;
}

// ─── Snap core ───────────────────────────────────────────────────

/**
 * Pour chaque room avec bounding_polygon, cherche le meilleur label OCR
 * et translate le polygone pour que son centroid = position du label.
 *
 * Stratégie matching :
 * - Assignation gloutonne : pour chaque room, on prend le label avec
 *   meilleur `nameMatchScore` ET la distance spatiale la plus faible
 *   en cas d'égalité de score textuel (un plan peut avoir 2 "Chambre").
 * - Un label ne peut être consommé qu'une fois.
 *
 * Post-check : si le snap introduit un drift déraisonnable (> 20% image),
 * on l'abandonne (label OCR probablement mal localisé).
 */
export function snapRoomsToLabels(
  rooms: RoomForSnap[],
  ocrLabels: OcrLabel[],
  opts: { maxSnapDistancePct?: number } = {}
): SnapResult {
  const MAX_SNAP = opts.maxSnapDistancePct ?? 20; // si le snap demande >20% de translation, refuser

  const snapped: RoomForSnap[] = rooms.map((r) => ({ ...r }));
  const matches: SnapMatch[] = [];
  const unmatched: string[] = [];
  const usedLabels = new Set<number>();

  // Phase 1 : Pour chaque room, calculer la liste de labels candidats triés
  // par score textuel ASC puis distance spatiale ASC.
  type Candidate = {
    roomIdx: number;
    labelIdx: number;
    textScore: number;
    spatialDist: number;
  };
  const candidates: Candidate[] = [];
  for (let ri = 0; ri < rooms.length; ri++) {
    const r = rooms[ri];
    if (!r.bounding_polygon || r.bounding_polygon.length < 3) continue;
    const c = centroid(r.bounding_polygon);
    for (let li = 0; li < ocrLabels.length; li++) {
      const lab = ocrLabels[li];
      const ts = nameMatchScore(r.name_raw, lab.text);
      if (!isFinite(ts)) continue;
      const sd = Math.hypot(c.cx - lab.x_percent, c.cy - lab.y_percent);
      candidates.push({
        roomIdx: ri,
        labelIdx: li,
        textScore: ts,
        spatialDist: sd,
      });
    }
  }
  // Tri : textScore ASC, puis spatialDist ASC (un meilleur texte gagne toujours
  // sur un meilleur emplacement).
  candidates.sort((a, b) => {
    if (a.textScore !== b.textScore) return a.textScore - b.textScore;
    return a.spatialDist - b.spatialDist;
  });

  const matchedRooms = new Set<number>();

  // Phase 2 : Assignation gloutonne
  for (const cand of candidates) {
    if (matchedRooms.has(cand.roomIdx)) continue;
    if (usedLabels.has(cand.labelIdx)) continue;

    const r = snapped[cand.roomIdx];
    const poly = r.bounding_polygon;
    if (!poly || poly.length < 3) continue;
    const lab = ocrLabels[cand.labelIdx];
    const c = centroid(poly);
    const dx = lab.x_percent - c.cx;
    const dy = lab.y_percent - c.cy;
    const snapDist = Math.hypot(dx, dy);

    // Refuser les snaps aberrants (label OCR probablement mal localisé ou
    // faux positif ex: "Chambre 3" distant)
    if (snapDist > MAX_SNAP) {
      continue; // ne consomme ni le label ni la room
    }

    const newPoly = translate(poly, dx, dy);
    snapped[cand.roomIdx].bounding_polygon = newPoly;

    matches.push({
      room_id: r.id,
      room_name: r.name_raw,
      label_text: lab.text,
      distance: cand.textScore,
      drift_before: snapDist,
      offset_x: dx,
      offset_y: dy,
    });
    matchedRooms.add(cand.roomIdx);
    usedLabels.add(cand.labelIdx);
  }

  // Rooms non matchées (dont celles sans polygone initial)
  for (let ri = 0; ri < rooms.length; ri++) {
    if (!matchedRooms.has(ri)) unmatched.push(rooms[ri].id);
  }

  const unusedLabels = ocrLabels.filter((_, i) => !usedLabels.has(i));

  return { snapped, unmatched, matches, unusedLabels };
}
