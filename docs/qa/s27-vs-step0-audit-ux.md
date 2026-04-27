# Audit UX — Versi Studio Étape 0 (liste projets `/vs`) — s27

**Date** : 2026-04-27 | **Persona** : Thomas, marchand de biens, 30 plans/semaine, mobile + bureau

---

## 1. Note globale : 3.5/10 — NO-GO

Deux blocages P0 critiques (verbatim Thomas) : zéro suppression/archivage UI, layout mobile inutilisable. Correction obligatoire avant usage terrain.

---

## 2. Critères détaillés

### C1 — Navigation mobile : 2/10

- `ProjectCard` = balise `<button>` full-width, tap target OK en hauteur MAIS `max-w-sm` sur l'adresse tronque à ~384px — illisible sur 375px (iPhone SE)
- Header `flex items-start justify-between` : le bouton "Nouvelle opération" est repoussé à droite, devient un bandeau étroit sur mobile. Taille estimée ~32px hauteur → sous le seuil 44px WCAG
- `CreateProjectForm` : champs `px-md py-sm` → ~36px de hauteur → sous seuil touch 44px
- Aucun `sm:` / `md:` breakpoint dans le JSX → layout desktop/mobile identique, aucune adaptation
- Grade : FAIL mobile (H1 visibilité état, H7 flexibilité expert terrain)

### C2 — Actions supprimer/archiver : 0/10

- `ProjectCard` : UN seul `onClick` → navigation vers `/vs/projects/[id]/upload`. Zéro menu contextuel, zéro icône poubelle, zéro bouton "Archiver"
- API `[id]/route.ts` : GET + PATCH uniquement. **Ni DELETE ni route `archived` n'existent**
- API `projects/route.ts` : GET + POST uniquement. Pas de filtre `status=archived`
- Le schema PATCH accepte les statuts `draft…completed` mais **"archived" n'est pas dans `VALID_STATUSES`**
- Résultat : Thomas ne peut ni supprimer ni archiver — confirmation technique du verbatim s27

### C3 — Découvrabilité actions destructives : 0/10

- Règle fondateur s22 : "boutons UI permanents, visibles dès l'arrivée sur la page"
- Aucun point d'entrée visible pour gérer le cycle de vie d'un projet (archiver, renommer, supprimer)
- Le `<button>` carte = zone de clic unique → conflit entre "ouvrir" et "gérer" (H3 : contrôle utilisateur absent)
- FAIL H6 (reconnaissance) : Thomas doit deviner qu'il n'existe aucune gestion de projet

### C4 — Tri / filtre / recherche : 1/10

- Tri API : `ORDER BY created_at DESC` — non modifiable côté UI
- Aucun filtre par statut, type de bien, date
- Aucun champ de recherche par adresse
- Pour 30 projets/semaine Thomas peut atteindre 150+ projets en 5 semaines → liste flat sans pagination ni filtre = friction critique
- Point positif : les badges statut ("En cours", "Terminé") sont présents mais non cliquables

### C5 — État vide + onboarding : 7/10

- État vide : icône + texte explicatif + CTA "Nouvelle opération" — complet et lisible
- Auto-focus sur le champ adresse à l'ouverture du formulaire : bon pattern
- Retry sur erreur 503 : présent
- Point de friction : le formulaire s'insère inline (push du contenu) — sur mobile, le CTA "Créer l'opération" peut tomber hors viewport sans scroll hint
- Pas d'anglicisme visible (règle s15 respectée : "Déposez" n'apparaît pas ici)

---

## 3. Top 3 BLOQUANTS P0

**P0-A : Suppression / archivage absents côté API ET UI** (verbatim Thomas : "impossible de supprimer/archiver")
- API `[id]/route.ts` : ni DELETE ni champ `archived_at` / statut `"archived"`
- UI : aucun bouton visible sur la carte projet
- Impact : Thomas accumule des opérations test sans pouvoir nettoyer — liste pollue le travail terrain

