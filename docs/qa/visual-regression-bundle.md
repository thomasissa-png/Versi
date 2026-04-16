# Boucle visuelle Versi Studio — BUNDLE Upload + Lots + Pièces

> Procédure de gestion des baselines screenshots pour la gate G26 (conformité visuelle).
> **Scope** : Versi Studio (`versi-studio/`) — outil interne marchand de biens.
> **Décision @moi versi-s17** : la boucle visuelle est différée par BUNDLE (pas par étape) pour préserver la vélocité IA. Ce document couvre les 3 premières étapes du workflow Studio.

## Architecture des tests visuels

Les specs visuels suivent le pattern unifié de `tests/e2e/upload-visual.spec.ts` :

- **3 viewports** pilotés manuellement (pas de projects Playwright multiples) :
  - `iphone13` : 375 × 812
  - `ipad` : 768 × 1024
  - `desktop` : 1280 × 800
- **APIs mockées** via `page.route()` — aucune dépendance PostgreSQL ni OpenAI
- **Screenshots PNG** stockés dans `tests/screenshots/[étape]/[viewport]-[état].png`
- **Comparaison pixel-diff** : seuil G26 < 0.5% de pixels différents

## État des baselines

| Étape | Spec | Baselines | États capturés |
|---|---|---|---|
| 1. Upload | `tests/e2e/upload-visual.spec.ts` | 15 (3×5) | default, success, error, uploading, modal-delete |
| 2. Lots | `tests/e2e/lots-visual.spec.ts` | 18 (3×6) | default, lots-detected, lot-selected, lot-validated, modal-delete, error |
| 3. Pièces | `tests/e2e/rooms-visual.spec.ts` | 21 (3×7) | default, rooms-detected, room-selected, lot-validated, validation-blocked, modal-delete, all-lots-validated |
| 4. Visuels | (à créer) | — | — |

**Total bundle 3 étapes** : 54 baselines à générer en première exécution.

## Génération initiale des baselines

### Pré-requis

- Node ≥ 20, npm installé
- Navigateurs Playwright installés : `npx playwright install chromium`
- Port 3000 libre (sinon kill le process : `lsof -ti:3000 | xargs kill -9`)

### Commandes

```bash
cd versi-studio

# Démarrer le serveur Next.js en arrière-plan
npm run dev > /tmp/versi-dev.log 2>&1 &
sleep 10

# Générer les baselines pour les 3 étapes (séquentiel, fullyParallel: false)
npx playwright test tests/e2e/upload-visual.spec.ts --update-snapshots
npx playwright test tests/e2e/lots-visual.spec.ts --update-snapshots
npx playwright test tests/e2e/rooms-visual.spec.ts --update-snapshots

# Ou en une seule commande (plus long)
npx playwright test tests/e2e/upload-visual.spec.ts \
                    tests/e2e/lots-visual.spec.ts \
                    tests/e2e/rooms-visual.spec.ts \
                    --update-snapshots
```

### Note importante

Les specs créent les screenshots via `page.screenshot({ path: ... })` (pas `toHaveScreenshot()`). Le flag `--update-snapshots` n'est donc pas strictement nécessaire — le simple lancement des tests écrit les fichiers PNG dans `tests/screenshots/`. Le flag est conservé pour cohérence avec une future migration vers `toHaveScreenshot()` (comparaison pixel-diff native Playwright).

## Review humain obligatoire

**Avant de committer les baselines** :

1. Ouvrir chaque PNG dans `tests/screenshots/lots/` et `tests/screenshots/rooms/`
2. Vérifier visuellement :
   - Layout cohérent avec `docs/design/page-compositions.md`
   - Pas de glitch (texte coupé, image cassée, élément absent)
   - Cohérence cross-viewport (le contenu s'adapte sans débordement)
   - États métier corrects (ex : `lot-validated` doit avoir un visuel différent de `lots-detected`)
3. Si OK → `git add tests/screenshots/lots/ tests/screenshots/rooms/ && git commit -m "feat(qa): baselines visuelles bundle Studio"`
4. Si KO sur 1+ baseline → corriger le bug visuel côté `@fullstack`, puis relancer la génération

## Refresh des baselines après modification UI

Quand un changement UI intentionnel modifie le rendu visuel (nouveau composant, refonte couleurs, etc.) :

```bash
# Régénérer uniquement les baselines impactées
cd versi-studio
npx playwright test tests/e2e/lots-visual.spec.ts --update-snapshots

# Review du diff git visuel sur les PNG modifiés
git diff --stat tests/screenshots/lots/

# Commit des nouvelles baselines avec message explicite
git add tests/screenshots/lots/
git commit -m "feat(ui): refresh baselines lots après [description du changement]"
```

## CI / Pipeline

À terme (hors scope versi-s18), la gate G26 doit s'exécuter en CI :

```yaml
# Pseudo-GitHub Actions
- name: Visual regression bundle Studio
  run: |
    cd versi-studio
    npx playwright test tests/e2e/upload-visual.spec.ts \
                        tests/e2e/lots-visual.spec.ts \
                        tests/e2e/rooms-visual.spec.ts
- name: Compare against baselines
  # Migrer les specs vers toHaveScreenshot() pour bénéficier de la comparaison
  # pixel-diff native Playwright (seuil maxDiffPixelRatio: 0.005 = 0.5%)
```

**État actuel** : les specs produisent les PNG mais ne comparent PAS contre les baselines. Pour activer la comparaison G26 stricte, migrer chaque `page.screenshot({ path: ... })` vers `await expect(page).toHaveScreenshot('nom.png', { maxDiffPixelRatio: 0.005 })`.

## Troubleshooting

| Symptôme | Cause probable | Fix |
|---|---|---|
| `Error: page.goto: net::ERR_CONNECTION_REFUSED` | Serveur dev non démarré | `npm run dev` puis `sleep 10` |
| Screenshots vides ou crash canvas | Mock route image manquant | Vérifier que `**/tmp/vs/**` retourne un PNG dans `mockBase()` |
| Test passe localement, fail en CI | Ordre `page.route()` incorrect (learning versi-s13 P1 #2) | Wildcard d'abord, route spécifique APRÈS |
| Modal screenshot vide | Focus-trap pas stabilisé | Augmenter `waitForTimeout(300)` après ouverture |
| Diff > 0.5% sur fonts | Police système différente OS / CI | Forcer une font via `--force-color-profile` ou Docker run identique |

## Historique

| Date | Étape | Action | Auteur |
|---|---|---|---|
| versi-s14 | Upload | Création 15 baselines | @qa |
| versi-s18 | Lots + Pièces | Création specs + procédure refresh | @qa |
| (à venir) | Visuels (étape 4) | À créer après livraison @fullstack étape 4 | @qa |

---

**Handoff** : ce document est le point d'entrée pour toute opération sur les baselines visuelles Studio. Si une nouvelle étape est livrée par `@fullstack`, dupliquer le pattern `lots-visual.spec.ts` et ajouter une ligne dans le tableau "État des baselines".
