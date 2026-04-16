# Spec F05 — Surface m² temps réel pendant drag

**Date** : 2026-04-16
**Session** : versi-s19 (résidu P1 UX Étape 2 Lots — reporté de s17 → s18 → s19)
**Persona** : Thomas, marchand de biens (outil interne)
**Composant cible** : `versi-studio/src/components/vs/PlanCanvas.tsx`
**Statut** : SPEC — À valider par Thomas avant implémentation

---

## 1. Contexte et user need

Thomas dessine un rectangle sur un plan PDF/PNG pour délimiter un lot (studio, T2, T4…).
Pendant ce dessin, il travaille visuellement — il place un coin, étire le rectangle — mais il ne sait pas si la surface obtenue est cohérente avec l'usage prévu tant qu'il ne lâche pas la souris.

Besoin : afficher en overlay, à côté du curseur, la surface en m² calculée EN TEMPS RÉEL pendant le drag (mousemove) et pendant le resize (poignées). L'overlay disparaît au mouseup.

Ce feedback immédiat permet à Thomas de :
1. Ajuster la taille avant de relâcher (pas de va-et-vient corrigeant lot par lot après coup)
2. Valider d'un coup d'oeil que "25m² = studio correct" ou "80m² = T4 correct"
3. Travailler plus vite sur les découpages de grands immeubles (10-20 lots)

Note : cet outil est INTERNE à Thomas. Esthétique secondaire, efficacité primaire.

## 2. Critère de succès

| Critère | Vérification binaire |
|---|---|
| L'overlay m² s'affiche pendant drag (move + resize) | Oui/Non — visible dès le 1er pixel de déplacement |
| L'overlay disparaît au mouseup / mouseleave | Oui/Non — état nettoyé |
| La valeur est correcte à ±5% de la surface réelle | Oui/Non — test manuel avec un lot dont la surface est connue |
| Plan sans calibration → overlay affiche "— m²" et non une valeur fausse | Oui/Non |
| Pas de lag perceptible (> 16ms de délai visuel) sur drag continu | Oui/Non — testé via requestAnimationFrame throttle |

## 3. Décision calibration

### Option retenue : Calibration par plan (Option 1)

**Recommandation : Option 1 — calibration manuelle par plan, ratio stocké en `vs_plans.m2_per_pixel`.**

