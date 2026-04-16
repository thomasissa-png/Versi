# Re-audit @product-manager v2 — Dashboard Versi Studio Étape 0

| # | Critère | v1 | v2 | Justification |
|---|---|---|---|---|
| C1 | Specs respectées | 8/10 | 8/10 | Pas de régression. La spec US-VS-01 fixe la validation adresse à "minimum 5 caractères" avec message "L'adresse est obligatoire (minimum 5 caractères)" — le code affiche "Saisis une adresse complète pour continuer." : divergence message/spec non corrigée. La surface_totale est validée 0–100 000 m² dans le code alors que la spec dit 10–9999 m² : divergence silencieuse. Dashboard (US-VS-00) toujours absent des specs. Score stable. |
| C2 | User stories couvertes | 7/10 | 7.5/10 | Correction R1 : empty state ajoute le CTA "+ Nouvelle opération" (ligne 159) — améliore l'accessibilité du parcours création depuis l'état vide. Correction R2 : H2 "Nouvelle opération" + sous-titre contextuel (lignes 246-247) réduit l'ambiguïté du formulaire. Résiduel : le message d'erreur adresse reste "Saisis une adresse complète" (tutoiement) alors que la spec exige "L'adresse est obligatoire (minimum 5 caractères)". Double-clic sur "Créer l'opération" non protégé (pas de debounce documenté dans le code). |
| C3 | 5 états UI | 9/10 | 9/10 | Pas de régression, pas d'amélioration sur ce critère. Les 5 états Dashboard restent présents (loading/vide/erreur/succès/défaut). L'état loading du formulaire reste partiel (bouton disabled + texte "Création…" mais pas de spinner). L'état vide corrigé (CTA présent). Point neutre : la correction du CTA dans l'état vide améliore l'état vide fonctionnellement mais pas les états manquants du formulaire. |
| C4 | KPI mesurable | 6/10 | 6/10 | Aucune correction appliquée sur ce critère. Zéro event analytics dans le code (pas de `project_created`, `dashboard_viewed`, `project_card_clicked`). Le KPI North Star "nombre de lots traités" est toujours non mesurable depuis le dashboard. Score inchangé — c'était hors scope des 6 corrections. |
| C5 | Edge cases | 6/10 | 7/10 | Correction partielle : validation surface_totale ajoutée (ligne 208 : `surfaceParsed < 0 \|\| surfaceParsed > 100000`). Gain réel sur le cas "valeur négative ou aberrante". Résiduel : adresse longue sans truncation CSS sur le `<h3>` du ProjectCard (ligne 390) — toujours pas de `truncate` ou `line-clamp`, risque visuel sur adresse > 60 chars. Pas de pagination (toujours pas de `?limit=50`). |

**Score v2** : 7.5/10
**Verdict** : GO CONDITIONNEL

---

## Vérifications fonctionnelles

**5 états UI couverts — gate G21 : PASS partiel**

Les 5 états du Dashboard principal sont présents et fonctionnels :
- Défaut (header + bouton "Nouvelle opération") : ligne 83–102 — PASS
- Loading (spinner centré) : lignes 115–120 — PASS
- Vide (icône + message + CTA "+ Nouvelle opération") : lignes 136–164 — PASS (amélioré v2)
- Erreur (banner rouge + "Réessayer") : lignes 122–133 — PASS
- Succès (grille de ProjectCards) : lignes 166–173 — PASS

État loading du formulaire CreateProjectForm : PARTIEL — bouton disabled + "Création…" sans spinner visuel dans le formulaire. Non bloquant mais incomplet par rapport à la spec US-VS-01 ("Bouton 'Créer' remplacé par spinner, champs disabled").

**Flow utilisateur Thomas cohérent : PASS**

Le parcours `Dashboard → Formulaire inline → Redirection /vs/projects/[id]/upload` est cohérent avec la spec. Le bouton "Nouvelle opération" en header + CTA dans l'état vide assurent deux points d'entrée au formulaire. La redirection post-création est immédiate (pas de toast de confirmation — voir résiduel C2).

**Critères d'acceptation vérifiables : PASS partiel**

