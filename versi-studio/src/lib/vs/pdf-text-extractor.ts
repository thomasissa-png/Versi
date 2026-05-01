/**
 * Module s28.6 — Extraction directe des textes depuis le PDF vectoriel.
 *
 * Critique : sur les PDFs Muguets R+2 (et potentiellement d'autres), l'IA
 * gpt-4.1 OCR retourne `y_percent ≈ 95` pour tous les labels (hallucination
 * de position). Conséquence : tous les seeds flood-fill tombent dans la même
 * zone → polygones fusionnés.
 *
 * Solution : lire les textes depuis le PDF vectoriel (textContent de pdfjs-dist).
 * Avantages :
 *   - Positions PIXEL-PARFAITES (coords directs du PDF, pas d'OCR).
 *   - Lecture des labels micro (« ECS » 4pt) que l'IA OCR rate.
 *   - Déterministe, pas de retry.
 *
 * On extrait tous les TextItem du PDF, puis on filtre par position (dans le
 * polygone du lot) et longueur (>= 2 chars). Les blocs cartouche sont exclus
 * via leur position basse-droite (sous le polygone du lot).
 */

import type { Pt } from "./lot-vector-extractor";

export type PdfTextItem = {
  /** Texte exact (avec espaces, slashes). */
  text: string;
  /** Centroïde en pixels image (scale=3). */
  x: number;
  y: number;
  /** Largeur, hauteur de la string en pixels. */
  width: number;
  height: number;
  /** Surface en m² associée (si présente dans le texte). */
  surface_m2: number | null;
};

/**
 * Extrait tous les éléments texte d'un PDF, filtrés par bbox du lot.
 *
 * @param pdfBuffer Buffer PDF.
 * @param lotPolygonPx Polygone lot en pixels (scale=3) — tout texte dont le
 *   centre est hors de ce polygone est ignoré (cartouche, légende externe).
 * @param scale Échelle PDF→pixels (= scale du PNG cible).
 */
export async function extractTextItems(
  pdfBuffer: Buffer,
  lotPolygonPx: Pt[],
  scale: number = 3,
): Promise<PdfTextItem[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(pdfBuffer.length);
  data.set(pdfBuffer);
  const pdf = await pdfjs.getDocument({ data }).promise;
  if (pdf.numPages < 1) return [];
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  const vt = (viewport as unknown as { transform?: number[] }).transform;
  const initialTransform: [number, number, number, number, number, number] =
    vt && vt.length >= 6
      ? [vt[0], vt[1], vt[2], vt[3], vt[4], vt[5]]
      : [1, 0, 0, 1, 0, 0];

  const textContent = await page.getTextContent({ includeMarkedContent: false });

  // Bbox du lot pour pré-filtrage
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  for (const p of lotPolygonPx) {
    if (p.x < bx0) bx0 = p.x;
    if (p.x > bx1) bx1 = p.x;
    if (p.y < by0) by0 = p.y;
    if (p.y > by1) by1 = p.y;
  }
  // Pour le PIP test
  const pip = (px: number, py: number): boolean => {
    let inside = false;
    for (let i = 0, j = lotPolygonPx.length - 1; i < lotPolygonPx.length; j = i++) {
      const xi = lotPolygonPx[i].x, yi = lotPolygonPx[i].y;
      const xj = lotPolygonPx[j].x, yj = lotPolygonPx[j].y;
      const inter = (yi > py) !== (yj > py) &&
        px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-12) + xi;
      if (inter) inside = !inside;
    }
    return inside;
  };

  const results: PdfTextItem[] = [];

  for (const item of textContent.items) {
    // pdfjs TextItem : { str, transform: [a,b,c,d,e,f], width, height, ... }
    const ti = item as { str?: string; transform?: number[]; width?: number; height?: number };
    const str = (ti.str ?? "").trim();
    if (str.length === 0) continue;
    const tr = ti.transform;
    if (!tr || tr.length < 6) continue;

    // Le transform de TextItem est en page-space (PDF user units).
    // L'origine du texte est `(e, f)` (coin baseline).
    // On applique le viewport.transform pour convertir en CSS pixels page,
    // puis × scale pour pixels image.
    // Multiplication 3×3 : page_to_css = vt, item_origin = [tr[4], tr[5]]
    const ix = tr[4];
    const iy = tr[5];
    // viewport.transform = [a,b,c,d,e,f] = [scale_x, 0, 0, -scale_y, 0, page_height_px]
    // Application : (px, py) = (a*ix + c*iy + e, b*ix + d*iy + f)
    const px = (initialTransform[0] * ix + initialTransform[2] * iy + initialTransform[4]) * scale;
    const py = (initialTransform[1] * ix + initialTransform[3] * iy + initialTransform[5]) * scale;
    // width × scale (largeur en pixels image)
    const w = (ti.width ?? 0) * scale * Math.abs(initialTransform[0]);
    const h = (ti.height ?? 0) * scale * Math.abs(initialTransform[3]);
    // Centroïde du label : x + w/2, y - h/2 (baseline → centre vertical)
    const cx = px + w / 2;
    const cy = py - h / 2;

    // Pré-filtrage bbox
    if (cx < bx0 - 50 || cx > bx1 + 50 || cy < by0 - 50 || cy > by1 + 50) continue;
    // Test PIP (avec tolérance de 30px sur les bords pour rattraper les
    // labels collés au bord du lot)
    const inside =
      pip(cx, cy) ||
      pip(cx - 30, cy) ||
      pip(cx + 30, cy) ||
      pip(cx, cy - 30) ||
      pip(cx, cy + 30);
    if (!inside) continue;

    results.push({
      text: str,
      x: cx,
      y: cy,
      width: w,
      height: h,
      surface_m2: null,
    });
  }

  // Step 2 : associer les surfaces aux labels.
  // Sur les plans archi, chaque pièce est étiquetée comme :
  //   "SdB"          (ligne 1)
  //   "5.9 m²"       (ligne 2, juste en dessous)
  // On cherche pour chaque label "name" (sans "m²") le texte "X.X m²" le
  // plus proche en distance euclidienne (tolérance verticale 80 px).
  const isSurface = (s: string) => /^\d+([.,]\d+)?\s*m[²2]?$/i.test(s.replace(/\s+/g, " ").trim());
  const isName = (s: string) => !isSurface(s) && s.length >= 2;
  const namedItems = results.filter((r) => isName(r.text));
  const surfaceItems = results.filter((r) => isSurface(r.text));
  for (const ni of namedItems) {
    let bestD = Infinity;
    let bestSi: PdfTextItem | null = null;
    for (const si of surfaceItems) {
      const dx = si.x - ni.x;
      const dy = si.y - ni.y;
      // Surface USUALLY below the name (dy = baseline - baseline ≈ +font_size).
      // On accepte un décalage horizontal jusqu'à 1.5× la largeur du nom.
      if (Math.abs(dx) > Math.max(80, ni.width * 1.5)) continue;
      if (Math.abs(dy) > 80) continue;
      const d = Math.hypot(dx, dy);
      if (d < bestD) {
        bestD = d;
        bestSi = si;
      }
    }
    if (bestSi) {
      const m = bestSi.text.match(/(\d+([.,]\d+)?)/);
      if (m) ni.surface_m2 = parseFloat(m[1].replace(",", "."));
    }
  }
  return namedItems;
}