**Justification :**
- Option 3 (OCR/IA) : hors scope V1, latence, dépendance modèle externe. Report en V2.
- Option 2 (par projet) : insuffisant dès qu'un projet a des plans d'étages différents (RDC vs étage 1 d'un même immeuble ont souvent des échelles PDF différentes selon la source de scan). Risque d'erreur silencieuse de ±20% si Thomas colle un plan agrandi.
- Option 1 : 1 calibration par plan, ~30 secondes de friction, erreur contenue à ±2-5% (erreur de geste sur la ligne de référence — acceptable pour Thomas dont l'objectif est "T2 ou T4 ?" pas "25.3m² exact").

### Flow de calibration (déclenchement unique par plan)

1. Au moment de l'affichage du canvas, si `vs_plans.m2_per_pixel IS NULL` → bannière non bloquante en haut du canvas : "Calibrez ce plan pour afficher les surfaces m² — Tracer une ligne de référence"
2. Thomas clique sur "Calibrer" → mode calibration activé (curseur crosshair, instructions inline)
3. Thomas trace une ligne de référence (2 clics : point A → point B) sur un élément connu (mur, porte de 90cm, couloir de 1m)
4. Une modale légère s'ouvre : "Cette ligne mesure [  ] mètres" → Thomas saisit la valeur (ex: 5)
5. Calcul : `m2_per_pixel = (longueur_m / longueur_px)²` — le ratio est en m²/px² (pas m/px)
6. `PATCH /api/vs/plans/:id` avec `{ m2_per_pixel: valeur }` → sauvegarde en DB
7. Mode calibration désactivé. L'overlay m² est maintenant actif pour ce plan.

**Précision attendue** : ±3-5% selon la précision du tracé. Suffisant pour Thomas (décision de découpage, pas de cadastre).

**Multi-étages** : chaque plan (`vs_plans`) a son propre `m2_per_pixel`. Si Thomas importe RDC et Étage 1 séparément, chaque plan se calibre indépendamment.

## 4. Modèle DB

### Champ à ajouter sur `vs_plans`

```sql
-- Migration : ajouter m2_per_pixel sur vs_plans
ALTER TABLE vs_plans
  ADD COLUMN m2_per_pixel DECIMAL(12, 6) NULL DEFAULT NULL;

COMMENT ON COLUMN vs_plans.m2_per_pixel IS
  'Ratio de calibration : m² par pixel² (surface réelle / surface pixel). NULL = non calibré.
   Calculé via : (longueur_ref_m / longueur_ref_px)^2
   Exemple : ligne de 5m = 250px → (5/250)^2 = 0.0004 m²/px²';
```

### Lecture côté client

Le champ `m2_per_pixel` est déjà retourné dans le fetch du plan (à ajouter dans la query SELECT). Pas de nouvel endpoint nécessaire si le plan est déjà chargé dans le composant parent (`PlanStudio` ou équivalent).

### Transmission à PlanCanvas

Ajouter `m2PerPixel: number | null` dans `PlanCanvasProps`. La prop est `null` si non calibré → overlay affiche "— m²".

## 5. UI overlay drag

### Pattern technique retenu : `<div>` absolute positionné en sortie de canvas

Le canvas est dans un `<div ref={containerRef} className="relative ...">`. Un `<div>` overlay est ajouté comme frère du `<canvas>` dans ce conteneur, positionné en `absolute`, mis à jour via état React.

**Pourquoi pas `ctx.fillText` sur le canvas lui-même ?**
Le canvas est redessiné via `requestAnimationFrame` — injecter le texte dans `draw()` fonctionnerait techniquement mais couple l'overlay au cycle de rendu complet. La `<div>` overlay est plus simple, évite la re-declaration de la police dans `ctx`, et respecte mieux la séparation des responsabilités.

### Spec visuelle de l'overlay

```
Position    : 12px à droite du coin bas-droit du rectangle en cours de drag
              (si déborde du canvas côté droit : basculer à gauche du curseur)
Contenu     : "25 m²"  (arrondi à l'entier le plus proche, pas de décimale)
              ou "— m²" si m2PerPixel est null
Police      : 13px, font-weight 600, font-family system-ui (pas de token custom)
Couleur     : texte blanc (#FFFFFF), fond noir semi-transparent rgba(0,0,0,0.72)
Padding     : 4px 8px
Border-radius : 4px
z-index     : 50 (par-dessus les labels des lots)
Transition  : aucune (instantané pour feedback temps réel)
```

### État React pour l'overlay

```typescript
const [surfaceOverlay, setSurfaceOverlay] = useState<{
  x: number;    // px depuis left du containerRef
  y: number;    // px depuis top du containerRef
  label: string; // "25 m²" ou "— m²"
  visible: boolean;
} | null>(null);
```

L'overlay est rendu conditionellement dans le JSX du containerRef :
```jsx
{surfaceOverlay?.visible && (
  <div
    role="status"
    aria-live="off"
    aria-atomic="true"
    style={{ left: surfaceOverlay.x, top: surfaceOverlay.y }}
    className="absolute pointer-events-none z-50 px-2 py-1 rounded text-[13px] font-semibold text-white bg-black/70 select-none"
  >
    {surfaceOverlay.label}
  </div>
)}
```

### Reduced-motion

L'overlay est déjà sans animation. Conforme `prefers-reduced-motion` par défaut.

### Mobile / touch

`mousemove` ne se déclenche pas sur mobile. Sur mobile, l'overlay n'est pas affiché (le drag sur touch est fonctionnel, juste sans le feedback m² — acceptable pour V1 : Thomas utilise Versi Studio sur desktop).

## 6. Calcul technique

### Formule

```
surface_m2 = (width_percent/100 * canvas_width_px) * (height_percent/100 * canvas_height_px) * m2_per_pixel
```

Où `m2_per_pixel` est en m²/px² (voir Section 4).

### Pseudo-code du listener mousemove (throttlé via rAF)

```typescript
// Ref pour le flag rAF throttle (à ajouter à côté de animFrameRef)
const rafOverlayRef = useRef<number>(0);

// Dans handleMouseMove, au début du bloc "if (dragRef.current && canvas)"
// APRÈS le calcul de newZone :

cancelAnimationFrame(rafOverlayRef.current);
rafOverlayRef.current = requestAnimationFrame(() => {
  const canvas = canvasRef.current;
  const container = containerRef.current;
  if (!canvas || !container) return;

  const rect = canvas.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  // Surface en px² de la zone courante
  const widthPx = (newZone.width_percent / 100) * rect.width;
  const heightPx = (newZone.height_percent / 100) * rect.height;
  const surfacePx2 = widthPx * heightPx;

  // Conversion en m²
  const label = m2PerPixel != null
    ? `${Math.round(surfacePx2 * m2PerPixel)} m²`
    : "— m²";

  // Position : coin bas-droit du lot + 12px décalage
  const lotRightPx = ((newZone.x_percent + newZone.width_percent) / 100) * rect.width;
  const lotBottomPx = ((newZone.y_percent + newZone.height_percent) / 100) * rect.height;

  // Offset container vs canvas (ils sont superposés, offset = 0 normalement)
  const offsetX = rect.left - containerRect.left;
  const offsetY = rect.top - containerRect.top;

  let overlayX = offsetX + lotRightPx + 12;
  const overlayY = offsetY + lotBottomPx - 28; // au-dessus du coin bas-droit

  // Anti-débordement : si trop à droite, basculer à gauche
  if (overlayX + 80 > containerRect.width) {
    overlayX = offsetX + ((newZone.x_percent / 100) * rect.width) - 80 - 4;
  }

  setSurfaceOverlay({ x: overlayX, y: overlayY, label, visible: true });
});
```

### Nettoyage au mouseup / mouseleave

```typescript
// Dans handleMouseUp et handleMouseLeave :
setSurfaceOverlay(null); // ou setSurfaceOverlay(prev => prev ? {...prev, visible: false} : null)
```

### Fréquence réelle

`requestAnimationFrame` = ~60fps max. Sur un drag mousemove natif (~100-120 events/s sur desktop), le throttle via rAF réduit à 60fps, soit un calcul de surface toutes les 16ms. Imperceptible pour l'utilisateur, pas de jank.

## 7. Cas limites

| Cas | Comportement attendu |
|---|---|
| `m2PerPixel` est null (plan non calibré) | Overlay affiche "— m²". Bannière de calibration affichée en haut du canvas. Pas de valeur inventée. |
| `m2PerPixel` = 0 (bug de calibration) | Guard : si `m2PerPixel <= 0` → traiter comme null. Pas de division par zéro. |
| Drag qui sort du canvas (cursor à l'extérieur) | `onMouseLeave` → `dragRef.current = null` + `setSurfaceOverlay(null)`. Comportement déjà implémenté dans le composant existant. |
| Lot très petit (< MIN_LOT_SIZE_PERCENT = 3%) | Surface calculée normalement (peut afficher "1 m²" ou "0 m²"). Arrondi à l'entier, pas de valeur négative possible. |
| Canvas redimensionné en cours de drag (ResizeObserver) | `rect.width/height` est relu au moment du calcul (dans le rAF callback) — valeur toujours fraiche. |
| Mobile / touch | Overlay non affiché (mousemove non déclenché sur touch). Drag fonctionnel sans feedback m². Acceptable V1. |
| Plusieurs plans par projet (étages) | Chaque plan a son propre `m2_per_pixel`. Si Thomas passe de l'étage 1 au RDC, la prop `m2PerPixel` est rechargée avec le plan affiché. |

## 8. Estimation @fullstack

| Fichier | Type de modification | Lignes estimées |
|---|---|---|
| `versi-studio/src/components/vs/PlanCanvas.tsx` | Ajout prop `m2PerPixel`, état `surfaceOverlay`, logique rAF dans `handleMouseMove`, nettoyage dans `handleMouseUp` + `handleMouseLeave`, div overlay dans JSX | +55 lignes |
| `versi-studio/src/components/vs/PlanCalibration.tsx` | Nouveau composant : mode calibration (tracé ligne référence + saisie longueur) | ~80 lignes (nouveau fichier) |
| `versi-studio/src/app/api/vs/plans/[id]/route.ts` (ou équivalent) | Ajout PATCH handler pour sauvegarder `m2_per_pixel` | +20 lignes |
| Migration SQL (Supabase / Prisma / drizzle selon stack) | `ALTER TABLE vs_plans ADD COLUMN m2_per_pixel` | 5 lignes |
| Parent de PlanCanvas (ex: `PlanStudio.tsx`) | Passer `m2PerPixel={plan.m2_per_pixel}` + afficher bannière calibration si null | +15 lignes |

**Total estimé : ~175 lignes modifiées/ajoutées. Durée en pattern typist : 25-35 min.**

## 9. Brief typist — prêt à coller en session future

```
@fullstack — Pattern typist. Implémenter F05 surface m² temps réel dans PlanCanvas.

BRANCHE : claude/versi-s19-visuels-autopilot-K7mQr (vérifier git branch avant de commencer)

## Étape 1 — Migration DB (5 min)

Ajouter dans la migration Supabase (ou équivalent) :
  ALTER TABLE vs_plans ADD COLUMN m2_per_pixel DECIMAL(12, 6) NULL DEFAULT NULL;

## Étape 2 — PlanCanvas.tsx (+55 lignes)

Fichier : versi-studio/src/components/vs/PlanCanvas.tsx

A. Dans PlanCanvasProps, ajouter :
  m2PerPixel: number | null;

B. Dans le composant, ajouter le state :
  const [surfaceOverlay, setSurfaceOverlay] = useState<{
    x: number; y: number; label: string; visible: boolean;
  } | null>(null);

  const rafOverlayRef = useRef<number>(0);

C. Dans handleMouseMove, APRÈS le bloc "onUpdateLotZone(lotId, newZone)" :
  cancelAnimationFrame(rafOverlayRef.current);
  rafOverlayRef.current = requestAnimationFrame(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = canvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const widthPx = (newZone.width_percent / 100) * rect.width;
    const heightPx = (newZone.height_percent / 100) * rect.height;
    const label = (m2PerPixel != null && m2PerPixel > 0)
      ? `${Math.round(widthPx * heightPx * m2PerPixel)} m²`
      : "— m²";
    const lotRightPx = ((newZone.x_percent + newZone.width_percent) / 100) * rect.width;
    const lotBottomPx = ((newZone.y_percent + newZone.height_percent) / 100) * rect.height;
    const offsetX = rect.left - containerRect.left;
    const offsetY = rect.top - containerRect.top;
    let overlayX = offsetX + lotRightPx + 12;
    const overlayY = offsetY + lotBottomPx - 28;
    if (overlayX + 80 > containerRect.width) {
      overlayX = offsetX + (newZone.x_percent / 100) * rect.width - 84;
    }
    setSurfaceOverlay({ x: overlayX, y: overlayY, label, visible: true });
  });

D. Dans handleMouseUp et handleMouseLeave, ajouter :
  setSurfaceOverlay(null);

E. Dans le JSX du return, DANS le div containerRef, après le <canvas> :
  {surfaceOverlay?.visible && (
    <div
      role="status"
      aria-live="off"
      style={{ left: surfaceOverlay.x, top: surfaceOverlay.y }}
      className="absolute pointer-events-none z-50 px-2 py-1 rounded text-[13px] font-semibold text-white bg-black/70 select-none"
    >
      {surfaceOverlay.label}
    </div>
  )}

## Étape 3 — Composant PlanCalibration.tsx (nouveau, ~80 lignes)

Nouveau fichier : versi-studio/src/components/vs/PlanCalibration.tsx
Logique : mode tracé (2 clics = ligne A→B), calcul longueur px via Pythagore, modale "Cette ligne mesure X mètres",
calcul m2_per_pixel = (metres / longueur_px)^2, PATCH vers l'API plan.

## Étape 4 — Parent PlanCanvas

Dans le composant parent qui instancie PlanCanvas :
- Passer m2PerPixel={plan?.m2_per_pixel ?? null}
- Si plan?.m2_per_pixel == null → afficher bannière "Calibrez ce plan pour afficher les surfaces m²" + bouton déclenchant PlanCalibration

## Critère de done
- Drag d'un lot sur un plan calibré → overlay "XX m²" visible en temps réel
- mouseup → overlay disparu
- plan non calibré → overlay "— m²" + bannière calibration
- tsc --noEmit 0 erreur
```
