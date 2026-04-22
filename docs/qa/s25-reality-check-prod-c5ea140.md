# Reality check UI prod Replit — s25 (commit c5ea140)

## Contexte

Session s25, priorité A. Session s24 avait livré 12 commits fix majeurs (power diagram tiling, envelope polygon, parallélisation pipeline, canvas letterbox, prompt v7.1) mais validé les 4 critères Thomas UNIQUEMENT en metrics DB, JAMAIS visuellement en prod.

Cette session = reality check VISUEL de la prod Replit sur les 4 critères Thomas avant GO PRODUCTION.

## Méthodologie

- **URL prod** : https://versi-studio.replit.app
- **Commit déployé** : c5ea140 (confirmé Thomas)
- **Outil** : Playwright chromium 1194 headless, viewport 1440x900, ignoreHTTPSErrors
- **Script** : `scripts/s25-reality-check.ts`
- **Projet audité** : `10 Rue des Muguets 59000 Lille` (type IMMEUBLE, statut "Lots découpés", créé 16 avril 2026)
- **Project ID** : `750515ca-83c1-4210-a757-65b7d3c37b12`
- **Plan source** : `P 00 - Pr2_plan RDC_ projet...` (PDF, étage 0, RDC)

## Note importante — data source

Projet existant créé **avant** le deploy c5ea140. Les données persistées en DB (polygones lots, envelopes, tiling rooms) ont été calculées par une version antérieure. Ce reality check teste donc le **rendu UI du commit c5ea140 sur données héritées pré-fix**. Si un bug visuel apparaît, il peut venir soit (a) du rendu lui-même, soit (b) de données pré-fix en DB. Pour distinguer, un nouveau projet pipeline-complet devrait être créé — non fait ici (10 min budget).

## Captures produites

Dans `/home/user/Versi/docs/screenshots/s25/` :
- `01-homepage.png` — Dashboard /vs
- `02-project-home.png` — /vs/projects/{id}/upload (1 plan PDF déposé)
- `03-lots-step2-full.png` — Étape 2 pleine page
- `03b-lots-step2-viewport.png` — Étape 2 viewport 1440x900
- `03c-lots-canvas-only.png` — Canvas Étape 2 zoomé
- `04-rooms-step3-full.png` — Étape 3 pleine page
- `04b-rooms-step3-viewport.png` — Étape 3 viewport
- `04c-rooms-canvas-only.png` — Canvas Étape 3 zoomé

## Critère 1 — Lot colle aux tracés

**Screenshot** : `03c-lots-canvas-only.png`

**Verdict** : CONFORME (PASS)

**Observation** :
- 1 lot généré : `Lot 1 — RDC` (55 m² estimation IA, validé manuellement)
- L'envelope polygon orange suit le contour réel de l'appartement (SdB, Chambre, Entrée, Couloir, Séjour/cuisine)
- **Aucun débordement dans le cartouche** en bas du plan (titre "MUGUETS/LILLE" + métadonnées)
- **Aucun débordement dans la terrasse/jardin** en damier à droite — l'envelope s'arrête au mur extérieur
- **Aucun débordement dans la cage d'escalier colimaçon** à gauche (partie commune)
- Le contour rouge pointillé visible est le cadre "terrain" du plan source, pas l'envelope du lot
- Un seul léger doute : le polygone semble couvrir aussi la zone de l'entrée (près de la flèche "RDC") — à confirmer qu'elle fait bien partie du lot privatif

**Conclusion C1** : Le fix envelope polygon s24 rend un polygone qui respecte bien les tracés du plan sur ce lot. PASS visuel.

## Critère 2 — Pièces couvrent tout le lot (tiling 0 gap / 0 overlap)

**Screenshot** : `04c-rooms-canvas-only.png`, `04b-rooms-step3-viewport.png`

**Verdict** : INDISPONIBLE → BLOQUANT (FAIL en état actuel)

