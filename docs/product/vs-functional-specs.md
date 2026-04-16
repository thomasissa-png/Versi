# Specs fonctionnelles — Versi Studio

**Version** : V1 (sans auth, sans paiement, sans PDF de sortie)
**Date** : 2026-04-15
**Persona** : Thomas, 35 ans, marchand de biens, 8-12 opérations/an
**KPI North Star** : Nombre de lots traités (upload plan → visuel final)

---

## 1. Évaluation du code existant

| Fichier | Verdict | Justification |
|---|---|---|
| `schemas.ts` (393 lignes) | GARDER et adapter | Schemas Zod complets et solides : TypeBien, RoomType (21 types), TargetBuyer, ProjectStatus, LotStatus, ExtractedRoom (bounding_box en %), BuildingOutline, PlanExtractionResult, LotDefinition, ValidatedRoom, LotQualification. Retirer les refs user/stripe en V1. |
| `plan-extractor.ts` | GARDER | Coeur IA fonctionnel : extraction via GPT-4.1 vision, PDF→PNG via pdf-to-img, support multi-fichiers (1 par étage, floor auto-incrémenté), gestion lots zones (rectangles + polygones en %). Zéro rewrite nécessaire. |
| `architect-agent.ts` | GARDER, adapter | Agent conversationnel GPT-4.1 pour itérer sur les visuels. Adapter l'interface au nouveau workflow (étape 4 uniquement, plus de lien avec les anciennes étapes). |
| `db.ts` | GARDER la structure, adapter | Tables SQL bien structurées (pro_projects, pro_lots, pro_rooms, pro_recommendations, pro_lot_descriptions, pro_visuals) avec indexes et FK. Renommer préfixe `pro_` → `vs_`, retirer `user_id` FK et champs Stripe. |
| `PlanEditor.tsx` | ADAPTER | Canvas HTML5 avec overlay rectangles colorés sur image du plan + drag/resize. Le concept est bon, l'UX est basique. Refactorer pour support polygones, fusion/séparation de lots, meilleure affordance. |
| `ProStepper.tsx` | REFAIRE | 7 étapes — trop de granularité. Refaire un stepper 4 étapes linéaire (Upload → Lots → Pièces → Visuels). Conserver la logique de validation par étape. |
| `description-generator.ts` | JETER en V1 | Génération de descriptions commerciales par lot. Pas de PDF de sortie en V1. Réintégrer en V2. |
| `ProPaymentGate.tsx` | JETER en V1 | Gate de paiement Stripe. Pas de paiement en V1 — outil accessible sans abonnement. Réintégrer en V2 avec le modèle tarifaire défini. |
| Pages 8 étapes (nouveau → extraction → decoupe → validation → qualification → recommandations → generation → dossier) | REFAIRE | Architecture de pages à reconstruire selon le workflow 4 étapes. Certaines routes sont récupérables (extraction, decoupe) mais la logique doit être consolidée. |

## 2. Workflow simplifié — 4 étapes (vs 8 dans l'existant)

### Pourquoi passer de 8 à 4 étapes

L'existant décomposait le workflow en 8 écrans : nouveau → extraction → decoupe → validation → qualification → recommandations → generation → dossier. Cette granularité créait une friction inutile : Thomas devait naviguer entre 8 contextes pour compléter un seul lot.

La règle produit est simple : **chaque étape correspond à une décision métier irréductible**. Une décision = un écran. Pas de sous-étapes sans enjeu décisionnel distinct.

Les étapes "qualification" (scoring du potentiel du lot) et "recommandations" (préconisations travaux) sont des raffinements qui n'apportent de valeur qu'une fois le visuel généré. Elles passent en V2.

L'étape "dossier" (génération PDF) est explicitement hors scope V1.

### Les 4 étapes V1

```
[1. Upload]  →  [2. Lots]  →  [3. Pièces]  →  [4. Visuels]
   Plans           Découpe        Identification    Génération IA
   bruts           par lots       des pièces        post-travaux
```

| Étape | Ce que Thomas fait | Ce que l'IA fait | Output |
|---|---|---|---|
| 1 — Upload | Dépose les PDFs/images des plans | Convertit PDF→PNG page par page | Plans stockés, prêts pour l'analyse |
| 2 — Lots | Valide / ajuste les zones de lots sur le plan | Propose un découpage en lots (T2, T3…) avec stratégie by_floor/by_zone | Lots validés avec périmètres |
| 3 — Pièces | Valide / ajuste les pièces par lot | Identifie et type chaque pièce dans le lot | Pièces validées par type et surface |
| 4 — Visuels | Upload photo brute, choisit un style, itère | Génère le visuel "après travaux" (~90s), répond aux itérations en langage naturel | Visuels validés par pièce |

### KPI de complétion par étape

- Étape 1 complète : `vs_plans.extraction_data IS NOT NULL`
- Étape 2 complète : `vs_lots.status = 'validated'` pour tous les lots du projet
- Étape 3 complète : `vs_rooms.status = 'validated'` pour toutes les pièces de tous les lots
- Étape 4 complète (KPI North Star) : `vs_visuals.status = 'validated'` pour au moins 1 pièce par lot

## 3. Étape 1 — Upload des plans

### Règles métier

- Formats acceptés : PDF (multi-pages = multi-étages), PNG, JPG, JPEG, WEBP
- Taille max : 20 Mo par fichier
- Nombre max : 10 fichiers par projet
- PDF multi-pages : chaque page = 1 étage (floor_number auto-incrémenté à partir de 0)
- Fichiers multiples : le marchand peut nommer l'étage manuellement après upload si la détection auto est fausse
- Stockage : Object Storage Replit (chemin : `vs/{project_id}/plans/{uuid}.png`)
- Résolution de sortie : 2000px max sur le grand côté (compromis lisibilité / performance canvas)

### 5 états UI — Page upload

| État | Comportement | Message/Affichage |
|---|---|---|
| Défaut | Zone de dépôt vide, drag-and-drop actif | "Déposez vos plans ici ou cliquez pour sélectionner — PDF, PNG, JPG, WEBP — Max 20 Mo par fichier" |
| Loading | Conversion PDF en cours, barre de progression par fichier | "Conversion en cours... [nom_fichier.pdf] — [X]%" avec spinner par fichier |
| Vide | Identique au défaut (pas d'état vide distinct — la zone vide est l'état initial) | N/A |
| Erreur | Fichier trop gros, format invalide, échec conversion | "Fichier refusé : [raison exacte]. [nom_fichier] dépasse 20 Mo" ou "Format non supporté" — toast rouge, fichier retiré de la liste |
| Succès | Plans uploadés, miniatures visibles, bouton "Analyser les plans" actif | Grille de miniatures avec nom du fichier, numéro d'étage détecté, option de renommer l'étage |

---

### US-VS-00 : Consulter la liste des opérations (Dashboard)

**Persona** : Thomas
**Epic** : Dashboard
**Dépendances** : Aucune
**Priorité RICE** : R=10 I=10 C=10 E=1 → Score=100

#### Job-to-be-done
En tant que Thomas, je veux consulter la liste de mes opérations en cours afin de reprendre une opération existante ou d'en démarrer une nouvelle depuis un point d'entrée unique.

#### Contexte de navigation
- **Page/écran d'origine** : Toute URL `/vs` — point d'entrée principal de Versi Studio
- **Déclencheur** : Chargement de la page `/vs` (montage du composant, requête GET automatique)
- **Page/écran de destination (succès — clic card)** : `/vs/projects/[id]/upload` — reprise de l'opération à l'étape courante
- **Page/écran de destination (échec)** : Reste sur `/vs` avec message d'erreur inline + bouton "Réessayer"

#### Données et champs
| Champ | Type | Obligatoire | Validation | Limites | Exemple |
|---|---|---|---|---|---|
| adresse | string | Affiché | N/A (lecture seule) | 5–200 caractères | "12 rue des Lilas, 75011 Paris" |
| type_bien | enum | Affiché | Valeurs : immeuble, maison, appartement | N/A | "immeuble" |
| surface_totale | number\|null | Affiché si non null | N/A (lecture seule) | 9–5000 m² (pas=1) | 350 |
| status | enum | Affiché (badge) | draft, step_1_complete, step_2_complete, step_3_complete, completed | N/A | "step_2_complete" |
| created_at | ISO8601 | Affiché | N/A | N/A | "2026-04-15T10:30:00Z" |

#### 5 états UI (Gate G21)
| État | Comportement | Message/Affichage |
|---|---|---|
| Défaut (loading) | Requête GET /api/vs/projects en cours au montage | Spinner centré + "Chargement…" — spinner border-t-interactive-primary, 6×6 |
| Vide | Requête réussie, tableau retourne `[]` | Icône immeuble + "Aucune opération pour l'instant. Créez votre première opération pour commencer." + bouton primaire "+ Nouvelle opération" |
| Peuplé | Requête réussie, >= 1 opération | Grille de cards (gap-md), triées par created_at DESC — chaque card affiche adresse, type_bien, surface si non null, badge statut coloré, date de création formatée "DD MMMM YYYY" |
| Erreur | Échec réseau ou réponse non-200 | Message inline rouge "Impossible de charger les opérations." + lien "Réessayer" (re-déclenche fetchProjects) |
| Succès (navigation) | Clic sur une card | Redirection immédiate vers `/vs/projects/[id]/upload` |

#### Critères d'acceptance

**Happy path :**
- [ ] GIVEN Thomas charge `/vs` et possède 3 opérations en base WHEN le composant monte THEN une requête GET /api/vs/projects est émise et 3 cards s'affichent triées par created_at DESC (la plus récente en premier)
- [ ] GIVEN 3 cards sont affichées WHEN Thomas clique sur la 2e card THEN il est redirigé vers `/vs/projects/[id]/upload` avec l'id correct de cette opération
- [ ] GIVEN une card a status="step_2_complete" WHEN la card s'affiche THEN le badge affiche "Lots découpés" avec fond warning/10 et texte warning
- [ ] GIVEN une card a status="completed" WHEN la card s'affiche THEN le badge affiche "Terminé" avec fond success/10 et texte success
- [ ] GIVEN une opération a surface_totale=null WHEN la card s'affiche THEN aucune mention de surface n'est affichée (champ absent, pas "null m²")

**Cas d'erreur :**
- [ ] GIVEN le réseau échoue lors du GET /api/vs/projects WHEN l'erreur est catchée THEN le spinner disparaît et le message "Impossible de charger les opérations." + lien "Réessayer" s'affichent
- [ ] GIVEN Thomas clique "Réessayer" WHEN la requête repart THEN le spinner réapparaît et le flux reprend depuis l'état loading

**Cas limites :**
- [ ] GIVEN Thomas charge `/vs` et n'a aucune opération WHEN le GET retourne `[]` THEN l'état vide s'affiche avec le CTA "+ Nouvelle opération" (pas une liste vide sans message)
- [ ] GIVEN Thomas quitte `/vs` avant la fin du chargement (navigation rapide) WHEN le composant est démonté THEN l'AbortController annule la requête (pas d'erreur setState sur composant démonté)
- [ ] GIVEN Thomas a 20 opérations WHEN la liste s'affiche THEN toutes les 20 cards s'affichent (pas de pagination en V1 — pas de limite côté client)

**Permissions :**
- [ ] GIVEN V1 sans auth WHEN n'importe quel visiteur charge `/vs` THEN toutes les opérations de la base sont listées (pas de filtrage par utilisateur en V1)

**Données existantes :**
- [ ] GIVEN Thomas a des opérations avec des statuts variés (draft, step_1_complete, completed) WHEN la liste charge THEN chaque card affiche le badge correspondant au statut réel de l'opération

#### Payload API
- **Endpoint** : `GET /api/vs/projects`
- **Authentification** : publique (V1 sans auth)
- **Rate limit** : N/A (lecture seule)
- **Request body** : GET uniquement — pas de body
- **Response succès** : `{ "success": true, "data": [{ "id": uuid, "adresse": string, "type_bien": string, "surface_totale": number|null, "status": string, "created_at": ISO8601 }] }` — status 200, trié par created_at DESC
- **Response erreur** : `{ "success": false, "error": string }` — status 500

#### Events analytics
| Event | Trigger | Propriétés | Funnel |
|---|---|---|---|
| `vs_dashboard_loaded` | GET /api/vs/projects 200 | projects_count, has_completed | activation |
| `vs_project_opened` | Clic sur une card | project_id, project_status, position_in_list | retention |
| `vs_new_project_cta_clicked` | Clic "+ Nouvelle opération" (état vide ou header) | source: "empty_state"\|"header" | activation |

