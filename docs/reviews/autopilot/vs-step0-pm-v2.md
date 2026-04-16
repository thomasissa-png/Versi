# Re-audit @product-manager v2 — Dashboard Versi Studio Étape 0

| # | Critère | v1 | v2 | Justification |
|---|---|---|---|---|
| C1 | Specs respectées | 8/10 | 8/10 | US-VS-01 formalisée dans `vs-functional-specs.md` (lignes 82-162) — le formulaire de création et ses validations sont spécifiés. Deux divergences spec/code subsistent : (a) message erreur adresse spec = "L'adresse est obligatoire (minimum 5 caractères)", code = "Saisis une adresse complète pour continuer." ; (b) limite surface spec = 10–9999 m², code = 0–100 000 m². US-VS-00 (listage dashboard) toujours absente des specs. Score stable. |
| C2 | User stories couvertes | 7/10 | 7.5/10 | Correction R1 : empty state avec CTA "+ Nouvelle opération" (ligne 159) — parcours création depuis état vide opérationnel. Correction R2 : H2 "Nouvelle opération" + sous-titre contextuel (lignes 246-247) — formulaire contextualisé. Correction R6 : validation surface_totale côté client (ligne 208 : `surfaceParsed < 0 || surfaceParsed > 100000`). Résiduel : pas de toast de confirmation post-création (redirection directe ligne 77), double-clic sur "Créer" non protégé (pas de debounce). |
| C3 | 5 états UI (Gate G21) | 9/10 | 9/10 | Pas de régression. Les 5 états du dashboard principal sont fonctionnels. Correction R1 améliore l'état vide (CTA présent). État loading du formulaire reste partiel : bouton disabled + "Création…" sans spinner SVG. Non bloquant. |
| C4 | KPI mesurable | 6/10 | 6/10 | Aucune correction appliquée. Zéro event analytics dans le code. `project_created`, `dashboard_viewed`, `project_card_clicked` absents. KPI North Star non mesurable. Hors scope des 6 corrections mais dette technique réelle. |
| C5 | Edge cases | 6/10 | 7/10 | Correction R3 : badge statut avec `STATUS_COLORS` complet — visuel statut fonctionnel. Correction R6 : validation surface côté client. Résiduels non corrigés : adresse longue sans `truncate` sur `<h3>` ProjectCard (ligne 390), pas de limite sur le GET `/api/vs/projects` (pas de `?limit=50`). |

**Score v2** : 7.5/10

**Verdict** : GO CONDITIONNEL — parcours création fonctionnel, 5 états UI présents, 6 corrections v1 appliquées. Quatre points résiduels ouverts dont deux non-conformités spec/code (registre message + limites surface) et un point structurel (analytics).

---

## Vérifications fonctionnelles

**5 états UI couverts — gate G21 : PASS (partiel sur formulaire)**

Dashboard principal (`/vs`) :
- Défaut (header + bouton "Nouvelle opération") : lignes 83–102 — PASS
- Loading (spinner centré + "Chargement…") : lignes 115–120 — PASS
- Vide (icône bâtiment + message + CTA "+ Nouvelle opération") : lignes 136–164 — PASS (amélioré v2)
- Erreur (banner rouge + bouton "Réessayer") : lignes 122–133 — PASS
- Succès (grille de ProjectCards) : lignes 166–173 — PASS

Formulaire CreateProjectForm (état loading) : PARTIEL — bouton disabled + texte "Création…" sans spinner visuel. La spec US-VS-01 exige "Bouton 'Créer' remplacé par spinner, champs disabled" — les champs ne sont pas disabled pendant la soumission.

**Flow utilisateur Thomas cohérent : PASS**

Parcours `Dashboard → formulaire inline → POST /api/vs/projects → redirection /vs/projects/[id]/upload` cohérent avec la spec. Deux points d'entrée au formulaire : bouton header + CTA état vide. Redirection post-création immédiate sans toast de confirmation (comportement différent de la spec qui mentionne "toast vert Projet créé").

**Critères d'acceptation vérifiables : PASS partiel**

Deux critères d'acceptance non conformes entre spec et implémentation :
1. Message erreur adresse : spec = `"L'adresse est obligatoire (minimum 5 caractères)"`, code ligne 198 = `"Saisis une adresse complète pour continuer."` — registre tutoiement + wording différent
2. Limite surface_totale : spec = 10–9999 m², code ligne 208 = `surfaceParsed < 0 || surfaceParsed > 100000` — 0 m² et jusqu'à 100 000 m² sont acceptés sans erreur

Ces divergences rendent deux critères d'acceptance non testables tels qu'écrits dans `vs-functional-specs.md`.

**Traçabilité user stories : PASS partiel**

US-VS-01 (créer un projet) : couverte par le code — formulaire, champs, validation, payload POST, redirection conformes sauf les deux divergences ci-dessus. US-VS-00 (lister les projets, états du dashboard) : absente des specs — le listage et la navigation depuis une carte n'ont pas de user story de référence pour @qa.

---

## Points résiduels (corrections exactes)

### P1 — Registre et wording du message d'erreur adresse (non-conformité spec)

Fichier : `versi-studio/src/app/vs/page.tsx`, ligne 198

```tsx
// Avant (tutoiement, wording différent de la spec)
setError("Saisis une adresse complète pour continuer.");

// Après (conforme spec US-VS-01 + vouvoiement cohérent avec ligne 235)
setError("L'adresse est obligatoire (minimum 5 caractères).");
```

Note : ligne 235 utilise le vouvoiement ("Vérifiez votre connexion"). Unifier en vouvoiement sur l'ensemble du formulaire.

