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

### L141 — `confirm()` natif pour suppression

```typescript
if (!confirm("Supprimer ce plan ? Cette action est irreversible.")) return;
```

**Impact UX** :
- Le dialog `confirm()` est un dialog navigateur natif, hors design system. Sur mobile, il peut être masqué ou bloquant selon les contextes (iOS Safari plein écran, WebView).
- Non accessible : le dialog natif n'est pas contrôlable via les conventions ARIA. Un lecteur d'écran le traite différemment selon le navigateur.
- Non testable : les tests E2E (Playwright, Cypress) ont du mal à intercepter `confirm()` nativement.
- Faute typographique : "irreversible" devrait être "irréversible" (accent sur le premier 'e').
- Style incohérent : boutons "OK / Annuler" système, pas les boutons du design system Versi.

**Correction requise** : remplacer par un modal de confirmation design system. Pattern recommandé : modal avec titre "Supprimer ce plan ?", message "Cette action est irréversible. Le fichier sera supprimé définitivement.", bouton "Supprimer" (destructeur, rouge) + bouton "Annuler" (secondaire). Focus trap dans le modal. Fermeture via Escape.

---

### L170 — PATCH `floor_number` non implémenté

```typescript
// Note : l'API PATCH plans n'est pas implémentée dans cette passe.
// Le floor_number sera persisté quand l'API PATCH plan sera ajoutée.
```

**Impact UX** : l'optimistic update est immédiat — l'UI se met à jour. Thomas croit avoir sauvegardé. S'il recharge la page, le `floor_number` revient à sa valeur originale (issue de l'API GET). C'est un **mensonge UX** : l'interface signale une réussite qui n'a pas eu lieu.

**Options de correction** :
1. **Court terme (v1)** : désactiver visuellement l'input `floor_number` avec un tooltip "Modification d'étage disponible prochainement" — honnête et non trompeur.
2. **Moyen terme (v1.1)** : implémenter l'API PATCH `/api/vs/plans/[id]` et afficher un spinner de sauvegarde sur l'input au blur + feedback "sauvegardé" (icône checkmark).
3. **Ne pas laisser l'optimistic update sans feedback de persistance** — c'est la situation actuelle et elle est inacceptable pour Thomas.

---

### L186 — Redirection `/lots` sans feedback de transition

```typescript
await fetch(`/api/vs/projects/${projectId}`, { method: "PATCH", ... });
router.push(`/vs/projects/${projectId}/lots`);
```

**Impact UX** :
- Le bouton "Analyser les plans" n'a pas d'état loading. Si le PATCH prend 500ms, Thomas peut cliquer deux fois (double-submit possible).
- La transition vers `/lots` se fait sans indication que "l'analyse IA est en cours". Thomas arrive sur une nouvelle page sans comprendre que quelque chose de significatif vient de se déclencher.
- Si le PATCH `/api/vs/projects/[id]` échoue, le code `catch` affiche "Impossible de lancer l'analyse." mais `router.push` n'est pas appelé — comportement correct. Mais le bouton ne revient pas à son état initial explicitement (l'état `uploading` n'est pas modifié dans ce flow — le bouton devrait être re-enabled).

**Correction requise** :
1. Ajouter `setUploading(true)` (ou un état `isAnalyzing` dédié) au début de `handleAnalyze`, `setUploading(false)` dans le `catch`.
2. Le bouton doit afficher "Analyse en cours..." + spinner pendant le PATCH.
3. Passer `disabled={uploading || isAnalyzing}` sur le bouton pour éviter les double-submits.
4. Sur la page `/lots`, afficher un indicateur "Analyse en cours" pour informer Thomas que l'IA travaille.

---

## 8. Stepper — Cohérence avec le workflow

