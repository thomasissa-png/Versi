# Audit Design R3 — Étape 1 Upload Plans (Versi Studio)
Session s27 — 2026-04-27 — Round 2 fixes (commit 2df507d)

---

## 1. Note globale

**8/10 — GO conditionnel** (+4 vs R1 4/10)

Les 3 P0 du R1 (scaling, réordonnement, saisie manuelle étage) sont résolus.
La liste compacte 48px avec drag-and-drop natif HTML5 correspond exactement à la
recommandation B de l'audit R1. 2 points résiduels mineurs empêchent le 10/10.

---

## 2. Critères /10

### C1 — Layout liste compacte (proportions, density) : **9/10**

Ligne 48px `minHeight`, `flex items-center gap-sm`, `bg-bg-card border border-border-default rounded-md`.
Grip handle + icône type + nom tronqué + badge étage + ↑/↓ mobile + supprimer : densité
d'information optimale. Scroll container `max-h-96 overflow-y-auto pr-xs` si > 8 plans : correct.
Point mineur : `gap-2xs` entre items (2px) → lisibilité limite à 15+ plans, `gap-xs` (4px)
aurait amélioré la séparation visuelle sans pénaliser la densité.

### C2 — Scaling 10+ plans : **9/10**

10 plans → ~480px de liste max-h-96 scrollable. 20 plans → conteneur borné à 384px scroll interne.
Cas d'usage Thomas (15 plans) : entièrement géré. Δ spectaculaire vs R1 (3/10, 3500px scroll mobile).
Point mineur résiduel : `pr-xs` (4px) de padding droit sur le scroll container peut être insuffisant
pour masquer la scrollbar native sur Chrome Windows — `pr-sm` (8px) serait plus sûr.

### C3 — Information density vs lisibilité : **8/10**

Nom fichier : bouton cliquable `text-sm truncate`, `title` tooltip complet. Amélioré vs R1.
Badge étage : `floorLabel()` correct (Cave -2/-1, RDC, R+1..R+10, Grenier). Auto-calculé
par index, override via select au clic. Élimine la friction des 12 saisies manuelles (P0-C R1).
Icône type : PDF rouge (`text-error`) / Image bleu (`text-info`) — discriminant visuellement.
Clic sur icône → lightbox preview via `PlanLightbox`. Lacune : aucun numéro de séquence
visible dans la ligne — l'index est implicite (position dans liste) mais non affiché.
Pour Thomas avec 15 plans nommés `scan001.pdf` à `scan015.pdf`, un numéro `#1`, `#2`...
en début de ligne renforcerait la lisibilité de l'ordre. Mineur.

### C4 — Actions par plan (supprimer, renommer, réordonner) : **8/10**

- Supprimer : modal ConfirmModal, `disabled={deleting}`, `opacity-50` en cours — OK
- Renommer : clic sur nom → `<input>` inline, `Enter` ou `blur` commit, `Escape` rollback — OK
  PATCH optimiste avec rollback sur erreur — robuste.
- Réordonner drag : natif HTML5, `effectAllowed="move"`, `isDragOver` visuel `border-interactive-primary border-2` — OK
- Réordonner mobile : boutons ↑/↓ `md:hidden`, `min-h-[44px] min-w-[36px]` — OK
- Découvrabilité (règle s22) : grip handle toujours visible (non conditionnel). Boutons ↑/↓
  affichés en permanence sur mobile. Correct.
- Point résiduel : les boutons ↑/↓ sont `md:hidden` → invisibles sur desktop. Sur desktop,
  l'utilisateur doit découvrir le drag-and-drop sans indice textuel. Le `title="Glisser pour
  réordonner"` sur le grip existe mais c'est un tooltip non-persistant.

### C5 — Cohérence Design System : **8/10**

Tokens corrects : `bg-bg-card`, `bg-bg-default`, `border-border-default`, `border-interactive-primary`,
`text-text-default`, `text-text-muted`, `text-error`, `text-info`, `interactive-primary`.
Focus-visible : `outline-2 outline-offset-2 outline-interactive-primary` sur tous les interactifs.
Touch targets : `min-h-[44px]` systématique. `motion-reduce:transition-none` présent.
`transition-all duration-150` conforme motion tokens (`fast` = 150ms).
Point : `text-error` pour les icônes PDF est sémantiquement discutable (rouge = erreur dans le DS)
— `text-text-muted` ou une couleur neutre serait plus cohérente. PDF n'est pas une erreur.

---

## 3. P0 résiduels

Aucun P0 bloquant. Les 3 P0 du R1 sont résolus.

**Mineurs (non-bloquants pour GO) :**
- M1 : `text-error` pour icône PDF → sémantique incorrecte (rouge = état erreur dans le DS)
- M2 : boutons ↑/↓ absents desktop → découvrabilité drag limitée au tooltip
- M3 : `pr-xs` scroll container → risque scrollbar native coupante sur Chrome Windows

---

## 4. Verdict

**GO conditionnel** — les P0 du R1 sont corrigés, le composant est production-ready.

Les 3 mineurs (M1/M2/M3) peuvent être traités en itération non-bloquante.
Condition : M1 (couleur icône PDF) à corriger avant merge en `main` — risque de confusion
sémantique avec les états d'erreur réels dans la liste.

*Audit @design — s27 R3. Handoff → @fullstack (M1 correction icône couleur PDF).*