#### Scénarios persona concrets
1. Thomas revient sur Versi Studio le lendemain d'avoir créé 2 opérations. Il charge `/vs`. La liste s'affiche avec 2 cards — la plus récente (rue des Lilas, créée hier soir) apparaît en premier. Il clique dessus pour reprendre l'upload des plans. Résultat attendu : redirection vers `/vs/projects/[id]/upload`.
2. Thomas ouvre Versi Studio pour la première fois. Il n'a aucune opération. La page affiche l'état vide avec l'icône immeuble et le bouton "+ Nouvelle opération". Il clique. Le formulaire de création s'affiche. Résultat attendu : transition vers US-VS-01.
3. Thomas a une opération "Terminé" (badge vert) et deux "Brouillon" (badge gris). Il consulte le dashboard pour vérifier l'avancement. Résultat attendu : 3 cards avec les bons badges colorés selon leur statut.
4. Thomas est en déplacement avec une connexion 3G instable. Le chargement échoue. Il voit "Impossible de charger les opérations." et clique "Réessayer". La 2e tentative réussit. Résultat attendu : la liste s'affiche correctement sans rechargement de page.
5. Thomas ferme l'onglet pendant le chargement initial. Résultat attendu : aucune erreur console "Can't perform a React state update on an unmounted component" — l'AbortController a annulé la requête proprement.

#### Definition of Done
- [ ] UI implémentée conforme aux 5 états (loading, vide, peuplé, erreur, succès-navigation)
- [ ] API GET /api/vs/projects fonctionnelle (retour trié par created_at DESC)
- [ ] Scénarios persona reproductibles
- [ ] Test E2E écrit (référencé dans matrice traçabilité)
- [ ] Screenshot conforme au design (3 états : vide, peuplé, erreur)

#### Notes pour @qa
- Tester le cas AbortController : naviguer rapidement hors de `/vs` pendant le chargement → vérifier absence d'erreur console
- Tester le badge statut pour chacune des 5 valeurs possibles (draft, step_1_complete, step_2_complete, step_3_complete, completed) → badge couleur et libellé corrects
- Tester le tri : créer 3 projets à quelques secondes d'intervalle → vérifier ordre DESC
- Non-régression US-VS-01 : vérifier que le CTA "Nouvelle opération" du header et le CTA de l'état vide déclenchent bien le même showForm

#### Notes pour @ux
- L'état vide doit inciter à l'action : icône + message encourageant + CTA primaire bien visible
- La card doit visuellement indiquer qu'elle est cliquable (hover border + shadow)
- Le badge statut doit être lisible à 12px (contraste >= 4.5:1 sur fond coloré)
- Focus-visible sur chaque card (outline-2 outline-offset-2)

#### Notes pour @fullstack
- L'AbortController est déjà implémenté dans `page.tsx` — s'assurer que la dépendance `useCallback` est stable pour éviter des re-fetches indésirables
- Le tri created_at DESC doit être garanti par la query SQL (ORDER BY created_at DESC), pas par un sort côté client
- STATUS_LABELS et STATUS_COLORS sont définis dans `page.tsx` — s'assurer que toute nouvelle valeur de statut a un fallback ("bg-bg-default text-text-muted border border-border-default")

---

### US-VS-01 : Créer un nouveau projet Versi Studio

**Persona** : Thomas
**Epic** : Upload des plans
**Dépendances** : Aucune
**Priorité RICE** : R=10 I=10 C=10 E=1 → Score=100

#### Job-to-be-done
En tant que Thomas, je veux créer un nouveau projet en renseignant l'adresse du bien afin de démarrer le workflow de pré-commercialisation pour cette opération.

#### Contexte de navigation
- **Page/écran d'origine** : `/vs` — Dashboard projets (liste vide ou liste existants)
- **Déclencheur** : Clic sur le bouton "Nouveau projet"
- **Page/écran de destination (succès)** : `/vs/projects/[id]/upload` — Étape 1 Upload
- **Page/écran de destination (échec)** : Reste sur `/vs` avec toast d'erreur

#### Données et champs
| Champ | Type | Obligatoire | Validation | Limites | Exemple |
|---|---|---|---|---|---|
| adresse | string | Oui | Minimum 5 caractères, pas de validation géographique en V1 | 5–200 caractères | "12 rue des Lilas, 75011 Paris" |
| type_bien | enum | Oui | Valeurs : immeuble, maison, appartement | N/A | "immeuble" |
| surface_totale | number | Non | Nombre entier positif si renseigné (step=1) | 9–5000 m² | 350 |

#### 5 états UI (Gate G21)
| État | Comportement | Message/Affichage |
|---|---|---|
| Défaut | Modal ou page de création avec formulaire vide | Champs adresse, type_bien (select), surface_totale (optionnel) |
| Loading | Soumission en cours | Bouton "Créer" remplacé par spinner, champs disabled |
| Vide | N/A — formulaire toujours pré-rempli avec placeholders | N/A |
| Erreur | Champ adresse vide ou < 5 caractères | Message inline rouge sous le champ : "L'adresse est obligatoire (minimum 5 caractères)" |
| Succès | Projet créé en base | Redirection vers `/vs/projects/[id]/upload`, toast vert "Projet créé" |

#### Critères d'acceptance

**Happy path :**
- [ ] GIVEN Thomas est sur `/vs` WHEN il clique "Nouveau projet" THEN un formulaire de création s'affiche avec les champs adresse (texte), type_bien (select : immeuble/maison/appartement), surface_totale (nombre, optionnel)
- [ ] GIVEN Thomas remplit adresse="12 rue des Lilas, 75011 Paris" et type_bien="immeuble" WHEN il clique "Créer" THEN un projet est créé en base (`vs_projects`) et il est redirigé vers `/vs/projects/[id]/upload`
- [ ] GIVEN Thomas ne renseigne pas la surface_totale WHEN il clique "Créer" THEN le projet est créé avec `surface_totale = NULL` (champ optionnel)

**Cas d'erreur :**
- [ ] GIVEN Thomas laisse l'adresse vide WHEN il clique "Créer" THEN le formulaire affiche "L'adresse est obligatoire" sous le champ, pas de requête API envoyée
- [ ] GIVEN une erreur réseau lors de la création WHEN Thomas clique "Créer" THEN un toast rouge "Erreur lors de la création — réessayez" s'affiche, le formulaire reste rempli

**Cas limites :**
- [ ] GIVEN Thomas saisit 4 caractères dans adresse WHEN il clique "Créer" THEN validation bloquante "Minimum 5 caractères"
- [ ] GIVEN Thomas saisit 201 caractères dans adresse WHEN il clique "Créer" THEN le champ est limité à 200 caractères (maxLength HTML + validation backend)
- [ ] GIVEN Thomas double-clique sur "Créer" WHEN les deux requêtes partent THEN un seul projet est créé (idempotence — debounce 500ms sur le bouton)

**Permissions :**
- [ ] GIVEN V1 sans auth WHEN n'importe quel visiteur accède à `/vs` THEN il peut créer un projet sans authentification

**Données existantes :**
- [ ] GIVEN Thomas a déjà 3 projets en cours WHEN il crée un nouveau projet THEN les projets existants ne sont pas affectés, le nouveau s'ajoute à la liste

#### Payload API
- **Endpoint** : `POST /api/vs/projects`
- **Authentification** : publique (V1 sans auth)
- **Rate limit** : 10 créations/min par IP
- **Request body** : `{ "adresse": string, "type_bien": "immeuble"|"maison"|"appartement", "surface_totale": number|null }`
- **Response succès** : `{ "id": uuid, "adresse": string, "type_bien": string, "status": "draft", "created_at": ISO8601 }` — status 201
- **Response erreur** : `{ "error": "VALIDATION_ERROR", "field": "adresse", "message": string }` — status 422 ; `{ "error": "INTERNAL_ERROR" }` — status 500

#### Events analytics
| Event | Trigger | Propriétés | Funnel |
|---|---|---|---|
| `vs_project_created` | POST /api/vs/projects 201 | project_id, type_bien, has_surface | activation |

#### Scénarios persona concrets
1. Thomas rentre d'une visite rue des Lilas à Paris. Il ouvre Versi Studio sur son laptop, clique "Nouveau projet", tape l'adresse, sélectionne "immeuble", laisse la surface vide car il ne s'en souvient plus. Il clique "Créer". Il arrive sur l'écran d'upload. Résultat attendu : projet créé, surface NULL, étape 1 active.
2. Thomas crée un second projet pour une maison à Lyon le même jour. Résultat attendu : 2 projets distincts dans la liste, le premier est intact.
3. Thomas tape juste "12" comme adresse (2 caractères). Il clique "Créer". Résultat attendu : message d'erreur "Minimum 5 caractères", pas de projet créé.
4. Thomas double-clique frénétiquement sur "Créer" car son réseau est lent. Résultat attendu : un seul projet créé malgré les 2 clics.
5. Thomas perd sa connexion wifi au moment de cliquer "Créer". Résultat attendu : toast rouge "Erreur lors de la création — réessayez", formulaire intact avec ses données.

#### Definition of Done
- [ ] UI implémentée conforme aux 5 états
- [ ] API fonctionnelle (payload testé)
- [ ] Scénarios persona reproductibles
- [ ] Test E2E écrit
- [ ] Screenshot conforme au design

---

### US-VS-02 : Déposer des plans (PDF ou images)

**Persona** : Thomas
**Epic** : Upload des plans
**Dépendances** : US-VS-01
**Priorité RICE** : R=10 I=10 C=10 E=1 → Score=100

#### Job-to-be-done
En tant que Thomas, je veux déposer les plans de mon bien (PDF ou images) afin de permettre à l'IA d'extraire les lots et les pièces.

#### Contexte de navigation
- **Page/écran d'origine** : `/vs/projects/[id]/upload` — arrivée depuis US-VS-01
- **Déclencheur** : Drag-and-drop ou clic sur zone de dépôt
- **Page/écran de destination (succès)** : Même page, zone de dépôt remplacée par grille de miniatures + bouton "Analyser les plans"
- **Page/écran de destination (échec)** : Même page, toast d'erreur par fichier rejeté

#### Données et champs
| Champ | Type | Obligatoire | Validation | Limites | Exemple |
|---|---|---|---|---|---|
| fichiers | File[] | Oui | MIME : application/pdf, image/png, image/jpeg, image/webp | Max 20 Mo/fichier, max 10 fichiers | plan_rdc.pdf |
| floor_number | number (auto) | Auto | Entier >= 0, auto-incrémenté par ordre de dépôt | 0–99 | 0 (RDC) |

#### 5 états UI (Gate G21)
Voir tableau section 3 en-tête.

#### Critères d'acceptance

**Happy path :**
- [ ] GIVEN Thomas est sur `/vs/projects/[id]/upload` WHEN il dépose `plan_rdc.pdf` (8 Mo) THEN le fichier est déposé, converti en PNG, et une miniature s'affiche avec le libellé "Étage 0 — RDC"
- [ ] GIVEN Thomas dépose 3 PDFs successivement WHEN le dépôt est terminé THEN 3 miniatures s'affichent, chacune avec son numéro d'étage (0, 1, 2) et son nom de fichier original
- [ ] GIVEN Thomas dépose un PDF 3 pages WHEN la conversion est terminée THEN 3 images PNG s'affichent (1 par page) avec floors 0, 1, 2

**Cas d'erreur :**
- [ ] GIVEN Thomas dépose un fichier .docx WHEN le fichier est rejeté THEN un toast rouge "Format non supporté — utilisez PDF, PNG, JPG ou WEBP" s'affiche, le fichier n'apparaît pas dans la liste
- [ ] GIVEN Thomas dépose un fichier de 25 Mo WHEN le fichier est rejeté THEN un toast rouge "plan_lourd.pdf dépasse la limite de 20 Mo" s'affiche
- [ ] GIVEN la conversion PDF échoue (PDF corrompu) WHEN l'erreur est détectée THEN toast rouge "Impossible de lire ce PDF — vérifiez qu'il n'est pas corrompu ou protégé par un mot de passe"

**Cas limites :**
- [ ] GIVEN Thomas a déjà 10 fichiers déposés WHEN il tente d'en ajouter un 11e THEN la zone de dépôt affiche "Limite atteinte (10 fichiers max)" et le dépôt est refusé
- [ ] GIVEN Thomas dépose simultanément 5 fichiers WHEN les dépôts partent en parallèle THEN chaque fichier a sa propre barre de progression, les erreurs sont par fichier (pas globales)
- [ ] GIVEN un timeout réseau pendant le dépôt WHEN la connexion est rétablie THEN le fichier incomplètement déposé est marqué "Échec — réessayer" avec un bouton de retry par fichier

**Permissions :**
- [ ] GIVEN V1 sans auth WHEN n'importe quel visiteur dépose des fichiers THEN le dépôt est accepté (pas de vérification d'identité)

