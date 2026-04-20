# Audit @product-manager — Etape 0 Dashboard

| # | Critere | Note /10 | Justification | Correction exacte (si < 10) |
|---|---|---|---|---|
| C1 | Specs respectees | 8/10 | Le dashboard couvre le workflow central des specs : liste des projets (US dashboard implicite), création inline avec les champs adresse/type_bien/surface_totale (cohérents avec `CreateProjectPayload`), redirection vers `/vs/projects/{id}/upload` apres creation (conforme etape 1 workflow 4 etapes). Le statut affiché via `STATUS_LABELS` couvre les 5 statuts specs. Manque : aucune user story formelle "US-VS-00 — Lister les projets" dans les specs lues (sections 1 et 2 couvrent evaluation du code + workflow, pas le dashboard lui-meme). Le dashboard n'a pas de spec dédiée dans les sections 1-2. | `docs/product/vs-functional-specs.md` : ajouter une section "## 0. Dashboard — Mes opérations" avec US-VS-00 formalisée (lister projets, créer projet, voir statuts). |
| C2 | User stories couvertes | 7/10 | Création projet : couverte (formulaire, 3 champs, validation adresse >= 5 chars, POST /api/vs/projects). Listage projets : couvert (GET /api/vs/projects, grille de cartes). Statuts : couverts (5 statuts labels). Manques : (1) pas de validation côté client sur surface_totale (valeur negative ou 0 acceptée — `min={1}` en HTML mais pas en JS avant submit) ; (2) pas de feedback de succès après création (le formulaire disparait et on est redirigé mais aucun toast/message confirme à Thomas que l'opération a été créée) ; (3) pas d'action "supprimer" ou "archiver" un projet depuis le dashboard. | `page.tsx` ligne 188 : ajouter `if (surfaceTotale && parseInt(surfaceTotale, 10) < 1)` avant le payload. Ajouter un toast de confirmation creation dans `handleProjectCreated`. |
| C3 | 5 etats UI | 9/10 | Defaut (header + bouton, pas de loading) : PRESENT ligne 74-88. Loading (spinner centré + texte "Chargement...") : PRESENT lignes 102-107. Vide (icone + message + invitation a créer) : PRESENT lignes 122-145. Erreur (banner rouge + bouton "Réessayer") : PRESENT lignes 110-120. Succes (liste de ProjectCards) : PRESENT lignes 148-154. Point faible : l'état loading du formulaire de création (submitting) est partiel — le bouton se désactive et affiche "Création..." mais aucun feedback visuel global (pas de spinner dans le formulaire, pas de skeleton). Ce n'est pas bloquant mais degradé par rapport aux specs section 3. | `page.tsx` lignes 306-318 : ajouter un spinner SVG à côté du texte "Création..." pendant `submitting`. |
| C4 | KPI mesurable | 6/10 | Les projets sont listés et les statuts sont affichés. Mais : (1) aucun event analytics déclenché — `project_created`, `dashboard_viewed`, `project_card_clicked` sont absents du code ; (2) le KPI North Star des specs est "nombre de lots traités (upload plan → visuel final)" — le dashboard ne trackle pas la progression par etape ni le funnel de complétion ; (3) pas de compteur de projets affiché ("X opérations en cours") qui permettrait de mesurer l'engagement. Sans events, @data-analyst ne peut pas construire le tracking-plan. | Ajouter `analytics.track('dashboard_viewed', { project_count: projects.length })` dans le useEffect. Ajouter `analytics.track('project_created', { type_bien, surface_totale })` dans `handleProjectCreated`. Ajouter `analytics.track('project_card_clicked', { project_id, status })` dans `ProjectCard`. |
| C5 | Edge cases | 6/10 | 0 projet : géré (état vide avec icone + message). Erreur réseau : géré (banner + retry). AbortError au démontage : géré (lignes 54, 57). Manques critiques : (1) 100 projets — pas de pagination ni de limite d'affichage : le GET /api/vs/projects renvoie tout, l'affichage est une grille infinie. Avec 100 projets = performance dégradée et UX confuse pour Thomas ; (2) nom très long (adresse 200+ chars) — le `ProjectCard` affiche `project.adresse` sans truncation CSS (`truncate` ou `line-clamp`), risque de carte "explosée" ; (3) caractères spéciaux dans l'adresse — aucune sanitization côté client, les specs ne l'interdisent pas non plus mais le comportement n'est pas documenté ; (4) double-clic sur "Nouvelle opération" — le state toggle fonctionne mais un double-clic rapide sur "Créer l'opération" pourrait soumettre 2 fois si le `setSubmitting` n'est pas synchrone (risk faible mais réel). | `ProjectCard` ligne 360 : ajouter `className="truncate"` sur le h3. `DashboardPage` : limiter l'affichage à 50 projets côté API ou ajouter un "Voir plus". Ligne 191 : `api/vs/projects?limit=50`. |

**Score global** : 7.2/10

**Corrections prioritaires** :

1. `docs/product/vs-functional-specs.md` — Ajouter section "## 0. Dashboard" avec US-VS-00 formalisée (lister, créer, statuts). Sans cette US, le dashboard n'a pas de spec de référence pour les tests @qa.
2. `versi-studio/src/app/vs/page.tsx` ligne 360 — Ajouter `className="truncate max-w-xs"` sur le `<h3>` de `ProjectCard` pour éviter l'explosion visuelle sur adresses longues.
3. `versi-studio/src/app/vs/page.tsx` lignes 67-70 — Ajouter 3 events analytics dans `handleProjectCreated`, le useEffect et `ProjectCard` (voir C4). Sans ces events, le KPI North Star est impossible a mesurer.
4. `versi-studio/src/app/vs/page.tsx` ligne 45 — Ajouter `?limit=50` au GET pour prévenir le cas 100+ projets.

---

**Handoff → @qa**

- Fichier produit : `/home/user/Versi/docs/reviews/autopilot/vs-step0-pm.md`
- Score : 7.2/10 (honnête — dashboard fonctionnel mais specs dashboard absentes et KPI non trackés)
- Top 3 à corriger avant test E2E :
  1. Truncation adresse longue dans ProjectCard (C5 — risque visuel)
  2. Events analytics manquants (C4 — KPI non mesurable)
  3. US-VS-00 à formaliser dans les specs (C2 — pas de user story de référence pour la matrice de traçabilité)
- Verdict : GO CONDITIONNEL — les 5 états UI sont présents, la création et le listage fonctionnent, mais l'absence d'analytics et la spec dashboard manquante bloquent la traçabilité @qa complète.