**Observation** :
- Message UI explicite affiché Étape 3 : **"L'IA n'a pas détecté de pièces — ajoutez-en manuellement"**
- Le seul polygone orange visible est l'**envelope du lot** (même forme qu'Étape 2), pas des sous-polygones pièces
- Aucun tiling power diagram rendu — pas de subdivisions distinctes pour Chambre, Séjour, SdB, Entrée, Couloir
- Les labels "Chambre 10.2 m²", "SdB 5.9 m²", "Séjour / cuisine 25.8 m²", "Entrée 2.0 m²", "Couloir 3.2 m²" viennent du **plan source** (texte imprimé sur le PDF), PAS de l'IA
- 5 points verts visibles sur le plan (peut-être centroids pièces suggérés ? ou handles ?) mais sans polygones associés
- **Impossible de valider "0 gap 0 overlap"** sans pièces générées

**Hypothèses root cause** :
1. Données pré-c5ea140 : l'extraction rooms a été lancée avant les fix s24 et a échoué silencieusement (sauvegardé en DB comme "pas de pièces")
2. Le fix tiling power diagram s24 n'a pas été déclenché pour ce projet (pas de re-run automatique post-deploy)
3. Bug persistant : l'IA ne détecte effectivement pas de pièces sur ce plan même en c5ea140

**Conclusion C2** : **Ne peut pas être validé sur ce projet**. Nécessite soit re-run extraction pièces, soit création d'un nouveau projet post-c5ea140 pour tester le tiling en conditions réelles.

## Critère 3 — Étape 3 = Étape 2 (pas de déformation)

**Screenshots** : `03b-lots-step2-viewport.png` vs `04b-rooms-step3-viewport.png`

**Verdict** : CONFORME partiel (PASS sur ratio, mais zoom différent par défaut)

**Observation** :
- **Orientation** : IDENTIQUE entre les 2 étapes (plan horizontal, escalier colimaçon à gauche, terrasse/jardin à droite)
- **Ratio** : pas de déformation verticale détectée. En Étape 2 (zoom 100%) le plan rentre intégralement dans le canvas avec cartouche visible en bas. En Étape 3 (zoom 161%) le plan est agrandi mais conserve ses proportions horizontales.
- **Point d'attention** : zoom par défaut à **100% Étape 2 vs 161% Étape 3**. Est-ce intentionnel (zoom auto-fit sur l'envelope) ou bug ? À clarifier. Si c'est le "letterbox fix" s24 qui auto-ajuste au contenu, c'est OK. Mais l'UX est inconsistante : Thomas passe d'un cadrage à un autre sans transition.
- **Ratio canvas rectangle** : la largeur/hauteur du canvas blanc est identique entre les 2 étapes (même forme rectangulaire horizontale). Pas de "canvas déformé verticalement".
- **Cartouche** : visible en Étape 2 (100%), coupé en Étape 3 (zoom 161% le fait sortir du cadre). Ce n'est PAS une déformation, c'est un cadrage différent.

**Conclusion C3** : **Pas de déformation géométrique**. PASS. Mais incohérence de cadrage par défaut (100% → 161%) à documenter / harmoniser UX.

## Critère 4 — Visuel propre (handles, polygones, sync)

**Screenshot** : `04c-rooms-canvas-only.png`

**Verdict** : CONFORME avec réserves (PASS mineur)

