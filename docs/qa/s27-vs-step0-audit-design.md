# Audit design — Versi Studio Étape 0 `/vs` (s27)

## Note globale : 5.5/10 — NO-GO mobile

---

## 5 critères

### C1 Layout responsive — 4/10
**375px (mobile) : FAIL.** Header `flex items-start justify-between` + button "Nouvelle opération" :
le titre `vs-h1` (30px uppercase) et le bouton cohabitent sur une ligne. Sur 375px, la phrase sous le
titre (`vs-body-sm`) fait 2 lignes, le bouton reste collé à droite du h1 — il déborde visuellement ou
compresse le titre. Aucune règle `flex-col` / `sm:flex-row` sur le header → layout cassé.

`ProjectCard` : `flex items-start justify-between` avec `max-w-sm` sur l'adresse. Sur 375px,
`max-w-sm` = 384px > viewport — le `truncate` peut masquer l'adresse sur un seul mot. Le badge statut
`text-right` + date s'empilent à droite sans contrainte de largeur minimale.

**768px (tablet) : PASS partiel** — la liste fonctionne, mais aucune grille 2 colonnes pour les cartes.
**1280px (desktop) : PASS** — liste verticale acceptable pour un backoffice.

### C2 Hiérarchie visuelle cards projet — 6/10
Points positifs : badge statut coloré, adresse `font-medium`, date en `text-muted`. Problème : les
`vs-label` (type de bien + surface) en uppercase 13px sont trop discrets entre l'adresse et le badge.
Sur un écran avec 10 projets, aucun élément visuel ne différencie les projets en dehors de l'adresse —
pas de date relative ("il y a 2 jours"), pas d'indicateur de progression (X/4 étapes), pas de thumbnail.
Densité d'information : faible pour un outil de travail — un marchand de biens avec 15 opérations ne
peut pas scanner rapidement.

### C3 Tokens design system — 8/10
PASS majoritaire : `bg-interactive-primary`, `text-text-muted`, `border-border-default`,
`text-text-inverse`, `focus-visible:outline-interactive-primary` — tous alignés sur les tokens
sémantiques de `globals.css`. Palette charcoal/stone respectée, aucune couleur custom ad hoc.
Point de vigilance : `STATUS_COLORS` utilise `bg-warning/10 text-warning` et `bg-success/10 text-success`
— ces tokens `warning`/`success` sont définis dans `globals.css` (`--color-warning: #D97706`,
`--color-success: #15803D`) mais sans token sémantique component dédié (`badge-status-*`). Acceptable
niveau actuel, à formaliser si les badges se multiplient.

### C4 Touch targets mobile — 4/10
**FAIL P0.** Bouton header "Nouvelle opération" : `px-lg py-sm` = 24px horizontal / 8px vertical.
Hauteur effective ~34px — **sous le seuil 44px WCAG mobile.** Idem bouton "Annuler" dans le formulaire
(`py-sm` = 8px) et bouton "Réessayer" dans l'état erreur (inline `underline` sans padding).
`ProjectCard` en tant que `<button>` avec `p-xl` (32px) : PASS — la zone cliquable est correcte.
Bouton empty state `vs-btn-primary` : `padding: 0.5rem 1.25rem` = 8px vertical = ~34px → FAIL.

### C5 États — 7/10
Loading : spinner + texte PASS. Empty state : icône + texte + CTA PASS — discoverability correcte.
Error : `role="alert"` + `aria-live="polite"` + "Réessayer" PASS sémantique.
Manque : skeleton loader (le spinner seul est moins premium pour un backoffice), état "loading" sur
les cartes lors d'une actualisation (fetch secondaire), feedback visuel après création projet
(TODO dans le code : `console.log("[toast]")`). Pas de toast = régression UX confirmée.

---

## Top 3 BLOQUANTS P0

**P0-1 — Touch targets sous 44px sur mobile (C4)**
Boutons header, formulaire et empty state : hauteur ~34px. Sur mobile, une action manquée sur 3 = 
friction majeure. Correction : `py-sm` → `py-[10px]` minimum sur tous les boutons standalone (hors
cards qui ont déjà suffisamment de padding).

**P0-2 — Header flex non responsive : titre + bouton se chevauchent sur 375px (C1)**
Ajouter `flex-col gap-md sm:flex-row sm:items-start` sur le wrapper header. Le bouton passe en
pleine largeur sur mobile (`w-full sm:w-auto`), titre respire.

**P0-3 — Aucun feedback toast après création projet (C5)**
`console.log("[toast]")` en commentaire depuis s16. Sur mobile, l'utilisateur crée un projet et
est redirigé silencieusement. Si la redirection rate, aucun signal. Implémenter un toast minimal
(même une bannière temporaire en haut de page) avant GO.

---

## Recommandation pattern layout

**Mobile (375px) : list view dense**
Garder la liste verticale mais réduire le padding card de `p-xl` (32px) à `p-md` (16px) sur mobile.
Ajouter une barre de progression "X/4 étapes" sous le badge statut — 1 ligne, scannable en 200ms.

**Desktop (1280px) : conserver list view**
La grille 2 colonnes est tentante mais pour un backoffice avec 5-20 opérations, la liste verticale
est plus dense et plus rapide à scanner. Ajouter un tri/filtre par statut en header.

**Hybride recommandé** : list view desktop dense (padding réduit, info enrichie) + list view mobile
avec header full-width. Pas de grid card — les cards sont adaptées aux galeries produit, pas aux
listes de projets de travail B2B. Le tableau `<table>` est une alternative valide au-delà de 20 items.