Les critères de la spec US-VS-01 sont en grande majorité couverts. Deux divergences détectées entre spec et implémentation :
1. Message erreur adresse : spec exige `"L'adresse est obligatoire (minimum 5 caractères)"`, code produit `"Saisis une adresse complète pour continuer."` (registre tutoiement + message différent)
2. Limite surface_totale : spec fixe 10–9999 m², code valide 0–100 000 m²

Ces divergences rendent deux critères d'acceptance non vérifiables tels que définis dans la spec.

**Traçabilité user stories : PASS partiel**

US-VS-01 (créer un projet) : couverte par le code — le formulaire, les champs, la validation, le payload POST, la redirection correspondent. US-VS-00 (lister les projets) : toujours absente des specs `vs-functional-specs.md` — le dashboard de listing n'a pas de user story de référence pour la matrice de traçabilité @qa.

---

## Points résiduels

Les points suivants n'ont pas été couverts par les 6 corrections v1→v2 et restent ouverts :

**P1 — Registre incohérent dans le formulaire (bloquant pour la cohérence UX)**
- Ligne 198 : `setError("Saisis une adresse complète pour continuer.")` → tutoiement
- Ligne 235 : `setError("La création a échoué. Vérifiez votre connexion et réessayez.")` → vouvoiement
- Même formulaire, deux registres différents. Correction : `"Saisis"` → `"L'adresse est obligatoire (minimum 5 caractères)"` pour respecter la spec ET uniformiser en vouvoiement, ou unifier en tutoiement si c'est le registre choisi pour Thomas.

**P2 — Divergence spec/code sur la limite surface_totale**
- Spec US-VS-01 : "10–9999 m²"
- Code ligne 208 : valide 0–100 000 m²
- Aucune validation de minimum dans le code (0 est accepté si non null). Correction : `surfaceParsed < 10 || surfaceParsed > 9999` — ou mettre à jour la spec si la limite 100 000 est intentionnelle (immeuble de grande surface possible).

**P3 — Truncation adresse longue absente dans ProjectCard**
- Ligne 390 : `<h3 className="text-base font-medium text-text-default">{project.adresse}</h3>` — pas de `truncate` ni `line-clamp-1`
- Une adresse de 150 chars fait "exploser" la carte visuellement. Correction : ajouter `truncate` ou `line-clamp-1` sur le `<h3>`.

**P4 — Events analytics absents (KPI non mesurable)**
- Aucun appel analytics dans le code. Sans ces events, le KPI North Star est non mesurable.
- Correction minimale pour la V1 : `analytics.track('dashboard_viewed')` dans le useEffect, `analytics.track('project_created')` dans `handleProjectCreated`.

**P5 — US-VS-00 manquante dans les specs**
- Le dashboard (listage des projets) n'a pas de user story formelle dans `vs-functional-specs.md`.
- Sans US-VS-00, @qa ne peut pas construire la matrice de traçabilité pour le listage, les statuts affichés, ou la navigation depuis une carte.

---

## Handoff

**Handoff → @qa**

- Fichier produit : `/home/user/Versi/docs/reviews/autopilot/vs-step0-pm-v2.md`
- Score v2 : 7.5/10 (progression de +0.3 — corrections partiellement efficaces)
- Améliorations confirmées : CTA empty state, H2 formulaire, badge statut couleurs, sous-titre H1, validation surface_totale
- Corrections incomplètes : message erreur adresse (registre + wording divergent de la spec), limite surface (spec vs code)
- Points bloquants pour @qa avant test E2E :
  1. P1 — Unifier le registre des messages d'erreur du formulaire (spec dit "L'adresse est obligatoire (minimum 5 caractères)")
  2. P3 — Truncation adresse sur ProjectCard (risque visuel reproductible avec adresse > 60 chars)
  3. P5 — US-VS-00 à créer dans `vs-functional-specs.md` avant construction de la matrice de traçabilité
- Verdict : GO CONDITIONNEL — les 5 états UI sont présents, le parcours creation→redirect fonctionne. P1 et P2 sont des non-conformités spec/code à corriger dans la session.