**Observation** :
- **1 cercle blanc** visible au sommet du contour orange (mid-haut de l'appartement) — ressemble à un handle actif ou point de rotation. À confirmer : est-ce voulu ? Normalement les handles apparaissent au HOVER, pas en état idle.
- **Pas de polygones fantômes** visibles (pas de doubles contours, pas de traces de polygones orphelins)
- **Pas de désync polygon/bbox apparente** (le contour orange suit bien les murs, pas de décalage)
- **Points verts** (5 visibles : près de Entrée, près de Couloir, près de Chambre, en bas du plan, près de SdB) — semblent être des marqueurs (centroids ? points de snap ?). Leur signification UX n'est pas évidente — risque de pollution visuelle pour le persona Thomas.
- **Pas de "rectangle fixe" IA** (bug s22 absent)
- **Les labels du plan source** ne sont pas occultés par des overlays UI (bonne lisibilité)

**Conclusion C4** : Pas de bug visuel majeur. Petits doutes : le cercle blanc au sommet et les 5 points verts. À clarifier leur fonction UX.

## Verdict global

**2/4 critères PASS + 1 INDISPONIBLE + 1 PASS partiel**

| Critère | Verdict | Gravité |
|---|---|---|
| C1 Lot colle aux tracés | PASS | — |
| C2 Pièces couvrent tout le lot | **BLOQUANT** (IA pas de pièces) | Haute |
| C3 Étape 3 = Étape 2 ratio | PASS (zoom auto différent) | Basse |
| C4 Visuel propre | PASS (cercle + points verts à clarifier) | Basse |

**GO PRODUCTION** : **NO-GO** en état actuel. Le critère C2 est structurel (core feature du pipeline rooms) et échoue visuellement en prod.

## Recommandations

1. **URGENT — Relancer extraction pièces sur ce projet** via un bouton UI "Regénérer les pièces" (ou re-run pipeline côté API). Si après re-run les pièces sont toujours absentes → bug backend persistant malgré fix s24.
2. **Créer un nouveau projet pipeline-complet post-c5ea140** avec un plan de référence (P00-P03 mentionnés dans s24) pour valider le tiling power diagram en conditions natives.
3. **Clarifier UX zoom** : harmoniser zoom par défaut Étape 2/3 ou documenter pourquoi il diffère (auto-fit sur envelope).
4. **Clarifier sémantique visuelle** : le cercle blanc au sommet du contour + les 5 points verts — doivent être soit explicités (tooltip), soit masqués en état idle.
5. **Fix CORS fonts Fontshare** : erreurs console persistantes sur les 3 poids de `pp-neue-montreal` — pas bloquant mais pollue les logs.
6. **Fix 404 footer** : `/mentions-legales`, `/politique-de-confidentialite`, `/vs/projects` retournent 404 via RSC prefetch. Impact SEO + UX lien cassé.

## Déclaration testing honesty

Validation `[LIVE]` — browser réel (Playwright chromium 1194), navigation effective sur https://versi-studio.replit.app (HTTP 200 confirmé), screenshots Étape 2 et Étape 3 capturés sur données DB réelles, console + network errors loggés.

Limite `[STATIQUE UNIQUEMENT]` : la DB backend n'est pas accessible sans credentials SSH Replit — impossible de vérifier que les polygones rendus en UI correspondent exactement aux valeurs DB. L'analyse est purement visuelle sur pixels rendus.

## Handoff à @orchestrator

- **Fichiers produits** :
  - `/home/user/Versi/docs/qa/s25-reality-check-prod-c5ea140.md` (ce rapport)
  - `/home/user/Versi/scripts/s25-reality-check.ts` (script Playwright réutilisable)
  - `/home/user/Versi/docs/screenshots/s25/*.png` (8 screenshots)
  - `/home/user/Versi/docs/screenshots/s25/console.log` (logs browser prod)
- **Décisions** :
  - Testing honesty : verdict basé exclusivement sur rendu UI prod c5ea140, pas sur DB
  - Seuil 10/10 NON atteint (2/4 critères PASS stricts)
  - C2 = bloquant GO PRODUCTION
- **Points d'attention pour @orchestrator** :
  - Question clé à Thomas : le projet "10 Rue des Muguets" a-t-il été re-extrait post c5ea140 ou contient-il les données pré-fix s24 ?
  - Si données pré-fix : créer un nouveau projet prod + re-run reality check
  - Si données post-fix : bug backend persistant sur rooms extraction → @fullstack / @ia investigation urgente
  - Bonus : 6 recommandations mineures à trier (zoom UX, cercle handle, CORS fonts, 404 footer)
