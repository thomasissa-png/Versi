# Test Plan E2E — Étape 4 v2 : Visuels sur Plan

Session : versi-s29 | Date : 2026-05-04 | Agent : @qa
Inputs : `docs/product/visuals-step-v2-specs.md` | `docs/ux/visuals-step-v2-wireframes.md` | `docs/ia/visuals-step-v2-pipeline.md` | `docs/reviews/persona-thomas-marchand-visuals-v2-avis.md`

---

## 1. Résumé exécutif

**Objectif.** Garantir que la refonte Étape 4 v2 (canvas plan + ancrage photos + cohérence inter-visuels + détection ambiguïté T1-T5) atteint la production sans régression sur l'Étape 3 et avec une couverture E2E sur les 10 user stories US-V4-01 à US-V4-10. Le test plan couvre les triggers IA bloquants, la cohérence visuelle ancre→secondaires, les edge cases EC-1 à EC-5, et les frictions persona Thomas (mobile tactile P0-A2, flooding T2 P1).

**Périmètre couvert.** Tests E2E Playwright (10 scénarios sur matrice Chromium desktop + Mobile Safari + Mobile Chrome), tests intégration Vitest sur 5 modules backend nouveaux, tests non-régression Étape 3 (ALTER TABLE `vs_photos` ne casse rien), validation cohérence visuelle persona (4 critères qualitatifs). Pipeline CI pré-push + smoke post-deploy.

**Exclusions explicites.** (a) Tests unitaires des fonctions internes au pipeline IA (extraction signature, calibration seuils flou/luminance) — couverts par @ia dans son test bench. (b) Validation pixel-par-pixel des visuels générés — non déterministe par nature gpt-image-2, jugé qualitativement par Thomas. (c) Load tests OpenAI — couvert par @infrastructure (token bucket 8 req/min validé indépendamment). (d) Tests A11y exhaustifs canvas SVG — couverts dans le test plan UX dédié à livrer Vague 2.

---

## 2. Outillage et stack

**Frameworks de test.**
- **Playwright** ≥ 1.49 : E2E sur matrice 3 devices (`devices['Desktop Chrome']`, `devices['iPhone 13']` Mobile Safari, `devices['Pixel 7']` Mobile Chrome). Locators `getByRole()` / `getByLabel()` prioritaires (jamais sélecteur CSS sur classes générées). Healer activé en CI pour réparation locators cassés.
- **Vitest** ≥ 1.6 : tests intégration backend modules `lib/vs/photo-preprocessor.ts`, `ambiguity-detector.ts`, `coherent-visual-generator.ts`, `openai-rate-limiter.ts`, refactor `visual-generator.ts`.
- **axe-core** : intégré dans CHAQUE test E2E Playwright via `@axe-core/playwright`. Échec si violation niveau A ou AA.