**Composant `Stepper.tsx`** : bien conçu. 4 étapes, état actif/complété/futur, indicateur circulaire numéroté, labels + descriptions. Navigation clavier non applicable (le Stepper n'est pas cliquable — pas de liens entre étapes). Conforme visuellement à un workflow linéaire.

**Problème d'alimentation** : dans `page.tsx` L225, le Stepper est appelé ainsi :
```typescript
<Stepper currentStep={1} projectId={projectId} />
```
La prop `completedSteps` n'est pas passée. Elle defaulte à `[]` dans le composant. Résultat : si Thomas a déjà complété l'étape 1 lors d'une visite précédente et revient sur la page upload, le Stepper affichera l'étape 1 comme "active" et non comme "complétée". L'historique de progression est perdu.

**Correction requise** : alimenter `completedSteps` depuis le statut du projet. Le statut `step_1_complete` (mis à jour en L184) devrait être mappé vers `completedSteps={project.status === 'step_1_complete' ? [1] : []}`. Pour un suivi multi-étapes correct, ce mapping devrait être extrait dans un helper partagé.

**Navigation retour via Stepper** : les étapes précédentes complétées devraient être cliquables (liens vers `/vs/projects/[id]/upload` depuis les étapes suivantes). Le Stepper actuel n'est pas interactif — aucun lien. Thomas ne peut pas revenir en arrière via le Stepper depuis `/lots`. Friction H3 (contrôle et liberté).

**Cohérence étape = 1** : `currentStep={1}` est cohérent avec le fait que cette page est l'étape 1 "Upload des plans". PASS.

**Visibilité du Stepper en loading** : le Stepper est rendu dès l'état loading (L198), avant que le projet soit chargé. C'est correct — Thomas voit la structure de navigation même pendant le chargement des données.

---

## 9. Empty state — Premier upload

**État actuel** : quand `plans.length === 0`, la page affiche :
- Titre H1 "Uploadez vos plans"
- Instruction courte en `text-muted`
- DropZone centrée

**Ce qui fonctionne** : le message "Un plan par lot, ou un plan d'ensemble — les deux formats fonctionnent. PDF ou image, résolution minimum 150 dpi." est concret et utile pour Thomas (il sait ce qu'on attend, dans quel format).

**Ce qui manque :**

1. **Guidage anticipatoire sur le CTA "Analyser"** : Thomas ne voit pas le bouton "Analyser les plans" tant qu'il n'a pas uploadé de fichier (le bloc entier est conditionnel L302). Il n'a donc aucune visibilité sur ce qui l'attend après l'upload. Un encadré "Après l'upload, notre IA extraira automatiquement vos lots et pièces" donnerait de la perspective sur la valeur du workflow.

2. **Exemple de plan accepté** : Thomas est un marchand de biens, pas un architecte. Il peut se demander : "mon plan annoté en PDF suffit-il ? Faut-il un plan architecte officiel ?" Une phrase comme "Plans d'architecte, plans cadastraux, photos de plans — tout format lisible est accepté" réduirait l'hésitation.

3. **Limite 10 fichiers non visible en empty state** : Thomas ne sait pas qu'il y a une limite de 10 fichiers tant qu'il n'en a pas uploadé un. L'info apparaît seulement après le premier upload (L309). Pourrait être affichée en sous-texte de la DropZone dès le départ.

4. **Absence de skeleton/placeholder de grille** : le passage entre "empty state" (DropZone seule) et "état succès" (grille de miniatures) est abrupt. Un placeholder visuel de grille en fond ("emplacements disponibles" grisés) donnerait une idée de ce que la grille ressemblera et encouragerait l'action.

**Verdict** : l'empty state est fonctionnel mais minimal. Pour Thomas, un marchand de biens habitué aux outils métier pro, l'empty state actuel peut sembler trop sobre et laisser des doutes sur ce qui est attendu.

---

## 10. Tableau findings

| # | Point UX | Observation | Impact Thomas | Correction proposée | Priorité |
|---|---|---|---|---|---|
| F1 | `confirm()` natif suppression (L141) | Dialog browser hors design system, non accessible, faute typographique "irreversible", bloquant sur mobile Safari | Thomas voit une UI incohérente avec le reste du produit. Rupture de confiance. | Remplacer par modal design system : titre, message, bouton "Supprimer" (destructeur) + "Annuler". Focus trap + Escape. | **P0** |
| F2 | `floor_number` optimistic update sans persistance (L170) | L'API PATCH n'est pas implémentée. La modification d'étage s'affiche côté UI mais est perdue au rechargement. | Thomas croit avoir corrigé l'ordre de ses étages. Il découvre l'erreur lors de l'analyse — trop tard. | Court terme : désactiver l'input avec tooltip "Prochainement". Moyen terme : implémenter PATCH + spinner + confirmaton "sauvegardé". | **P0** |
| F3 | Aucun feedback entre "Analyser les plans" et redirection (L186) | Pas de loading state sur le bouton, pas de transition explicite, double-clic possible | Thomas ne sait pas si son clic a fonctionné. Risque de double-submit. Arrivée sur `/lots` sans contexte. | Ajouter état loading bouton, désactiver pendant PATCH, message de transition "Analyse en cours..." sur la page `/lots`. | **P0** |
| F4 | Upload séquentiel vs spec "progression parallèle par fichier" | Boucle `for...of` séquentielle (L102). Plusieurs spinners affichés mais un seul upload actif à la fois. | Pour 4 fichiers de 10 Mo chacun, Thomas attend 4x le temps d'un upload sans visibilité réelle sur l'avancement. | Paralléliser avec `Promise.all`. Ajouter barre de progression XHR par fichier. | **P1** |
| F5 | Pas de bouton retry par fichier après échec réseau | L121 : erreur réseau → message dans toast global. Pas de retry individuel. | Thomas doit re-déposer manuellement le fichier depuis son système de fichiers. | Ajouter un état "échec" par fichier dans la liste + bouton "Réessayer" individuel. | **P1** |
| F6 | `completedSteps` non alimenté dans Stepper | `<Stepper currentStep={1} projectId={projectId} />` sans `completedSteps` | Si Thomas revient sur la page upload après avoir validé l'étape 1, le Stepper ne montre pas l'étape 1 comme complétée. | Mapper `project.status` vers `completedSteps`. Extraire helper partagé. | **P1** |
| F7 | Stepper non navigable (pas de liens vers étapes précédentes) | Les étapes passées ne sont pas cliquables — impossible de revenir en arrière via le Stepper. | Thomas sur `/lots` ne peut pas revenir facilement à `/upload`. Friction de navigation. | Rendre les étapes complétées cliquables (`<Link href="/vs/projects/[id]/upload">`). | **P1** |
| F8 | Bouton suppression touch target trop petit | `p-xs` sur icône `w-4 h-4` — surface estimée ~24-28px, WCAG 2.2 exige 44x44px. | Sur mobile (Thomas sur chantier), Thomas peut rater le bouton et supprimer accidentellement le mauvais plan — ou ne pas réussir à cliquer. | Augmenter padding à `p-md` minimum. Ajouter `min-w-[44px] min-h-[44px]` sur le bouton. | **P1** |
| F9 | "Étage 0" sans mapping "RDC" | L'input étage affiche "0" mais les marchands de biens utilisent "RDC" pour l'étage 0. | Thomas doit faire le mapping mental "0 = RDC". Friction H2 (correspondance monde réel). | Afficher "Étage 0 — RDC" pour le floor 0. Ajouter placeholder "0 = RDC" dans l'input. | **P1** |
| F10 | "ou parcourir vos fichiers" non identifié comme interactif | Texte `text-xs text-muted underline` sans couleur interactive (`text-interactive-primary`). | Thomas peut ne pas comprendre que c'est cliquable séparément de la zone. | Passer en `text-interactive-primary underline` ou extraire en vrai bouton/lien stylé. | **P2** |
| F11 | Empty state sans guidage anticipatoire sur l'analyse IA | Pas de mention de ce qui se passe après l'upload (extraction lots/pièces). | Thomas ignore pourquoi il uploade des plans — la valeur du workflow n'est pas annoncée. | Ajouter un encadré "Après upload, l'IA extrait vos lots et pièces automatiquement." | **P2** |
| F12 | Erreurs multiples concaténées en une seule string | `errors.join(" ")` (L132) — plusieurs erreurs sur la même ligne. | Difficile à lire sur mobile. Thomas ne peut pas identifier rapidement quel fichier a échoué. | Afficher une liste `<ul>` d'erreurs, une `<li>` par fichier en erreur. | **P2** |
| F13 | Limite 10 fichiers non visible en empty state | L'info "X emplacements restants" n'apparaît qu'après le premier upload. | Thomas peut préparer 15 fichiers, en déposer 10, puis découvrir la limite trop tard. | Afficher "10 plans maximum" en sous-texte de la DropZone dès l'empty state. | **P2** |

---

## 11. Verdict global

**Score UX : 6/10**

Justification honnête :

- **Structure fondamentale solide** : le composant DropZone est bien conçu (rôle button, aria-label, keyboard nav, feedback drag-over). La grille de miniatures est correcte. Le Stepper est visuellement cohérent. Le flow happy path Thomas (dépose PDF → miniatures → Analyser) est fonctionnel.
- **Trois problèmes P0 bloquants** : le `confirm()` natif rompt la cohérence design, l'optimistic update sans persistance est un mensonge UX, et l'absence de feedback sur "Analyser les plans" casse la confiance au moment le plus critique du flow (dernier CTA avant l'IA). Ces 3 frictions P0 seules justifient de ne pas passer à 7/10.
- **Upload séquentiel** : en V1 avec des fichiers légers, l'impact est limité. Mais la spec exige de la parallélisation — c'est un écart documenté.
- **Ce qui manque pour atteindre 8/10** : corriger les 3 P0 + le touch target du bouton suppression + l'alimentation de `completedSteps` + le Stepper navigable.
- **Ce qui manque pour atteindre 9/10** : l'ensemble des P1 + la parallélisation upload + le retry par fichier + les améliorations de l'empty state.

**Gate G21 — Verdict final** : FAIL partiel (état Loading non conforme à la spec parallèle, `floor_number` optimistic update trompeur).

**Synthèse nielsen** :
- H1 (visibilité état) : 3 FAIL (progression %, état analyser, floor persistance)
- H2 (vocabulaire) : 1 FAIL (Étage 0 vs RDC)
- H3 (contrôle) : 1 FAIL (Stepper non navigable, pas de retour arrière)
- H5 (prévention erreurs) : 1 FAIL (confirm() natif)
- H9 (aide récupération erreurs) : 1 FAIL (message "Analyser" sans action suggérée)
- H1-H4, H6-H8, H10 : PASS

---

## 12. Handoff

---
**Handoff → @fullstack** (corrections P0 et P1)
- Fichiers produits : `/home/user/Versi/docs/ux/upload-us-vs-02-audit-v1.md`
- Corrections P0 à implémenter en priorité :
  1. **F1** — Remplacer `confirm()` L141 par un modal design system (titre "Supprimer ce plan ?", bouton destructeur + annuler, focus trap, Escape)
  2. **F2** — Désactiver l'input `floor_number` dans `PlanThumbnail.tsx` avec tooltip "Prochainement" tant que l'API PATCH n'est pas implémentée. Supprimer l'optimistic update trompeur.
  3. **F3** — Ajouter état loading sur le bouton "Analyser les plans" : `isAnalyzing` state, spinner + "Analyse en cours...", `disabled={isAnalyzing}` pendant le PATCH, reset dans le `catch`.
- Corrections P1 à implémenter dans la même session :
  - **F6** — Alimenter `completedSteps` depuis `project.status` dans `page.tsx` L225
  - **F8** — Augmenter padding bouton suppression dans `PlanThumbnail.tsx` : `min-w-[44px] min-h-[44px]`
  - **F9** — Afficher "RDC" à côté de "0" pour le floor 0 dans `PlanThumbnail.tsx`
- Points d'attention : ne pas modifier la logique d'upload sans valider la parallélisation (F4 est P1, traitable en V1.1)

**Handoff → @design** (compositions visuelles)
- Fichiers produits : `/home/user/Versi/docs/ux/upload-us-vs-02-audit-v1.md`
- Décisions UX à respecter dans les compositions :
  - Le modal de confirmation suppression doit exister dans le design system comme composant "Danger Modal" réutilisable
  - Le bouton "Analyser les plans" doit avoir un état loading documenté dans component-library.md
  - Le bouton suppression `PlanThumbnail` doit respecter min 44x44px touch target dans les specs mobiles
  - La correction "Étage 0 — RDC" doit être intégrée dans la composition miniature plan

**Handoff → @orchestrator**
- Audit terminé. Score : 6/10. 3 P0 identifiés, 7 P1 identifiés.
- Prochaine étape session versi-s15 : @fullstack implémente les corrections P0.
- Après corrections : relancer @ux en mode révision sur le même fichier pour valider que les P0 sont résolus avant de passer à l'étape 2 (US-VS-03 lots).
---
