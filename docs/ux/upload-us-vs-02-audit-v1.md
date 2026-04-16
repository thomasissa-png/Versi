# Audit UX v1 — US-VS-02 Upload des plans
> Agent : @ux | Session : versi-s15 | Date : 2026-04-16
> Persona : Thomas, marchand de biens, 35 ans, 8-12 opérations/an
> Fichier audité : `versi-studio/src/app/vs/projects/[id]/upload/page.tsx`
> Composants : `DropZone.tsx`, `PlanThumbnail.tsx`, `Stepper.tsx`

---

## 1. Résumé exécutif

- Le flow upload est structurellement solide : drag-drop + clic, validation MIME/taille côté client, feedback par fichier, gestion du multi-upload. Le happy path Thomas est couvrable en <3 min.
- **Friction critique P0** : `confirm()` natif ligne 141 (dialog browser bloquant, hors design system, non testable, non accessible en mobile). Doit être remplacé par un modal de confirmation design system.
- **Bug UX P0** : `handleFloorChange` ne persiste pas le `floor_number` (API PATCH non implémentée, optimistic update sans fallback). Thomas peut modifier un étage, croire que c'est sauvegardé, relancer la page et perdre ses modifications.
- **Friction P1** : redirection vers `/lots` (L186) se fait sans feedback de transition — Thomas ne sait pas que "Analyser les plans" a déclenché quelque chose. Aucun loader, aucun toast de succès, pas d'indication que l'analyse IA est en cours.
- **Lacune P1** : le Stepper ne reçoit pas `completedSteps` depuis la page upload — l'historique des étapes complétées n'est jamais affiché. Le composant existe, la prop aussi, mais elle n'est pas alimentée.

---

## 2. Gate G21 — 5 états UI

La spec US-VS-02 exige 5 états UI par écran interactif. Vérification état par état.

| État | Attendu (US-VS-02) | Implémenté | Composant | Verdict |
|---|---|---|---|---|
| **Défaut** | Zone de dépôt vide, texte guidant, CTA parcourir | Oui — DropZone avec bordure dashed, icône upload, "Déposez vos plans ici" + "ou parcourir vos fichiers" | `DropZone.tsx` | PASS |
| **Loading** | Indicateur par fichier en cours d'upload | Partiel — spinner animé + nom de fichier (L289-299). Mais : upload séquentiel (boucle `for`), pas parallèle. La spec exige "chaque fichier a sa propre barre de progression" — ici c'est un indicateur de fichier ACTIF unique, les autres attendent en file sans indicateur. | `page.tsx` L287-299 | FAIL partiel |
| **Vide** | = état défaut. Identique si 0 plan uploadé. | Oui — la DropZone s'affiche seule quand `plans.length === 0`. Commentaire dans le code (L5) le confirme. | `page.tsx` | PASS |
| **Erreur** | Toast rouge par fichier rejeté | Oui — zone d'erreur rouge visible (L241-278 page, L194-199 DropZone). Deux niveaux : erreur DropZone (validation MIME/taille côté client), erreur page (erreur serveur/réseau). Bouton fermeture (×) sur le toast page. | `page.tsx` + `DropZone.tsx` | PASS |
| **Succès** | Grille de miniatures + bouton "Analyser les plans" | Oui — grille grid-cols-2/3/4 (L316), compteur "N plans uploadés", emplacements restants, bouton Analyser (L329-344). | `page.tsx` L301-346 | PASS |