/**
 * Filtre/normalise les labels pour ne garder que les NOMS DE PIÈCES.
 *
 * Approche : whitelist par mots-clés (incluant les abréviations courantes
 * SdB, SDE, WC, ECS, etc.). Les abréviations techniques (LV, LL, TGBT) et
 * indicateurs (R+1, RDC, A885, dimensions cm) sont rejetés via une blacklist.
 *
 * Critique : ECS et TGBT SONT des pièces (espaces techniques) sur les plans
 * Muguets — on les garde. LV (lave-vaisselle) et LL (lave-linge) sont des
 * équipements et NE sont PAS des pièces — on les exclut.
 */
export function filterRoomLabels(items: PdfTextItem[]): PdfTextItem[] {
  // Mots-clés "this is a room" (déjà dans le nom OU un de ces tokens présent).
  // Note : TGBT n'est PAS dans cette liste — c'est un coffret électrique
  // (équipement, pas une pièce utilisable persona). ECS reste car c'est un
  // micro-local (chauffe-eau dans un placard fermé).
  const ROOM_KEYWORDS = [
    "sejour", "salon", "cuisine", "chambre", "sdb", "sde",
    "salle de bain", "salle de bains", "salle de douche",
    "wc", "toilettes", "entree", "couloir", "palier", "hall",
    "cellier", "placard", "rangement", "buanderie", "bureau",
    "ecs", "local", "sas", "dressing", "loggia",
  ];
  // Tokens à rejeter : indicateurs, dimensions, dates, étiquettes meta.
  const EXCLUDE_REGEX = /^(R\+?\d+|RDC|R0|R\+|A\d+|N°|P\s?\d+|ECH|Pr\d+|Pr0\d|projet|MUGUETS|LILLE|DOSSIER|EMETTEUR|PHASE|LOT|INDICE|DATE|AVP|ESQ|ARC|\d{2}\/\d{2}\/\d{2,4}|\d+\s?[xX]\s?\d+|m²)$/i;
  // Tokens "équipement" : explicitement REJETÉS (lave-vaisselle, lave-linge,
  // tableau électrique, etc. — pas des pièces utilisables persona).
  const EQUIPMENT_TOKENS = new Set(["LV", "LL", "LR", "FR", "ME", "TGBT"]);

  const looksLikeRoom = (s: string): boolean => {
    const norm = s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    return ROOM_KEYWORDS.some((kw) => norm.includes(kw));
  };

  // Nettoyage doublons : pdfjs renvoie souvent 2 fois le même text à la
  // même position. On dedupe par (text, x rounded, y rounded).
  const seen = new Set<string>();

  // Tokens "annotation technique" : on les garde TOUJOURS car ils
  // représentent souvent des micro-locaux fermés (placards techniques sous
  // l'escalier, etc.). Le flood-fill ignorera les labels qui tombent dans des
  // zones non-fermées.
  // void ANNOTATION_TOKENS;

  const accepted: PdfTextItem[] = [];
  for (const it of items) {
    const txt = it.text.trim();
    if (txt.length < 2 || txt.length > 40) continue;
    if (EXCLUDE_REGEX.test(txt)) continue;
    if (EQUIPMENT_TOKENS.has(txt.toUpperCase())) continue;
    // Pure number / dimension (3.49, 0.07, 1.77) → reject
    if (/^\d+([.,]\d+)?$/.test(txt)) continue;
    if (!looksLikeRoom(txt)) continue;
    const dedupKey = `${txt}|${Math.round(it.x / 10)}|${Math.round(it.y / 10)}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);
    accepted.push(it);
  }
  return accepted;
}