**Données existantes :**
- [ ] GIVEN Thomas a déjà déposé 2 plans WHEN il ajoute un 3e THEN les 2 plans existants ne sont pas supprimés, le 3e s'ajoute avec floor_number = 2

#### Payload API
- **Endpoint** : `POST /api/vs/projects/[id]/plans` (multipart/form-data)
- **Authentification** : publique
- **Rate limit** : 20 uploads/min par IP
- **Request body** : FormData — `file: File`, `floor_number?: number`
- **Response succès** : `{ "plan_id": uuid, "floor_number": number, "preview_url": string, "pages_count": number }` — status 201
- **Response erreur** : `{ "error": "FILE_TOO_LARGE"|"INVALID_FORMAT"|"CONVERSION_FAILED"|"PROJECT_NOT_FOUND"|"MAX_FILES_REACHED", "message": string }` — status 400/404/422/500

---

- **Endpoint** : `PATCH /api/vs/plans/[id]`
- **Authentification** : publique
- **Rate limit** : N/A
- **Request body** : `{ "floor_number": number }` (entier obligatoire, borné -5 à 50)
- **Response succès** : `{ "success": true, "data": { "id": string, "floor_number": number } }` — status 200
- **Response erreur** : `{ "error": string }` — status 400 (UUID invalide ou floor_number hors bornes), 404 (plan introuvable), 500 (erreur serveur)
- **Usage** : persiste le numéro d'étage modifié par Thomas sur une miniature de plan (correction manuelle post-upload).

#### Events analytics
| Event | Trigger | Propriétés | Funnel |
|---|---|---|---|
| `vs_plan_uploaded` | POST /api/vs/projects/[id]/plans 201 | project_id, plan_id, mime_type, file_size_mb, pages_count, floor_number | activation |
| `vs_plan_upload_error` | POST /api/vs/projects/[id]/plans 4xx/5xx | project_id, error_type, mime_type | activation |

#### Scénarios persona concrets
1. Thomas a scanné ses plans avec son iPhone en PDF. Il dépose le PDF 4 pages (RDC + 3 étages) sur la zone. La conversion démarre, 4 miniatures apparaissent numérotées 0 à 3. Résultat attendu : 4 plans stockés, prêts pour l'analyse.
2. Thomas travaille sur un immeuble Haussmannien, il a des plans en PNG (architecte les a exportés directement). Il dépose 5 PNGs. Résultat attendu : 5 miniatures sans conversion, floor_numbers 0 à 4.
3. Thomas dépose accidentellement un fichier Excel de devis. Résultat attendu : toast rouge immédiat, pas de fichier dans la liste.
4. Thomas est en 4G avec du réseau instable. L'upload d'un PDF 15 Mo échoue à 60%. Résultat attendu : fichier marqué "Échec — réessayer", bouton retry visible, les autres fichiers uploadés sont intacts.
5. Thomas dépose son PDF mais réalise que c'est la mauvaise version (pas à jour). Il supprime la miniature et redépose la bonne version. Résultat attendu : ancienne version supprimée de l'Object Storage et de la base, nouvelle version uploadée avec le même floor_number.

#### Definition of Done
- [ ] UI implémentée conforme aux 5 états
- [ ] API fonctionnelle (multipart testé)
- [ ] Scénarios persona reproductibles
- [ ] Test E2E écrit
- [ ] Screenshot conforme au design

---

### US-VS-03 : Lancer l'analyse IA des plans

**Persona** : Thomas
**Epic** : Upload des plans
**Dépendances** : US-VS-02 (au moins 1 plan uploadé)
**Priorité RICE** : R=10 I=10 C=10 E=1 → Score=100

#### Job-to-be-done
En tant que Thomas, je veux lancer l'analyse automatique de mes plans afin que l'IA identifie les pièces et propose un découpage en lots.

#### Contexte de navigation
- **Page/écran d'origine** : `/vs/projects/[id]/upload` — après upload d'au moins 1 plan
- **Déclencheur** : Clic sur "Analyser les plans"
- **Page/écran de destination (succès)** : `/vs/projects/[id]/lots` — Étape 2 Découpe
- **Page/écran de destination (échec)** : Reste sur `/vs/projects/[id]/upload` avec message d'erreur

#### Données et champs
| Champ | Type | Obligatoire | Validation | Limites | Exemple |
|---|---|---|---|---|---|
| project_id | uuid | Oui (URL param) | Doit exister en base | N/A | "a1b2c3d4-..." |

#### 5 états UI (Gate G21)
| État | Comportement | Message/Affichage |
|---|---|---|
| Défaut | Bouton "Analyser les plans" actif (si >= 1 plan uploadé), grisé sinon | "Analyser les plans — L'IA va identifier les pièces et proposer un découpage" |
| Loading | Analyse en cours (~30-60s), barre de progression indéterminée | "L'IA analyse vos plans... Cela peut prendre 30 à 60 secondes." avec animation |
| Vide | N/A — le bouton est grisé si aucun plan | "Déposez au moins un plan pour lancer l'analyse" |
| Erreur | Extraction IA échouée (plan illisible, erreur OpenAI) | Toast rouge "L'analyse a échoué — le plan est peut-être trop flou ou d'un format inhabituel. Vous pouvez réessayer ou contacter le support." + bouton "Réessayer" |
| Succès | Extraction terminée, pièces identifiées | Redirection automatique vers `/vs/projects/[id]/lots` |

#### Critères d'acceptance

**Happy path :**
- [ ] GIVEN Thomas a uploadé 2 plans WHEN il clique "Analyser les plans" THEN le bouton passe en état loading, une barre de progression apparaît
- [ ] GIVEN l'analyse est terminée avec succès WHEN le résultat est reçu THEN Thomas est redirigé vers `/vs/projects/[id]/lots` avec les lots proposés visibles
- [ ] GIVEN l'IA retourne `warnings: ["surface_incohérente"]` WHEN Thomas arrive sur `/vs/projects/[id]/lots` THEN un bandeau d'avertissement jaune affiche "L'IA a détecté des incohérences de surface — vérifiez les zones manuellement"

**Cas d'erreur :**
- [ ] GIVEN l'API OpenAI retourne une erreur 500 WHEN Thomas a lancé l'analyse THEN toast rouge avec message explicite et bouton "Réessayer"
- [ ] GIVEN le plan est trop flou pour être analysé WHEN l'IA retourne `confidence < 0.4` THEN message "Ce plan est difficile à lire — l'IA a fait de son mieux, vérifiez chaque zone manuellement" (pas d'erreur bloquante, on passe quand même à l'étape 2)

**Cas limites :**
- [ ] GIVEN Thomas clique "Analyser" puis navigue en arrière WHEN il revient sur la page THEN l'analyse continue en background, son résultat sera disponible à son retour
- [ ] GIVEN l'analyse dure plus de 120s WHEN le timeout est atteint THEN toast rouge "L'analyse prend trop de temps — réessayez. Si le problème persiste, vérifiez la qualité de vos plans."
- [ ] GIVEN Thomas clique "Analyser" deux fois rapidement WHEN les deux requêtes partent THEN une seule analyse est lancée (debounce + vérification en base du statut)

**Permissions :**
- [ ] GIVEN V1 sans auth WHEN n'importe quel visiteur clique "Analyser" THEN l'analyse est lancée sans vérification d'identité

**Données existantes :**
- [ ] GIVEN Thomas a déjà lancé une analyse précédente WHEN il relance l'analyse THEN l'ancienne extraction est remplacée (pas de doublon en base)

