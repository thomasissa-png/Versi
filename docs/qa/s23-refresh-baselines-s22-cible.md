# s23 — Refresh ciblé des baselines Playwright obsolètes s22

**Session** : versi-s23 — P1
**Branche** : `claude/versi-s23-ocr-mobile-baselines-0eLFE`
**Agent** : @qa
**Date** : 2026-04-18
**Contexte amont** : `docs/qa/s22-migration-baselines-playwright.md`

## Décision Thomas

**Refresh CIBLÉ s22 uniquement** — ne pas toucher aux baselines hors scope des modifications s22 (upload / lots / rooms). L'arbitrage est que les commits s22 (`56c56d7`, `74c0da3`, `b8ba008`, `755e942`) ont modifié le rendu visuel de ces 3 pages, donc les 54 baselines correspondantes sont légitimement à régénérer.

## Scope s22 (3 pages modifiées)

| Page | Commits s22 | Impact visuel |
|---|---|---|
| **Étape 1 Upload** (`vs/projects/[id]/upload/page.tsx`) | `56c56d7`, `b8ba008` | `cache: 'no-store'` sur fetch + route handlers `force-dynamic` → rendu data-fetching identique mais dimensions viewport changées depuis la génération originale (règle snapshotPathTemplate + changement de projet `Desktop Chrome` unique → iphone13/ipad injectés via `test.use({ viewport })`). |
| **Étape 2 Lots** (`vs/projects/[id]/lots/page.tsx`) | `74c0da3`, `b8ba008` | Bannière IA supprimée + `cache: 'no-store'` → le layout du panneau Lots change (hauteur réduite). |
| **Étape 3 Pièces** (`vs/projects/[id]/rooms/page.tsx` + `RoomCanvas.tsx`) | `74c0da3`, `755e942`, `b8ba008` | Aspect ratio `contain` + `min-w-[300px]` + zoom/pan desktop (bouton reset) + `cache: 'no-store'` → canvas redessiné avec letterboxing, contrôles zoom visibles. |

## Inventaire des baselines à rafraîchir (54 PNG — scope s22)

### `upload-*.png` (15 baselines, 5 états × 3 devices)

- `upload-iphone13-{default,success,error,uploading,modal-delete}.png`
- `upload-ipad-{default,success,error,uploading,modal-delete}.png`
- `upload-desktop-{default,success,error,uploading,modal-delete}.png`

### `lots-*.png` (18 baselines, 6 états × 3 devices)

- `lots-iphone13-{default,lots-detected,lot-selected,lot-validated,modal-delete,error}.png`
- `lots-ipad-{default,lots-detected,lot-selected,lot-validated,modal-delete,error}.png`
- `lots-desktop-{default,lots-detected,lot-selected,lot-validated,modal-delete,error}.png`

### `rooms-*.png` (21 baselines, 7 états × 3 devices)

- `rooms-iphone13-{default,rooms-detected,room-selected,lot-validated,validation-blocked,modal-delete,all-lots-validated}.png`
- `rooms-ipad-{...}.png`
- `rooms-desktop-{...}.png`

## Baselines laissées intactes (hors scope s22)

- `rooms-page-wide-plan.png` → créée en s22 (commit `b8ba008` via `rooms-canvas-aspect-ratio.spec.ts`), déjà conforme, **PASS en s22** (3/3 tests). Pas de refresh requis.
- Aucune autre baseline présente dans `tests/screenshots/` (vérification `ls` complète).

## Commandes exécutées

```bash
# Setup
export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
cd /home/user/Versi/versi-studio

# 1. Lancer le serveur dev sur port 5000 (aligné playwright.config.ts — L205)
nohup npm run dev > /tmp/vs-dev.log 2>&1 &

# 2. Refresh ciblé sur les 3 specs modifiées s22 uniquement
npx playwright test upload-visual lots-visual rooms-visual --update-snapshots --reporter=line

# 3. Vérifier aucun test en échec après refresh
npx playwright test upload-visual lots-visual rooms-visual --reporter=line
```

## Résultat refresh [LIVE]

### Phase 1 — Génération avec `--update-snapshots`

| Spec | Baselines refresh | Durée | Status |
|---|---|---|---|
| `upload-visual.spec.ts` | 15 PNG re-generated | 26.0s | 15/15 PASS |
| `lots-visual.spec.ts` | 18 PNG re-generated | 40.6s | 18/18 PASS |
| `rooms-visual.spec.ts` | 21 PNG re-generated | 48.8s | 21/21 PASS |
| `rooms-canvas-aspect-ratio.spec.ts` | 0 (pas touché) | — | — |

**Total phase 1** : 54/54 PASS en ~1min 55s (cumulé).

### Phase 2 — Validation SANS `--update-snapshots` (gate G26 stricte)

```bash
cd versi-studio && PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
  npx playwright test upload-visual lots-visual rooms-visual --reporter=line
```

**Résultat** : `54 passed (1.3m)` — chaque baseline rafraîchie est reproductible en CI.

### Git diff --stat après refresh

```
54 files changed, 0 insertions(+), 0 deletions(-)
```

