# Audit UX — Versi Studio Étape 0 `/vs` — Round 3 (post-fixes R2)

**Date** : 2026-04-27 | **Commits analysés** : `f647aa8` + `59c473d`

---

## 1. Note globale : 8.5/10 — Δ +5/10 vs R1 (3.5/10)

Les 3 P0 du R1 sont résolus. Quelques frictions mineures subsistent.

---

## 2. Critères détaillés (mêmes 5 critères)

### C1 — Navigation mobile : 8/10 (était 2/10)

- PASS : Header `flex-col sm:flex-row` — bouton "Nouvelle opération" `w-full sm:w-auto py-[10px]` — hauteur touch correcte
- PASS : `ProjectCard` padding `p-sm sm:p-xl` — la carte s'adapte à 375px
- PASS : Formulaire création — inputs/selects `py-[10px]` — seuil 44px atteint avec padding interne
- RESIDUEL (mineur) : le bouton kebab `top-2 right-2` — `w-11 h-11` (44px) — conforme. Toutefois sur 375px, chevauchement possible avec le badge statut dans la zone droite de la carte. Non-bloquant.

### C2 — Actions supprimer/archiver : 9/10 (était 0/10)

- PASS : Menu kebab ⋯ `w-11 h-11` permanent sur chaque carte — visible sans interaction préalable
- PASS : `handleArchive` → PATCH `status: "archived"` actif + optimistic update
- PASS : `handleDelete` → DELETE actif + `window.confirm` de protection
- PASS : Erreurs capturées avec message humain + setError
- RESIDUEL (mineur) : `window.confirm` natif — fonctionnel mais rupture visuelle avec le design system. Non-bloquant pour usage terrain.

### C3 — Découvrabilité actions : 8/10 (était 0/10)

- PASS : Bouton ⋯ visible dès l'arrivée, pas conditionnel — règle fondateur s22 respectée
- PASS : Menu role="menu" + aria-haspopup + aria-expanded + fermeture Escape/clic extérieur
- PASS : "Supprimer" en `text-error` — distinction visuelle claire vs "Archiver"
- RESIDUEL : aucun tooltip sur le bouton ⋯ — Thomas discover-mode doit cliquer pour voir les options. Faible friction, non-bloquant.

### C4 — Tri / filtre / recherche : 8/10 (était 1/10)

- PASS : 4 chips filtre statut ("Tous / En cours / Terminés / Archivés") — `aria-pressed` correct
- PASS : Recherche client-side sur `adresse` — `type="search"` + `aria-label`
- PASS : Pagination 20/page avec indicateur "Page X sur Y — N opérations"
- PASS : Reset page automatique au changement de filtre/recherche
- RESIDUEL : filtre "Tous" masque les archivés (ligne 158) — un chip "Archivés" dédié est présent, c'est le bon pattern. OK.
- RESIDUEL (mineur) : pas de tri par date/adresse. Acceptable à ce stade, Thomas peut trouver par recherche.

### C5 — État vide + onboarding : 8/10 (était 7/10)

- PASS : Toast `role="status" aria-live="polite"` post-création — feedback immédiat visible
- PASS : Redirection auto vers `/vs/projects/[id]/upload` après création — flow progressif respecté
- PASS : Auto-focus champ adresse à l'ouverture du formulaire
- PASS : État vide filtré ("Aucune opération ne correspond à votre filtre") distinct de l'état vide global
- PASS : Retry 503 + timeout 10s sur fetch
- RESIDUEL : formulaire inline push le contenu — sur mobile avec clavier ouvert, le CTA "Créer l'opération" peut sortir du viewport. Non-bloquant, Thomas peut scroller.

---

## 3. P0 résiduels

Aucun P0. Les 3 P0 du R1 sont fermés.

**P1 résiduel (non-bloquant) :**
- `window.confirm` Supprimer → remplacer par modale design system (prochaine session)
- Tooltip hover sur bouton ⋯ : "Actions" — 1 ligne de code

---

## 4. Verdict

**GO CONDITIONNEL** — Déployable pour usage terrain Thomas dès maintenant.

Condition : P1 `window.confirm` → modale design system à traiter en session suivante, pas bloquant pour le test utilisateur.