**Verdict G21 : FAIL partiel sur l'état Loading** — l'upload est séquentiel alors que la spec prévoit des uploads parallèles avec barre de progression individuelle (critère d'acceptance L310 : "chaque fichier a sa propre barre de progression"). L'expérience pour Thomas : si il dépose 4 fichiers, il voit un seul spinner qui change de nom à chaque fichier — impossible de distinguer ce qui est en cours de ce qui attend.

**État chargement initial** (bonus, non spécifié dans G21 mais présent) : spinner centré + Stepper visible (L194-205). PASS.

**État projet introuvable** (edge case) : message "Opération introuvable" + lien retour (L207-219). PASS.

---

## 3. Parcours Thomas — Frictions identifiées

**Cognitive walkthrough — premier upload (first-time user Thomas)**

**Étape 1 : Arrivée sur `/vs/projects/[id]/upload`**
1. L'utilisateur sait-il quoi faire ? OUI — "Uploadez vos plans" en H1, instruction courte sous le titre. La DropZone est visuellement centrale.
2. L'action est-elle visible ? OUI — zone dashed avec icône upload clairement identifiable.
3. Le lien but-action est-il clair ? OUI — "Déposez vos plans ici / ou parcourir vos fichiers" est sans ambiguïté.
4. Le feedback est-il immédiat ? OUI — état drag-over (bordure colorée + fond teinté) au survol.

**Étape 2 : Dépôt d'un PDF 4 pages (scénario Thomas scan iPhone)**
1. L'utilisateur sait-il quoi faire ? OUI.
2. Le feedback pendant l'upload est-il clair ? PARTIEL — "Upload de plan_rdc.pdf..." s'affiche. Mais pas de barre de progression en %. Thomas ne sait pas si c'est 2s ou 20s.
3. [FRICTION H1 — Visibilité état système] : à l'étape de l'upload, Thomas ne voit pas de temps estimé ni de % de complétion. Pour un PDF 15 Mo en 4G, l'attente peut être longue sans indication d'avancement réel.

**Étape 3 : Upload terminé, 4 miniatures affichées**
1. L'état succès est-il clair ? OUI — grille de miniatures avec noms de fichiers.
2. Le numéro d'étage est-il compréhensible ? PARTIEL — champ "Étage" avec input numérique. Thomas voit "0, 1, 2, 3" mais pas de mapping explicite "0 = RDC". Un tooltip ou placeholder "0 = RDC" manque.
3. [FRICTION H2 — Correspondance monde réel] : le label "Étage 0" n'est pas le vocabulaire de Thomas. Un marchand de biens dit "RDC" pas "Étage 0". À minima, afficher "Étage 0 — RDC" pour l'étage 0.

**Étape 4 : Thomas veut supprimer un fichier (mauvaise version)**
1. L'action de suppression est-elle visible ? OUI — icône poubelle sur chaque miniature, aria-label correct.
2. Le feedback de confirmation est-il approprié ? NON — `confirm()` natif du navigateur (L141). Dialog système bloquant, style incohérent, texte en dur "Supprimer ce plan ? Cette action est irreversible." (faute typographique : "irreversible" sans accent sur le 1er 'e'). Sur mobile Safari, le dialog peut être bloquant ou masqué selon le contexte.
3. [FRICTION H5 — Prévention erreurs] : la confirmation est là mais le moyen (browser native dialog) est hors-design system et impacte négativement la confiance visuelle.

**Étape 5 : Thomas modifie le numéro d'étage (floor_number)**
1. L'action est-elle visible ? OUI — input numérique dans la miniature.
2. Le feedback est-il immédiat ? OUI — optimistic update instantané côté UI.
3. La persistance est-elle claire ? NON — rien n'indique à Thomas que cette modification ne sera PAS sauvegardée. Il n'y a pas de badge "non sauvegardé", pas de warning, pas de message au reload. Thomas pense que c'est persisté alors que l'API PATCH est absente.
4. [FRICTION H1 — Visibilité état système] : l'état "modification non persistée" est invisible pour l'utilisateur. C'est un mensonge UX.

**Étape 6 : Clic sur "Analyser les plans"**
1. L'action est-elle visible ? OUI — bouton CTA primaire en bas à droite.
2. Le feedback post-clic est-il immédiat ? NON — `handleAnalyze` fait un PATCH silencieux puis `router.push`. S'il y a un délai réseau, le bouton ne change pas d'état (pas de loading state, pas de disabled temporaire). Thomas peut cliquer 2 fois.
3. [FRICTION H1 — Visibilité état système] : aucun feedback entre "clic" et "redirection". L'utilisateur voit une page qui change sans comprendre pourquoi ni si l'analyse a bien démarré.
4. [FRICTION H3 — Contrôle liberté] : une fois "Analyser les plans" cliqué, il n'y a pas de retour possible explicite depuis la page `/lots` vers l'upload. Le Stepper devrait permettre ce retour.

---

## 4. Affordances — Drag-drop, cliquabilité, touch targets

**Drag-drop (DropZone.tsx)**
- Zone de drop : `role="button"`, `tabIndex={0}`, `aria-label` descriptif. Bonne pratique.
- Feedback drag-over : bordure colorée + fond teinté + texte "Relâchez pour déposer". Clair et immédiat.
- Clic → file picker : `onClick → inputRef.current?.click()`. Fonctionne.
- Keyboard : `onKeyDown` sur Enter et Space → déclenche le file picker. WCAG 2.2 conforme.
- État disabled : `opacity-50 cursor-not-allowed` quand `plans.length >= MAX_FILES_PER_PROJECT || uploading`. Correct.

**Problème affordance DropZone** : le texte "ou parcourir vos fichiers" est stylé `text-xs text-muted underline` — un lien textuel sans rôle de lien, sans couleur interactive (juste `underline`). Thomas peut ne pas percevoir que c'est cliquable séparément de la zone. Sur le design system Versi, ce texte devrait être en `text-interactive-primary` avec underline pour signaler l'interactivité.

**Touch targets (mobile)**
- DropZone : `min-h-[200px]` + `p-4xl`. Surface de tap large. PASS.
- Bouton Analyser : `px-2xl py-md` — taille effective probable ~44px de hauteur selon les tokens. À vérifier avec les valeurs de tokens (pas accessibles dans ce code).
- Bouton suppression (PlanThumbnail) : `p-xs` sur une icône `w-4 h-4` (16px). **Surface de tap estimée : ~24-28px maximum**. FAIL — WCAG 2.2 exige 44x44px minimum pour les cibles tactiles. Un marchand de biens utilise souvent son téléphone sur chantier : c'est un vrai problème d'usabilité.
- Input floor_number : `w-12` (~48px) sur `text-xs`. Largeur correcte mais hauteur dépend du padding `px-xs py-2xs` — probablement ~28px. Borderline.

**Affordance "bouton Analyser" quand disabled** : `disabled:opacity-50` quand `plans.length === 0`. Le bouton est présent mais grisé tant qu'aucun plan n'est uploadé. Attention : le bouton n'est rendu que dans le bloc conditionnel `{plans.length > 0}` (L302) — il n'est donc pas visible du tout en empty state. Cohérent mais à documenter : Thomas ne voit pas le CTA avant d'avoir uploadé. Pas de guidage anticipatoire ("Uploadez un plan pour continuer").

---

## 5. Feedback progression — Upload multi-fichiers

**Architecture actuelle** : upload séquentiel dans une boucle `for...of` (L102-127). Les fichiers sont uploadés un par un, pas en parallèle.

**Progression affichée** : `uploadProgress` est un tableau de noms de fichiers en cours. À chaque fin d'upload, le fichier est retiré du tableau (`prev.filter(name => name !== file.name)`). Côté rendu, chaque nom restant dans le tableau affiche un spinner + "Upload de [nom]...".

**Problème** : en pratique, comme l'upload est séquentiel, le tableau `uploadProgress` contient TOUS les noms au départ (L96), mais un seul fichier est réellement en cours d'upload à la fois. Thomas voit donc 4 spinners pour 4 fichiers mais seulement le premier upload est actif — les 3 autres spinners sont trompeurs. Ce n'est pas "4 uploads parallèles avec progression individuelle" comme exigé par la spec (critère d'acceptance L310).