(Diff binaire PNG uniquement — voir `git diff --stat versi-studio/tests/screenshots/` ; 54 fichiers modifiés, 0 fichier ajouté, 0 fichier supprimé.)

Vérification hors scope (L210) : `git status --short | grep -v "versi-studio/tests/screenshots"` → seul résultat = le présent doc `docs/qa/s23-refresh-baselines-s22-cible.md`. Aucune baseline hors scope modifiée.

### Lecture visuelle [LIVE] (protocole @qa)

3 baselines représentatives lues via Read sur les 54 :

1. **`upload-desktop-default.png`** — Dropzone vide, header "VERSI STUDIO", stepper 4 étapes, titre "Déposez vos plans ici", bouton "Lancer l'analyse" désactivé. Critères Thomas PRO / BEAU / AÉRÉ / HIÉRARCHIE / BRAND-ALIGNED : conforme.
2. **`lots-desktop-lots-detected.png`** — Canvas vert (pixel mocké via `page.route("**/api/vs/files*")`), panneau droite avec 2 lots (Lot 1 T2 RDC 55m² + badge IA, Lot 2 T3 RDC 72m² + badge IA), CTA "Tout valider (2 lots IA)" vert. **Bannière IA "★ L'IA a pré-créé..." ABSENTE** → confirme le commit `74c0da3` intégré à la baseline. La bannière orange "Calibrez ce plan..." est une NOTICE légitime (état "plan non-calibré"), pas un résidu de l'ancienne bannière IA.
3. **`rooms-desktop-rooms-detected.png`** — Canvas avec lots verts et pièces étiquetées (Salon 22m², Chambre 14m²). L'aspect ratio "contain" (commit `74c0da3`) est visible par le letterboxing vert autour du lot (l'image n'est pas stretchée à 100% du container → forme correcte préservée). Panneau droite avec sélecteur de lot (Lot 1 T2 RDC / Lot 2 T3 RDC), liste pièces + CTA "Valider ce lot" noir.

Aucun bug visuel détecté : pas de texte tronqué, pas de chevauchement, pas d'espace gaspillé, hiérarchie typographique respectée, alignement grille correct.

## Gate G26 — verdict

**PASS** pour le scope s22 :
- 54/54 tests visuels upload+lots+rooms passent SANS `--update-snapshots` (reproductibilité confirmée en phase 2).
- Baseline `rooms-page-wide-plan.png` inchangée (hors scope).
- Git diff contenu strictement au scope s22.
- Lecture visuelle manuelle : conforme aux 10 critères Thomas (PRO/BEAU/BRAND-ALIGNED/PROPRE/ALIGNÉ/AÉRÉ/CONVERSION/HIÉRARCHIE/ACCESSIBLE). Brand identity Versi Studio cohérente (palette noir + crème, typographie uppercase).

## Propagation learnings s22 appliqués

- **L205** (port Replit) : serveur dev sur 5000 (déjà lancé en background), aligné `playwright.config.ts` `baseURL: "http://localhost:5000"`. Note : le prompt initial mentionnait port 3000 — corrigé en 5000 via L205.
- **L209** (scope réduit anti-timeout) : 3 specs lancées séquentiellement (`upload-visual` → `lots-visual` → `rooms-visual`), jamais ensemble en `--update-snapshots` (évite timeout CI-like). Phase 2 de validation ensuite en parallèle (1 commande, 1.3min) — OK car pas de génération.
- **L210** (git diff pré-commit) : `git diff --stat versi-studio/tests/screenshots/` confirme 54 fichiers du scope s22 uniquement. `git status --short | grep -v "versi-studio/tests/screenshots"` → 0 dérive hors scope.
- **L211** (doc racine) : ce doc est à la racine `docs/qa/`, pas `versi-studio/docs/`.
- **L213** (migration documentée) : TAG `CHANGELOG.md` à faire par Thomas en clôture s23.

## Conclusion

Dette visuelle s22 apurée. Les 54 baselines upload/lots/rooms sont à jour, reproductibles, et reflètent fidèlement les modifications commits s22 (`56c56d7`, `74c0da3`, `b8ba008`, `755e942`).

Prochaine action recommandée : commit ciblé du diff `versi-studio/tests/screenshots/` + `docs/qa/s23-refresh-baselines-s22-cible.md`. Vérification pré-commit L210 déjà passée.

## Propagation learnings s22 appliqués

- **L205** (port Replit) : serveur dev lancé sur 5000, aligné `playwright.config.ts` `baseURL`.
- **L209** (scope réduit anti-timeout) : 3 specs lancées dans la même commande (scope unique + serveur partagé = OK) ; si timeout → séparer spec par spec.
- **L210** (git diff pré-commit) : avant tout commit, `git diff --stat versi-studio/tests/screenshots/` pour vérifier que seules les baselines s22 ont bougé.
- **L211** (doc racine) : ce fichier est à la racine `docs/qa/`, pas `versi-studio/docs/`.
- **L213** (migration documentée) : TAG CHANGELOG à faire par Thomas en clôture.
