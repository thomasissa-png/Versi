# Audit UX — Upload US-VS-02 (versi-s16 P3 Batch 6a)

**Date** : 2026-04-16
**Agent** : @ux
**Scope** : Parcours Upload — point de vue Thomas (marchand de biens)
**Objectif** : Score 9/10 minimum pour unanimité Étape 1

---

## Section 1 — Évaluation parcours (8 dimensions UX)

| Dimension | Note /10 | Preuve | Friction détectée | Correction proposée |
|---|---|---|---|---|
| 1. Clarté de l'état courant | 8/10 | page.tsx:399 H1 "Déposez vos plans" + adresse project.adresse ; Stepper actif avec `aria-current="step"` (Stepper.tsx:41) ; compteur plans "X plans déposés / Y emplacements restants" (page.tsx:519-527) | Le Stepper ne lit jamais `project.status` — `completedSteps` est toujours `[]` (page.tsx:386, 391). L'étape 1 n'est donc jamais marquée cochée même si Thomas est revenu après un dépôt partiel. Pas de "progress" global visible si Thomas ferme l'onglet et revient. | Passer `completedSteps` dérivé de `project.status` au Stepper. Ex. : si `project.status === 'step_1_complete'` → `completedSteps={[1]}`. Coût : 3 lignes dans page.tsx. |
| 2. Dual Stepper responsive | 9/10 | Stepper.tsx:27-81 (horizontal mobile) + page.tsx:385-392 (sidebar desktop, horizontal mobile). `hidden md:block` / `md:hidden`. Présent aussi dans l'état loading (page.tsx:354-360). `aria-label="Étapes du projet"` sur les deux variantes. | Stepper horizontal mobile : labels texte masqués (seuls les numéros + icône check). Thomas sur mobile ne peut pas lire "Plans" ou "Lots" — il ne sait que "je suis à l'étape 1 sur 4". Friction légère en first-use. | Ajouter un label court `sr-only` ou une tooltip au-dessus de l'étape active en mobile (ex. : `"Plans"` en 10px sous le cercle actif uniquement). |
| 3. Zone de dépôt (DropZone) — feedback visuel drag/drop | 8/10 | DropZone importé et passé `disabled={uploading \|\| plans.length >= MAX_FILES_PER_PROJECT}` (page.tsx:453-456). Code DropZone non audité (hors scope) mais les props `disabled` et `onFilesSelected` sont correctement gérées. | DropZone.tsx non lu dans cet audit — le comportement visuel drag-over (highlight, cursor) n'est pas vérifiable ici. Risque : absence de feedback "drag active" distinctif. Note conservatrice car preuve incomplète. | Vérifier dans DropZone.tsx que l'état drag-over change visuellement la zone (border colorée, fond légèrement teinté). Sinon Thomas ne sait pas si son glisser-déposer est "reconnu". |
| 4. Feedback progression upload (barres, compteur) | 7/10 | page.tsx:459-471 : spinner par fichier + texte "Dépôt de {nom} en cours…" pour chaque fichier en `uploadProgress`. Approche texte + icône spinner. | Pas de barre de progression par fichier (pas de pourcentage). L'API fetch ne remonte pas l'avancement — c'est un état binaire (en cours / terminé). Pour un fichier de 20 Mo en 4G lente, Thomas voit un spinner pendant 30 secondnes sans feedback de progression. Risque d'abandon ou de double-clic. | Court terme : ajouter `"… (peut prendre quelques secondes pour les fichiers volumineux)"` sous le spinner si un fichier est > 5 Mo. Long terme : implémenter XHR avec `onprogress` pour une vraie barre. La mention "20 Mo max" dans le sous-titre (page.tsx:403-407) atténue partiellement. |
| 5. Gestion erreurs (message actionnable, retry visible) | 9/10 | 5 occurrences du pattern "vérifiez votre connexion et réessayez" (page.tsx:89, 137, 259, 296, 344). Tuiles retry par fichier échoué (page.tsx:474-513) avec bouton "Réessayer" `min-h-[44px]`. Erreur globale fermable (page.tsx:410-450, bouton ×). `role="alert"` présent. | Erreur globale et erreurs-tuile peuvent coexister sans priorisation visuelle. Si fetchData échoue ET que des fichiers échouent, Thomas voit une bannière rouge ET des tuiles rouges en même temps, ce qui peut être ambigu. | Si une erreur globale (fetchData) est affichée, masquer les tuiles retry (elles sont inutiles si le projet n'a pas chargé). Sinon le double rouge est redondant. |
| 6. ConfirmModal suppression (focus, Escape, clarté message) | 9/10 | ConfirmModal.tsx : focus trap (L84-102), Escape (L67-81), focus initial sur bouton confirmer (L57-59), restauration focus (L60-63), `role="dialog"` + `aria-modal` + `aria-labelledby` + `aria-describedby` (L113-116). Message : "Cette action est irréversible. Le fichier sera supprimé définitivement." (page.tsx:575). Overlay cliquable ferme (L124 `onClick={onCancel}`). | Clic overlay ferme le modal par `onCancel` (attendu), mais focus initial est sur le bouton "Supprimer" (bouton destructeur). Pratique UX usuellement recommandée : focus initial sur "Annuler" pour éviter la suppression accidentelle par Enter rapide. | Déplacer `ref={confirmButtonRef}` sur le bouton "Annuler" plutôt que "Supprimer". Ou ajouter un délai de 300ms avant activation du bouton destructeur (pattern "cooling period"). Friction faible mais concerne une action irréversible. |
| 7. CTA "Lancer l'analyse" (disabled state, spinner, aria-busy) | 9/10 | page.tsx:545-566 : `disabled={plans.length === 0 \|\| isAnalyzing}` + `aria-busy={isAnalyzing}` + spinner conditionnel (L559-563, `aria-hidden="true"`) + label conditionnel "Analyse en cours…" / "Lancer l'analyse" (L565) + `disabled:opacity-50 disabled:cursor-not-allowed` + `focus-visible:outline-2` + `min-h-[44px]`. Bouton rendu UNIQUEMENT si `plans.length > 0` (L516). | CTA absent jusqu'à ce qu'un plan soit déposé (L516 `if (plans.length > 0)`). Thomas en first-use ne voit pas le bouton et peut ne pas savoir que c'est l'étape suivante. Pas de signpost "déposez un plan pour continuer". Note maintenue haute car c'est un flow logique, mais une cible exigeante comme Thomas terrain peut être déstabilisée. | Afficher le bouton en état `disabled` avec tooltip "Déposez au moins un plan pour lancer l'analyse" dès l'arrivée sur la page, plutôt que de le masquer totalement. Le bouton fantôme guide l'intention. |
| 8. Navigation mobile (Stepper horizontal, touch targets) | 8/10 | Stepper horizontal mobile (Stepper.tsx:27-81) : cercles `w-8 h-8` = 32px — inférieur à la cible WCAG 44px. Séparateurs `w-4 h-px` non-interactifs (OK). Boutons actifs page.tsx : tous `min-h-[44px]` (fermer erreur L432, Réessayer L506, Lancer l'analyse L551). ConfirmModal : `min-h-[44px]` sur les deux boutons (L149, L157). | Stepper cercles horizontaux mobiles = 32x32px (w-8 h-8). Non-interactifs donc WCAG touch target ne s'applique pas strictement — mais en termes de tap zone perceptive, si Thomas rate l'indication d'étape active, il ne peut pas "cliquer dessus" pour avoir l'info. Friction d'orientation. | Les cercles Stepper sont non-interactifs donc techniquement conformes. Mais ajouter `w-11 h-11` (44px) en mobile améliorait la zone de perception sans casser le design. Correction P2 (non bloquante). |

---

## Section 2 — 5 états visibles (gate G21)

| État | Présence | Preuve (fichier:ligne) | Verdict |
|---|---|---|---|
| Défaut | Présent | page.tsx:395-456 — DropZone affiché seul, H1 "Déposez vos plans", sous-titre formats acceptés. Aucun plan affiché. | PASS |
| Loading | Présent | page.tsx:352-366 — skeleton avec spinner centré pendant fetchData (chargement initial). `setLoading(true)` au montage. Stepper visible dans les deux variantes pendant le loading. | PASS |
| Vide (0 plans) | Présent (confondu avec Défaut) | page.tsx:452-456 — DropZone + instructions. Pas de "empty state" distinct (message "aucun plan encore") mais l'état vide = état défaut initial, ce qui est cohérent. JSDoc L6-7 documente "Vide : = défaut (aucun plan)". | PASS (intention documentée) |
| Erreur | Présent | page.tsx:410-450 (bannière globale `role="alert"`) + page.tsx:474-513 (tuiles par fichier échoué). 5 déclencheurs couverts (fetchData, uploadSingleFile, confirmDelete, handleFloorChange, handleAnalyze). | PASS |
| Succès | Présent | page.tsx:516-569 — grille miniatures `grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`, compteur "X plans déposés / Y emplacements restants", bouton "Lancer l'analyse". La page reste sur la même URL (pas de redirect, conforme spec AC L284). | PASS |

---

## Section 3 — Frictions P0/P1/P2

| Sévérité | Friction | Correction exacte |
|---|---|---|
| P1 | **CTA "Lancer l'analyse" invisible jusqu'au premier dépôt.** Thomas en first-use ne sait pas ce qui l'attend après le dépôt — pas de signpost de l'action suivante. | Rendre le bouton visible dès l'arrivée sur la page avec `disabled` et `title="Déposez au moins un plan pour continuer"`. Supprimer la condition `plans.length > 0` autour du bloc bouton (page.tsx:516). Bouton reste `disabled={plans.length === 0 \|\| isAnalyzing}`. |
| P1 | **Stepper non connecté à `project.status`** — `completedSteps` toujours `[]`. Thomas revenant après un dépôt partiel ne voit pas l'étape 1 cochée. Perte du contexte de progression. | page.tsx:386 et 391 : remplacer `<Stepper currentStep={1} projectId={projectId} />` par `<Stepper currentStep={1} projectId={projectId} completedSteps={project?.status === 'step_1_complete' ? [1] : []} />`. Coût : 1 ligne modifiée × 4 occurrences (rendu normal + loading state). |
| P1 | **Focus initial ConfirmModal sur bouton destructeur** ("Supprimer"). Un Enter rapide après ouverture du modal supprime sans confirmation visuelle. Action irréversible. | ConfirmModal.tsx:153 : déplacer `ref={confirmButtonRef}` du bouton "Supprimer" au bouton "Annuler". Ou ajouter `setTimeout(() => confirmButtonRef.current?.focus(), 300)` pour un délai cooling period. |
| P2 | **Feedback progression upload** binaire (spinner texte seulement). Sur un fichier 20 Mo en 4G lente : 30+ secondes de spinner sans progression perceptible. | Court terme : si `file.size > 5 * 1024 * 1024`, ajouter après le spinner `"… (peut prendre quelques secondes)"` dans la liste page.tsx:465-470. Long terme : XHR + `onprogress` pour barre de progression réelle. |
| P2 | **Labels Stepper mobile masqués** (seuls les numéros visibles, pas les noms d'étapes). Thomas en mobile ne voit que "1 — 2 — 3 — 4", pas "Plans — Lots — Pièces — Export". | Stepper.tsx variant horizontal : sous le cercle actif uniquement, ajouter `<span className="text-[10px] text-text-inverse mt-0.5">{step.label}</span>` conditionnel `isActive`. Pas de changement pour les étapes futures/complétées (trop dense). |
| P2 | **Double affichage rouge** (bannière globale + tuiles retry). Si `fetchData` échoue ET des fichiers ont échoué précédemment, Thomas voit deux zones rouges sans distinction de priorité. | page.tsx: si `error` (erreur fetchData) est affiché, ne pas rendre `failedFiles` (les retry sont inutiles si le projet n'a pas chargé). Ajouter `{!error && failedFiles.length > 0 && (…)}` à la ligne 474. |

---

## Section 4 — Verdict

- **Score /10** : —
- **Unanimité 9/10** : —
- **Top 3 corrections P0/P1** : —

---

## Section 5 — Handoff

→ À remplir après analyse