**Ce qui manque :**
- Barre de progression en % par fichier (nécessite XHR avec `onprogress` ou fetch avec ReadableStream, non implémenté)
- Statut distinct par fichier : "en attente", "en cours", "terminé", "erreur"
- Pour un PDF 15 Mo en 4G (scénario Thomas sur chantier), l'upload peut prendre 30-60s sans aucune indication d'avancement réel

**Annulation** : il n'est pas possible d'annuler un upload en cours. Aucun bouton "Annuler", aucun AbortController. Thomas ne peut qu'attendre. Pour un upload réseau instable, c'est une friction significative.

**Ordre des plans** : l'ordre d'affichage dans la grille est l'ordre de réception des réponses API (push dans `newPlans`). Comme l'upload est séquentiel, l'ordre correspond à l'ordre de dépôt. En cas de parallélisation future, l'ordre pourrait devenir aléatoire selon la latence réseau.

**Retry après échec** : un fichier qui échoue (erreur réseau, L121) est signalé dans le toast d'erreur global mais il n'y a pas de bouton "Réessayer" par fichier. La spec (L311) exige un bouton retry individuel. Non implémenté.

---

## 6. Gestion des erreurs — Récupération after-error

**Deux couches d'erreurs** coexistent dans le flow :

**Couche 1 — DropZone (validation client)** : erreurs MIME et taille avant envoi réseau. Affichage dans un bloc `bg-error/10` sous la DropZone. Pas de bouton de fermeture sur cette erreur — elle disparaît uniquement quand un nouveau drop valide est effectué ou quand le composant se remonte. Thomas ne peut pas fermer manuellement cette erreur.