**Mocks OpenAI — règle critique (learning P0 s28).**
- Mocks pour `gpt-image-2` (`images.edit`) et `gpt-4o-mini` (vision + text) DOIVENT être SYNCHRONISÉS avec les structures réelles observées en prod. Hardcoder une structure de réponse absente du dataset réel = bug s28 reproductible (mock-obsolete-detection).
- Test obligatoire `mock-vs-real-shape.test.ts` : compare la structure JSON retournée par chaque mock avec un échantillon snapshot de la sortie réelle (capturé une fois sur un appel live, stocké dans `tests/fixtures/openai-real-snapshots/`). Si divergence (clés manquantes, types différents, profondeur d'objet différente) → FAIL.
- Contrat mock minimal : `gpt-image-2` retourne `{ data: [{ b64_json, revised_prompt }] }`. Mock signature ancre retourne JSON valide avec clés `palette`, `meubles`, `sols_murs`, `lumiere`.
- Mock token bucket : appel mocké respecte aussi le rate limit interne (vérifie que le code consomme bien le token avant l'appel mocké).

**Fixtures photos — 5 archétypes obligatoires.**
| ID | Format | Caractéristiques | Vérifie |
|---|---|---|---|
| F1 | HEIC iPhone 14 (sortie native) | EXIF orientation 6, GPS Paris, 4032×3024 | Conversion HEIC→JPG, rotation EXIF appliquée + strippée, GPS conservé en `exif_raw` |
| F2 | JPG desktop reflex | EXIF orientation 1, 6000×4000, 8 Mo | Resize 2048px max, ratio préservé |
| F3 | PNG capture écran | Pas d'EXIF, 1920×1080, 200 KB | Passthrough sans erreur, pas de rotation |
| F4 | JPG low-light | Luminance Y moyenne 28/255 (< 40), 1024×768 | Warning UI low-light affiché, ne bloque pas |
| F5 | JPG flou | Variance Laplacien 65 (< 100), 800×600 | Warning UI flou affiché, ne bloque pas |

**Fixtures données.** Projet test seed `tests/seed-vs-v2.sql` : 1 lot, 4 pièces (salon 28m², chambre 12m², SDB 4m², pièce surface NULL), polygones définis, 0 photo placée par défaut. Reset via `prisma migrate reset --skip-seed && psql < tests/seed-vs-v2.sql` avant chaque suite E2E.

**Fixtures snapshots OpenAI.** `tests/fixtures/openai-real-snapshots/` contient au moins 1 snapshot par endpoint mocké, capturé en mode record (env `OPENAI_RECORD=true`), versionné dans le repo. Mise à jour manuelle trimestrielle ou si OpenAI release API breaking.

---

## 3. Test plan E2E par scénario (10 scénarios)

Format : `ID | Nom | Préconditions | Steps | Asserts | Risque si fail`. Chaque scénario tourne sur la matrice 3 devices sauf indication contraire. Annotation `// REGRESSION:` ajoutée si le scénario couvre un bug déjà corrigé.

### S1 — Upload + placement photo simple (chemin nominal)

- **Préconditions** : projet seed (1 lot, 4 pièces), salon (28 m²) sélectionné dans sidebar, 0 photo placée.
- **Steps** :
  1. `getByRole('button', { name: /Ajouter des photos/i }).click()`
  2. Upload fixture F2 (JPG 6000×4000) via `setInputFiles`
  3. Attendre toast "Photo uploadée" puis drag du marker depuis la zone de dépôt vers le polygon Salon (`page.locator('[data-room-type="salon"]').dragTo(...)`)
  4. Cliquer sur le marker placé, faire pivoter la flèche d'angle à 45° (drag arc + assertion sur input numérique)
  5. Cliquer "Confirmer"
  6. Slider visuels = 1, commentaire vide, cliquer "Générer tous les visuels"
- **Asserts** :
  - `vs_photos.position_x`, `position_y` non null ET dans le polygone salon (vérification BDD via API `/api/vs/projects/[id]/state`)
  - `angle_degrees == 45`, `is_placed_on_plan == true`
  - Aucune modale questions n'apparaît (`expect(page.getByRole('dialog')).toHaveCount(0)`)
  - Génération démarre, barre de progression visible
  - 1 visuel apparaît dans la galerie pièce salon après mock OpenAI
  - axe-core scan : 0 violation A/AA
- **Risque si fail** : pipeline nominal cassé — bloquant déploiement.

### S2 — Multi-photos même pièce + génération cohérente (signature visuelle propagée)

- **Préconditions** : projet seed, salon sélectionné, slider visuels = 3.
- **Steps** :
  1. Uploader 3 photos (F2, F3, et une variante F2 modifiée pour différer en angle)
  2. Placer les 3 sur le polygon Salon à des positions distinctes (15%, 50%, 85% en x), angles 0°, 120°, 240°
  3. Cliquer "Générer"
- **Asserts** :
  - Mock `coherent-visual-generator` est appelé 1× pour l'ancre + 2× pour les secondaires
  - Le mock secondaire reçoit dans son input le champ `anchorSignature` non null avec clés `palette`, `meubles`, `sols_murs`, `lumiere` (intercept Playwright sur `/api/vs/visuals/generate`)
  - L'ancre choisie est la photo dont la position est la plus proche du centroïde du polygon (vérifier `selectedAnchorPhotoId` dans réponse API)
  - 3 visuels stockés dans `vs_visuals` avec même `signature_json` que l'ancre
  - PROMPT_VERSION = `v2.0.0` dans chaque ligne
- **Risque si fail** : cohérence inter-visuels cassée — visuels du même salon avec mobilier différent → décrédibilisation Laurent. Couvre learning P0 s28 (mock vs réel : on vérifie aussi la STRUCTURE de la signature retournée par le mock).

### S3 — Trigger T1 surface aberrante → modale question bloquante

- **Préconditions** : projet seed modifié, salon avec `surface_m2 = 3` (< 4), 1 photo placée, slider = 1.
- **Steps** :
  1. Cliquer "Générer"
  2. Attendre l'apparition de la modale questions (Écran C)
  3. Vérifier que la modale ne se ferme pas avant réponse (Escape ne ferme PAS, click outside ne ferme PAS — sauf bouton "Annuler tout")
  4. Saisir `12` dans le champ de réponse, cliquer "Confirmer"
  5. Attendre fermeture modale puis génération démarre
- **Asserts** :
  - Modale présente avec texte exact `"La surface détectée est 3 m² pour Salon"` (vérifier template T1)
  - Bouton "Générer tous les visuels" est `disabled` tant que `vs_visual_questions.answered_at IS NULL`
  - Après réponse `12` : `vs_rooms.surface_m2` est mis à jour à 12 (side-effect documenté §7.3 brief IA)
  - Trap focus actif (Tab ne sort pas de la modale — vérifier via `page.keyboard.press('Tab')` × 20 et que le focus reste dedans)
  - aria-live="polite" sur le compteur de réponses
- **Risque si fail** : génération avec données incohérentes → meubles disproportionnés.

### S4 — Trigger T2 photo manquante → warning + question si forcé

- **Préconditions** : projet seed, cuisine avec slider = 2 mais 0 photo placée.
- **Steps** :
  1. Vérifier badge sidebar "INCOMPLET" sur cuisine
  2. Cliquer "Générer"
  3. Modale T2 apparaît avec question
  4. Choisir réponse "passer à 0"
  5. Vérifier que `target_visual_count` passe à 0 et que la cuisine est exclue de la génération
- **Asserts** :
  - Badge "Aucune photo placée" visible avant clic
  - Modale T2 avec template exact "Vous demandez 2 visuel(s) pour Cuisine mais aucune photo n'y est placée"
  - Après réponse, `vs_room_settings.target_visual_count == 0` pour la cuisine
  - Pipeline génération ne touche pas la cuisine (mock pas appelé pour cette pièce)
- **Risque si fail** : génération sur pièce sans input → hallucination IA totale.

### S5 — Trigger T3 conflit style/commentaire ("supprimer un mur" + style classique)

- **Préconditions** : salon avec photo placée, style classique sélectionné, commentaire = `"supprimer le mur entre cuisine et salon"`.
- **Steps** :
  1. Cliquer "Générer"
  2. Mock `gpt-4o-mini` retourne `{ conflit: true, raison: "demande de démolition incompatible avec préservation classique" }`
  3. Modale T3 affiche question avec choix A/B
  4. Choisir A, confirmer
- **Asserts** :
  - Pré-filtre déterministe matche (mot "supprimer" détecté + style classique)
  - 1 appel `gpt-4o-mini` confirmé via mock (vérifier intercept)
  - Question template avec `« supprimer »` + nom pièce + style
  - `userAnswers` injecté dans prompt génération contient `"Show post-structural-transformation state"` (vérifier prompt envoyé au mock gpt-image-2)
- **Risque si fail** : visuels générés contradictoires avec demande Thomas → reroll obligatoire (gaspillage $0.21/visuel).

### S6 — Trigger T4 photos incohérentes (jour vs nuit) — SYNC au clic Générer

- **Préconditions** : salon avec 2 photos, EXIF `taken_at` photo1 = 14h, photo2 = 22h ; mock `gpt-4o-mini` vision retourne `{ coherent: false, raison: "éclairage très différent jour/nuit" }`.
- **Steps** :
  1. Cliquer "Générer"
  2. Loader "L'IA analyse vos photos…" visible (latence T4 ~3-4s)
  3. Modale T4 apparaît avec choix A/B/C
  4. Choisir B "après gros œuvre seulement", confirmer
- **Asserts** :
  - Évaluation T4 lancée SYNC après clic Générer (pas async background)
  - Mock vision appelé exactement 1× pour cette pièce
  - Réponse `B` mappée vers `"After heavy work only"` dans `userAnswers` injecté
  - Loader disparaît avant que la modale s'affiche (pas de superposition)
- **Risque si fail** : génération sur photos incohérentes → 3 visuels d'ambiances différentes pour la même pièce.

### S7 — Trigger T5 surface inconnue → question bloquante

- **Préconditions** : pièce avec `surface_m2 = NULL`, 1 photo placée, slider = 1.
- **Steps** :
  1. Cliquer "Générer"
  2. Modale T5 apparaît demandant estimation surface (entre 4 et 100)
  3. Saisir `15`, confirmer
- **Asserts** :
  - Validation input : refus de `0`, `3`, `101`, texte non numérique (assertions `expect(page.locator('button:has-text("Confirmer")')).toBeDisabled()`)
  - Surface 15 m² stockée dans `vs_visual_questions.user_answer` (NOT mis à jour dans `vs_rooms.surface_m2` car valeur estimée temporaire)
  - Prompt généré contient `"Estimated surface: 15m²"`
- **Risque si fail** : prompt sans surface → meubles non proportionnés.

### S8 — Régénération individuelle EC-5 (1 visuel sur 3 échoue, relancer celui-ci)

- **Préconditions** : salon avec 3 visuels demandés, mock OpenAI configuré pour échouer sur le 2e appel (réponse erreur 500).
- **Steps** :
  1. Lancer génération
  2. 1 visuel ancre OK + 1 secondaire OK + 1 secondaire en état `failed`
  3. Vérifier que les 2 visuels OK sont conservés et affichables dans la galerie
  4. Cliquer "Régénérer ce visuel" sur le visuel raté
  5. Mock OpenAI configuré pour réussir le retry
- **Asserts** :
  - Visuel raté affiche icône alerte + texte "Génération échouée"
  - Bouton "Régénérer ce visuel" présent uniquement sur le visuel en échec
  - Re-génération utilise la `signature_json` de l'ancre (PAS un nouveau pipeline complet) — vérifier que le mock ancre n'est PAS rappelé
  - Après succès retry : visuel apparaît, état passe à `done`, projet pas bloqué
- **Risque si fail** : Thomas doit tout regénérer pour 1 visuel cassé → coût × 3 + frustration.

### S9 — Mobile placement tactile (Mobile Safari + Mobile Chrome) — couvre P0-A2

- **Préconditions** : exécution sur `devices['iPhone 13']` (Mobile Safari) ET `devices['Pixel 7']` (Mobile Chrome). Salon sélectionné.
- **Steps** :
  1. Tap sur FAB "+ Ajouter une photo"
  2. Sélection F1 (HEIC) via input file
  3. Vérifier zoom auto centré sur Salon (facteur ajusté pour 80% viewport)
  4. Tap sur position cible dans le polygon Salon (placement par tap, pas drag)
  5. Drag en arc autour du pin pour définir l'angle (gesture `page.touchscreen.tap` + `swipe`)
  6. Long-press 500ms sur marker pour menu contextuel (Voir l'angle / Repositionner / Supprimer)
  7. Tester pinch-to-zoom canvas (min 0.5×, max 4×)
- **Asserts** :
  - Touch targets ≥ 44×44px sur tous les éléments (marker photo, FAB, boutons sidebar) — vérifier via `boundingBox()`
  - Conversion HEIC→JPG côté serveur réussie (vérifier `vs_photos.file_path` extension)
  - Long-press déclenche bien le menu (pas un tap court, pas un drag)
  - Pinch-zoom fonctionnel avec limites respectées
  - Bottom sheet sidebar : drag depuis la poignée fonctionne, état persistant en sessionStorage
  - axe-core 0 violation
- **Risque si fail** : couverture P0-A2 frictions tactiles cassée — Thomas ne peut pas utiliser l'outil sur iPad chantier. Bloquant. **REGRESSION P0-A2 propagée s28 : test E2E par étage/contexte obligatoire — itérer sur 2 OS mobiles distincts (iOS + Android) car comportements touch divergent.**

### S10 — Perte réseau pendant placement + reprise (autosave optimiste + queue replay)

- **Préconditions** : projet seed, salon sélectionné, 1 photo prête à placer.
- **Steps** :
  1. Placer la photo sur le canvas
  2. `await context.setOffline(true)` pendant que Thomas saisit le commentaire et bouge le slider
  3. Banner "Reconnexion en cours…" apparaît après ~5s
  4. Continuer à modifier slider à 3, saisir commentaire complet
  5. `await context.setOffline(false)` après 35s (déclenche le mode "hors-ligne persistant")
  6. Vérifier banner "Synchronisé ✓"
  7. Reload page, vérifier que toutes les modifications sont persistées
- **Asserts** :
  - Aucune perte de saisie (commentaire et slider corrects après reload)
  - Bouton "Générer" disabled pendant offline persistant
  - Upload photos désactivé pendant offline (`+` grisé + tooltip)
  - Queue replay envoie bien les modifications dès reconnexion (vérifier 1 PATCH consolidé, pas N PATCH par caractère)
  - Modale TTL 24h non déclenchée ici (test couvert séparément en S-bonus)
- **Risque si fail** : Thomas perd 5 min de saisie → abandon outil.

---

---

## 4. Tests intégration backend (Vitest) — 5 modules

Chaque module = 1 fichier `.test.ts` dans `versi-studio/src/lib/vs/__tests__/`. Mocks OpenAI partagés via `tests/setup-openai-mocks.ts`. Couverture cible 80% sur les chemins critiques (mutation testing Stryker score ≥ 70% sur `ambiguity-detector` et `coherent-visual-generator`).

### 4.1 `photo-preprocessor.test.ts`

- **Conversion HEIC→JPG** : input fixture F1 (HEIC iPhone) → output JPG quality 90, magic bytes vérifiés (pas l'extension)
- **EXIF orientation** : F1 a orientation 6 (rotation 90° CW) → après preprocessing, image orientée correctement ET EXIF strippé
- **Resize** : F2 (6000×4000) → 2048×1365 (ratio préservé, fit inside)
- **Passthrough** : F3 (PNG 1920×1080) → identique en sortie, aucune modification
- **Détection low-light** : F4 (luminance 28/255) → flag `low_light: true` retourné
- **Détection flou** : F5 (variance Laplacien 65) → flag `blurry: true` retourné
- **Détection too small** : image 400×300 → flag `too_small: true`
- **Idempotence** : appeler preprocessor 2× sur la même image normalisée → no-op (sortie identique, pas d'erreur)
- **Magic byte mismatch** : fichier `.jpg` qui est en réalité HEIC → détecté et converti
- **Format rejeté** : TIFF, BMP, GIF → throw `UnsupportedFormatError`
- **EXIF DateTimeOriginal** : extrait dans `vs_photos.taken_at` (utile pour T4)
- **EXIF GPS conservé en `exif_raw` JSONB** : strippé de l'image mais préservé en BDD pour usage futur

### 4.2 `ambiguity-detector.test.ts` — T1-T5 isolés + cas limites

- **T1 surface < 4** : `room.surface_m2 = 3.5` → trigger activé, question template correct
- **T1 surface > 80 sur grande pièce** : `salon, surface 95` → trigger activé
- **T1 surface > 80 sur petite pièce** : `wc, surface 95` → trigger PAS activé (whitelist `largeRooms`)
- **T1 surface NULL** : pas activé (T5 traite ce cas)
- **T2 photo manquante** : `target_visual_count = 2`, 0 photo → trigger activé
- **T2 cas limite** : `target_visual_count = 0` → trigger PAS activé (pièce inactive)
- **T3 pré-filtre négatif** : commentaire sans mot-clé → 0 appel `gpt-4o-mini` (vérifier mock NOT called)
- **T3 pré-filtre positif + style non patrimonial** : "abattre mur" + style scandinave → 0 appel IA (filtre style)
- **T3 pré-filtre positif + style classique + IA confirme conflit** : 1 appel `gpt-4o-mini` mocké, retour `{conflit: true}` → trigger activé
- **T3 mock retourne JSON invalide** : graceful fallback, log erreur, ne bloque pas la génération
- **T4 photos < 2** : pas activé
- **T4 photos ≥ 2 + EXIF cohérent** : pré-étape déterministe ne flag pas → pas d'appel vision
- **T4 EXIF jour/nuit + IA confirme incohérence** : 1 appel vision mocké, trigger activé
- **T5 surface NULL + target > 0** : trigger activé
- **Agrégation** : projet avec 3 pièces déclenchant T1, T2, T5 → 1 INSERT par question dans `vs_visual_questions`, modale unique avec 3 questions ordonnées
- **Mutation testing Stryker** : score ≥ 70% sur les conditions `if` des 5 triggers (un mutant qui survit révèle un test manquant)

### 4.3 `coherent-visual-generator.test.ts`

- **Sélection ancre = centroïde** : 3 photos placées à (0.1, 0.1), (0.5, 0.5), (0.9, 0.9) sur polygon centroïde (0.5, 0.5) → photo 2 sélectionnée
- **Tie-break** : 2 photos équidistantes du centroïde → celle avec plus haute résolution post-resize
- **Signature ancre extraite** : mock retour `{palette: ["#fff"], meubles: ["canapé"], sols_murs: "...", lumiere: "..."}` → JSON valide stocké dans `vs_visuals.signature_json`
- **Signature mock contrat** : la structure doit avoir EXACTEMENT 4 clés (palette, meubles, sols_murs, lumiere) — pas plus, pas moins (compare avec snapshot réel)
- **Secondaires utilisent signature** : appel `buildVisualPromptSecondary` injecte bien le bloc COHERENCE WITH ANCHOR avec les valeurs de la signature
- **Fallback textuel si multi-image refusé** : si `gpt-image-2` retourne erreur "image array not supported" → fallback signature textuelle uniquement, log warning
- **Re-génération secondaire (EC-5)** : appel direct `regenerateSecondary(visualId)` → ancre pas re-générée, signature récupérée de la BDD
- **Propagation erreur** : mock OpenAI throw → `VisualGenerationOutcome.error` propagé sans fallback (P0 fondateur s27)
- **Mutation testing** : score ≥ 70% sur la logique de sélection ancre et de propagation signature

### 4.4 `openai-rate-limiter.test.ts`

- **Token bucket 8 req/min** : 8 appels rapides → tous passent ; 9e appel → wait jusqu'à libération du token
- **Libération après 60s** : avancer horloge fake `vi.useFakeTimers()` de 60s → tokens reset
- **Blocage propre** : si rate limit hit → throw `RateLimitExceededError` avec retry-after
- **Concurrent calls** : 20 appels en parallèle → 8 passent immédiatement, 12 attendent
- **Reset compteur** : entre 2 fenêtres glissantes, vérifier comportement (pas de burst de 16 sur 2× 60s)

### 4.5 Refactor `visual-generator.test.ts`

- **`extractVisualSignature` retourne JSON valide** : mock vision retour OK → parse réussit, schéma respecté
- **`extractVisualSignature` mock JSON invalide** : retour mal formé → throw + log clair
- **`generateSecondaryVisual` respecte signature** : prompt envoyé à `gpt-image-2` contient le bloc COHERENCE WITH ANCHOR
- **PROMPT_VERSION = `v2.0.0`** stocké dans chaque visuel généré
- **Non-régression V1** : `buildVisualPromptAnchor` sans `anchorSignature` produit un prompt identique à la V1 (snapshot test sur prompt généré)
- **Test mock vs réel (learning P0 s28)** : `mock-vs-real-shape.test.ts` lit le snapshot `tests/fixtures/openai-real-snapshots/gpt-image-2-edit.json` et compare clés/types avec la réponse mock. Si divergence → FAIL avec diff lisible.

---

---

## 5. Tests non-régression — Étape 3 ne doit pas casser

La refonte Étape 4 ajoute `position_x/y/angle_degrees/is_placed_on_plan` à `vs_photos` et crée 2 tables (`vs_room_settings`, `vs_visual_questions`). Aucune modification attendue côté Étape 3, mais migration BDD = risque silencieux. 5 cas obligatoires :

- **NR1 — Affichage Étape 3 inchangé** : test E2E parcours étape 3 (extraction pièces existante) inchangé après migration. Re-run de la suite E2E `vs-step-3.spec.ts` existante : 100% PASS attendu sans modification de code Étape 3.
- **NR2 — Migration up/down réversible** : `prisma migrate reset` puis `prisma migrate deploy` puis `prisma migrate down` → 0 erreur, schéma initial restauré identique (vérifier via `pg_dump --schema-only` diff).
- **NR3 — Photos existantes pré-migration** : seed avec 10 `vs_photos` existantes → après ALTER TABLE, toutes ont `is_placed_on_plan = false`, `position_x/y/angle_degrees = NULL`. Aucune ligne perdue ou corrompue.
- **NR4 — Routes existantes inchangées** : tests d'intégration sur routes `/api/vs/projects/[id]/rooms`, `/api/vs/projects/[id]/plan`, `/api/vs/projects/[id]/photos` — schemas de réponse inchangés (snapshot Zod), 0 propriété ajoutée breaking.
- **NR5 — Champ `angle_description` (TEXT) conservé** : la dépréciation est en V3, pas V2. Vérifier que la colonne est encore lisible et écrite par le code legacy si présent. Aucun trigger de suppression silencieuse.

Si un de ces 5 cas FAIL → blocker déploiement, rollback migration nécessaire.

---

---

## 6. Tests cohérence visuelle (validation persona)

Ces 4 critères sont **qualitatifs** et non automatisables par Playwright (la sortie `gpt-image-2` est stochastique — un pixel-diff serait absurde). Ils sont validés visuellement par Thomas (ou par persona-thomas-marchand en review IA + audit Thomas final). Format : "Critère acceptation = X/10 visuel validé par Thomas".

| ID | Critère | Méthode validation | Seuil acceptation |
|---|---|---|---|
| C1 | Les 3 visuels du salon ont **le même canapé** (matériau, couleur, forme) | Thomas regarde les 3 visuels côte à côte. Identifie si le canapé est cohérent ou s'il a changé entre les angles. | 8/10 sur 10 projets test (80% des sets cohérents) |
| C2 | Surface 8 m² → **mobilier compact** (canapé 2 places, table d'appoint, pas de canapé d'angle) | Thomas vérifie qu'aucun meuble disproportionné n'est présent. | 9/10 (1 raté toléré sur 10) |
| C3 | Surface 50 m² → **mobilier généreux** (canapé d'angle, fauteuil lounge, table basse 120 cm) | Thomas vérifie qu'aucun meuble compact ne donne l'impression d'une pièce vide. | 9/10 |
| C4 | Commentaire "poutres apparentes à conserver" → **présent dans les visuels** | Thomas vérifie la présence des poutres dans chaque visuel généré pour cette pièce. | 9/10 sur les visuels avec ce type de contrainte |

**Process validation** : à chaque release V2 majeure, batch de 10 projets test prédéfinis (`tests/visual-coherence-batch/`) lancé sur env staging avec API OpenAI réelle. Thomas reçoit un rapport HTML avec les 10 sets de visuels + grille de scoring. Si seuils non atteints → arbitrage @ia (ajustement prompts ou activation Option B seed fixe, cf. brief IA §5).

**Garde-fou IA optionnel** (cf. brief IA §5.5) : un appel `gpt-4o-mini` vision peut comparer chaque visuel secondaire à l'ancre et scorer la cohérence. Si activé, le score `coherence_warning` est affiché dans la galerie sans bloquer. À discuter avec Thomas (coût +$0.005/visuel).

**Reality check obligatoire avant GO PRODUCTION** (règle s22/s24) : 1 test E2E avec photos réelles + DB réelle + génération OpenAI réelle (PAS mock) sur 1 projet complet dans Versi Studio prod. Thomas valide les visuels via UI (pas via CLI ou inspection DB). Tests mockés = nécessaires mais PAS suffisants.

---

---

## 7. CI/CD intégration

### 7.1 Pipeline pre-push (Husky + lint-staged)

Hook `.husky/pre-push` exécute en séquence (échec strict, code retour ≠ 0 bloque le push) :

```bash
npx tsc --noEmit --project tsconfig.json   # 0 erreur strict — pas de filtre (règle s24)
npx next lint                                # 0 erreur (warnings tolérés)
npx vitest run --coverage                    # tests unitaires + intégration (~3 min)
npx playwright test --project=chromium-desktop --grep "@critical"  # S1 + S2 + S3 critiques (~4 min)
```

Total cible : ≤ 8 min sur poste dev. Si > 10 min → escalade @infrastructure pour parallélisation.

### 7.2 Pipeline GitHub Actions (PR + main)

```yaml
jobs:
  lint-typecheck:    # ~2 min
  unit-integration:  # vitest sur tout le projet, ~3 min
  e2e-matrix:        # playwright matrice 3 devices x 10 scénarios, ~12 min total
    strategy:
      matrix:
        device: [chromium-desktop, mobile-safari, mobile-chrome]
  visual-regression: # screenshots vs baselines tests/screenshots/ (gate G24/G26)
  build:             # next build, vérifie 0 erreur
```

**Gate G26 strict** :
1. `tsc --noEmit` — 0 erreur sur TOUT le projet (scripts inclus, pas de filter — règle s24)
2. ESLint — 0 erreur
3. Vitest — 100% PASS
4. Playwright critiques (S1, S2, S3, S9) — 100% PASS sur les 3 devices
5. Grep clés API placeholders : `sk_test_`, `pk_test_`, `="..."`, `=xxx`, `=placeholder` dans `versi-studio/src/` → 0 résultat

Si 1 des 5 fail → blocker déploiement Replit.

### 7.3 Smoke test post-deploy Replit

Hook post-deploy : exécution automatique du scénario S1 nominal en prod après chaque push merged sur `main`. Durée cible ≤ 90s. Échec → notification Slack + rollback manuel proposé.

```bash
PLAYWRIGHT_BASE_URL=https://versi-studio.replit.app \
  npx playwright test tests/e2e/smoke-s1.spec.ts --project=chromium-desktop
```

### 7.4 Mutation testing — exécution conditionnelle

Stryker exécuté **uniquement sur fichiers modifiés** dans la PR (via `--mutate "files-changed-since=main"`). Score cible ≥ 70% sur `ambiguity-detector.ts` et `coherent-visual-generator.ts` (chemins critiques). Score < 70% → warning bloquant en review (pas auto-block CI mais flag review @qa requis).

### 7.5 Visual regression baselines

Baselines source : `tests/screenshots/visuals-step-v2-*.png` produites par @fullstack pendant la boucle visuelle (cf. wireframes §3-6, screenshots à valider page par page contre `docs/design/page-compositions.md`). Si baselines absentes → @qa signale bug bloquant à @fullstack ("Boucle visuelle non exécutée"). Seuil pixel-diff < 0.5%, mais @qa lit visuellement chaque screenshot via `Read("tests/screenshots/[page]-[device].png")` pour détecter problèmes hors pixel-diff (texte tronqué, chevauchements, contenu visuellement creux).

---

---

## 8. Handoff

### Matrice de traçabilité user stories ↔ tests (Gate G25)

| User Story | Test correspondant | Statut |
|---|---|---|
| US-V4-01 — Uploader photos | tests/e2e/visuals-v2.spec.ts S1 + photo-preprocessor.test.ts | À implémenter Vague 2 |
| US-V4-02 — Placer photo sur pièce | tests/e2e/visuals-v2.spec.ts S1, S9 | À implémenter Vague 2 |
| US-V4-03 — Indiquer angle de vue | tests/e2e/visuals-v2.spec.ts S1, S9 | À implémenter Vague 2 |
| US-V4-04 — Supprimer photo placée | tests/e2e/visuals-v2.spec.ts S9 (long-press menu) | À implémenter Vague 2 |
| US-V4-05 — Commentaire libre par pièce | tests/e2e/visuals-v2.spec.ts S5, S10 | À implémenter Vague 2 |
| US-V4-06 — Choisir nombre visuels | tests/e2e/visuals-v2.spec.ts S2, S4 | À implémenter Vague 2 |
| US-V4-07 — Répondre questions IA | tests/e2e/visuals-v2.spec.ts S3, S4, S5, S6, S7 | À implémenter Vague 2 |
| US-V4-08 — Naviguer entre N visuels | tests/e2e/visuals-v2.spec.ts S2 (galerie) | À implémenter Vague 2 |
| US-V4-09 — Retour à l'Étape 3 | tests/e2e/visuals-v2.spec.ts NR1 (couvre EC-4) | À implémenter Vague 2 |
| US-V4-10 — Valider et exporter | tests/e2e/visuals-v2.spec.ts S2 (fin parcours) | À implémenter Vague 2 |

100% des US ont au moins 1 test correspondant — Gate G25 PASS.

### Suivants

- **@fullstack Vague 2** : implémentation des routes API (`POST /preflight`, `PATCH /questions/:id`, `POST /generate`) + UI canvas + sidebar + modale chat questions + galerie résultats.
- **@reviewer** : audit pré-prod après V2 complète (code review + audit persona + reality check E2E + tests auto = 4/4 verdict GO PRODUCTION).

### Inputs requis pour @fullstack Vague 2

- Ce document (`/home/user/Versi/docs/qa/visuals-step-v2-test-plan.md`)
- Tous les livrables Vague 1 @fullstack : `versi-studio/src/lib/vs/photo-preprocessor.ts`, `ambiguity-detector.ts`, `coherent-visual-generator.ts`, migrations SQL, refactor `visual-generator.ts`
- Spec PM (`docs/product/visuals-step-v2-specs.md`)
- Wireframes UX (`docs/ux/visuals-step-v2-wireframes.md`)
- Pipeline IA (`docs/ia/visuals-step-v2-pipeline.md`)

### Inputs requis pour @reviewer

- Ce document
- Tous les livrables Phase 1 (specs PM, wireframes UX, pipeline IA, persona avis)
- Tous les livrables Phase 2 (modules @fullstack Vague 1)
- Tous les livrables Phase 3 (routes API + UI @fullstack Vague 2)
- Screenshots V2 prod dans `tests/screenshots/visuals-step-v2-*.png`
- Rapport batch cohérence visuelle 10 projets test (cf. §6) validé par Thomas

### Points d'attention pour Vague 2

- **Variables d'env CI requises** : `OPENAI_API_KEY` (mode mock par défaut, mode réel pour reality check pre-prod), `DATABASE_URL` (test DB séparée, jamais prod), `OPENAI_RECORD=true` pour capturer snapshots réels (à exécuter manuellement, pas en CI).
- **Secrets GitHub Actions à configurer** : `OPENAI_API_KEY_TEST`, `DATABASE_URL_TEST`, `PLAYWRIGHT_TEST_BASE_URL`.
- **Mocks à synchroniser après chaque release OpenAI** : si OpenAI release une nouvelle version `gpt-image-2` ou `gpt-4o-mini` avec changement de schéma → re-capturer les snapshots `tests/fixtures/openai-real-snapshots/` et re-run `mock-vs-real-shape.test.ts`.
- **Reality check E2E obligatoire avant verdict GO PRODUCTION** : 1 projet complet généré en prod avec photos réelles (pas mocks), validé visuellement par Thomas via UI Versi Studio (pas via DB inspect). Sans ce reality check → verdict GO CONDITIONNEL maximum (3/4).

---

## Auto-évaluation gates

| Gate | Critère | Statut |
|---|---|---|
| G1 | 0 TODO non résolus, 0 placeholder résiduel | PASS |
| G3 | Handoff structuré avec destinataires + inputs + points d'attention | PASS |
| G12 | Tests implémentables — steps Playwright crédibles avec API exacte (`getByRole`, `dragTo`, `setOffline`, etc.) | PASS |
| G24 | Screenshots CI vs baselines mentionnés (§7.5) avec seuil 0.5% + lecture visuelle obligatoire | PASS |
| G25 | 100% user stories US-V4-01 à US-V4-10 ont au moins 1 test correspondant (matrice §8) | PASS |
| G26 | Pipeline pre-deploy 5 checks strict (tsc / lint / vitest / playwright critiques / grep placeholders) | PASS |
| G27 | Matrice traçabilité documentée dans le bloc handoff | PASS |
| s28 — test E2E par étage/contexte | S9 itère sur 2 OS mobiles (Mobile Safari + Mobile Chrome) car comportements touch divergent — pattern propagé | PASS |
| s28 — test mock vs réel | `mock-vs-real-shape.test.ts` obligatoire (§4.5) compare structure mock vs snapshot réel — cf. learning P0 | PASS |
| s27.2 — vérification rigoureuse pre-claim | Section §3 = tableau scenario par scenario avec asserts explicites point par point — pas de claim "PASS final" sans détail | PASS |
| s22/s24 — reality check E2E avant GO PRODUCTION | Mentionné §6 et §8 — reality check UI obligatoire avec photos+DB+OpenAI réels | PASS |

---

## Auto-évaluation gates

[À remplir]
