# URGENT — Thomas screenshot Étape 3 — 2026-04-19 session s23

## Contexte

Thomas a envoyé une capture d'écran de l'Étape 3 après tentative de test. Voici ce que montre la capture :

## Observations visuelles directes

1. **SdB (badge IA pourpre top-left)** : rectangle axis-aligned superposé à la zone "SdB" du plan (label manuel "SdB 5.9 m²" visible en dessous). Le rectangle IA couvre la zone labelled mais n'adhère pas aux contours réels des murs (la SdB réelle a une forme irrégulière avec ECS en sous-zone).

2. **Chambre 10 m² (badge IA bleu)** et **Couloir 3 m² (badge IA bleu en dessous)** : les deux rectangles se CHEVAUCHENT visiblement. Le Couloir est partiellement recouvert par la Chambre.

3. **Séjour / cuisine 26 m² (badge IA vert)** : rectangle poussé vers la droite mais il reste un espace vide notable entre son bord droit et le mur extérieur du plan. Impossible de le pousser plus à droite → blocage.

4. **Espace vide conséquent** entre les 4-5 pièces et les murs du bâtiment. Les pièces sont clairement plus petites que la réalité.

5. **Toutes les pièces sont des rectangles axis-aligned** (visible au tracé en pointillés autour de chaque badge IA). Aucune pièce ne suit le tracé polygonal réel.

## Ce que ça nous dit du code

**L'UI rend `bounding_box` (rect) PAS `bounding_polygon` (polygone n-points)**.

Cela signifie :
- Le resolver (mes commits `f7a2699` + `c57aba3`) qui clippe des polygones n'a **aucun effet visible** si l'UI affiche des bboxes axis-aligned.
- Le fix drag `9747387` sur `lotPolygon` ne peut pas aider si le drag est sur des bboxes contre un autre bbox.
- Les pièces stockent probablement leur bbox séparément du polygone détecté par l'IA, et le rendu UI utilise la bbox.

## Hypothèses root cause

- **RC1** : Le composant RoomCanvas n'a jamais affiché les polygones, juste les bboxes. C'est un limite d'affichage jamais adressée.
- **RC2** : Les polygones sont stockés mais le rendu/drag/resolver UI utilise bbox comme approximation.
- **RC3** : Le pipeline persiste `bounding_box` seulement, et `bounding_polygon` est perdu entre API et DB.

## Actions requises (ordre priorité)

### P0 — Vérifier le rendu UI

1. Grep `bounding_polygon` dans `versi-studio/src/components/vs/RoomCanvas.tsx` et dans `versi-studio/src/app/vs/projects/[id]/rooms/page.tsx`
2. Si jamais utilisé → **le rendu UI utilise bbox**. C'est la cause du "rectangle qui ne suit pas les murs".
3. Le fix : RoomCanvas doit dessiner `bounding_polygon` (si disponible) au lieu de `bounding_box`.

### P0 — Vérifier la persistance DB

1. Grep dans `versi-studio/src/lib/vs/db.ts` ou `schemas.ts` : la colonne `vs_rooms` contient-elle `bounding_polygon` ?
2. Si non → c'est perdu à l'insert.
3. Si oui → ok, UI est la cause.

### P0 — Vérifier le resolver côté persist

1. Dans `route.ts` de l'extract, le resolver produit des polygones **clippés**. Ces polygones clippés sont-ils bien persistés dans `vs_rooms.bounding_polygon` ?
2. Si non → les polygones clippés sont perdus, seul `bounding_box` reste → overlap visible.

### P1 — Si l'UI rend bbox intentionnellement

Alors mon resolver ne sert à rien côté UX. Il faut soit :
- (a) Passer l'UI au rendu polygone (plus gros chantier UX — drag polygone au lieu de bbox, resize par vertex, etc.)
- (b) Dériver la bbox depuis le polygone clippé (pas le polygone original) pour au moins que la bbox soit non-overlap

## Message à Thomas

Le fix que j'ai livré attaque le mauvais niveau. L'UI (Étape 3) affiche des rectangles axis-aligned, pas les polygones réels détectés par l'IA. Mes commits optimisent les polygones mais l'utilisateur voit des rectangles → problème visuellement intact.

Correction prioritaire session s23 : rendre RoomCanvas en mode polygone + drag/resize polygonal + resolver sur polygones visibles.