#### Payload API
- **Endpoint** : `POST /api/vs/projects/[id]/extract`
- **Authentification** : publique
- **Rate limit** : 5 extractions/min par IP
- **Request body** : `{}` (project_id dans l'URL)
- **Response succès** : `{ "extraction_id": uuid, "status": "processing" }` — status 202
- **Response erreur** : `{ "error": "NO_PLANS_FOUND"|"EXTRACTION_ALREADY_RUNNING"|"PROJECT_NOT_FOUND" }` — status 400/404/409

**Polling du résultat :**
- **Endpoint** : `GET /api/vs/projects/[id]/extraction`
- **Response** : `{ "status": "processing"|"done"|"failed", "result": PlanExtractionResult|null, "error": string|null }`
- Frontend poll toutes les 3s jusqu'à `status = "done"|"failed"`

#### Events analytics
| Event | Trigger | Propriétés | Funnel |
|---|---|---|---|
| `vs_extraction_started` | POST /api/vs/projects/[id]/extract 202 | project_id, plans_count | activation |
| `vs_extraction_completed` | GET extraction status = "done" | project_id, lots_count, rooms_count, warnings_count, duration_ms | activation |
| `vs_extraction_failed` | GET extraction status = "failed" | project_id, error_type | activation |

#### Scénarios persona concrets
1. Thomas a uploadé 4 plans (immeuble 4 étages). Il clique "Analyser les plans". Pendant 45 secondes, il voit la barre de progression. L'IA identifie 12 lots et 48 pièces. Il est redirigé vers l'étape 2. Résultat attendu : 12 lots proposés sur le plan.
2. Thomas upload un plan photographié en biais et flou. L'IA retourne confidence=0.3. Résultat attendu : warning affiché, Thomas passe quand même à l'étape 2 pour corriger manuellement.
3. Thomas clique "Analyser" mais l'API OpenAI est down. Résultat attendu : après 120s, toast rouge avec option de réessayer.
4. Thomas relance l'analyse après avoir supprimé et re-uploadé un plan. Résultat attendu : ancienne extraction effacée, nouvelle extraction lancée sur les plans à jour.
5. Thomas ferme son navigateur accidentellement pendant l'analyse (40s). Il revient 5 minutes plus tard. Résultat attendu : l'extraction a continué en background, le projet est à l'étape 2 avec les lots disponibles.

#### Definition of Done
- [ ] UI implémentée conforme aux 5 états
- [ ] API fonctionnelle (polling testé)
- [ ] Scénarios persona reproductibles
- [ ] Test E2E écrit
- [ ] Screenshot conforme au design

## 4. Étape 2 — Découpe par lots

### Règles métier

- L'IA propose un découpage initial. Thomas valide ou ajuste.
- Un lot = un logement vendable (T1, T2, T3, T4, T5, studio, loft…)
- Les zones de lots sont des polygones ou rectangles en % de l'image (compatibles multi-résolutions)
- Contraintes de validation : pas de superposition entre lots du même étage, pas de zone à 0% de surface
- Le marchand peut : fusionner 2 lots, séparer un lot en 2, renommer un lot, drag-resizer les zones
- Stratégies IA : `by_floor` (1 lot par étage), `by_zone` (lots par zones logiques du plan)
- Un projet doit avoir au minimum 1 lot validé pour passer à l'étape 3

### 5 états UI — Éditeur de lots

| État | Comportement | Message/Affichage |
|---|---|---|
| Défaut | Plan affiché avec overlays colorés par lot (couleur unique par lot), panneau latéral avec liste des lots | Liste lots : nom, surface estimée, nombre de pièces détectées, statut |
| Loading | IA en train d'analyser (première arrivée sur cet écran) | "L'IA organise les lots... quelques secondes" — skeleton sur le canvas |
| Vide | Aucun lot détecté (cas rare : plan illisible) | "L'IA n'a pas détecté de lots — vous pouvez en créer manuellement" + bouton "Ajouter un lot" |
| Erreur | Erreur sauvegarde des modifications | Toast rouge "Impossible de sauvegarder — vérifiez votre connexion", modifications non perdues (état local conservé) |
| Succès | Tous les lots sont marqués "validé" | Bouton "Continuer vers les pièces" actif, badge vert "X lots validés" |

---

### US-VS-06 : Visualiser les lots proposés par l'IA sur le plan

**Persona** : Thomas
**Epic** : Découpe par lots
**Dépendances** : US-VS-03
**Priorité RICE** : R=10 I=10 C=10 E=1 → Score=100

#### Job-to-be-done
En tant que Thomas, je veux voir les lots proposés par l'IA superposés sur le plan afin de comprendre le découpage suggéré et décider quoi ajuster.

#### Contexte de navigation
- **Page/écran d'origine** : `/vs/projects/[id]/upload` (après extraction réussie) ou retour depuis étape 3
- **Déclencheur** : Redirection automatique après extraction, ou clic sur "Étape 2" dans le stepper
- **Page/écran de destination (succès)** : Même page `/vs/projects/[id]/lots` — overlays actifs, éditables
- **Page/écran de destination (échec)** : Même page avec état vide (pas de lots détectés)

#### Données et champs
| Champ | Type | Obligatoire | Validation | Limites | Exemple |
|---|---|---|---|---|---|
| lot.name | string | Oui | Non vide | 1–50 caractères | "Lot 1 — T3" |
| lot.zone_data | JSONB | Oui | Polygone valide, coordonnées en % (0-100) | Max 20 points par polygone | `{"type":"rect","x":10,"y":20,"w":30,"h":40}` |
| lot.floor | number | Oui | Entier >= 0 | 0–99 | 0 |
| lot.surface_m2 | number | Non (calculé IA) | Positif | 5–500 | 65 |

#### Critères d'acceptance

**Happy path :**
- [ ] GIVEN l'extraction a produit 6 lots WHEN Thomas arrive sur `/vs/projects/[id]/lots` THEN 6 overlays colorés (couleur distincte par lot) s'affichent sur le plan, un panneau latéral liste les 6 lots avec leur nom et surface estimée
- [ ] GIVEN le projet a 3 étages WHEN Thomas sélectionne l'étage 2 dans le sélecteur THEN le plan de l'étage 2 s'affiche avec les lots de cet étage uniquement
- [ ] GIVEN Thomas survole un overlay THEN le lot correspondant dans le panneau latéral est mis en surbrillance (et vice versa)

**Cas d'erreur :**
- [ ] GIVEN l'extraction_data est NULL en base WHEN Thomas arrive sur l'étape 2 THEN il est redirigé vers l'étape 1 avec message "Relancez l'analyse avant de continuer"
- [ ] GIVEN la liste des lots est vide (confidence très basse) WHEN Thomas arrive sur l'écran THEN état "vide" avec bouton "Ajouter un lot manuellement"

**Cas limites :**
- [ ] GIVEN un immeuble de 8 étages (8 plans) WHEN Thomas arrive sur l'étape 2 THEN un sélecteur d'étage s'affiche (tabs ou dropdown), pas de scroll infini de plans
- [ ] GIVEN le plan est une image de 6000x4000px WHEN il s'affiche dans le canvas THEN il est redimensionné pour tenir dans la fenêtre (max 100% de la zone canvas), les coordonnées des zones restent en % (pas affectées par le zoom)

**Permissions :**
- [ ] GIVEN V1 sans auth WHEN un visiteur accède à `/vs/projects/[id]/lots` THEN l'accès est accordé sans vérification

**Données existantes :**
- [ ] GIVEN Thomas a déjà validé 3 lots et revient sur l'étape 2 WHEN la page charge THEN les 3 lots validés sont affichés avec leur statut "validé" (modifications précédentes conservées)

#### Events analytics
| Event | Trigger | Propriétés | Funnel |
|---|---|---|---|
| `vs_lots_screen_viewed` | Chargement page `/vs/projects/[id]/lots` | project_id, lots_count, floors_count | activation |

#### Scénarios persona concrets
1. Thomas arrive sur l'étape 2 après l'analyse. L'IA a proposé 4 lots colorés sur le plan RDC. Thomas voit immédiatement que le lot 3 chevauche le couloir commun. Résultat attendu : overlays visibles, lot 3 sélectionnable pour correction.
2. Thomas gère un immeuble 3 étages. Il utilise le sélecteur d'étage pour naviguer entre les plans. Résultat attendu : chaque étage affiche ses propres lots, navigation fluide.
3. Thomas revient sur l'étape 2 après avoir travaillé sur l'étape 3. Ses modifications de lots sont conservées. Résultat attendu : les zones qu'il avait ajustées sont telles qu'il les avait laissées.
4. Thomas charge une très grande image (plan architecte 6000px). Résultat attendu : l'image est zoomée pour tenir dans le canvas, les zones sont à la bonne position.
5. L'IA n'a détecté aucun lot (plan de façade uploadé par erreur). Résultat attendu : état vide avec message explicite et bouton pour créer un lot manuellement.

#### Definition of Done
- [ ] Canvas HTML5 affiche le plan avec overlays colorés
- [ ] Sélecteur d'étage fonctionnel si > 1 étage
- [ ] Panneau latéral avec liste des lots synchronisé avec le canvas
- [ ] Test E2E : vérifier affichage overlays post-extraction
- [ ] Screenshot conforme au design

---

### US-VS-07 : Ajuster les zones de lots (drag/resize)

**Persona** : Thomas
**Epic** : Découpe par lots
**Dépendances** : US-VS-06
**Priorité RICE** : R=9 I=9 C=9 E=1 → Score=81

#### Job-to-be-done
En tant que Thomas, je veux repositionner et redimensionner les zones de lots sur le plan afin que le découpage corresponde exactement au cadastre.

#### Contexte de navigation
- **Page/écran d'origine** : `/vs/projects/[id]/lots` — overlays visibles
- **Déclencheur** : Clic sur un overlay + drag ou drag d'une poignée de redimensionnement
- **Page/écran de destination (succès)** : Même page, zone mise à jour visuellement + sauvegarde auto
- **Page/écran de destination (échec)** : Toast d'erreur de sauvegarde, zone revient à sa position précédente

#### Données et champs
| Champ | Type | Obligatoire | Validation | Limites | Exemple |
|---|---|---|---|---|---|
| zone_data.x | number | Oui | 0–100 (%) | 0–100 | 12.5 |
| zone_data.y | number | Oui | 0–100 (%) | 0–100 | 8.3 |
| zone_data.w | number | Oui | > 0, x+w <= 100 | 0.1–100 | 35.2 |
| zone_data.h | number | Oui | > 0, y+h <= 100 | 0.1–100 | 28.7 |

#### Critères d'acceptance

**Happy path :**
- [ ] GIVEN Thomas clique sur un overlay WHEN il le glisse THEN la zone se déplace en temps réel, les coordonnées en % sont recalculées, sauvegarde auto déclenche après 1s de pause (debounce)
- [ ] GIVEN Thomas drag une poignée de redimensionnement WHEN il relâche THEN la zone est redimensionnée, surface_m2 estimée recalculée et mise à jour dans le panneau latéral
- [ ] GIVEN Thomas superpose accidentellement 2 lots WHEN les zones se chevauchent THEN un contour rouge s'affiche sur les 2 lots concernés + message "Ces lots se chevauchent — ajustez les zones"

**Cas d'erreur :**
- [ ] GIVEN Thomas tente de déplacer une zone hors des limites du canvas WHEN la zone dépasse 100% THEN la zone est bloquée à la limite du canvas (clamp)
- [ ] GIVEN la sauvegarde auto échoue WHEN Thomas a glissé une zone THEN toast rouge "Sauvegarde échouée — vos modifications sont conservées en local, réessayez", bouton "Sauvegarder maintenant"

**Cas limites :**
- [ ] GIVEN Thomas redimensionne un lot jusqu'à une surface < 1% du canvas WHEN la taille est trop petite THEN la zone snap à une taille minimale (2%×2%) pour rester cliquable
- [ ] GIVEN Thomas est sur mobile (touch) WHEN il pinch-to-zoom sur le canvas THEN le zoom ne déclenche pas un drag de zone (distinction touch zoom vs drag)

**Permissions :**
- [ ] GIVEN V1 sans auth WHEN un visiteur modifie les zones THEN les modifications sont sauvegardées en base sans vérification

**Données existantes :**
- [ ] GIVEN Thomas a déjà ajusté des zones et revient sur l'étape 2 WHEN la page charge THEN les zones affichent leur dernière position sauvegardée (pas la proposition IA initiale)

#### Payload API
- **Endpoint** : `PATCH /api/vs/lots/[id]`
- **Authentification** : publique
- **Rate limit** : 60 PATCH/min par IP (opération fréquente)
- **Request body** : `{ "zone_data": { "type": "rect"|"polygon", "x": number, "y": number, "w": number, "h": number } | { "type": "polygon", "points": [{"x":number,"y":number}] } }`
- **Response succès** : `{ "lot_id": uuid, "zone_data": object, "surface_m2": number }` — status 200
- **Response erreur** : `{ "error": "INVALID_ZONE"|"LOT_NOT_FOUND" }` — status 400/404

#### Events analytics
| Event | Trigger | Propriétés | Funnel |
|---|---|---|---|
| `vs_lot_zone_adjusted` | PATCH /api/vs/lots/[id] 200 (après drag) | project_id, lot_id, adjustment_type (drag/resize) | activation |

#### Scénarios persona concrets
1. Thomas voit que le lot 2 déborde sur le mur porteur. Il clique et redimensionne la zone droite. Résultat attendu : zone mise à jour en temps réel, surface recalculée.
2. Thomas glisse un lot par erreur hors du canvas. Résultat attendu : la zone clamp à la bordure, pas de crash.
3. Thomas travaille sur mobile depuis le chantier. Il essaie de zoomer avec deux doigts sur le plan. Résultat attendu : le zoom fonctionne sans déplacer la zone de lot.
4. La connexion coupe pendant un ajustement. Résultat attendu : état local conservé, toast de retry.
5. Thomas fait 10 ajustements successifs rapides. Résultat attendu : 1 seule requête API par lot après 1s de pause (debounce), pas 10 requêtes.

#### Definition of Done
- [ ] Drag + resize fonctionnels sur canvas HTML5
- [ ] Sauvegarde auto avec debounce 1s
- [ ] Détection de chevauchement visuelle
- [ ] Test E2E : ajuster une zone, vérifier persistance après refresh
- [ ] Screenshot conforme

---

### US-VS-08 : Valider les lots et passer à l'étape 3

**Persona** : Thomas
**Epic** : Découpe par lots
**Dépendances** : US-VS-07
**Priorité RICE** : R=10 I=10 C=10 E=1 → Score=100

#### Job-to-be-done
En tant que Thomas, je veux valider la liste des lots finalisés afin de passer à l'identification des pièces.

#### Contexte de navigation
- **Page/écran d'origine** : `/vs/projects/[id]/lots`
- **Déclencheur** : Clic sur "Continuer vers les pièces"
- **Page/écran de destination (succès)** : `/vs/projects/[id]/rooms` — Étape 3
- **Page/écran de destination (échec)** : Reste sur `/vs/projects/[id]/lots` avec message de blocage

#### Critères d'acceptance

**Happy path :**
- [ ] GIVEN tous les lots ont `status != "chevauchement"` et au moins 1 lot existe WHEN Thomas clique "Continuer" THEN le projet passe au statut `step_2_complete`, Thomas est redirigé vers l'étape 3
- [ ] GIVEN Thomas a 4 lots valides WHEN il clique "Continuer" THEN l'étape 3 affiche automatiquement le premier lot pour l'identification des pièces

**Cas d'erreur :**
- [ ] GIVEN 2 lots se chevauchent (contour rouge actif) WHEN Thomas clique "Continuer" THEN bouton bloqué avec message "Corrigez les chevauchements avant de continuer" (tooltip sur le bouton grisé)
- [ ] GIVEN aucun lot n'existe WHEN Thomas clique "Continuer" THEN bouton bloqué avec message "Ajoutez au moins un lot avant de continuer"

**Cas limites :**
- [ ] GIVEN Thomas a un lot sans nom (nom = "") WHEN il clique "Continuer" THEN blocage avec message "Nommez tous vos lots avant de continuer"
- [ ] GIVEN Thomas clique "Continuer" puis le bouton "Précédent" depuis l'étape 3 WHEN il revient à l'étape 2 THEN ses lots sont intacts (pas de reset)

**Permissions :**
- [ ] GIVEN V1 sans auth WHEN un visiteur valide les lots THEN la transition est acceptée

**Données existantes :**
- [ ] GIVEN Thomas avait déjà validé les lots et les pièces et revient modifier un lot WHEN il re-valide THEN les pièces de l'étape 3 sont recalculées (warning : "Vous avez modifié un lot — les pièces associées seront réanalysées")

#### Payload API
- **Endpoint** : `POST /api/vs/projects/[id]/lots/validate`
- **Authentification** : publique
- **Rate limit** : N/A
- **Request body** : `{}`
- **Response succès** : `{ "project_id": uuid, "status": "step_2_complete", "lots": [{ "id": uuid, "name": string, "surface_m2": number }] }` — status 200
- **Response erreur** : `{ "error": "LOTS_OVERLAP"|"NO_LOTS"|"UNNAMED_LOTS", "details": [...] }` — status 422

#### Events analytics
| Event | Trigger | Propriétés | Funnel |
|---|---|---|---|
| `vs_lots_validated` | POST /api/vs/projects/[id]/lots/validate 200 | project_id, lots_count, total_surface_m2 | activation |

#### Scénarios persona concrets
1. Thomas a 5 lots proprement découpés sans chevauchement. Il clique "Continuer". Résultat attendu : transition vers l'étape 3, premier lot sélectionné.
2. Thomas a oublié de nommer le lot 4 (nom = ""). Résultat attendu : bouton bloqué, message d'erreur ciblant le lot non nommé.
3. Thomas revient modifier le lot 2 après avoir identifié les pièces de l'étape 3. Résultat attendu : warning que les pièces du lot 2 seront réanalysées.
4. Thomas clique "Continuer" sur un projet sans lots. Résultat attendu : bouton grisé, message explicite.
5. Thomas valide ses lots, arrive à l'étape 3, puis appuie sur "Retour" du navigateur. Résultat attendu : il retourne à l'étape 2 avec ses lots intacts.

#### Definition of Done
- [ ] Bouton "Continuer" conditionnel (bloqué si lots invalides)
- [ ] API de validation fonctionnelle
- [ ] Test E2E : valider lots → vérifier navigation vers étape 3
- [ ] Screenshot conforme

## 5. Étape 3 — Identification des pièces

### Règles métier

- L'étape 3 travaille lot par lot. Thomas sélectionne un lot, valide ses pièces, puis passe au suivant.
- Pour chaque lot, l'IA relit le plan et propose les pièces identifiées dans la zone du lot (types : chambre, salon, cuisine, SDB, WC, entrée, dressing, bureau, cellier, terrasse, garage, balcon…).
- Les pièces sont positionnées en coordonnées % relatives à la zone du lot (pas du plan global).
- Contraintes : pas de superposition de pièces au sein d'un lot, surface totale des pièces <= surface du lot + 5% tolérance.
- Un lot est "validé" quand toutes ses pièces ont un type défini et pas de chevauchement.
- Tous les lots doivent être validés pour passer à l'étape 4.

### 5 états UI — Éditeur de pièces

| État | Comportement | Message/Affichage |
|---|---|---|
| Défaut | Zoom sur la zone du lot sélectionné, pièces identifiées en overlays nuancés | Panneau latéral : liste des pièces du lot avec type (dropdown), surface m² |
| Loading | IA identifie les pièces du lot sélectionné | "L'IA identifie les pièces du [nom du lot]..." — skeleton sur le zoom |
| Vide | Aucune pièce détectée dans le lot | "L'IA n'a pas détecté de pièces — ajoutez-en manuellement" + bouton "Ajouter une pièce" |
| Erreur | Erreur identification ou sauvegarde | Toast rouge avec option retry |
| Succès | Toutes les pièces du lot validées | Badge vert "Lot validé", passage au lot suivant ou bouton "Continuer vers les visuels" si dernier lot |

---

### US-VS-13 : Visualiser les pièces identifiées par l'IA pour un lot

**Persona** : Thomas
**Epic** : Identification des pièces
**Dépendances** : US-VS-08
**Priorité RICE** : R=10 I=10 C=10 E=1 → Score=100

#### Job-to-be-done
En tant que Thomas, je veux voir les pièces identifiées par l'IA à l'intérieur d'un lot afin de valider ou corriger le découpage fonctionnel du logement.

#### Contexte de navigation
- **Page/écran d'origine** : `/vs/projects/[id]/rooms` — arrivée depuis étape 2
- **Déclencheur** : Sélection d'un lot dans la liste latérale ou arrivée automatique sur le premier lot
- **Page/écran de destination (succès)** : Même page, zoom sur le lot sélectionné avec pièces affichées
- **Page/écran de destination (échec)** : Toast d'erreur si l'identification IA échoue pour ce lot

#### Critères d'acceptance

**Happy path :**
- [ ] GIVEN Thomas arrive sur l'étape 3 WHEN la page charge THEN le premier lot est sélectionné, le plan est zoomé sur sa zone, les pièces proposées sont affichées en overlays avec un code couleur par type (chambre=bleu, salon=vert, cuisine=orange, SDB=violet, WC=rose, autres=gris)
- [ ] GIVEN un lot contient 5 pièces identifiées WHEN Thomas sélectionne ce lot THEN le panneau latéral liste les 5 pièces avec leur type et surface estimée
- [ ] GIVEN Thomas clique sur une pièce dans le panneau THEN la pièce correspondante sur le canvas est mise en surbrillance

**Cas d'erreur :**
- [ ] GIVEN l'IA retourne 0 pièce pour un lot (zone trop petite ou floue) WHEN Thomas sélectionne ce lot THEN état "vide" avec bouton "Ajouter une pièce manuellement"

**Cas limites :**
- [ ] GIVEN un lot très grand (>200 m²) WHEN Thomas zoome sur ce lot THEN toutes les pièces sont visibles sans scroll horizontal
- [ ] GIVEN Thomas sélectionne un lot déjà validé WHEN il clique dessus THEN les pièces s'affichent avec leur statut validé (pas de relance IA)

**Permissions :**
- [ ] GIVEN V1 sans auth THEN accès accordé

**Données existantes :**
- [ ] GIVEN Thomas a déjà validé les pièces d'un lot et revient sur ce lot WHEN la page charge THEN les pièces affichent leur état validé (pas de reset)

#### Scénarios persona concrets
1. Thomas sélectionne "Lot 1 — T3". Le plan zoome sur la zone du lot. L'IA a identifié : salon (28m²), chambre 1 (12m²), chambre 2 (10m²), SDB (5m²), WC (2m²). Résultat attendu : 5 overlays colorés avec noms.
2. Thomas passe au lot 3 en cliquant dans la liste latérale. Résultat attendu : zoom sur lot 3, pièces du lot 3 affichées, pièces du lot 1 disparaissent.
3. Thomas revient sur un lot déjà validé. Résultat attendu : pièces affichées avec badge "Validé", pas de re-lancement IA.
4. L'IA n'a détecté aucune pièce pour le lot 4 (zone trop petite dans le plan). Résultat attendu : état vide avec bouton d'ajout manuel.
5. Thomas a un T5 avec 7 pièces. Toutes s'affichent dans le canvas sans superposition. Résultat attendu : canvas lisible, panneau latéral scrollable si liste > 5 pièces.

#### Definition of Done
- [ ] Zoom sur zone du lot sélectionné fonctionnel
- [ ] Code couleur par type de pièce
- [ ] Synchronisation canvas ↔ panneau latéral
- [ ] Test E2E : sélectionner lot → vérifier pièces affichées
- [ ] Screenshot conforme

---

### US-VS-14 : Modifier le type d'une pièce

**Persona** : Thomas
**Epic** : Identification des pièces
**Dépendances** : US-VS-13
**Priorité RICE** : R=9 I=9 C=9 E=1 → Score=81

#### Job-to-be-done
En tant que Thomas, je veux changer le type d'une pièce identifiée par l'IA (ex : "bureau" → "chambre") afin que le plan reflète la réalité du logement.

#### Contexte de navigation
- **Page/écran d'origine** : `/vs/projects/[id]/rooms` — pièce sélectionnée
- **Déclencheur** : Clic sur le dropdown de type dans le panneau latéral ou clic droit sur la pièce dans le canvas
- **Page/écran de destination (succès)** : Même page, type mis à jour, couleur de l'overlay changée en conséquence
- **Page/écran de destination (échec)** : Toast d'erreur si sauvegarde échoue

#### Données et champs
| Champ | Type | Obligatoire | Validation | Limites | Exemple |
|---|---|---|---|---|---|
| room_type | enum | Oui | Valeurs : chambre, salon, cuisine, sdb, wc, entree, dressing, bureau, cellier, terrasse, garage, balcon, autre | N/A | "chambre" |

#### Critères d'acceptance

**Happy path :**
- [ ] GIVEN Thomas voit une pièce typée "bureau" incorrectement WHEN il ouvre le dropdown et sélectionne "chambre" THEN le type est mis à jour, la couleur de l'overlay change immédiatement, sauvegarde auto déclenchée
- [ ] GIVEN Thomas change le type de 3 pièces successivement WHEN il fait les 3 changements THEN chaque changement est sauvegardé individuellement (pas d'attente d'une validation globale)

**Cas d'erreur :**
- [ ] GIVEN la sauvegarde du changement de type échoue WHEN l'erreur réseau survient THEN toast rouge, le type revient à sa valeur précédente dans l'UI, option "Réessayer"

**Cas limites :**
- [ ] GIVEN Thomas change le type vers "autre" WHEN il sélectionne "autre" THEN un champ texte libre apparaît pour préciser (ex : "local vélos"), max 50 caractères
- [ ] GIVEN Thomas change un type alors que le lot est déjà "validé" WHEN il fait le changement THEN le statut du lot passe à "à valider" (invalide la validation précédente)

**Permissions :**
- [ ] GIVEN V1 sans auth THEN modification acceptée

**Données existantes :**
- [ ] GIVEN la pièce avait le type suggéré par l'IA WHEN Thomas le change THEN `source` passe de "ai" à "manual" en base

#### Payload API
- **Endpoint** : `PATCH /api/vs/rooms/[id]`
- **Authentification** : publique
- **Rate limit** : 60 PATCH/min par IP
- **Request body** : `{ "room_type": string, "custom_label": string|null }`
- **Response succès** : `{ "room_id": uuid, "room_type": string, "source": "manual" }` — status 200
- **Response erreur** : `{ "error": "INVALID_ROOM_TYPE"|"ROOM_NOT_FOUND" }` — status 400/404

#### Events analytics
| Event | Trigger | Propriétés | Funnel |
|---|---|---|---|
| `vs_room_type_changed` | PATCH /api/vs/rooms/[id] 200 | project_id, lot_id, room_id, old_type, new_type | activation |

#### Scénarios persona concrets
1. L'IA a typé une grande pièce "salon" mais c'est en fait une cuisine ouverte. Thomas change le type en "cuisine". Résultat attendu : overlay orange (cuisine), sauvegardé immédiatement.
2. Thomas a un local technique inhabituel. Il choisit "autre" et tape "local technique". Résultat attendu : champ texte visible, libellé custom sauvegardé.
3. Thomas change le type d'une pièce dans un lot déjà validé. Résultat attendu : lot repassé à "à valider", warning toast "Le lot a été invalidé — validez-le à nouveau avant de continuer".
4. La connexion coupe au moment du changement. Résultat attendu : type revenu à l'ancien dans l'UI, toast de retry.
5. Thomas fait 5 changements de type rapidement. Résultat attendu : 5 requêtes PATCH envoyées (1 par changement, pas de debounce ici car changement discret).

#### Definition of Done
- [ ] Dropdown type de pièce avec tous les types enum
- [ ] Champ custom_label si type = "autre"
- [ ] Invalidation automatique du statut lot si changement sur lot validé
- [ ] Test E2E : changer type → vérifier persistance
- [ ] Screenshot conforme

---

### US-VS-15 : Valider les pièces d'un lot et passer au lot suivant

**Persona** : Thomas
**Epic** : Identification des pièces
**Dépendances** : US-VS-14
**Priorité RICE** : R=10 I=10 C=10 E=1 → Score=100

#### Job-to-be-done
En tant que Thomas, je veux valider les pièces d'un lot afin de confirmer que l'identification est correcte et passer au lot suivant.

#### Contexte de navigation
- **Page/écran d'origine** : `/vs/projects/[id]/rooms` — lot sélectionné, pièces vérifiées
- **Déclencheur** : Clic sur "Valider ce lot"
- **Page/écran de destination (succès)** : Même page, lot suivant automatiquement sélectionné. Si dernier lot : bouton "Continuer vers les visuels" actif.
- **Page/écran de destination (échec)** : Reste sur le même lot avec message de blocage

#### Critères d'acceptance

**Happy path :**
- [ ] GIVEN toutes les pièces du lot ont un type défini (non "non_identifie") et pas de chevauchement WHEN Thomas clique "Valider ce lot" THEN `vs_lots.status = 'validated'`, lot suivant sélectionné automatiquement
- [ ] GIVEN c'est le dernier lot WHEN Thomas clique "Valider ce lot" THEN le bouton "Continuer vers les visuels" devient actif

**Cas d'erreur :**
- [ ] GIVEN une pièce a encore le type "non_identifie" WHEN Thomas clique "Valider" THEN blocage avec message "Définissez le type de toutes les pièces avant de valider" et surbrillance des pièces concernées

**Cas limites :**
- [ ] GIVEN Thomas valide le lot 3 et revient en arrière pour modifier le lot 2 WHEN il re-valide le lot 2 THEN le lot 3 n'est pas affecté (chaque lot est indépendant)

**Permissions :**
- [ ] GIVEN V1 sans auth THEN validation acceptée

**Données existantes :**
- [ ] GIVEN Thomas avait validé ce lot dans une session précédente WHEN il revient et re-valide sans modification THEN le statut reste "validated" (idempotent)

#### Payload API
- **Endpoint** : `POST /api/vs/lots/[id]/rooms/validate`
- **Authentification** : publique
- **Rate limit** : N/A
- **Request body** : `{}`
- **Response succès** : `{ "lot_id": uuid, "status": "validated", "rooms_count": number }` — status 200
- **Response erreur** : `{ "error": "UNTYPED_ROOMS"|"ROOMS_OVERLAP", "room_ids": [uuid] }` — status 422

#### Events analytics
| Event | Trigger | Propriétés | Funnel |
|---|---|---|---|
| `vs_lot_rooms_validated` | POST /api/vs/lots/[id]/rooms/validate 200 | project_id, lot_id, rooms_count | activation |
| `vs_all_lots_rooms_validated` | Quand tous les lots du projet sont validated | project_id, total_lots, total_rooms | activation |

#### Scénarios persona concrets
1. Thomas a vérifié les 5 pièces du lot 1, tout est correct. Il clique "Valider ce lot". Résultat attendu : lot 1 marqué validé, lot 2 auto-sélectionné.
2. Thomas a oublié de typer la pièce 4. Il clique "Valider". Résultat attendu : blocage, pièce 4 mise en surbrillance rouge dans le canvas ET dans le panneau.
3. Thomas valide son dernier lot. Résultat attendu : message "Tous les lots sont validés — vous pouvez générer les visuels" + bouton "Continuer vers les visuels" vert.
4. Thomas revient modifier le lot 2 après avoir validé le lot 3. Résultat attendu : lot 2 repassé à "à valider", lot 3 intact.
5. Thomas valide un lot déjà validé (session de reprise). Résultat attendu : statut reste "validated", pas de doublon en base.

#### Definition of Done
- [ ] Bouton "Valider ce lot" conditionnel
- [ ] Auto-sélection du lot suivant
- [ ] API validation fonctionnelle
- [ ] Test E2E : valider tous les lots → vérifier bouton "Continuer"
- [ ] Screenshot conforme

## 6. Étape 4 — Visuels post-travaux

### Règles métier

- L'étape 4 travaille pièce par pièce. Thomas sélectionne une pièce, uploade sa photo, choisit un style, génère.
- Modèle : gpt-image-1.5 (génération d'image), latence cible ~90 secondes.
- Une pièce peut avoir plusieurs générations (itérations via l'agent architecte).
- L'agent architecte reçoit : le visuel courant, la demande en langage naturel, le style choisi. Il génère une nouvelle version.
- Styles curatés (12) : Scandinave, Industriel, Moderne, Bohème, Classique, Minimaliste, Art Déco, Tropical, Wabi-Sabi, Mid-Century Modern, Cottagecore, Japandi.
- Un visuel est "validé" quand Thomas clique "Valider ce visuel". Il peut en valider plusieurs par pièce.
- KPI North Star comptabilisé : quand au moins 1 visuel est validé pour au moins 1 pièce d'un lot.
- Stockage : Object Storage Replit (`vs/{project_id}/visuals/{uuid}.png`)

### 5 états UI — Générateur de visuels

| État | Comportement | Message/Affichage |
|---|---|---|
| Défaut | Grille des pièces du projet (miniatures + nom + statut), invitation à sélectionner une pièce | "Sélectionnez une pièce pour générer son visuel post-travaux" |
| Loading | Génération en cours (~90s) | Barre de progression avec compte à rebours indicatif "Génération en cours — environ 90 secondes", aperçu flou/skeleton de la future image |
| Vide | Pièce sélectionnée, aucune photo déposée | "Déposez une photo de cette pièce pour démarrer la génération" |
| Erreur | Génération échouée (timeout OpenAI, image rejetée par les filtres) | "La génération a échoué — réessayez. Si le problème persiste, essayez une autre photo." + bouton "Réessayer" |
| Succès | Visuel généré affiché | Visuel pleine largeur, boutons "Itérer" (chat agent), "Valider ce visuel", "Générer un autre style" |

---

### US-VS-19 : Déposer la photo brute d'une pièce

**Persona** : Thomas
**Epic** : Visuels post-travaux
**Dépendances** : US-VS-15
**Priorité RICE** : R=10 I=10 C=10 E=1 → Score=100

#### Job-to-be-done
En tant que Thomas, je veux déposer une photo de la pièce dans son état brut afin que l'IA génère un visuel réaliste de l'état post-travaux.

#### Contexte de navigation
- **Page/écran d'origine** : `/vs/projects/[id]/visuals` — pièce sélectionnée, état "vide"
- **Déclencheur** : Clic sur "Ajouter une photo" ou drag-and-drop sur la zone de dépôt
- **Page/écran de destination (succès)** : Même page, photo déposée avec aperçu + formulaire de configuration (angle, style)
- **Page/écran de destination (échec)** : Toast d'erreur, pas de changement d'écran

#### Données et champs
| Champ | Type | Obligatoire | Validation | Limites | Exemple |
|---|---|---|---|---|---|
| photo | File | Oui | MIME : image/jpeg, image/png, image/webp | Max 10 Mo, min 800x600px recommandé | chambre_brute.jpg |
| angle_description | string | Non | Texte libre | Max 100 caractères | "Vue depuis la porte vers la fenêtre" |

#### Critères d'acceptance

**Happy path :**
- [ ] GIVEN Thomas est sur une pièce sans photo WHEN il dépose `chambre_brute.jpg` (3 Mo) THEN la photo s'affiche en aperçu, un champ "Angle de prise de vue" apparaît (optionnel), le bouton "Choisir un style" devient actif
- [ ] GIVEN Thomas dépose depuis mobile (appareil photo) WHEN la photo HEIC est chargée THEN elle est acceptée et convertie en JPEG côté serveur (HEIC = format iOS)

**Cas d'erreur :**
- [ ] GIVEN Thomas dépose une photo de < 400x300px WHEN la résolution est trop basse THEN toast orange "Cette photo est de faible résolution — le visuel généré sera moins précis. Continuer quand même ?" (pas bloquant)
- [ ] GIVEN la photo fait 15 Mo WHEN elle est rejetée THEN toast rouge "Photo trop lourde — maximum 10 Mo"

**Cas limites :**
- [ ] GIVEN Thomas dépose plusieurs photos pour la même pièce WHEN il dépose la 2e THEN elle s'ajoute (jusqu'à 3 photos par pièce), la génération utilisera la plus récente par défaut
- [ ] GIVEN Thomas dépose une photo paysage ET une portrait WHEN les deux sont là THEN il peut sélectionner celle à utiliser pour la génération

**Permissions :**
- [ ] GIVEN V1 sans auth THEN dépôt accepté

**Données existantes :**
- [ ] GIVEN une photo existe déjà pour cette pièce WHEN Thomas en dépose une nouvelle THEN l'ancienne est conservée (pas remplacée automatiquement), Thomas choisit laquelle utiliser

#### Payload API
- **Endpoint** : `POST /api/vs/rooms/[id]/photos` (multipart/form-data)
- **Authentification** : publique
- **Rate limit** : 30 uploads/min par IP
- **Request body** : FormData — `photo: File`, `angle_description?: string`
- **Response succès** : `{ "photo_id": uuid, "preview_url": string, "angle_description": string|null }` — status 201
- **Response erreur** : `{ "error": "FILE_TOO_LARGE"|"INVALID_FORMAT"|"ROOM_NOT_FOUND" }` — status 400/404

#### Events analytics
| Event | Trigger | Propriétés | Funnel |
|---|---|---|---|
| `vs_room_photo_uploaded` | POST /api/vs/rooms/[id]/photos 201 | project_id, lot_id, room_id, room_type, file_size_mb | activation |

#### Scénarios persona concrets
1. Thomas photographie la chambre brute avec son iPhone. Il envoie le HEIC depuis son téléphone. Résultat attendu : photo acceptée et convertie, aperçu visible.
2. Thomas dépose une photo trop petite (640x480). Résultat attendu : toast orange de warning non bloquant, il peut continuer.
3. Thomas a 3 photos de la même chambre (angles différents). Il dépose les 3. Résultat attendu : 3 photos listées, il sélectionne la meilleure.
4. Thomas dépose une photo de 12 Mo. Résultat attendu : rejetée avec toast rouge.
5. Thomas revient sur une pièce déjà alimentée en photo. Résultat attendu : la photo existante s'affiche, option d'en déposer une nouvelle.

#### Definition of Done
- [ ] Dépôt photo avec preview immédiat
- [ ] Conversion HEIC acceptée
- [ ] Warning résolution basse (non bloquant)
- [ ] Test E2E : dépôt photo → vérifier preview
- [ ] Screenshot conforme

---

### US-VS-20 : Choisir un style et lancer la génération du visuel

**Persona** : Thomas
**Epic** : Visuels post-travaux
**Dépendances** : US-VS-19
**Priorité RICE** : R=10 I=10 C=10 E=1 → Score=100

#### Job-to-be-done
En tant que Thomas, je veux choisir un style de décoration et lancer la génération du visuel post-travaux afin d'obtenir une projection réaliste du logement rénové.

#### Contexte de navigation
- **Page/écran d'origine** : `/vs/projects/[id]/visuals` — photo déposée
- **Déclencheur** : Clic sur un style dans la grille des 12 styles + clic "Générer"
- **Page/écran de destination (succès)** : Même page, état "loading" puis affichage du visuel généré
- **Page/écran de destination (échec)** : Toast d'erreur, état "erreur" avec bouton retry

#### Données et champs
| Champ | Type | Obligatoire | Validation | Limites | Exemple |
|---|---|---|---|---|---|
| style_id | enum | Oui | 12 valeurs : scandinave, industriel, moderne, boheme, classique, minimaliste, art-deco, tropical, wabi-sabi, mid-century, cottagecore, japandi | N/A | "scandinave" |
| photo_id | uuid | Oui (auto depuis sélection) | Doit exister pour cette pièce | N/A | "b3c4d5e6-..." |

#### 5 états UI (Gate G21)
Voir tableau section 6 en-tête (état Loading : barre de progression + ~90s).

#### Critères d'acceptance

**Happy path :**
- [ ] GIVEN Thomas a uploadé une photo WHEN il sélectionne le style "Scandinave" et clique "Générer" THEN l'état loading s'affiche avec barre de progression et message "~90 secondes"
- [ ] GIVEN la génération est terminée WHEN le visuel arrive THEN il s'affiche en pleine largeur avec les boutons "Itérer", "Valider ce visuel", "Générer un autre style"
- [ ] GIVEN Thomas choisit "Industriel" sur une pièce qui a déjà un visuel "Scandinave" WHEN il clique "Générer" THEN un nouveau visuel est généré (l'ancien est conservé, les deux sont dans l'historique)

**Cas d'erreur :**
- [ ] GIVEN gpt-image-1.5 rejette la photo (contenu non conforme) WHEN la génération échoue THEN message "La génération a été bloquée — essayez avec une autre photo ou contactez le support"
- [ ] GIVEN la génération dépasse 150s WHEN le timeout est atteint THEN état erreur avec retry automatique proposé

**Cas limites :**
- [ ] GIVEN Thomas lance une génération et ferme son navigateur WHEN il revient THEN la génération a continué en background, le visuel est disponible
- [ ] GIVEN Thomas clique "Générer" sans sélectionner de style WHEN il clique THEN le bouton reste inactif (disabled) jusqu'à la sélection d'un style

**Permissions :**
- [ ] GIVEN V1 sans auth THEN génération acceptée

**Données existantes :**
- [ ] GIVEN Thomas a déjà 3 visuels générés pour cette pièce WHEN il en génère un 4e THEN les 3 précédents sont conservés dans l'historique, scrollable

#### Payload API
- **Endpoint** : `POST /api/vs/rooms/[id]/generate`
- **Authentification** : publique
- **Rate limit** : 10 générations/heure par IP (coût élevé gpt-image-1.5)
- **Request body** : `{ "photo_id": uuid, "style_id": string, "angle_description": string|null }`
- **Response succès** : `{ "visual_id": uuid, "status": "processing" }` — status 202
- **Response erreur** : `{ "error": "NO_PHOTO"|"INVALID_STYLE"|"ROOM_NOT_FOUND"|"RATE_LIMIT_EXCEEDED" }` — status 400/404/429

**Polling du statut :**
- **Endpoint** : `GET /api/vs/visuals/[id]/status`
- **Response** : `{ "status": "processing"|"done"|"failed", "url": string|null, "error": string|null }`
- Frontend poll toutes les 5s

#### Events analytics
| Event | Trigger | Propriétés | Funnel |
|---|---|---|---|
| `vs_visual_generation_started` | POST /api/vs/rooms/[id]/generate 202 | project_id, lot_id, room_id, room_type, style_id | activation |
| `vs_visual_generation_completed` | GET visual status = "done" | project_id, visual_id, style_id, duration_ms, room_type | activation |
| `vs_visual_generation_failed` | GET visual status = "failed" | project_id, error_type, style_id | activation |

#### Scénarios persona concrets
1. Thomas sélectionne "Scandinave" pour la chambre, clique "Générer". Il voit la barre de progression et le compte à rebours. Après 87 secondes, le visuel s'affiche. Résultat attendu : chambre rénovée style scandinave visible.
2. Thomas ferme son MacBook pendant la génération (90s). Il le rouvre 2 minutes plus tard. Résultat attendu : le visuel est disponible, page chargée avec le résultat.
3. Thomas génère "Industriel" après avoir déjà généré "Scandinave". Résultat attendu : 2 visuels dans l'historique, le dernier en vue principale.
4. Thomas clique "Générer" sans sélectionner de style. Résultat attendu : bouton disabled, aucun appel API.
5. Thomas dépasse le rate limit (10 générations/heure). Résultat attendu : toast orange "Limite de génération atteinte — réessayez dans X minutes", pas de génération lancée.

#### Definition of Done
- [ ] Grille 12 styles avec preview visuel (screenshot illustratif par style)
- [ ] Polling status toutes les 5s
- [ ] Barre de progression avec timer indicatif
- [ ] Historique des visuels générés par pièce
- [ ] Test E2E : sélectionner style → lancer génération → vérifier affichage résultat (mock OpenAI en test)
- [ ] Screenshot conforme

---

### US-VS-21 : Itérer sur un visuel via l'agent architecte

**Persona** : Thomas
**Epic** : Visuels post-travaux
**Dépendances** : US-VS-20
**Priorité RICE** : R=9 I=9 C=8 E=1 → Score=72

#### Job-to-be-done
En tant que Thomas, je veux affiner le visuel généré en envoyant des instructions en langage naturel à l'agent architecte afin d'obtenir exactement le rendu que j'imagine pour commercialiser ce logement.

#### Contexte de navigation
- **Page/écran d'origine** : `/vs/projects/[id]/visuals` — visuel affiché post-génération
- **Déclencheur** : Clic sur "Itérer" + saisie d'une instruction dans le champ de chat
- **Page/écran de destination (succès)** : Même page, nouvelle version du visuel affichée
- **Page/écran de destination (échec)** : Toast d'erreur, visuel précédent conservé

#### Données et champs
| Champ | Type | Obligatoire | Validation | Limites | Exemple |
|---|---|---|---|---|---|
| instruction | string | Oui | Non vide | 5–500 caractères | "Retire le tapis, ajoute plus de lumière naturelle" |
| visual_id (base) | uuid | Oui (auto) | Visuel existant validé ou généré | N/A | "c4d5e6f7-..." |

#### Critères d'acceptance

**Happy path :**
- [ ] GIVEN Thomas a un visuel généré WHEN il clique "Itérer" et tape "Ajoute une table basse en chêne" et envoie THEN une nouvelle génération démarre (~90s), l'agent architecte intègre l'instruction dans le prompt
- [ ] GIVEN l'itération est terminée WHEN le visuel arrive THEN il s'affiche à côté du précédent (comparaison avant/après), bouton "Valider cette version"
- [ ] GIVEN Thomas a fait 3 itérations WHEN il visualise l'historique THEN les 4 versions (originale + 3 itérations) sont accessibles en scroll horizontal

**Cas d'erreur :**
- [ ] GIVEN l'instruction est trop vague ("change tout") WHEN la génération échoue ou retourne un mauvais résultat THEN Thomas peut ré-itérer avec une instruction plus précise (pas d'erreur technique)
- [ ] GIVEN l'API gpt-image-1.5 est en erreur WHEN l'itération échoue THEN toast rouge, le visuel précédent est conservé

**Cas limites :**
- [ ] GIVEN Thomas a atteint 5 itérations sur une pièce WHEN il tente une 6e THEN warning "Vous avez beaucoup itéré sur cette pièce — êtes-vous satisfait ?" (pas bloquant, il peut continuer)
- [ ] GIVEN l'instruction contient plus de 500 caractères WHEN Thomas écrit THEN le champ est limité à 500 caractères (maxLength HTML)

**Permissions :**
- [ ] GIVEN V1 sans auth THEN itération acceptée

**Données existantes :**
- [ ] GIVEN Thomas a validé un visuel précédent WHEN il itère depuis ce visuel THEN le visuel validé est conservé, la nouvelle itération s'ajoute à l'historique sans écraser

#### Payload API
- **Endpoint** : `POST /api/vs/visuals/[id]/iterate`
- **Authentification** : publique
- **Rate limit** : 20 itérations/heure par IP
- **Request body** : `{ "instruction": string }`
- **Response succès** : `{ "visual_id": uuid, "status": "processing", "iteration_count": number }` — status 202
- **Response erreur** : `{ "error": "VISUAL_NOT_FOUND"|"RATE_LIMIT_EXCEEDED" }` — status 404/429

#### Events analytics
| Event | Trigger | Propriétés | Funnel |
|---|---|---|---|
| `vs_visual_iterated` | POST /api/vs/visuals/[id]/iterate 202 | project_id, visual_id, room_type, iteration_count, instruction_length | activation |

#### Scénarios persona concrets
1. Thomas reçoit le visuel scandinave, trouve le canapé trop grand. Il tape "Remplace le canapé par un modèle plus compact, gris anthracite". Résultat attendu : nouvelle génération en ~90s, version corrigée affichée.
2. Thomas compare la version 1 et la version 3 en scrollant l'historique. Résultat attendu : les 3 versions accessibles, dates affichées.
3. Thomas est sur mobile et utilise la dictée vocale pour l'instruction. Résultat attendu : le champ texte accepte la dictée (standard HTML, pas de contrainte).
4. Thomas a itéré 3 fois et obtient quelque chose de bien. Il valide cette version. Résultat attendu : version 3 marquée "validée", les autres conservées dans l'historique.
5. Thomas écrit une instruction de 600 caractères (très détaillée). Résultat attendu : champ limité à 500, il doit synthétiser.

#### Definition of Done
- [ ] Champ d'instruction + bouton "Itérer"
- [ ] Historique scroll horizontal des versions
- [ ] Affichage comparatif avant/après
- [ ] Test E2E : itérer → vérifier nouvelle version générée (mock)
- [ ] Screenshot conforme

---

### US-VS-22 : Valider un visuel et voir la progression du projet

**Persona** : Thomas
**Epic** : Visuels post-travaux
**Dépendances** : US-VS-20
**Priorité RICE** : R=10 I=10 C=10 E=1 → Score=100

#### Job-to-be-done
En tant que Thomas, je veux valider un visuel généré afin de marquer cette pièce comme traitée et suivre la progression globale du projet.

#### Contexte de navigation
- **Page/écran d'origine** : `/vs/projects/[id]/visuals` — visuel affiché
- **Déclencheur** : Clic sur "Valider ce visuel"
- **Page/écran de destination (succès)** : Même page, pièce marquée "validée" (badge vert), progression du projet mise à jour
- **Page/écran de destination (échec)** : Toast d'erreur

#### Critères d'acceptance

**Happy path :**
- [ ] GIVEN Thomas est satisfait du visuel WHEN il clique "Valider ce visuel" THEN `vs_visuals.status = 'validated'`, badge vert sur la miniature de cette pièce dans la grille
- [ ] GIVEN c'est le premier lot où une pièce est validée WHEN la validation est confirmée THEN le KPI North Star est incrémenté (1 lot traité pour ce projet)
- [ ] GIVEN toutes les pièces de tous les lots ont au moins 1 visuel validé WHEN Thomas valide la dernière THEN un message de félicitations s'affiche "Projet terminé — X lots traités, X visuels générés"

**Cas d'erreur :**
- [ ] GIVEN la sauvegarde échoue WHEN Thomas valide THEN toast rouge, statut non changé en base

**Cas limites :**
- [ ] GIVEN Thomas valide un visuel puis clique "Invalider" (pour reprendre les itérations) WHEN il invalide THEN `status` repasse à "generated" (non validé), le KPI est décrémenté si c'était la seule pièce validée du lot

**Permissions :**
- [ ] GIVEN V1 sans auth THEN validation acceptée

**Données existantes :**
- [ ] GIVEN Thomas valide le même visuel deux fois WHEN il clique deux fois THEN idempotent (status reste "validated", pas de doublon)

#### Payload API
- **Endpoint** : `PATCH /api/vs/visuals/[id]/validate`
- **Authentification** : publique
- **Rate limit** : N/A
- **Request body** : `{ "validated": true|false }`
- **Response succès** : `{ "visual_id": uuid, "status": "validated"|"generated" }` — status 200
- **Response erreur** : `{ "error": "VISUAL_NOT_FOUND" }` — status 404

#### Events analytics
| Event | Trigger | Propriétés | Funnel |
|---|---|---|---|
| `vs_visual_validated` | PATCH /api/vs/visuals/[id]/validate validated=true | project_id, lot_id, room_id, room_type, style_id, iteration_count | **KPI NORTH STAR** |
| `vs_project_completed` | Tous les lots ont >= 1 pièce avec visuel validé | project_id, total_lots, total_visuals, total_duration_minutes | retention |

#### Scénarios persona concrets
1. Thomas valide le visuel de la chambre du lot 1. C'est la première validation du projet. Résultat attendu : KPI incrémenté, badge vert sur la chambre.
2. Thomas valide toutes les pièces de ses 4 lots. Résultat attendu : message "Projet terminé — 4 lots traités, 12 visuels générés".
3. Thomas invalide un visuel après validation pour re-itérer. Résultat attendu : statut revenu à "generated", Thomas peut relancer une itération.
4. Thomas valide le même visuel deux fois. Résultat attendu : pas de doublon, statut reste "validated".
5. Thomas a 3 visuels pour une pièce (3 styles différents). Il en valide 2. Résultat attendu : 2 badges verts sur cette pièce, 1 non validé.

#### Definition of Done
- [ ] Bouton "Valider ce visuel" fonctionnel
- [ ] Badge vert sur la miniature de pièce dans la grille
- [ ] Compteur de progression projet (X pièces validées / Y pièces totales)
- [ ] Message de félicitations si projet complet
- [ ] Test E2E : valider → vérifier badge + event analytics
- [ ] Screenshot conforme

## 7. Recommandation stack technique

### Next.js 16 App Router (confirmé)

Raison du choix vs React/Vite isolé :

| Critère | Next.js 16 App Router | React/Vite isolé |
|---|---|---|
| API Routes | Intégré (pas besoin d'Express séparé pour les appels OpenAI) | Express séparé nécessaire |
| SSR pour le partage | Possible en V2 (pages de partage de visuels) | Impossible sans backend séparé |
| Continuité codebase | L'existant est déjà en Next.js — moins de rewrite | Rewrite complet |
| Déploiement Replit | Compatible | Compatible |

### Canvas HTML5 (pas de lib externe)

- Pas de Konva, Fabric.js ou autre lib canvas — canvas natif HTML5
- Raison : les libs canvas ajoutent 200-400 Ko de bundle pour des features dont on a 20%
- Drag/resize gérés avec les event listeners natifs (mousedown, mousemove, mouseup, touch*)
- Les coordonnées sont en % (flottants 0-100) pour être indépendantes de la résolution d'affichage

### Tailwind CSS avec tokens Versi

- Couleurs : `charcoal` (#1a1a1a), `stone` (#8c8c7a), `cream` (#f5f0e8), `white-off` (#fafaf8)
- Les overlays de lots/pièces utilisent des couleurs dédiées avec transparence (opacity 40%) pour rester lisibles sur les plans
- Palette overlays (10 couleurs, une par lot/pièce) : définie dans `design-tokens.json` Versi

### Modèles IA

| Usage | Modèle | Latence cible | Coût estimé |
|---|---|---|---|
| Extraction plan (vision) | gpt-4.1 avec vision | 20-40s | ~$0.05 par extraction |
| Génération visuel | gpt-image-1.5 | ~90s | ~$0.15 par génération |
| Agent architecte (itération) | gpt-4.1 + gpt-image-1.5 | ~90s | ~$0.15 par itération |

### Object Storage Replit

Structure de stockage :
```
vs/
  {project_id}/
    plans/           ← images converties depuis PDF
      {uuid}.png
    photos/          ← photos brutes uploadées par Thomas
      {uuid}.jpg
    visuals/         ← visuels générés par l'IA
      {uuid}.png
```

### PostgreSQL Replit

- Même instance PostgreSQL que les autres sites Versi (base de données partagée)
- Préfixe de tables `vs_` pour isoler du reste
- Migrations gérées via script SQL versionné (pas d'ORM en V1)

## 8. Modèle de données (V1)

Adapté de `db.ts` existant — préfixe `pro_` → `vs_`, suppression `user_id` FK, suppression champs Stripe.

```sql
-- Projet : le bien immobilier à traiter
CREATE TABLE vs_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adresse VARCHAR(200) NOT NULL,
  type_bien VARCHAR(20) NOT NULL CHECK (type_bien IN ('immeuble', 'maison', 'appartement')),
  surface_totale INT,                          -- m², optionnel
  status VARCHAR(30) NOT NULL DEFAULT 'draft'  -- draft | step_1_complete | step_2_complete | step_3_complete | completed
    CHECK (status IN ('draft','step_1_complete','step_2_complete','step_3_complete','completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Plans (images des étages)
CREATE TABLE vs_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES vs_projects(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,                     -- Object Storage path
  mime_type VARCHAR(50) NOT NULL,
  floor_number INT NOT NULL DEFAULT 0,
  original_filename VARCHAR(255),
  extraction_data JSONB,                       -- PlanExtractionResult (rooms + bounding_boxes + warnings)
  extraction_status VARCHAR(20) DEFAULT 'pending'
    CHECK (extraction_status IN ('pending','processing','done','failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_vs_plans_project ON vs_plans(project_id);

-- Lots (logements vendables découpés dans le projet)
CREATE TABLE vs_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES vs_projects(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  floor_number INT NOT NULL DEFAULT 0,
  surface_m2 NUMERIC(6,2),
  zone_data JSONB NOT NULL,                    -- { type: "rect"|"polygon", x, y, w, h } ou { points: [{x,y}] }
  status VARCHAR(20) NOT NULL DEFAULT 'suggested'
    CHECK (status IN ('suggested','validated','overlap_error')),
  source VARCHAR(10) NOT NULL DEFAULT 'ai'
    CHECK (source IN ('ai','manual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_vs_lots_project ON vs_lots(project_id);

-- Pièces (espaces fonctionnels à l'intérieur d'un lot)
CREATE TABLE vs_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id UUID NOT NULL REFERENCES vs_lots(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES vs_plans(id),        -- plan d'où vient cette pièce
  name VARCHAR(50),                            -- libellé affiché (ex: "Chambre 1")
  room_type VARCHAR(30) NOT NULL DEFAULT 'non_identifie',
  custom_label VARCHAR(50),                    -- si room_type = 'autre'
  surface_m2 NUMERIC(6,2),
  position JSONB,                              -- coordonnées en % relatives à la zone du lot
  status VARCHAR(20) NOT NULL DEFAULT 'suggested'
    CHECK (status IN ('suggested','validated')),
  source VARCHAR(10) NOT NULL DEFAULT 'ai'
    CHECK (source IN ('ai','manual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_vs_rooms_lot ON vs_rooms(lot_id);

-- Photos brutes uploadées par Thomas
CREATE TABLE vs_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES vs_rooms(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  angle_description VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_vs_photos_room ON vs_photos(room_id);

-- Visuels générés par l'IA
CREATE TABLE vs_visuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES vs_photos(id) ON DELETE CASCADE,
  style_id VARCHAR(30) NOT NULL,               -- ex: "scandinave"
  file_path TEXT,                              -- NULL si status = processing|failed
  status VARCHAR(20) NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing','generated','validated','failed')),
  prompt_used TEXT,                            -- prompt envoyé à gpt-image-1.5 (debug)
  iteration_count INT NOT NULL DEFAULT 0,      -- 0 = première génération
  parent_visual_id UUID REFERENCES vs_visuals(id),  -- pour itérations
  error_message TEXT,                          -- si status = failed
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_vs_visuals_photo ON vs_visuals(photo_id);
CREATE INDEX idx_vs_visuals_status ON vs_visuals(status);
```

## 9. Endpoints API (V1)

Tous les endpoints sont sous `/api/vs/`. Auth : publique (V1 sans auth).

### Projets

| Méthode | Route | Description | Status |
|---|---|---|---|
| POST | `/api/vs/projects` | Créer un projet | 201 / 422 |
| GET | `/api/vs/projects` | Lister tous les projets | 200 |
| GET | `/api/vs/projects/[id]` | Détail projet + statut | 200 / 404 |
| PATCH | `/api/vs/projects/[id]` | Modifier adresse / type / surface | 200 / 404 / 422 |

### Plans

| Méthode | Route | Description | Status |
|---|---|---|---|
| POST | `/api/vs/projects/[id]/plans` | Upload plan (multipart/form-data) | 201 / 400 / 404 |
| GET | `/api/vs/projects/[id]/plans` | Lister les plans du projet | 200 / 404 |
| DELETE | `/api/vs/plans/[id]` | Supprimer un plan + fichier Object Storage | 204 / 404 |
| POST | `/api/vs/projects/[id]/extract` | Lancer extraction IA (async) | 202 / 400 / 404 / 409 |
| GET | `/api/vs/projects/[id]/extraction` | Statut et résultat extraction (polling) | 200 / 404 |

### Lots

| Méthode | Route | Description | Status |
|---|---|---|---|
| GET | `/api/vs/projects/[id]/lots` | Lister les lots avec zones | 200 / 404 |
| POST | `/api/vs/projects/[id]/lots` | Créer un lot manuellement | 201 / 422 |
| PATCH | `/api/vs/lots/[id]` | Modifier zone / nom / floor | 200 / 400 / 404 |
| DELETE | `/api/vs/lots/[id]` | Supprimer un lot | 204 / 404 |
| POST | `/api/vs/projects/[id]/lots/validate` | Valider tous les lots (étape 2 → 3) | 200 / 422 / 404 |

### Pièces

| Méthode | Route | Description | Status |
|---|---|---|---|
| GET | `/api/vs/lots/[id]/rooms` | Lister les pièces d'un lot | 200 / 404 |
| POST | `/api/vs/lots/[id]/rooms` | Créer une pièce manuellement | 201 / 422 |
| PATCH | `/api/vs/rooms/[id]` | Modifier type / position / surface | 200 / 400 / 404 |
| DELETE | `/api/vs/rooms/[id]` | Supprimer une pièce | 204 / 404 |
| POST | `/api/vs/lots/[id]/rooms/validate` | Valider les pièces d'un lot | 200 / 422 / 404 |

### Photos et visuels

| Méthode | Route | Description | Status |
|---|---|---|---|
| POST | `/api/vs/rooms/[id]/photos` | Upload photo brute (multipart) | 201 / 400 / 404 |
| DELETE | `/api/vs/photos/[id]` | Supprimer une photo | 204 / 404 |
| POST | `/api/vs/rooms/[id]/generate` | Lancer génération visuel (async) | 202 / 400 / 404 / 429 |
| GET | `/api/vs/visuals/[id]/status` | Statut génération (polling) | 200 / 404 |
| POST | `/api/vs/visuals/[id]/iterate` | Itérer avec l'agent architecte (async) | 202 / 400 / 404 / 429 |
| PATCH | `/api/vs/visuals/[id]/validate` | Valider / invalider un visuel | 200 / 404 |
| GET | `/api/vs/rooms/[id]/visuals` | Lister l'historique des visuels d'une pièce | 200 / 404 |

### Structure de répertoire recommandée (Next.js App Router)

```
app/
  vs/
    page.tsx                          ← Dashboard projets
    projects/
      [id]/
        upload/page.tsx               ← Étape 1
        lots/page.tsx                 ← Étape 2
        rooms/page.tsx                ← Étape 3
        visuals/page.tsx              ← Étape 4

api/
  vs/
    projects/
      route.ts                        ← GET + POST
      [id]/
        route.ts                      ← GET + PATCH
        plans/route.ts                ← GET + POST
        extract/route.ts              ← POST
        extraction/route.ts           ← GET (polling)
        lots/
          route.ts                    ← GET + POST
          validate/route.ts           ← POST
    lots/
      [id]/
        route.ts                      ← PATCH + DELETE
        rooms/
          route.ts                    ← GET + POST
          validate/route.ts           ← POST
    rooms/
      [id]/
        route.ts                      ← PATCH + DELETE
        photos/route.ts               ← POST
        generate/route.ts             ← POST
        visuals/route.ts              ← GET
    plans/[id]/route.ts               ← DELETE
    photos/[id]/route.ts              ← DELETE
    visuals/
      [id]/
        status/route.ts               ← GET (polling)
        iterate/route.ts              ← POST
        validate/route.ts             ← PATCH
```

## 10. Checklist couverture user journey

| Parcours | Couvert par | Statut |
|---|---|---|
| Création projet | US-VS-01 | OK |
| Upload plans | US-VS-02 | OK |
| Lancement analyse IA | US-VS-03 | OK |
| Visualisation lots proposés | US-VS-06 | OK |
| Ajustement zones lots | US-VS-07 | OK |
| Validation lots → étape 3 | US-VS-08 | OK |
| Visualisation pièces proposées | US-VS-13 | OK |
| Modification type de pièce | US-VS-14 | OK |
| Validation pièces → étape 4 | US-VS-15 | OK |
| Dépôt photo brute | US-VS-19 | OK |
| Sélection style + génération | US-VS-20 | OK |
| Itération agent architecte | US-VS-21 | OK |
| Validation visuel final | US-VS-22 | OK |
| Dashboard liste projets | Non spécifié — V1 simple, hors scope user stories | Exclu V1 (simple liste GET /api/vs/projects) |
| Inscription / Auth | N/A — V1 sans auth | Exclu V1 (décision fondateur) |
| Paiement / Abonnement | N/A — V1 sans paiement | Exclu V1 (décision fondateur) |
| Export PDF dossier | N/A — V1 sans PDF | Exclu V1 (décision fondateur) |
| Suppression de compte | N/A — V1 sans auth | Exclu V1 |
| Export données RGPD | N/A — V1 sans auth | Exclu V1 — à traiter en V2 avec l'auth |
| Fusion de lots | Non spécifié — interaction avancée | Exclu V1 (drag/resize suffit pour 90% des cas) |
| Séparation de lot | Non spécifié — interaction avancée | Exclu V1 |

## 11. Questions ouvertes pour le fondateur

Avant implémentation, les décisions suivantes doivent être confirmées :

1. **Nombre de styles visuels en V1** : 12 styles curatés documentés ci-dessus. À confirmer ou réduire (8 styles minimum recommandé pour la crédibilité de l'outil).
2. **Stack Next.js confirmée ?** : L'existant est en Next.js, continuer sur Next.js 16 App Router est la recommandation. Confirmer.
3. **Rate limits** : Les limites documentées (10 générations/heure, 5 extractions/min) sont des estimations basées sur les coûts OpenAI. À valider selon la politique de coût V1.
4. **Fusion / séparation de lots** : Exclu V1. Confirmer que drag/resize des zones couvre 90% des besoins terrain.
5. **Modèle de données partagé** : Les tables `vs_` sont dans la même instance PostgreSQL que les autres sites Versi. Confirmer l'isolation acceptable ou préférer une instance séparée.

## 12. Handoff

---
**Handoff → @ux**
- Fichiers produits : `/home/user/Versi/docs/product/vs-functional-specs.md`
- Décisions prises : workflow 4 étapes (Upload → Lots → Pièces → Visuels), canvas HTML5, 12 styles curatés, polling toutes les 5s pour la génération, rate limit 10 générations/heure
- Points d'attention : étape 2 et 3 reposent sur un canvas HTML5 avec overlays colorés — les wireframes doivent spécifier les 5 états UI par écran (Gate G21), les affordances de drag/resize, et la navigation entre étages (sélecteur d'étage si > 1 plan). Étape 4 : UI de comparaison avant/après + historique scroll horizontal des itérations.

**Handoff → @fullstack**
- Fichiers produits : `/home/user/Versi/docs/product/vs-functional-specs.md`
- Décisions prises : Next.js 16 App Router confirmé, tables `vs_` PostgreSQL, Object Storage Replit, modèles gpt-4.1 vision + gpt-image-1.5, polling GET pour les opérations async
- Points d'attention : réutiliser `plan-extractor.ts`, `architect-agent.ts` et `schemas.ts` existants. Refaire `ProStepper.tsx` (4 étapes), adapter `PlanEditor.tsx` (support fusion/polygones), jeter `ProPaymentGate.tsx` et `description-generator.ts`. Structure de routes API documentée en section 9. Débounce 1s sur les PATCH de zones (opération fréquente, 60/min max).

**Handoff → @design**
- Fichiers produits : `/home/user/Versi/docs/product/vs-functional-specs.md`
- Décisions prises : palette overlays (10 couleurs distinctes avec opacity 40%), couleurs Versi (charcoal/stone/cream/white-off), canvas HTML5 sans lib externe
- Points d'attention : définir les 10 couleurs d'overlay (lots + pièces) dans `design-tokens.json`. Créer les previews visuels pour les 12 styles curatés (screenshots illustratifs pour la grille de sélection). Les 5 états UI de chaque canvas (loading skeleton, état vide, état erreur) ont besoin d'une spec visuelle.
---
