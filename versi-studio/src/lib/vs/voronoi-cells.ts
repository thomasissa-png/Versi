/**
 * Module s28.5 fallback — Voronoï clippé pour générer des polygones de pièces
 * à partir de positions de labels + polygone du lot.
 *
 * **Pourquoi ce fallback** : sur certains PDFs (Muguets typiquement), les murs
 * internes ne sont pas dessinés comme des polylignes fermées qui encadrent
 * exactement chaque pièce. Le graphe planaire détecte alors des faces résiduelles
 * minuscules autour du mobilier au lieu des grandes pièces réelles. Dans ce cas,
 * la position du label est l'information la plus fiable.
 *
 * Algorithme : pour chaque label Li, le polygone Voronoï est l'intersection :
 *   lotPolygon ∩ ⋂_{j≠i} { p : dist(p, Li) ≤ dist(p, Lj) }
 *
 * Le demi-plan `dist(p, Li) ≤ dist(p, Lj)` est délimité par la bissectrice
 * perpendiculaire au segment LiLj passant par son milieu. On clippe le polygone
 * lot par chacune de ces bissectrices via Sutherland-Hodgman.
 *
 * Propriétés garanties :
 *   - Chaque label devient EXACTEMENT 1 polygone (count exact)
 *   - Les polygones tessellent le lot (pas de chevauchement, pas de trous)
 *   - Le label est strictement DANS son polygone (par construction)
 *
 * Limitation : les frontières des polygones sont les bissectrices entre labels —
 * pas forcément les vrais murs. Mais c'est nettement mieux qu'un polygone
 * arbitraire ou un bbox IA halluciné. L'utilisateur peut ajuster via les handles.
 */

export type Pt2 = { x: number; y: number };

/**
 * Clip un polygone convexe ou non par un demi-plan défini par :
 *   ax + by + c <= 0  (côté "négatif" gardé)
 *
 * Sutherland-Hodgman fonctionne pour clipper un polygone par un demi-plan
 * (chaque arête du clipper). Ici on n'a qu'une seule arête (la bissectrice).
 */
function clipPolygonByHalfPlane(
  polygon: Pt2[],
  a: number,
  b: number,
  c: number,
): Pt2[] {
  if (polygon.length === 0) return [];
  const inside = (p: Pt2): number => a * p.x + b * p.y + c;
  const result: Pt2[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const cur = polygon[i];
    const prev = polygon[(i - 1 + polygon.length) % polygon.length];
    const dCur = inside(cur);
    const dPrev = inside(prev);
    const curIn = dCur <= 1e-9;
    const prevIn = dPrev <= 1e-9;
    if (curIn) {
      if (!prevIn) {
        // entrée : intersection bissectrice avec [prev, cur]
        const t = dPrev / (dPrev - dCur);
        result.push({
          x: prev.x + t * (cur.x - prev.x),
          y: prev.y + t * (cur.y - prev.y),
        });
      }
      result.push(cur);
    } else if (prevIn) {
      // sortie
      const t = dPrev / (dPrev - dCur);
      result.push({
        x: prev.x + t * (cur.x - prev.x),
        y: prev.y + t * (cur.y - prev.y),
      });
    }
  }
  return result;
}

/**
 * Calcule la cellule Voronoï du point `i` parmi `points`, clippée au polygone
 * `clipPolygon`. Retourne un polygone (peut être vide si i hors clipPolygon).
 */
export function voronoiCellClipped(
  points: Pt2[],
  i: number,
  clipPolygon: Pt2[],
): Pt2[] {
  if (i < 0 || i >= points.length) return [];
  let cell = clipPolygon.slice();
  const Pi = points[i];
  for (let j = 0; j < points.length; j++) {
    if (j === i) continue;
    const Pj = points[j];
    // Bissectrice entre Pi et Pj : ensemble des points équidistants.
    // dist(p, Pi)² = dist(p, Pj)² développé donne :
    //   2(Pj.x - Pi.x)·x + 2(Pj.y - Pi.y)·y = |Pj|² - |Pi|²
    // Côté Pi gardé : dist(p, Pi)² <= dist(p, Pj)², soit :
    //   2(Pj.x - Pi.x)·x + 2(Pj.y - Pi.y)·y - (|Pj|² - |Pi|²) <= 0
    // Sous forme `ax + by + c <= 0` :
    //   a = Pj.x - Pi.x, b = Pj.y - Pi.y, c = -(|Pj|² - |Pi|²)/2 = (|Pi|² - |Pj|²)/2
    // Vérification : Pi=(0,0), Pj=(10,0) → a=10, b=0, c=-50 → 10x-50<=0 → x<=5 ✓ (côté Pi)
    const a = Pj.x - Pi.x;
    const b = Pj.y - Pi.y;
    const c =
      ((Pi.x * Pi.x + Pi.y * Pi.y) - (Pj.x * Pj.x + Pj.y * Pj.y)) / 2;
    cell = clipPolygonByHalfPlane(cell, a, b, c);
    if (cell.length === 0) return [];
  }
  return cell;
}

/**
 * Calcule TOUTES les cellules Voronoï pour un set de points, chacune clippée
 * au polygone du lot. Garantit count(cells) == count(points), bien que certaines
 * puissent être vides si le point est hors du lot.
 */
export function voronoiCellsAll(
  points: Pt2[],
  lotPolygon: Pt2[],
): Pt2[][] {
  return points.map((_, i) => voronoiCellClipped(points, i, lotPolygon));
}
