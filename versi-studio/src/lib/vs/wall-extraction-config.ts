/**
 * s28 tour 10 — Configuration partagée extraction des murs.
 *
 * RAISON D'ÊTRE.
 * Tour 9 plateau 15/20 sur trade-off Inv A↔Inv C. Cause structurelle :
 * les murs vus par l'audit divergent légèrement de ceux vus par l'extract.
 *   - Audit : extractInternalWallSegments(minSegLen=5) → chain → filter ≥10
 *   - Extract : extractInternalWallSegments(minSegLen=10) → chain → filter ≥10
 * Différence : segments courts (5-10px, typiques des dashes pixel-tracing)
 * sont CHAÎNABLES entre eux pour former des murs ≥10px finaux. L'extract
 * les jetait trop tôt (avant chaînage) → polygons snappés sur murs absents
 * de l'audit → vertices à >5px → Inv C fail.
 *
 * Solution : constante partagée importée par audit ET extract. Plus jamais
 * de divergence silencieuse de paramètres entre les deux côtés du pipeline.
 *
 * CRITIQUE : si tu modifies une valeur ici, tu modifies les DEUX côtés
 * automatiquement. Lance `npx tsx scripts/s28-audit-strict.ts <pid>` après
 * tout changement pour vérifier que l'audit reste cohérent.
 */
export const WALL_EXTRACTION_CONFIG = {
  /**
   * Échelle PDF→PNG pour rastérisation et extraction vectorielle.
   * 3 = balance qualité/perf (1px PNG ≈ 0.33pt PDF).
   */
  scale: 3,

  /**
   * Mode multi-couleur : capture TOUS les strokes (orange enveloppe + gris
   * cloisons + noir contours) sauf cotes/hachures/cartouche.
   * Sur Muguets : enveloppe orange #ff6600 + cloisons gris #7f7f7f.
   */
  multiColor: true,

  /**
   * Filtre minimal AU MOMENT de l'extraction PDF.
   * 10 = valeur empirique tour 9 extract (cohérente avec minSegLenFinal).
   * Audit utilisait 5 → divergence. Tour 10 force 10 partout (audit + extract).
   */
  minSegLenExtraction: 10,

  /**
   * Chaînage segments colinéaires : gap maximum entre 2 segments pour les
   * fusionner en un seul mur long.
   */
  chainGapPx: 15,

  /**
   * Tolérance angulaire pour considérer 2 segments colinéaires.
   */
  chainAngleTolDeg: 3,

  /**
   * Tolérance latérale (déviation perpendiculaire) entre 2 segments.
   */
  chainLateralTolPx: 3,

  /**
   * Filtre minimal APRÈS chaînage. Définit le set "snap target" final :
   * les murs vus par audit Inv C, regularizer, dragOutliers et snap.
   * Doit être identique audit/extract → seuil unique partagé.
   */
  minSegLenFinal: 10,

  /**
   * Tolérance Inv C audit : un vertex est considéré "snappé" s'il est
   * à ≤ snapTolerancePx du mur le plus proche.
   */
  snapTolerancePx: 5,
} as const;