### P2 — Divergence limites surface_totale entre spec et code

La spec US-VS-01 fixe 10–9999 m². Le code valide 0–100 000 m². L'une des deux est à corriger.

Option A — corriger le code pour correspondre à la spec :
```tsx
// Ligne 208
if (surfaceParsed !== null && (surfaceParsed < 10 || surfaceParsed > 9999)) {
  setError("Surface invalide (10 à 9 999 m²).");
  return;
}
```

Option B — mettre à jour la spec si 100 000 m² est intentionnel (grands immeubles). Thomas peut traiter des immeubles de grande surface. **Recommandation : valider avec Thomas, puis corriger la spec ou le code selon la réponse.**

### P3 — Truncation adresse longue sur ProjectCard

Fichier : `versi-studio/src/app/vs/page.tsx`, ligne 390

```tsx
// Avant
<h3 className="text-base font-medium text-text-default">
  {project.adresse}
</h3>

// Après
<h3 className="text-base font-medium text-text-default truncate max-w-sm">
  {project.adresse}
</h3>
```

### P4 — Events analytics absents (KPI North Star non mesurable)

Trois events à ajouter dans `versi-studio/src/app/vs/page.tsx` :

```tsx
// Dans useEffect, après setProjects(json.data) — ligne ~57
// analytics.track('dashboard_viewed', { project_count: json.data.length });

// Dans handleProjectCreated, avant router.push — ligne ~77
// analytics.track('project_created', { type_bien: project.type_bien, has_surface: project.surface_totale !== null });

// Dans ProjectCard onClick, avant router.push — ligne ~381
// analytics.track('project_card_clicked', { project_id: project.id, status: project.status });
```

Si le service analytics n'est pas encore implémenté, ajouter des `console.log('[analytics]', ...)` en attendant — les events doivent exister dans le code pour que @data-analyst puisse construire le tracking-plan sur des events réels.

### P5 — US-VS-00 manquante dans les specs (traçabilité @qa)

Fichier : `docs/product/vs-functional-specs.md`

Ajouter une section avant la section 3 :

```markdown
## 0. Dashboard — Mes opérations

**Écran** : `/vs`
**Persona** : Thomas
**Job-to-be-done** : En tant que Thomas, je veux voir toutes mes opérations en cours afin de reprendre le travail là où je me suis arrêté.

### 5 états UI (Gate G21)
| État | Comportement | Message/Affichage |
|---|---|---|
| Défaut | Header + bouton "Nouvelle opération", appel API en cours | — |
| Loading | Spinner centré | "Chargement…" |
| Vide | Icône bâtiment + message + CTA | "Aucune opération pour l'instant. Créez votre première opération pour commencer." + bouton "+ Nouvelle opération" |
| Erreur | Banner rouge + bouton retry | Texte d'erreur + "Réessayer" |
| Succès | Grille de ProjectCards triée par date desc | Chaque carte : adresse, type_bien, surface, badge statut, date |
```

Cette section est nécessaire pour que @qa puisse référencer le dashboard dans la matrice de traçabilité.

---

## Bilan des 6 corrections v1

| Correction | Description | Statut v2 |
|---|---|---|
| R1 | Empty state vouvoyé + CTA "+ Nouvelle opération" | APPLIQUÉ (ligne 154-163) |
| R2 | H2 formulaire + sous-titre contextuel | APPLIQUÉ (lignes 246-247) |
| R3 | Badge statut avec mapping couleurs | APPLIQUÉ (lignes 32-38) |
| R4 | Sous-titre H1 orienté bénéfice business | APPLIQUÉ (lignes 86-88) |
| R5 | Message d'erreur vouvoyé | PARTIELLEMENT APPLIQUÉ — ligne 235 vouvoyé mais ligne 198 toujours tutoiement |
| R6 | Validation surface_totale côté client | APPLIQUÉ avec divergence spec (0–100 000 vs spec 10–9999) |

**6/6 corrections présentes dans le code. 2/6 avec divergence résiduelle (R5 registre, R6 limites).**

---

## Pourquoi 7.5 et pas 9

C4 (analytics) à 6/10 plafonne le score global. Sans events de tracking, le KPI North Star est structurellement non mesurable depuis le dashboard — c'est une dette produit, pas juste technique. Les deux divergences spec/code (P1, P2) sont des non-conformités qui rendent deux critères d'acceptance non testables par @qa. Ces trois points constituent le plancher du score.

Pour atteindre 9/10 : P1 + P4 obligatoires. P2 nécessite une décision Thomas. P3 et P5 sont des polissages de robustesse.

---

**Handoff → @qa**

- Fichier produit : `/home/user/Versi/docs/reviews/autopilot/vs-step0-pm-v2.md`
- Score v2 : 7.5/10 (progression +0.3 par rapport à v1 7.2/10)
- 6/6 corrections v1 appliquées dans le code (2 avec divergence résiduelle)
- Points bloquants pour les tests E2E :
  1. P1 — message erreur adresse non conforme à la spec (registre + wording) : critère d'acceptance non testable en l'état
  2. P2 — limites surface_totale à trancher (Thomas) avant d'écrire les tests
  3. P5 — US-VS-00 absente : le dashboard de listing n'a pas de user story parent pour la matrice de traçabilité
- Points non bloquants (à corriger avant production) : P3 (truncation), P4 (analytics)
- Verdict : GO CONDITIONNEL — les 5 états UI sont présents et le parcours création fonctionne. Résoudre P1 + P5 avant test E2E complet.