**Couche 2 — Page (erreur serveur/réseau)** : toast rouge avec icône d'alerte et bouton × de fermeture (L258-277). Correct. Contient les erreurs API et les messages d'erreur concaténés (L131-133 : `errors.join(" ")`).

**Problème de concaténation** : si Thomas dépose 3 fichiers et que 2 échouent, le message d'erreur sera `"fichier1.pdf : format non supporté. fichier2.pdf : taille supérieure à 20 Mo."` sur une seule ligne. Difficile à lire, surtout sur mobile. La spec prévoit des toasts séparés par fichier, pas une chaîne concaténée.

**Messages d'erreur — conformité spec** :
- Format non supporté : `"${file.name} : format non supporté. Utilisez PDF, PNG, JPG ou WEBP."` — spec dit "Format non supporté — utilisez PDF, PNG ou JPG". PASS (légère variation acceptable).
- Taille dépassée : `"${file.name} : taille supérieure à 20 Mo."` — spec dit "plan_lourd.pdf dépasse la limite de 20 Mo". PASS (équivalent).
- PDF corrompu : l'API renverrait `CONVERSION_FAILED`, mappé via `json.error` (raw). Le message serait le champ `error` de l'API, pas le message humain prévu par la spec ("Impossible de lire ce PDF — vérifiez qu'il n'est pas corrompu ou protégé par un mot de passe"). Risque d'exposition d'un code technique (`CONVERSION_FAILED`) à Thomas. À vérifier côté API.
- Timeout réseau : catch L121 → `"${file.name} : erreur réseau."` — court mais fonctionnel. Pas de retry button.

**Récupération après erreur** :
- Erreur de validation : Thomas peut immédiatement re-déposer un fichier valide. La DropZone reste active. PASS.
- Erreur serveur fichier individuel : le fichier n'est pas dans la liste, les autres fichiers valides s'affichent. Thomas peut re-déposer le fichier problématique. PASS conceptuellement, mais sans feedback "ce fichier a échoué, réessayez" directement dans la grille.
- Erreur critique (projet introuvable) : L207-219 — message "Opération introuvable" + lien retour vers `/vs`. PASS.
- Erreur "Analyser les plans" : toast d'erreur "Impossible de lancer l'analyse." mais pas d'indication sur ce que Thomas doit faire ensuite (réessayer ? contacter le support ?). FAIL H9.

---

## 7. Points de vigilance code (L141, L170, L186)

[SECTION — à remplir]

---

## 8. Stepper — Cohérence avec le workflow

[SECTION — à remplir]

---

## 9. Empty state — Premier upload

[SECTION — à remplir]

---

## 10. Tableau findings

[SECTION — à remplir]

---

## 11. Verdict global

[SECTION — à remplir]

---

## 12. Handoff

[SECTION — à remplir]