**P0-B : Layout mobile inutilisable** (verbatim Thomas : "sur mobile c'est très peu navigable")
- Bouton "Nouvelle opération" header : taille estimée ~32px, inaccessible au pouce
- Formulaire création : champs ~36px hauteur → erreurs de saisie sur terrain
- Aucun breakpoint responsive dans le composant → comportement bureau copié-collé sur 375px

**P0-C : Zéro gestion du cycle de vie projet** (conséquence directe P0-A)
- PATCH API accepte les 5 statuts mais pas `"archived"` → pas d'archivage sans changement DB + API + UI
- Pas de pagination : à 30 projets/semaine, la liste devient ingérable en quelques semaines
- Pas de filtre "Terminés" pour les cacher du flux de travail actif

---

## 4. Plan correctif pour 10/10

### 4a — P0-A : Archivage/suppression (priorité absolue)

**Brief @fullstack :**
1. `versi-studio/src/app/api/vs/projects/[id]/route.ts` — ajouter `DELETE` handler : `DELETE FROM vs_projects WHERE id = $1 RETURNING id`. Réponse 200 `{ success: true }` ou 404.
2. Ajouter `"archived"` dans `VALID_STATUSES` + colonne `archived_at TIMESTAMPTZ` en DB (migration). PATCH avec `status: "archived"` met à jour `archived_at = NOW()`.
3. GET `/api/vs/projects` : ajouter `WHERE archived_at IS NULL` par défaut + query param `?include_archived=true`.
4. `page.tsx` — `ProjectCard` : ajouter menu contextuel (3 points `…`) visible en permanence sur chaque carte. Menu contient : "Archiver" (soft delete, confirmation modale) + "Supprimer" (hard delete, confirmation "Cette action est irréversible"). Pattern : dropdown positionné `absolute top-0 right-0`.

### 4b — P0-B : Responsive mobile (priorité 1)

**Brief @fullstack :**
1. Header `page.tsx` : passer en `flex-col sm:flex-row` + bouton "Nouvelle opération" `w-full sm:w-auto py-md` (min 44px hauteur sur mobile).
2. `CreateProjectForm` : champs `py-[10px]` minimum (44px avec padding interne) sur tous les inputs et selects.
3. `ProjectCard` : supprimer `max-w-sm` sur l'adresse, laisser `truncate` sur `w-full`. Bloc droite (statut + date) : `flex-shrink-0 ml-sm`.
4. Tester sur viewport 375px : chaque élément interactif ≥ 44px hauteur.

### 4c — P0-C : Tri / filtre / pagination (priorité 2)

**Brief @fullstack :**
1. Ajouter barre filtre statut au-dessus de la liste : chips "Tous | En cours | Terminés". Filtre client-side sur `projects` state (pas d'appel API supplémentaire).
2. Ajouter champ recherche `<input placeholder="Rechercher une adresse…">` — filtre client-side sur `project.adresse`.
3. Pagination client-side : afficher 20 projets par page avec "Charger plus" (pas de navigation).
4. Option "Voir les archives" (lien texte discret) → recharge avec `?include_archived=true`.

---

## Tests UX — Étape 0

| Test | Critère | Statut |
|---|---|---|
| Thomas peut archiver une opération sans aide | Bouton visible sur carte, confirmation modale | FAIL |
| Thomas peut supprimer une opération test | DELETE API + UI visible | FAIL |
| Touch targets ≥ 44px mobile 375px | Bouton header + champs formulaire | FAIL |
| Recherche parmi 50+ projets | Champ recherche présent | FAIL |
| État vide → création → redirection | Flow complet en 1 action | PASS |
| Accessibilité clavier (Tab + Enter) | Focus visible sur cartes et formulaire | PASS (partiel) |
| Anglicismes UI (règle s15) | grep upload/download/feedback | PASS |
